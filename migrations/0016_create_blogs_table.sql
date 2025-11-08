-- Create blogs table
-- Stores blog posts created by users
CREATE TABLE IF NOT EXISTS blogs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0, -- SQLite boolean (0 or 1)
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for sorting by created_at (most recent first)
CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON blogs(created_at DESC);

-- Index for filtering featured blogs
CREATE INDEX IF NOT EXISTS idx_blogs_featured ON blogs(featured) WHERE featured = 1;

-- Index for user's blogs
CREATE INDEX IF NOT EXISTS idx_blogs_user_id ON blogs(user_id);
