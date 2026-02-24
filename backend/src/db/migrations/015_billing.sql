-- Stripe billing + subscription cache on users (source of truth after webhooks)
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_plan VARCHAR(20) NOT NULL DEFAULT 'free';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id
  ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_subscription_id
  ON users(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Idempotent webhook processing (Stripe may retry the same event)
CREATE TABLE IF NOT EXISTS stripe_processed_events (
  event_id VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
