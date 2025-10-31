-- Migration: Create post_likes table
-- Description: Enable users to like/unlike posts with engagement tracking
-- Features: Unique constraints prevent duplicate likes, indexes for performance

CREATE TABLE IF NOT EXISTS post_likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(post_id, user_id)
);

-- Index on post_id for efficient like count queries
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);

-- Index on user_id for finding user's liked posts
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

-- Index on created_at for sorting likes by recency (optional)
CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON post_likes(created_at DESC);
