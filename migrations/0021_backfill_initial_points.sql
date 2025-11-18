-- Backfill initial points for existing users without points records
-- This migration creates points records for all users who don't have one yet
-- Idempotent: Safe to run multiple times

INSERT INTO user_points (id, user_id, points, updated_at)
SELECT
  lower(hex(randomblob(16))) as id,
  u.id as user_id,
  20 as points,
  cast(strftime('%s', 'now') as integer) as updated_at
FROM users u
WHERE u.id NOT IN (
  SELECT DISTINCT user_id FROM user_points
)
AND u.id IS NOT NULL;
