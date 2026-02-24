-- Insights cache: stores AI-generated insights with 24h expiry
CREATE TABLE IF NOT EXISTS insights_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    insights JSONB NOT NULL DEFAULT '[]',
    stats_snapshot JSONB NOT NULL DEFAULT '{}',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_insights_cache_user ON insights_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_cache_expires ON insights_cache(expires_at);
