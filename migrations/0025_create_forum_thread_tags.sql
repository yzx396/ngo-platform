-- Migration: Create forum_thread_tags table for tagging threads

CREATE TABLE IF NOT EXISTS forum_thread_tags (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE,
  UNIQUE(thread_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_forum_thread_tags_thread ON forum_thread_tags(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_thread_tags_tag_name ON forum_thread_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_forum_thread_tags_created ON forum_thread_tags(created_at DESC);
