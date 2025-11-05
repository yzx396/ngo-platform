-- Add CV storage fields to users table
-- Allows mentees to upload and store their CV documents

ALTER TABLE users ADD COLUMN cv_url TEXT;
ALTER TABLE users ADD COLUMN cv_filename TEXT;
ALTER TABLE users ADD COLUMN cv_uploaded_at INTEGER;

-- Create index for faster CV lookups
CREATE INDEX IF NOT EXISTS idx_users_cv_uploaded_at ON users(cv_uploaded_at DESC);
