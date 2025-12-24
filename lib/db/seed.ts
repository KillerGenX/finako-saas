import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers, subscriptionPlans } from './schema';
import { hashPassword } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...');

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800, // $8 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200, // $12 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  console.log('Stripe products and prices created successfully.');
}

async function seed() {
  console.log('Starting seed process...');

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, 'test@test.com'))
    .limit(1);

  let user;
  if (existingUser.length > 0) {
    user = existingUser[0];
    console.log('Test user already exists, skipping user creation.');
  } else {
    const email = 'test@test.com';
    const password = 'admin123';
    const passwordHash = await hashPassword(password);

    [user] = await db
      .insert(users)
      .values([
        {
          email: email,
          passwordHash: passwordHash,
          role: 'owner',
        },
      ])
      .returning();

    console.log('Initial user created.');
  }

  // Check if team already exists
  const existingTeam = await db.select().from(teams).limit(1);

  let team;
  if (existingTeam.length > 0) {
    team = existingTeam[0];
    console.log('Test team already exists, skipping team creation.');
  } else {
    [team] = await db
      .insert(teams)
      .values({
        name: 'Test Team',
      })
      .returning();

    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: 'owner',
    });

    console.log('Team and team member created.');
  }

  // Check if plans already exist
  const existingPlans = await db.select().from(subscriptionPlans).limit(1);

  if (existingPlans.length > 0) {
    console.log('Subscription plans already exist, skipping plan creation.');
  } else {
    // Create subscription plans
    await db.insert(subscriptionPlans).values([
      {
        name: 'Basic',
        slug: 'basic',
        description: 'Perfect for small businesses getting started',
        price: '39000.00',
        currency: 'IDR',
        billingInterval: 'month',
        trialDays: 14,
        features: JSON.stringify([
          '1 Point of Sale',
          '100 Products',
          '500 Transactions/month',
          'Basic Reports',
          'Email Support',
        ]),
        isActive: true,
      },
      {
        name: 'Pro',
        slug: 'pro',
        description: 'For growing businesses (Coming Soon)',
        price: '99000.00',
        currency: 'IDR',
        billingInterval: 'month',
        trialDays: 14,
        features: JSON.stringify([
          '3 Point of Sale',
          'Unlimited Products',
          'Unlimited Transactions',
          'Advanced Reports',
          'Multi-location',
          'Priority Support',
        ]),
        isActive: false, // Coming Soon
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'For large businesses (Coming Soon)',
        price: '299000.00',
        currency: 'IDR',
        billingInterval: 'month',
        trialDays: 14,
        features: JSON.stringify([
          'Unlimited Point of Sale',
          'Unlimited Products',
          'Unlimited Transactions',
          'Custom Reports',
          'API Access',
          'Dedicated Support',
          'Custom Integration',
        ]),
        isActive: false, // Coming Soon
      },
    ]);

    console.log('Subscription plans created successfully.');
  }

  // TODO: Skip Stripe products for now, will setup when Stripe keys are ready
  // await createStripeProducts();
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
