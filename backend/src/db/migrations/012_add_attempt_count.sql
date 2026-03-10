-- Fix: Add attempt_count to meeting_briefs if missing (e.g. table created before column was in migration 006)
-- Safe to run: only alters if table exists; ADD COLUMN IF NOT EXISTS is idempotent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_briefs') THEN
    ALTER TABLE meeting_briefs ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;
