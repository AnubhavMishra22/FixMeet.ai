-- Add brief email preference to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS brief_emails_enabled BOOLEAN NOT NULL DEFAULT true;
