-- Migration: Create forum_thread_views table for view tracking
-- Tracks unique views per thread with optional user tracking

CREATE TABLE IF NOT EXISTS forum_thread_views (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT,
  ip_address TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_forum_thread_views_thread ON forum_thread_views(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_thread_views_user ON forum_thread_views(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_thread_views_created ON forum_thread_views(created_at DESC);

-- Compound index for duplicate view prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_thread_views_unique_user 
  ON forum_thread_views(thread_id, user_id) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_thread_views_unique_ip 
  ON forum_thread_views(thread_id, ip_address) 
  WHERE user_id IS NULL AND ip_address IS NOT NULL;
