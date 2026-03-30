import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { sql } from '../../config/database.js';
import { env } from '../../config/env.js';
import { getStripe } from './stripe-client.js';
import {
  applySubscriptionToUser,
  clearSubscriptionForUser,
  findUserIdByStripeCustomerId,
  findUserIdByStripeSubscriptionId,
} from './billing.service.js';

type PgTx = typeof sql;

async function findUserIdFromSubscription(sub: Stripe.Subscription): Promise<string | null> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  return (
    (await findUserIdByStripeSubscriptionId(sub.id)) ??
    (await findUserIdByStripeCustomerId(customerId))
  );
}

async function claimEvent(tx: unknown, eventId: string): Promise<boolean> {
  const t = tx as PgTx;
  const rows = await t<{ event_id: string }[]>`
    INSERT INTO stripe_processed_events (event_id) VALUES (${eventId})
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `;
  return rows.length > 0;
}

async function handleCheckoutCompleted(
  tx: unknown,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId ?? session.client_reference_id;
  if (!userId) {
    console.error('[stripe webhook] checkout.session.completed missing userId metadata');
    return;
  }
  const subRef = session.subscription;
  const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;
  if (!subscriptionId) {
    console.error('[stripe webhook] checkout.session.completed missing subscription');
    return;
  }
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });
  await applySubscriptionToUser(tx, userId, subscription);
}

async function handleSubscriptionUpdated(
  tx: unknown,
  sub: Stripe.Subscription,
): Promise<void> {
  const userId = await findUserIdFromSubscription(sub);
  if (!userId) {
    console.warn('[stripe webhook] customer.subscription.updated: no user for', sub.id);
    return;
  }
  const stripe = getStripe();
  const full = await stripe.subscriptions.retrieve(sub.id, {
    expand: ['items.data.price'],
  });
  await applySubscriptionToUser(tx, userId, full);
}

async function handleSubscriptionDeleted(
  tx: unknown,
  sub: Stripe.Subscription,
): Promise<void> {
  const userId = await findUserIdFromSubscription(sub);
  if (!userId) {
    console.warn('[stripe webhook] customer.subscription.deleted: no user for', sub.id);
    return;
  }
  await clearSubscriptionForUser(tx, userId);
}

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).send('Webhook not configured');
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    res.status(400).send('Missing stripe-signature');
    return;
  }

  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).send('Expected raw body');
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe webhook] signature verify failed:', msg);
    res.status(400).send(`Webhook signature verification failed: ${msg}`);
    return;
  }

  try {
    await sql.begin(async (tx) => {
      const fresh = await claimEvent(tx, event.id);
      if (!fresh) {
        return;
      }

      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(tx, event.data.object as Stripe.Checkout.Session);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(tx, event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(tx, event.data.object as Stripe.Subscription);
          break;
        default:
          break;
      }
    });
  } catch (e) {
    console.error('[stripe webhook] handler error:', e);
    res.status(500).json({ error: 'Webhook handler failed' });
    return;
  }

  res.json({ received: true });
}
