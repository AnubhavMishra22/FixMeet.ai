-- Track sent reminders to avoid duplicates
CREATE TABLE IF NOT EXISTS sent_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL,  -- '24h' or '1h'
    sent_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(booking_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_sent_reminders_booking ON sent_reminders(booking_id);
