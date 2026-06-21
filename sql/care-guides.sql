-- =============================================================================
-- Care Guides — Schema
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/care-guides.sql
-- =============================================================================

-- Care Guide Categories
CREATE TABLE IF NOT EXISTS learning.care_categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) UNIQUE,
    icon            VARCHAR(10),
    description     TEXT,
    sort_order      INT DEFAULT 0
);

INSERT INTO learning.care_categories (name, slug, icon, sort_order) VALUES
    ('Indoor Plants', 'indoor-plants', '🪴', 1),
    ('Outdoor Gardens', 'outdoor-gardens', '🏡', 2),
    ('Cut Flowers', 'cut-flowers', '💐', 3),
    ('Succulents & Cacti', 'succulents-cacti', '🌵', 4),
    ('Tropical Plants', 'tropical-plants', '🌴', 5),
    ('Seasonal Care', 'seasonal-care', '🍂', 6),
    ('Pest & Disease', 'pest-disease', '🐛', 7),
    ('Soil & Fertilizer', 'soil-fertilizer', '🌍', 8)
ON CONFLICT (name) DO NOTHING;

-- Care Guides
CREATE TABLE IF NOT EXISTS learning.care_guides (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE,
    excerpt         TEXT,
    content         TEXT NOT NULL,
    cover_image     TEXT,
    author_name     VARCHAR(255),
    author_title    VARCHAR(255),
    category_id     INT REFERENCES learning.care_categories(id) ON DELETE SET NULL,
    difficulty      VARCHAR(50) DEFAULT 'Beginner',
    reading_time    INT DEFAULT 5,
    plant_name      VARCHAR(255),
    light           VARCHAR(100),
    water           VARCHAR(100),
    temperature     VARCHAR(100),
    humidity        VARCHAR(100),
    soil            VARCHAR(255),
    is_published    BOOLEAN DEFAULT TRUE,
    views           INTEGER DEFAULT 0,
    tips            JSONB,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_care_guides_slug ON learning.care_guides(slug);
CREATE INDEX IF NOT EXISTS idx_care_guides_category ON learning.care_categories(id);
CREATE INDEX IF NOT EXISTS idx_care_guides_plant ON learning.care_guides(plant_name);

-- Care Guide Tips (quick tips)
CREATE TABLE IF NOT EXISTS learning.care_tips (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guide_id        UUID NOT NULL REFERENCES learning.care_guides(id) ON DELETE CASCADE,
    tip_text        TEXT NOT NULL,
    tip_type        VARCHAR(50) DEFAULT 'general',
    sort_order      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_care_tips_guide ON learning.care_tips(guide_id);

-- Seed sample guides if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM learning.care_guides LIMIT 1) THEN
        INSERT INTO learning.care_guides (title, slug, excerpt, content, cover_image, author_name, author_title, category_id, difficulty, reading_time, plant_name, light, water, temperature, humidity, soil, tips) VALUES
        ('Complete Rose Care Guide', 'rose-care-guide',
         'Everything you need to know about growing, pruning, and maintaining healthy roses in your garden or home.',
         '## Choosing the Right Roses

Select roses suited to your climate zone. Hybrid teas offer elegant blooms, floribundas provide clusters of color, and climbing roses cover trellises beautifully. Consider disease resistance ratings when choosing varieties.

## Planting

Plant roses in spring after the last frost. Choose a location with 6+ hours of direct sunlight daily. Dig a hole 18 inches wide and 18 inches deep. Mix compost into the soil. Plant with the graft union 1 inch below soil level in cold climates, or at soil level in warm areas.

## Watering

Water deeply 2-3 times per week, providing about 1-2 inches of water total. Water at the base of the plant, not overhead, to prevent fungal diseases. Morning watering is ideal as it allows foliage to dry before evening.

## Fertilizing

Feed roses every 4-6 weeks during the growing season with a balanced rose fertilizer. Stop fertilizing 6-8 weeks before the first expected frost to allow the plant to harden off for winter.

## Pruning

Prune in late winter or early spring before new growth begins. Remove dead, damaged, or crossing branches. Cut at a 45-degree angle above an outward-facing bud. Shape the plant into an open vase form for good air circulation.

## Pest & Disease Management

Common issues include aphids, Japanese beetles, black spot, and powdery mildew. Inspect plants regularly. Remove affected leaves promptly. Use neem oil or insecticidal soap for organic pest control.',
         'https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=800&auto=format&fit=crop',
         'Sarah Chen', 'Master Florist',
         (SELECT id FROM learning.care_categories WHERE slug = 'outdoor-gardens'), 'Beginner', 10, 'Rose',
         'Full Sun (6+ hours)', 'Deep water 2-3x/week', '60-75°F', '40-60%', 'Rich, well-drained, pH 6.0-6.5',
         '[{"text":"Water at the base, not overhead","type":"tip"},{"text":"Prune in late winter before new growth","type":"tip"},{"text":"Remove spent blooms to encourage more flowers","type":"tip"},{"text":"Use mulch to retain moisture and suppress weeds","type":"tip"},{"text":"Watch for black spot in humid conditions","type":"warning"}]'),

        ('Orchid Care for Beginners', 'orchid-care-beginners',
         'Orchids have a reputation for being difficult, but with these simple tips you will have them blooming all year.',
         '## Understanding Orchids

The most common indoor orchid is the Phalaenopsis (Moth Orchid). They are actually one of the easiest houseplants to care for once you understand their needs.

## Light Requirements

Orchids need bright, indirect light. An east-facing window is ideal. Avoid direct afternoon sun which can burn the leaves. If leaves are dark green, they need more light. If leaves are yellowish, they are getting too much light.

## Watering

Water once a week by soaking the roots in room-temperature water for 10-15 minutes. Allow all water to drain completely. Never let orchids sit in standing water. In winter, reduce watering to every 10-14 days.

## Humidity & Temperature

Orchids prefer 50-70% humidity. Place the pot on a tray of pebbles with water below the pot line. Keep temperatures between 65-80°F during the day and 55-65°F at night.

## Feeding

Use a balanced orchid fertilizer (20-20-20) diluted to half strength every 2 weeks during active growth. Reduce to monthly in fall and stop in winter.

## Repotting

Repot every 1-2 years or when the potting medium breaks down. Use orchid bark mix, not regular potting soil. Choose a pot only slightly larger than the root ball.',
         'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?q=80&w=800&auto=format&fit=crop',
         'Amara Singh', 'Plant Specialist',
         (SELECT id FROM learning.care_categories WHERE slug = 'indoor-plants'), 'Beginner', 8, 'Orchid',
         'Bright, indirect light', 'Weekly soak, drain completely', '65-80°F', '50-70%', 'Orchid bark mix',
         '[{"text":"Never let orchids sit in standing water","type":"warning"},{"text":"East-facing window provides ideal light","type":"tip"},{"text":"Leaves should be bright green, not dark green","type":"tip"},{"text":"Mist leaves in dry environments","type":"tip"},{"text":"Yellow leaves usually mean too much sun","type":"warning"}]'),

        ('Succulent Care Guide', 'succulent-care-guide',
         'Why succulents are perfect for busy people who love plants but can not always keep up with watering.',
         '## Choosing Succulents

Popular beginner succulents include Echeveria, Sedum, Haworthia, and Aloe. Choose plants with firm, plump leaves and no signs of mushiness or discoloration.

## Light

Succulents need at least 6 hours of direct sunlight daily. A south-facing window is ideal. Rotate the pot weekly for even growth. If succulents start stretching (etiolation), they need more light.

## Watering

The golden rule: soak and dry. Water thoroughly until water drains from the bottom, then wait until the soil is completely dry before watering again. In summer, this might be every 1-2 weeks. In winter, once a month or less.

## Soil & Drainage

Use a well-draining cactus or succulent mix. You can make your own: 50% potting soil, 25% perlite, 25% coarse sand. Always use pots with drainage holes.

## Temperature

Most succulents prefer 60-80°F. They can tolerate cooler temperatures at night but are not frost-tolerant. Bring outdoor succulents inside before the first frost.

## Common Mistakes

- Overwatering is the #1 killer of succulents
- Using pots without drainage holes
- Placing in too little light
- Using regular potting soil that retains too much moisture',
         'https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=800&auto=format&fit=crop',
         'Priya Nair', 'Desert Plant Expert',
         (SELECT id FROM learning.care_categories WHERE slug = 'succulents-cacti'), 'Beginner', 6, 'Succulent',
         'Full Sun (6+ hours)', 'Soak and dry method', '60-80°F', 'Low (30-40%)', 'Cactus/succulent mix',
         '[{"text":"Overwatering kills more succulents than underwatering","type":"warning"},{"text":"Always use pots with drainage holes","type":"tip"},{"text":"Let soil dry completely between waterings","type":"tip"},{"text":"Give them at least 6 hours of direct sun","type":"tip"},{"text":"Bring indoors before first frost","type":"warning"}]'),

        ('Tropical Plant Care Guide', 'tropical-plant-care-guide',
         'Learn how to care for tropical houseplants like Monstera, Philodendron, and Peace Lily in your home.',
         '## Understanding Tropical Plants

Tropical plants come from warm, humid rainforest environments. Replicating these conditions indoors is the key to keeping them healthy and thriving.

## Light Requirements

Most tropical plants prefer bright, indirect light. Avoid direct sunlight which can scorch their leaves. Place them near a north or east-facing window, or a few feet back from a south or west-facing window.

## Watering

Water when the top inch of soil feels dry. Most tropical plants prefer to be consistently moist but not soggy. Use room-temperature water and allow excess to drain. Reduce watering in winter when growth slows.

## Humidity

Tropical plants thrive in 50-70% humidity. Increase humidity by:
- Placing pots on a tray of pebbles with water
- Grouping plants together
- Using a humidifier nearby
- Misting leaves regularly

## Temperature

Keep tropical plants in temperatures between 65-80°F. Avoid cold drafts from windows, doors, or air conditioning vents. Most tropical plants cannot tolerate temperatures below 55°F.

## Fertilizing

Feed monthly during spring and summer with a balanced liquid fertilizer diluted to half strength. Reduce to every 6-8 weeks in fall and stop in winter.

## Common Tropical Plants

- Monstera deliciosa: Large, fenestrated leaves
- Philodendron: Heart-shaped leaves, easy care
- Peace Lily: Low light tolerant, white flowers
- Pothos: Trailing vine, very forgiving
- Fiddle Leaf Fig: Statement plant, needs consistent care',
         'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?q=80&w=800&auto=format&fit=crop',
         'James Ofori', 'Tropical Plant Specialist',
         (SELECT id FROM learning.care_categories WHERE slug = 'tropical-plants'), 'Beginner', 9, 'Tropical Plant',
         'Bright, indirect light', 'When top inch is dry', '65-80°F', '50-70%', 'Rich, well-draining potting mix',
         '[{"text":"Most tropical plants prefer indirect light","type":"tip"},{"text":"Group plants together to increase humidity","type":"tip"},{"text":"Avoid cold drafts from windows and vents","type":"warning"},{"text":"Clean leaves monthly to help them breathe","type":"tip"},{"text":"Reduce watering in winter when growth slows","type":"tip"}]');
    END IF;
END $$;
