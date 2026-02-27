-- Add follow-up settings to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS followups_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS followup_tone VARCHAR(20) NOT NULL DEFAULT 'friendly'
  CHECK (followup_tone IN ('formal', 'friendly', 'casual'));
