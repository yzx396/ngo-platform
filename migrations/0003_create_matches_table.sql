-- Migration: Create matches table
-- Description: Tracks mentor-mentee match requests and their status

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  mentor_id TEXT NOT NULL,
  mentee_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected', 'active', 'completed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (mentor_id) REFERENCES mentor_profiles(user_id) ON DELETE CASCADE,
  FOREIGN KEY (mentee_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(mentor_id, mentee_id) -- Prevent duplicate match requests
);

CREATE INDEX IF NOT EXISTS idx_matches_mentor ON matches(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_mentee ON matches(mentee_id, status);
