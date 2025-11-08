-- Create blog_comments table
-- Stores comments on blog posts (supports nested/threaded comments)
CREATE TABLE IF NOT EXISTS blog_comments (
  id TEXT PRIMARY KEY,
  blog_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id TEXT, -- NULL for top-level comments, references another comment for replies
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES blog_comments(id) ON DELETE CASCADE
);

-- Index for fetching comments by blog (most common query)
CREATE INDEX IF NOT EXISTS idx_blog_comments_blog_id ON blog_comments(blog_id);

-- Index for fetching replies to a comment
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent_id ON blog_comments(parent_comment_id);

-- Index for fetching comments by user
CREATE INDEX IF NOT EXISTS idx_blog_comments_user_id ON blog_comments(user_id);

-- Composite index for sorting comments by blog and creation time
CREATE INDEX IF NOT EXISTS idx_blog_comments_blog_created ON blog_comments(blog_id, created_at);
