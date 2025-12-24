import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { chargeQris } from '@/lib/payments/midtrans';
import { db } from '@/lib/db/drizzle';
import {
  invoices,
  payments,
  teamMembers,
} from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

function extractQrisActionUrl(actions?: Array<{ name: string; url: string }>) {
  if (!actions || actions.length === 0) return null;
  const qr = actions.find((a) => a.name === 'generate-qr-code');
  return qr?.url || null;
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const invoiceId = Number(body.invoiceId);
    if (!invoiceId || Number.isNaN(invoiceId)) {
      return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 });
    }

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check team membership
    const membership = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, invoice.teamId), eq(teamMembers.userId, user.id))
      )
      .limit(1);

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
    }

    // Idempotency: if there is already a pending/succeeded payment for this invoice, return it
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoice.id))
      .limit(1);

    if (existingPayment.length > 0 && existingPayment[0].status !== 'failed') {
      const meta = existingPayment[0].metadata ? JSON.parse(existingPayment[0].metadata) : null;
      return NextResponse.json({
        invoiceId: invoice.id,
        orderId: invoice.paymentReference,
        payment: existingPayment[0],
        midtrans: meta,
      });
    }

    const grossAmount = Math.round(Number(invoice.amount));
    const orderId =
      invoice.paymentReference || invoice.invoiceNumber || `INV-${invoice.id}-${Date.now()}`;

    const charge = await chargeQris({
      orderId,
      grossAmount,
      customer: {
        email: user.email,
        firstName: user.name,
        phone: undefined,
      },
    });

    const metadata = JSON.stringify(charge);

    await db.transaction(async (tx) => {
      await tx
        .update(invoices)
        .set({
          status: 'pending',
          paymentProvider: 'midtrans',
          paymentReference: charge.order_id,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoice.id));

      if (existingPayment.length > 0) {
        await tx
          .update(payments)
          .set({
            status: 'pending',
            provider: 'midtrans',
            providerId: charge.transaction_id,
            paymentMethod: 'qris',
            metadata,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, existingPayment[0].id));
      } else {
        await tx.insert(payments).values({
          invoiceId: invoice.id,
          teamId: invoice.teamId,
          amount: invoice.amount,
          currency: invoice.currency,
          status: 'pending',
          paymentMethod: 'qris',
          provider: 'midtrans',
          providerId: charge.transaction_id,
          metadata,
        });
      }
    });

    return NextResponse.json({
      invoiceId: invoice.id,
      orderId: charge.order_id,
      transactionId: charge.transaction_id,
      status: charge.transaction_status,
      paymentType: charge.payment_type,
      qrUrl: extractQrisActionUrl(charge.actions),
      expiryTime: charge.expiry_time,
      raw: charge,
    });
  } catch (error: any) {
    console.error('Midtrans charge error:', error);
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status });
  }
}
