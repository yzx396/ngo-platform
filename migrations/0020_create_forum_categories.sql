-- Create forum_categories table
CREATE TABLE IF NOT EXISTS forum_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES forum_categories(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_forum_categories_parent ON forum_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_forum_categories_display_order ON forum_categories(display_order);

-- Seed initial categories
INSERT INTO forum_categories (id, name, slug, description, icon, display_order, created_at) VALUES
('cat_career', 'Career Development', 'career-development', 'Professional growth and career advice', '💼', 1, unixepoch()),
('cat_career_job', 'Job Search & Applications', 'job-search', 'Tips, resume reviews, interview prep', '💡', 1, unixepoch()),
('cat_career_transition', 'Career Transitions', 'career-transitions', 'Changing careers, pivoting industries', '🎯', 2, unixepoch()),
('cat_career_skills', 'Skill Development', 'skill-development', 'Learning new skills, certifications', '📊', 3, unixepoch()),
('cat_mentorship', 'Mentorship', 'mentorship', 'Finding and working with mentors', '🤝', 2, unixepoch()),
('cat_mentor_finding', 'Finding a Mentor', 'finding-mentor', 'How to find and approach mentors', '🔍', 1, unixepoch()),
('cat_mentor_stories', 'Mentoring Success Stories', 'mentor-stories', 'Share your mentorship journey', '⭐', 2, unixepoch()),
('cat_mentor_qa', 'Mentor Q&A', 'mentor-qa', 'Ask experienced mentors anything', '💬', 3, unixepoch()),
('cat_community', 'Community', 'community', 'General discussions and networking', '🌟', 3, unixepoch()),
('cat_community_general', 'General Discussion', 'general-discussion', 'General discussions', '💭', 1, unixepoch()),
('cat_community_events', 'Events & Meetups', 'events', 'Community events and meetups', '🎉', 2, unixepoch()),
('cat_community_achievements', 'Community Achievements', 'achievements', 'Celebrate community wins', '🏆', 3, unixepoch()),
('cat_help', 'Help & Support', 'help', 'Platform help and feedback', 'ℹ️', 4, unixepoch()),
('cat_help_platform', 'Platform Help', 'platform-help', 'Questions about using the platform', '❓', 1, unixepoch()),
('cat_help_features', 'Feature Requests', 'feature-requests', 'Suggest new features', '💡', 2, unixepoch());
