-- Migration: Create post_comments table
-- Description: Enable users to comment on posts with engagement tracking
-- Features: Support for nested replies, indexes for performance, author tracking

CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id)
);

-- Index on post_id for finding comments by post
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);

-- Index on user_id for finding user's comments
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);

-- Index on parent_comment_id for finding nested replies
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON post_comments(parent_comment_id);

-- Index on created_at for sorting comments by recency (oldest first)
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at ASC);
