-- Migration 009: Awards & Badges

CREATE TABLE IF NOT EXISTS community.badges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,
    icon            VARCHAR(10) DEFAULT '🏆',
    category        VARCHAR(50) DEFAULT 'achievement' CHECK (category IN ('achievement', 'contribution', 'expertise', 'milestone', 'seasonal')),
    level           VARCHAR(20) DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    criteria        TEXT,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community.user_badges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id        UUID NOT NULL REFERENCES community.badges(id) ON DELETE CASCADE,
    awarded_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON community.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON community.user_badges(badge_id);

-- Default badges
INSERT INTO community.badges (name, slug, description, icon, category, level, criteria, sort_order) VALUES
    ('Rising Star', 'rising-star', 'First showcase project uploaded', '⭐', 'milestone', 'bronze', 'Upload your first showcase project', 1),
    ('Garden Guru', 'garden-guru', 'Grew a garden of 10+ plants', '🌿', 'achievement', 'silver', 'Track 10 plants in your garden', 2),
    ('Floral Expert', 'floral-expert', 'Provided high-quality answers in Q&A', '💡', 'expertise', 'gold', 'Get 10 best answer acceptances', 3),
    ('Community Hero', 'community-hero', 'Active participant across the community', '🦸', 'contribution', 'gold', 'Post 50 discussions, questions, or stories', 4),
    ('Green Thumb', 'green-thumb', 'Consistent contributor for 6+ months', '👍', 'milestone', 'silver', 'Active for 6 months', 5),
    ('Top Creator', 'top-creator', 'Featured showcase project', '🎨', 'achievement', 'gold', 'Get a showcase project featured', 6),
    ('Conversation Starter', 'conversation-starter', 'Spark engaging discussions', '💬', 'contribution', 'bronze', 'Create 10 discussions', 7),
    ('Helping Hand', 'helping-hand', 'Answered 20+ community questions', '🤝', 'contribution', 'silver', 'Write 20 answers on Q&A', 8),
    ('Master Florist', 'master-florist', 'Premium creator with exceptional portfolio', '👑', 'expertise', 'platinum', 'Have 10+ showcase projects with 100+ total likes', 9),
    ('Loyal Member', 'loyal-member', '1+ year on the platform', '🎂', 'milestone', 'bronze', 'Registered for 1 year', 10)
ON CONFLICT (name) DO NOTHING;
