-- Migration: Drop all post-related tables
-- Description: Remove posts, post_likes, and post_comments tables and their indexes
-- Note: This is a destructive migration - data will be lost

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS post_comments;
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS posts;
