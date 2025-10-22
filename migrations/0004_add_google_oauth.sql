-- Migration: Add Google OAuth support
-- Description: Adds google_id column for OAuth account linking
-- Note: ALTER TABLE cannot be made idempotent in SQLite. However, D1's migration
-- tracking ensures this runs only once per database. Manual re-runs will fail if
-- the column already exists (expected behavior).

ALTER TABLE users ADD COLUMN google_id TEXT;

-- Create index for faster lookups by google_id
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
