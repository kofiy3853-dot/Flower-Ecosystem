-- Missing community tables for feed functionality

-- Post saves (bookmarks)
CREATE TABLE IF NOT EXISTS community.post_saves (
    id          SERIAL PRIMARY KEY,
    post_id     UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_saves_post ON community.post_saves(post_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_user ON community.post_saves(user_id);

-- Post reactions (love, beautiful, great-work, helpful, congrats)
CREATE TABLE IF NOT EXISTS community.post_reactions (
    id              SERIAL PRIMARY KEY,
    post_id         UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type   VARCHAR(50) NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON community.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user ON community.post_reactions(user_id);

-- Post shares
CREATE TABLE IF NOT EXISTS community.post_shares (
    id          SERIAL PRIMARY KEY,
    post_id     UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_post_shares_post ON community.post_shares(post_id);

-- Poll votes
CREATE TABLE IF NOT EXISTS community.poll_votes (
    id              SERIAL PRIMARY KEY,
    post_id         UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    option_index    INT NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_post ON community.poll_votes(post_id);
