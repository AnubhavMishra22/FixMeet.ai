-- Meeting briefs table (AI-generated pre-meeting context)
CREATE TABLE IF NOT EXISTS meeting_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- AI-generated content
    invitee_summary TEXT,           -- About the person
    company_summary TEXT,           -- About their company
    previous_meetings JSONB DEFAULT '[]',  -- Past meeting history
    talking_points JSONB DEFAULT '[]',     -- AI suggested topics

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, generating, completed, failed

    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- One brief per booking per user
    UNIQUE(booking_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meeting_briefs_booking ON meeting_briefs(booking_id);
CREATE INDEX IF NOT EXISTS idx_meeting_briefs_user ON meeting_briefs(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_briefs_status ON meeting_briefs(status);
