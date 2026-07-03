-- 003_feed_tables.sql
-- Adds feed-specific columns to community.posts and creates supporting tables

-- ─── Extend community.posts ────────────────────────────────────────────
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(50) DEFAULT 'standard';
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS audience VARCHAR(50) DEFAULT 'public';
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]';
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS media_type JSONB DEFAULT '[]';
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS poll_options JSONB;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS poll_ends_at TIMESTAMP;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS event_id UUID;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS like_count INT DEFAULT 0;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;

-- ─── Extend community.comments for threading ───────────────────────────
ALTER TABLE community.comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES community.comments(id) ON DELETE CASCADE;

-- ─── Post Media ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community.post_media (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id     UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    media_type  VARCHAR(20) DEFAULT 'image',
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_post_media_post ON community.post_media(post_id);

-- ─── Post Reactions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community.post_reactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type   VARCHAR(20) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON community.post_reactions(post_id);

-- ─── Post Shares ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community.post_shares (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id     UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_post_shares_post ON community.post_shares(post_id);

-- ─── Post Saves (Bookmarks) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community.post_saves (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id     UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_saves_user ON community.post_saves(user_id);

-- ─── Poll Votes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community.poll_votes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    option_index    INT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_post ON community.poll_votes(post_id);

-- ─── Post Type Index ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_type ON community.posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_published ON community.posts(is_published);
