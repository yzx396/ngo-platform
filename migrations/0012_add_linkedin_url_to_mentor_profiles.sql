-- Migration: Add linkedin_url to mentor_profiles table
-- Description: Allow mentors to maintain their LinkedIn profile URL for mentees to review

-- Add linkedin_url column to mentor_profiles table
ALTER TABLE mentor_profiles ADD COLUMN linkedin_url TEXT;

-- Create index for potential future queries filtering by LinkedIn presence
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_linkedin_url
ON mentor_profiles(linkedin_url) WHERE linkedin_url IS NOT NULL;
