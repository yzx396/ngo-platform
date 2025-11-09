-- Remove foreign key constraint from point_actions_log.reference_id
-- The reference_id is polymorphic and can refer to posts, blogs, comments, etc.
-- Removing this constraint allows flexible entity type references
-- SQLite doesn't support DROP CONSTRAINT, so we recreate the table without the FK

-- Backup existing data
CREATE TABLE IF NOT EXISTS point_actions_log_backup AS
SELECT * FROM point_actions_log;

-- Drop the old table with the restrictive foreign key
DROP TABLE IF EXISTS point_actions_log;

-- Recreate without the foreign key constraint on reference_id
CREATE TABLE IF NOT EXISTS point_actions_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  points_awarded INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Recreate indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_point_actions_user_time
ON point_actions_log(user_id, action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_point_actions_created_at
ON point_actions_log(created_at);

-- Restore data from backup
INSERT INTO point_actions_log (id, user_id, action_type, reference_id, points_awarded, created_at)
SELECT id, user_id, action_type, reference_id, points_awarded, created_at
FROM point_actions_log_backup;

-- Clean up backup table
DROP TABLE IF EXISTS point_actions_log_backup;
