-- Create blog_likes table
-- Stores likes on blog posts
CREATE TABLE IF NOT EXISTS blog_likes (
  id TEXT PRIMARY KEY,
  blog_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(blog_id, user_id) -- One like per user per blog
);

-- Index for querying likes by blog
CREATE INDEX IF NOT EXISTS idx_blog_likes_blog_id ON blog_likes(blog_id);

-- Index for querying likes by user
CREATE INDEX IF NOT EXISTS idx_blog_likes_user_id ON blog_likes(user_id);
