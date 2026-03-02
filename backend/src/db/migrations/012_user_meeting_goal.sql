-- Migration 012: Add meeting hours goal to users table
ALTER TABLE users ADD COLUMN meeting_hours_goal REAL DEFAULT NULL;
