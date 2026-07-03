-- Migration 007: Showcase Feature
-- Extends posts for showcase metadata, adds collections + competitions

ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS showcase_meta JSONB DEFAULT '{}'::jsonb;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS save_count INT DEFAULT 0;
ALTER TABLE community.posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_posts_showcase_featured ON community.posts(is_featured) WHERE post_type = 'showcase' AND is_featured = true;
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON community.posts(view_count DESC);

CREATE TABLE IF NOT EXISTS community.collections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    cover_image     TEXT,
    is_public       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collections_user ON community.collections(user_id);

CREATE TABLE IF NOT EXISTS community.collection_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id   UUID NOT NULL REFERENCES community.collections(id) ON DELETE CASCADE,
    post_id         UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    note            TEXT,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON community.collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_post ON community.collection_items(post_id);

CREATE TABLE IF NOT EXISTS community.competitions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    rules           TEXT,
    prize           TEXT,
    cover_image     TEXT,
    category        VARCHAR(100),
    start_date      TIMESTAMP NOT NULL,
    end_date        TIMESTAMP NOT NULL,
    status          VARCHAR(20) DEFAULT 'upcoming',
    is_featured     BOOLEAN DEFAULT FALSE,
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_competitions_status ON community.competitions(status);
CREATE INDEX IF NOT EXISTS idx_competitions_dates ON community.competitions(start_date, end_date);

CREATE TABLE IF NOT EXISTS community.competition_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id  UUID NOT NULL REFERENCES community.competitions(id) ON DELETE CASCADE,
    post_id         UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rank            INT,
    is_winner       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(competition_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_entries_competition ON community.competition_entries(competition_id);
CREATE INDEX IF NOT EXISTS idx_comp_entries_user ON community.competition_entries(user_id);
