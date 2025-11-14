-- Migration: Add forum fields to posts table
-- Description: Add title, category, views, and pinning support for forum-style UI
-- Features: Post titles, categorization, view tracking, admin pinning

-- Add title column (required for forum threads)
ALTER TABLE posts ADD COLUMN title TEXT;

-- Add category column for organizing posts
ALTER TABLE posts ADD COLUMN category TEXT DEFAULT 'general';

-- Add views counter
ALTER TABLE posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0;

-- Add is_pinned flag for admin to pin important posts
ALTER TABLE posts ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;

-- Add last_reply_at for sorting by recent activity
ALTER TABLE posts ADD COLUMN last_reply_at INTEGER;

-- Add last_reply_user_id to show who replied last
ALTER TABLE posts ADD COLUMN last_reply_user_id TEXT;

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

-- Create index on is_pinned for showing pinned posts first
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned DESC, created_at DESC);

-- Create index on last_reply_at for sorting by activity
CREATE INDEX IF NOT EXISTS idx_posts_last_reply_at ON posts(last_reply_at DESC);

-- Create index on views for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_posts_views ON posts(views DESC);
