-- Migration: Add feed feature flag
-- This allows admins to toggle the Feed feature on/off

INSERT INTO feature_flags (id, feature_key, display_name, description, enabled, created_at, updated_at) VALUES
  ('ft-9', 'feed', 'Community Feed', 'Display community feed with user posts', 1, strftime('%s', 'now'), strftime('%s', 'now'))
ON CONFLICT(feature_key) DO NOTHING;
