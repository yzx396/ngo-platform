-- Migration: Add requires_auth field to blogs table
-- This allows marking blogs as members-only (authentication required)

-- Add requires_auth column (0 = public, 1 = members-only)
ALTER TABLE blogs ADD COLUMN requires_auth INTEGER NOT NULL DEFAULT 0;

-- Index for filtering public vs members-only blogs
CREATE INDEX idx_blogs_requires_auth ON blogs(requires_auth);
