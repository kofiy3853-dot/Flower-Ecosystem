-- =============================================================================
-- Community Posts — Enhanced Schema
-- =============================================================================

ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(50) DEFAULT 'standard';
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS audience VARCHAR(20) DEFAULT 'public';
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS media_captions TEXT[] DEFAULT '{}';
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS poll_options JSONB;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS poll_duration INT;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS poll_ends_at TIMESTAMP;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS achievement_type VARCHAR(100);
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS achievement_detail TEXT;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS event_title VARCHAR(255);
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS event_time TIME;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS event_venue TEXT;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS event_link TEXT;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS like_count INT DEFAULT 0;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS comment_count INT DEFAULT 0;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS share_count INT DEFAULT 0;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;

-- Post media table for captions
CREATE TABLE IF NOT EXISTS community.post_media (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id     UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    media_type  VARCHAR(20) DEFAULT 'image',
    caption     TEXT,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_media_post ON community.post_media(post_id);

-- Post likes
CREATE TABLE IF NOT EXISTS community.post_likes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id     UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON community.post_likes(post_id);
