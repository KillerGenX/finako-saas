const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const MIDTRANS_BASE_URL = IS_PRODUCTION
  ? 'https://api.midtrans.com'
  : 'https://api.sandbox.midtrans.com';

if (!MIDTRANS_SERVER_KEY) {
  throw new Error('MIDTRANS_SERVER_KEY is not set');
}

function authHeader() {
  const basic = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
  return `Basic ${basic}`;
}

export type MidtransChargeResult = {
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_status?: string;
  status_code?: string;
  status_message?: string;
  actions?: Array<{ name: string; method: string; url: string }>;
  qr_string?: string;
  qr_url?: string;
  expiry_time?: string;
  va_numbers?: Array<{ bank: string; va_number: string }>;
  permata_va_number?: string;
  payment_code?: string;
};

export async function chargeQris(params: {
  orderId: string;
  grossAmount: number;
  customer?: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  };
}): Promise<MidtransChargeResult> {
  const payload = {
    payment_type: 'qris',
    transaction_details: {
      order_id: params.orderId,
      gross_amount: Math.round(params.grossAmount),
    },
    customer_details: {
      email: params.customer?.email || undefined,
      first_name: params.customer?.firstName || undefined,
      last_name: params.customer?.lastName || undefined,
      phone: params.customer?.phone || undefined,
    },
    qris: {
      acquirer: 'gopay',
    },
  };

  const response = await fetch(`${MIDTRANS_BASE_URL}/v2/charge`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as MidtransChargeResult;

  if (!response.ok) {
    const message = data?.status_message || 'Midtrans charge failed';
    const error = new Error(message);
    // @ts-expect-error attach http status for caller
    error.status = response.status;
    throw error;
  }

  return data;
}
