-- Migration: Create forum_votes table for upvote/downvote system
-- Supports voting on both threads and replies

CREATE TABLE IF NOT EXISTS forum_votes (
  id TEXT PRIMARY KEY,
  votable_type TEXT NOT NULL CHECK (votable_type IN ('thread', 'reply')),
  votable_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(votable_type, votable_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_votes_votable ON forum_votes(votable_type, votable_id);
CREATE INDEX IF NOT EXISTS idx_forum_votes_user ON forum_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_votes_created ON forum_votes(created_at DESC);
