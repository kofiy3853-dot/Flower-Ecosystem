-- =============================================================================
-- Success Stories — Schema Extension
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/success-stories.sql
-- =============================================================================

-- Success Stories
CREATE TABLE IF NOT EXISTS community.success_stories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    author_name     VARCHAR(255),
    author_role     VARCHAR(255),
    author_avatar   TEXT,
    cover_image     TEXT,
    category        VARCHAR(100),
    is_featured     BOOLEAN DEFAULT FALSE,
    is_published    BOOLEAN DEFAULT TRUE,
    views           INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_success_stories_user ON community.success_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_success_stories_category ON community.success_stories(category);
CREATE INDEX IF NOT EXISTS idx_success_stories_featured ON community.success_stories(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_success_stories_created ON community.success_stories(created_at DESC);

-- Story Images (gallery within a story)
CREATE TABLE IF NOT EXISTS community.story_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id        UUID NOT NULL REFERENCES community.success_stories(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    caption         VARCHAR(255),
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_story_images_story ON community.story_images(story_id);

-- Story Likes
CREATE TABLE IF NOT EXISTS community.story_likes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id        UUID NOT NULL REFERENCES community.success_stories(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_likes_story ON community.story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_user ON community.story_likes(user_id);

-- Story Comments
CREATE TABLE IF NOT EXISTS community.story_comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id        UUID NOT NULL REFERENCES community.success_stories(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_story_comments_story ON community.story_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_user ON community.story_comments(user_id);

-- Story Bookmarks
CREATE TABLE IF NOT EXISTS community.story_bookmarks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id        UUID NOT NULL REFERENCES community.success_stories(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_bookmarks_story ON community.story_bookmarks(story_id);

-- Seed sample stories if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM community.success_stories LIMIT 1) THEN
        INSERT INTO community.success_stories (user_id, title, content, author_name, author_role, author_avatar, cover_image, category, is_featured) VALUES
        ((SELECT id FROM auth.users LIMIT 1),
         'From Hobby to Full-Time Florist',
         'I started selling arrangements at a local farmers market just as a side hustle. Every weekend I would wake up at 4 AM to prepare fresh blooms. The community here gave me the confidence to take the leap.

Within two years, I opened my own shop in downtown Portland and now employ three part-time assistants. The turning point was when I learned about color theory from the workshops here — it completely transformed my arrangements.

Key lessons I learned:
• Start small and build your portfolio
• Take every workshop you can
• Network with other florists
• Don''t be afraid to charge what you''re worth
• Always keep learning new techniques

If you''re thinking about going pro, just do it. The flower community is incredibly supportive.',
         'Sarah Chen', 'Florist, Portland', '🌹',
         'https://images.unsplash.com/photo-1567691482090-4cc36f5721f6?q=80&w=800&auto=format&fit=crop',
         'Floristry Business', true),

        ((SELECT id FROM auth.users LIMIT 1),
         'Won Best Garden Design at City Show',
         'I applied the companion planting techniques I learned from this community and won first place at the Austin Garden Show! The judges were impressed by how I combined native wildflowers with traditional garden plants.

The secret was understanding soil pH requirements and bloom timing. I planned my garden so something was always flowering from March through November.

My setup:
• 15 native wildflower species
• 8 companion vegetables
• Drip irrigation system
• Compost corner for sustainability

Thank you to everyone who shared their tips over the past year. This community made it possible!',
         'Emma Laurent', 'Garden Designer, Austin', '🌼',
         'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=800&auto=format&fit=crop',
         'Gardening', true),

        ((SELECT id FROM auth.users LIMIT 1),
         'Grew 500 Tulips for Charity Event',
         'I organized a neighborhood tulip-growing project and donated all 500 blooms to local nursing homes. The planning advice from this community was invaluable.

We started with 200 bulbs in October and ended up with over 500 by spring. The nurses told us the residents hadn''t received fresh flowers in months. Seeing their faces light up was the best reward.

What worked:
• Group planting sessions with neighbors
• Weekly progress photos for accountability
• Sharing bulb costs among 12 families
• Using the community''s planting calendar

Next year we''re aiming for 1,000 bulbs!',
         'Iris Nakamura', 'Volunteer Grower, Seattle', '🌸',
         'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=800&auto=format&fit=crop',
         'Community', true);
    END IF;
END $$;
