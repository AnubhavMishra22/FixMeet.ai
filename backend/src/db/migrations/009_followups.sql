-- Meeting follow-ups table
CREATE TABLE IF NOT EXISTS meeting_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Generated content
    subject TEXT,
    body TEXT,
    action_items JSONB DEFAULT '[]',

    -- Status tracking
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'skipped')),
    sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- One followup per booking per user
    UNIQUE(booking_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_followups_booking ON meeting_followups(booking_id);
CREATE INDEX IF NOT EXISTS idx_followups_user ON meeting_followups(user_id);
CREATE INDEX IF NOT EXISTS idx_followups_status ON meeting_followups(status);
