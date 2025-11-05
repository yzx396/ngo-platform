-- Create point actions log table to track user actions for point awarding and diminishing returns
CREATE TABLE IF NOT EXISTS point_actions_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  points_awarded INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reference_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Index for efficient lookups of recent actions by user and action type
CREATE INDEX IF NOT EXISTS idx_point_actions_user_time
ON point_actions_log(user_id, action_type, created_at DESC);

-- Index for cleanup queries (find actions older than 24 hours)
CREATE INDEX IF NOT EXISTS idx_point_actions_created_at
ON point_actions_log(created_at);
