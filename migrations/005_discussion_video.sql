-- 005_discussion_video.sql
-- Adds video support to discussion comments

ALTER TABLE community.discussion_comments ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE community.discussions ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
