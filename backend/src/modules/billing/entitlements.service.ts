import { sql } from '../../config/database.js';
import { env } from '../../config/env.js';
import { ForbiddenError } from '../../utils/errors.js';
import type { BillingPlan } from '../auth/auth.types.js';

const PLAN_RANK: Record<BillingPlan, number> = {
  free: 0,
  pro: 1,
  max: 2,
};

/** Returns the cached plan from the database (updated by Stripe webhooks). */
export async function getPlanForUser(userId: string): Promise<BillingPlan> {
  const rows = await sql<{ billing_plan: BillingPlan }[]>`
    SELECT billing_plan FROM users WHERE id = ${userId} LIMIT 1
  `;
  const plan = rows[0]?.billing_plan;
  if (plan === 'free' || plan === 'pro' || plan === 'max') {
    return plan;
  }
  return 'free';
}

/**
 * Throws ForbiddenError if the user’s plan is below `minimum`.
 * No-op when BILLING_SHOWCASE_MODE is enabled.
 */
export async function assertPlanAtLeast(
  userId: string,
  minimum: BillingPlan,
): Promise<void> {
  if (env.BILLING_SHOWCASE_MODE) {
    return;
  }
  const plan = await getPlanForUser(userId);
  if (PLAN_RANK[plan] < PLAN_RANK[minimum]) {
    throw new ForbiddenError(
      `This feature requires ${minimum === 'max' ? 'Max' : 'Pro'} plan or higher.`,
    );
  }
}
