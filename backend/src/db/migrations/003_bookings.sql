-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Invitee info (not a user, just contact details)
    invitee_name VARCHAR(255) NOT NULL,
    invitee_email VARCHAR(255) NOT NULL,
    invitee_timezone VARCHAR(100) NOT NULL,
    invitee_notes TEXT,

    -- Meeting time (stored in UTC)
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,

    -- Location
    location_type VARCHAR(50) NOT NULL,
    location_value TEXT,
    meeting_url TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'confirmed',
    cancellation_reason TEXT,
    cancelled_by VARCHAR(50),
    cancelled_at TIMESTAMPTZ,

    -- Responses to custom questions
    responses JSONB DEFAULT '{}',

    -- For invitee to manage their booking without auth
    cancel_token VARCHAR(100) UNIQUE NOT NULL,

    -- Calendar sync (for future)
    host_calendar_event_id VARCHAR(255),
    invitee_calendar_event_id VARCHAR(255),

    -- Metadata
    source VARCHAR(50) DEFAULT 'booking_page',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_host ON bookings(host_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_type ON bookings(event_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_host_time ON bookings(host_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_invitee_email ON bookings(invitee_email);
CREATE INDEX IF NOT EXISTS idx_bookings_cancel_token ON bookings(cancel_token);
