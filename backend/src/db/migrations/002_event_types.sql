-- Event Types table
CREATE TABLE IF NOT EXISTS event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic info
    slug VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 30,

    -- Location settings
    location_type VARCHAR(50) DEFAULT 'google_meet',
    location_value TEXT,

    -- Appearance
    color VARCHAR(7) DEFAULT '#3B82F6',

    -- Weekly availability schedule
    schedule JSONB NOT NULL DEFAULT '{
        "monday": [{"start": "09:00", "end": "17:00"}],
        "tuesday": [{"start": "09:00", "end": "17:00"}],
        "wednesday": [{"start": "09:00", "end": "17:00"}],
        "thursday": [{"start": "09:00", "end": "17:00"}],
        "friday": [{"start": "09:00", "end": "17:00"}],
        "saturday": [],
        "sunday": []
    }',

    -- Booking rules
    buffer_before INTEGER DEFAULT 0,
    buffer_after INTEGER DEFAULT 0,
    min_notice_minutes INTEGER DEFAULT 60,
    slot_interval INTEGER DEFAULT 30,
    max_bookings_per_day INTEGER,

    -- Date range settings
    range_type VARCHAR(50) DEFAULT 'rolling',
    range_days INTEGER DEFAULT 60,
    range_start DATE,
    range_end DATE,

    -- Custom questions for invitee
    questions JSONB DEFAULT '[]',

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, slug)
);

-- Availability overrides (block or open specific dates)
CREATE TABLE IF NOT EXISTS availability_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type_id UUID REFERENCES event_types(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_available BOOLEAN DEFAULT true,
    time_ranges JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, event_type_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_types_user ON event_types(user_id);
CREATE INDEX IF NOT EXISTS idx_event_types_slug ON event_types(user_id, slug);
CREATE INDEX IF NOT EXISTS idx_event_types_active ON event_types(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_availability_overrides_user ON availability_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_overrides_date ON availability_overrides(user_id, date);
