-- Add brief generation settings to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS briefs_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS brief_generation_hours INTEGER NOT NULL DEFAULT 24;
