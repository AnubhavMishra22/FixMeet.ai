import Stripe from 'stripe';
import { sql } from '../../config/database.js';
import { env } from '../../config/env.js';
import { BadRequestError, NotFoundError, ServiceUnavailableError } from '../../utils/errors.js';
import type { BillingPlan } from '../auth/auth.types.js';
import { getStripe } from './stripe-client.js';
import type { CheckoutSessionBody } from './billing.schema.js';

// Inside sql.begin(), the transaction handle is callable like `sql` but postgres.js types do not expose the template tag. Cast to the root sql type when building queries.
type PgTx = typeof sql;

/** Postgres undefined_column — billing migration not applied on this DB */
function rethrowIfMissingBillingColumns(e: unknown): void {
  const code =
    typeof e === 'object' && e !== null && 'code' in e
      ? String((e as { code: unknown }).code)
      : '';
  const msg = e instanceof Error ? e.message : String(e);
  if (
    code === '42703' ||
    (/column/i.test(msg) && /does not exist/i.test(msg) && /stripe_|billing_plan/i.test(msg))
  ) {
    throw new ServiceUnavailableError(
      'Billing database columns are missing. On the server run: cd /root/FixMeet.ai/backend && npm run db:migrate',
    );
  }
}

function throwStripeAsBadRequest(err: unknown): never {
  if (err instanceof Stripe.errors.StripeError) {
    console.error('Stripe API error:', err.type, err.code, err.message);
    throw new BadRequestError(err.message);
  }
  throw err;
}

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
  console.warn(
    'Billing: unrecognized Stripe price id; treating user as free. priceId=',
    priceId,
  );
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

  let existingCustomerId: string | null = null;
  try {
    const users = await sql<{ stripe_customer_id: string | null }[]>`
      SELECT stripe_customer_id FROM users WHERE id = ${userId} LIMIT 1
    `;
    existingCustomerId = users[0]?.stripe_customer_id ?? null;
  } catch (e) {
    rethrowIfMissingBillingColumns(e);
    throw e;
  }

  const successUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/dashboard/settings?billing=success`;
  const cancelUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/dashboard/settings?billing=cancel`;

  const baseParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
  };

  const withCustomer = (customerId: string | null): Stripe.Checkout.SessionCreateParams =>
    customerId
      ? { ...baseParams, customer: customerId }
      : { ...baseParams, customer_email: email };

  try {
    const session = await stripe.checkout.sessions.create(withCustomer(existingCustomerId));
    return { url: session.url };
  } catch (err) {
    if (
      err instanceof Stripe.errors.StripeError &&
      err.code === 'resource_missing' &&
      existingCustomerId
    ) {
      // Stale customer id in DB (e.g. deleted in Stripe Dashboard)
      await sql`
        UPDATE users SET stripe_customer_id = NULL, updated_at = NOW() WHERE id = ${userId}
      `;
      try {
        const session = await stripe.checkout.sessions.create(withCustomer(null));
        return { url: session.url };
      } catch (e) {
        throwStripeAsBadRequest(e);
      }
    }
    throwStripeAsBadRequest(err);
  }
}

export async function createPortalSession(userId: string): Promise<{ url: string }> {
  let customerId: string | null = null;
  try {
    const rows = await sql<{ stripe_customer_id: string | null }[]>`
      SELECT stripe_customer_id FROM users WHERE id = ${userId} LIMIT 1
    `;
    customerId = rows[0]?.stripe_customer_id ?? null;
  } catch (e) {
    rethrowIfMissingBillingColumns(e);
    throw e;
  }
  if (!customerId) {
    throw new BadRequestError('No Stripe customer on file. Subscribe once via Checkout first.');
  }
  const stripe = getStripe();
  const returnUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/dashboard/settings`;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError && err.code === 'resource_missing') {
      await sql`
        UPDATE users SET stripe_customer_id = NULL, updated_at = NOW() WHERE id = ${userId}
      `;
      throw new BadRequestError(
        'Stripe customer no longer exists. Use Upgrade again to create a new Checkout session.',
      );
    }
    throwStripeAsBadRequest(err);
  }
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
