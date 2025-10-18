-- Migration: Create mentor_profiles table
-- Description: Mentor profile information with bit flags for levels and payment types

CREATE TABLE mentor_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  nick_name TEXT NOT NULL UNIQUE,
  bio TEXT NOT NULL,
  -- Bit flags for mentoring levels:
  -- 1 = entry (2^0), 2 = senior (2^1), 4 = staff (2^2), 8 = management (2^3)
  mentoring_levels INTEGER NOT NULL DEFAULT 0,
  availability TEXT, -- Free text description (e.g., "Weekdays 9am-5pm EST", "Flexible, contact me")
  hourly_rate INTEGER,
  -- Bit flags for payment types:
  -- 1 = venmo (2^0), 2 = paypal (2^1), 4 = zelle (2^2), 8 = alipay (2^3), 16 = wechat (2^4), 32 = crypto (2^5)
  payment_types INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  allow_reviews BOOLEAN NOT NULL DEFAULT 1,
  allow_recording BOOLEAN NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_mentor_user_id ON mentor_profiles(user_id);
CREATE INDEX idx_mentor_levels ON mentor_profiles(mentoring_levels);
CREATE INDEX idx_mentor_payment ON mentor_profiles(payment_types);
CREATE INDEX idx_mentor_hourly_rate ON mentor_profiles(hourly_rate);
