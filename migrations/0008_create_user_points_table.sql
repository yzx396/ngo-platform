-- Migration: Create user_points table
-- Description: Store user points for gamification and leaderboard system
-- Note: Rank is calculated on-the-fly using SQL window functions, not stored

CREATE TABLE IF NOT EXISTS user_points (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index on user_id for lookups
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);

-- Index on points for sorting (used in leaderboard queries)
CREATE INDEX IF NOT EXISTS idx_user_points_points ON user_points(points DESC);
