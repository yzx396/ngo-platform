-- Fix parent_id relationships for forum categories
-- This migration corrects the missing parent_id values from migration 0020

-- Update Career Development subcategories
UPDATE forum_categories SET parent_id = 'cat_career' WHERE id = 'cat_career_job';
UPDATE forum_categories SET parent_id = 'cat_career' WHERE id = 'cat_career_transition';
UPDATE forum_categories SET parent_id = 'cat_career' WHERE id = 'cat_career_skills';

-- Update Mentorship subcategories
UPDATE forum_categories SET parent_id = 'cat_mentorship' WHERE id = 'cat_mentor_finding';
UPDATE forum_categories SET parent_id = 'cat_mentorship' WHERE id = 'cat_mentor_stories';
UPDATE forum_categories SET parent_id = 'cat_mentorship' WHERE id = 'cat_mentor_qa';

-- Update Community subcategories
UPDATE forum_categories SET parent_id = 'cat_community' WHERE id = 'cat_community_general';
UPDATE forum_categories SET parent_id = 'cat_community' WHERE id = 'cat_community_events';
UPDATE forum_categories SET parent_id = 'cat_community' WHERE id = 'cat_community_achievements';

-- Update Help & Support subcategories
UPDATE forum_categories SET parent_id = 'cat_help' WHERE id = 'cat_help_platform';
UPDATE forum_categories SET parent_id = 'cat_help' WHERE id = 'cat_help_features';
