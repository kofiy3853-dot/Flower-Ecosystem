-- Migration 008: Clubs & Groups
-- Adds community.clubs, club_members, club_posts tables

CREATE TABLE IF NOT EXISTS community.clubs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),
    icon            VARCHAR(10) DEFAULT '🌿',
    cover_image     TEXT,
    member_count    INTEGER DEFAULT 0,
    post_count      INTEGER DEFAULT 0,
    is_public       BOOLEAN DEFAULT TRUE,
    created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clubs_category ON community.clubs(category);
CREATE INDEX IF NOT EXISTS idx_clubs_created ON community.clubs(created_at DESC);

CREATE TABLE IF NOT EXISTS community.club_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id         UUID NOT NULL REFERENCES community.clubs(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(club_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_club_members_club ON community.club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON community.club_members(user_id);

CREATE TABLE IF NOT EXISTS community.club_posts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id         UUID NOT NULL REFERENCES community.clubs(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    image_url       TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_club_posts_club ON community.club_posts(club_id);
CREATE INDEX IF NOT EXISTS idx_club_posts_created ON community.club_posts(created_at DESC);
