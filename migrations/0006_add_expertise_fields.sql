-- Migration: Add expertise domain and topic fields to mentor_profiles
-- Description: Enable mentees to filter mentors by professional domains and expertise topics

-- Add expertise_domains column
-- Bit flags for domains: 1 = technical, 2 = product/project, 4 = management/strategy, 8 = career development
ALTER TABLE mentor_profiles ADD COLUMN expertise_domains INTEGER NOT NULL DEFAULT 0;

-- Add expertise_topics_preset column
-- Bit flags for predefined topics:
-- 1 = career transition, 2 = technical skills, 4 = leadership, 8 = communication
-- 16 = interview prep, 32 = negotiation, 64 = time management, 128 = fundraising
-- 256 = volunteer management, 512 = strategic planning
ALTER TABLE mentor_profiles ADD COLUMN expertise_topics_preset INTEGER NOT NULL DEFAULT 0;

-- Add expertise_topics_custom column
-- JSON array of custom topic tags (e.g., ["startup strategy", "product marketing"])
ALTER TABLE mentor_profiles ADD COLUMN expertise_topics_custom TEXT NOT NULL DEFAULT '[]';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_mentor_expertise_domains ON mentor_profiles(expertise_domains);
CREATE INDEX IF NOT EXISTS idx_mentor_expertise_topics ON mentor_profiles(expertise_topics_preset);
