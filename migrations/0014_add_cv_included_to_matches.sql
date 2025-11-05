-- Add cv_included flag to matches table
-- Tracks whether mentee included their CV with the match request

ALTER TABLE matches ADD COLUMN cv_included INTEGER DEFAULT 0;
