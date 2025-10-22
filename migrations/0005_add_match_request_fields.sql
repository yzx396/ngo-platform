-- Migration: Add mentee introduction and preferred mentoring time to matches
-- Description: Allows mentees to provide personal introduction and preferred mentoring times when requesting mentorship
-- Note: ALTER TABLE cannot be made idempotent in SQLite. However, D1's migration
-- tracking ensures this runs only once per database. Manual re-runs will fail if
-- the columns already exist (expected behavior).

ALTER TABLE matches ADD COLUMN introduction TEXT NOT NULL DEFAULT '';
ALTER TABLE matches ADD COLUMN preferred_time TEXT NOT NULL DEFAULT '';
