-- Migration: Create feature_flags table for admin feature toggle system
-- This table stores feature flags that admins can toggle on/off dynamically

CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  feature_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(feature_key);

-- Seed initial feature flags
INSERT INTO feature_flags (id, feature_key, display_name, description, enabled, created_at, updated_at) VALUES
  -- Core features (enabled by default)
  ('ft-1', 'mentor_search', 'Mentor Search & Browse', 'Allow users to search and browse mentor profiles', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('ft-2', 'match_requests', 'New Match Requests', 'Allow mentees to send new match requests', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('ft-3', 'points_system', 'Points System', 'Track and award points for user engagement', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('ft-4', 'leaderboard', 'Leaderboard', 'Display user rankings and points', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('ft-5', 'linkedin_profiles', 'LinkedIn Integration', 'Display LinkedIn profile links on mentor profiles', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('ft-6', 'public_registration', 'Public Registration', 'Allow new user registration via Google OAuth', 1, strftime('%s', 'now'), strftime('%s', 'now')),

  -- Future features (disabled by default)
  ('ft-7', 'challenges', 'Community Challenges', 'Community challenges and competitions for skill development', 0, strftime('%s', 'now'), strftime('%s', 'now')),
  ('ft-8', 'blogs', 'Blog Posts', 'User-generated blog posts and articles', 0, strftime('%s', 'now'), strftime('%s', 'now'));
