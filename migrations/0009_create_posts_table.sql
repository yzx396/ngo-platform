-- Migration: Create posts table
-- Description: Store community posts for the feed system
-- Features: Auto-publish posts, support for post types, engagement counts

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'general' CHECK (post_type IN ('announcement', 'discussion', 'general')),
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index on user_id for finding posts by author
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- Index on created_at for chronological sorting (newest first)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Index on post_type for filtering announcements
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
