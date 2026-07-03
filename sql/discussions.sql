-- =============================================================================
-- Discussion Page — PostgreSQL Schema Extension
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/discussions.sql
-- =============================================================================

-- Discussion Categories
CREATE TABLE IF NOT EXISTS community.discussion_categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) UNIQUE,
    icon            VARCHAR(10),
    description     TEXT,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discussion_categories_slug ON community.discussion_categories(slug);

-- Discussions
CREATE TABLE IF NOT EXISTS community.discussions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    category_id     INT REFERENCES community.discussion_categories(id) ON DELETE SET NULL,
    is_pinned       BOOLEAN DEFAULT FALSE,
    is_solved       BOOLEAN DEFAULT FALSE,
    best_answer_id  UUID,
    views           INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discussions_user ON community.discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_category ON community.discussions(category_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created ON community.discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_pinned ON community.discussions(is_pinned DESC, created_at DESC);

-- Discussion Comments / Replies
CREATE TABLE IF NOT EXISTS community.discussion_comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id   UUID NOT NULL REFERENCES community.discussions(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    is_best_answer  BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discussion_comments_discussion ON community.discussion_comments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_comments_user ON community.discussion_comments(user_id);

-- Discussion Images
CREATE TABLE IF NOT EXISTS community.discussion_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id   UUID NOT NULL REFERENCES community.discussions(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discussion_images_discussion ON community.discussion_images(discussion_id);

-- Discussion Votes
CREATE TABLE IF NOT EXISTS community.discussion_votes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id   UUID REFERENCES community.discussions(id) ON DELETE CASCADE,
    comment_id      UUID REFERENCES community.discussion_comments(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type       VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(discussion_id, user_id),
    UNIQUE(comment_id, user_id),
    CHECK (
        (discussion_id IS NOT NULL AND comment_id IS NULL) OR
        (discussion_id IS NULL AND comment_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_discussion_votes_discussion ON community.discussion_votes(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_votes_comment ON community.discussion_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_discussion_votes_user ON community.discussion_votes(user_id);

-- Discussion Views Tracking
CREATE TABLE IF NOT EXISTS community.discussion_views (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id   UUID NOT NULL REFERENCES community.discussions(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address      INET,
    viewed_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discussion_views_discussion ON community.discussion_views(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_views_user ON community.discussion_views(user_id);

-- Seed default categories
INSERT INTO community.discussion_categories (name, slug, icon, sort_order) VALUES
    ('Flower Care', 'flower-care', '🌿', 1),
    ('Flower Identification', 'flower-identification', '🔍', 2),
    ('Floristry', 'floristry', '✂️', 3),
    ('Gardening', 'gardening', '🌱', 4),
    ('Medicinal Flowers', 'medicinal-flowers', '💊', 5),
    ('Indoor Plants', 'indoor-plants', '🪴', 6),
    ('Events', 'events', '🎪', 7),
    ('Marketplace Questions', 'marketplace-questions', '🛒', 8),
    ('Beginner Questions', 'beginner-questions', '❓', 9)
ON CONFLICT (name) DO NOTHING;

-- Auto-update updated_at for discussions
CREATE OR REPLACE FUNCTION community.update_discussion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_discussion_updated
    BEFORE UPDATE ON community.discussions
    FOR EACH ROW
    EXECUTE FUNCTION community.update_discussion_timestamp();

CREATE OR REPLACE TRIGGER trg_discussion_comment_updated
    BEFORE UPDATE ON community.discussion_comments
    FOR EACH ROW
    EXECUTE FUNCTION community.update_discussion_timestamp();

-- Post Views (deduplication for view counting)
CREATE TABLE IF NOT EXISTS community.post_views (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id     UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    viewer_id   VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_post_views_post ON community.post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_lookup ON community.post_views(post_id, viewer_id, created_at);
