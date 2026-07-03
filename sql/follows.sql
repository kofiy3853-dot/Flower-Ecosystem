-- =============================================================================
-- Follow System — Schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform.follows (
    follower_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON platform.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON platform.follows(following_id);
