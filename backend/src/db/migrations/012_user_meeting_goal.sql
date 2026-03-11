-- Migration 012: Add meeting hours goal to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS meeting_hours_goal REAL DEFAULT NULL;
