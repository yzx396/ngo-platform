-- Add Google OAuth support to users table
ALTER TABLE users ADD COLUMN google_id TEXT;

-- Create index for faster lookups by google_id
CREATE INDEX idx_users_google_id ON users(google_id);
