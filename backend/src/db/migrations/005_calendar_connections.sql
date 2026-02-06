-- Calendar connections table
CREATE TABLE IF NOT EXISTS calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Provider info
    provider VARCHAR(50) NOT NULL,  -- 'google', 'outlook', etc.
    provider_account_id VARCHAR(255),  -- Provider's user/account ID

    -- OAuth tokens (encrypted in production)
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ NOT NULL,

    -- Selected calendar
    calendar_id VARCHAR(255),
    calendar_name VARCHAR(255),

    -- Settings
    is_primary BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One connection per provider per user
    UNIQUE(user_id, provider)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_provider ON calendar_connections(provider);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_active ON calendar_connections(user_id, is_active);
