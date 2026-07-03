-- 004_feed_enhancements.sql
-- Adds columns for enhanced feed features

ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS course_id UUID;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

CREATE INDEX IF NOT EXISTS idx_posts_location ON community.posts(location);
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON community.posts USING GIN(search_vector);
