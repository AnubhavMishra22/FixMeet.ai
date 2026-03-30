import type Stripe from 'stripe';
import { sql } from '../../config/database.js';
import { env } from '../../config/env.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import type { BillingPlan } from '../auth/auth.types.js';
import { getStripe } from './stripe-client.js';
import type { CheckoutSessionBody } from './billing.schema.js';

/** Transaction client from `sql.begin` — cast for queries (postgres TransactionSql typings omit the template tag). */
type PgTx = typeof sql;

function priceIdForTier(tier: CheckoutSessionBody['tier']): string {
  const id =
    tier === 'max' ? env.STRIPE_PRICE_ID_MAX : env.STRIPE_PRICE_ID_PRO;
  if (!id) {
    throw new BadRequestError(
      `Stripe price ID for ${tier} is not configured (STRIPE_PRICE_ID_${tier === 'max' ? 'MAX' : 'PRO'}).`,
    );
  }
  return id;
}

function extractPriceId(sub: Stripe.Subscription): string | null {
  const item = sub.items.data[0];
  if (!item?.price) return null;
  const p = item.price;
  return typeof p === 'string' ? p : p.id;
}

export function priceIdToPlan(priceId: string | null): BillingPlan {
  if (!priceId) return 'free';
  if (env.STRIPE_PRICE_ID_MAX && priceId === env.STRIPE_PRICE_ID_MAX) return 'max';
  if (env.STRIPE_PRICE_ID_PRO && priceId === env.STRIPE_PRICE_ID_PRO) return 'pro';
  console.warn('[billing] Unknown Stripe price id, defaulting plan to free:', priceId);
  return 'free';
}

function subscriptionToPlan(sub: Stripe.Subscription, priceId: string | null): BillingPlan {
  const entitled = ['active', 'trialing', 'past_due'].includes(sub.status);
  if (!entitled || !priceId) return 'free';
  return priceIdToPlan(priceId);
}

export async function findUserIdByStripeCustomerId(
  customerId: string,
): Promise<string | null> {
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM users WHERE stripe_customer_id = ${customerId} LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

export async function findUserIdByStripeSubscriptionId(
  subscriptionId: string,
): Promise<string | null> {
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM users WHERE stripe_subscription_id = ${subscriptionId} LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

export async function applySubscriptionToUser(
  tx: unknown,
  userId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const t = tx as PgTx;
  const priceId = extractPriceId(subscription);
  const plan = subscriptionToPlan(subscription, priceId);
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await t`
    UPDATE users SET
      stripe_customer_id = ${customerId},
      stripe_subscription_id = ${subscription.id},
      stripe_price_id = ${priceId},
      subscription_status = ${subscription.status},
      subscription_current_period_end = ${periodEnd},
      billing_plan = ${plan},
      updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export async function clearSubscriptionForUser(tx: unknown, userId: string): Promise<void> {
  const t = tx as PgTx;
  await t`
    UPDATE users SET
      stripe_subscription_id = NULL,
      stripe_price_id = NULL,
      subscription_status = 'canceled',
      subscription_current_period_end = NULL,
      billing_plan = 'free',
      updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  body: CheckoutSessionBody,
): Promise<{ url: string | null }> {
  const stripe = getStripe();
  const priceId = priceIdForTier(body.tier);

  const users = await sql<{ stripe_customer_id: string | null }[]>`
    SELECT stripe_customer_id FROM users WHERE id = ${userId} LIMIT 1
  `;
  const existingCustomerId = users[0]?.stripe_customer_id ?? null;

  const successUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/dashboard/settings?billing=success`;
  const cancelUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/dashboard/settings?billing=cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
    ...(existingCustomerId
      ? { customer: existingCustomerId }
      : { customer_email: email }),
  });

  return { url: session.url };
}

export async function createPortalSession(userId: string): Promise<{ url: string }> {
  const rows = await sql<{ stripe_customer_id: string | null }[]>`
    SELECT stripe_customer_id FROM users WHERE id = ${userId} LIMIT 1
  `;
  const customerId = rows[0]?.stripe_customer_id;
  if (!customerId) {
    throw new BadRequestError('No Stripe customer on file. Subscribe once via Checkout first.');
  }
  const stripe = getStripe();
  const returnUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/dashboard/settings`;
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

export async function getUserEmail(userId: string): Promise<string> {
  const rows = await sql<{ email: string }[]>`
    SELECT email FROM users WHERE id = ${userId} LIMIT 1
  `;
  if (!rows[0]) {
    throw new NotFoundError('User not found');
  }
  return rows[0].email;
}
