-- =============================================================================
-- Seasonal Planting Calendar — Schema
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/planting-calendar.sql
-- =============================================================================

-- Planting Zones (USDA-style)
CREATE TABLE IF NOT EXISTS learning.planting_zones (
    id              SERIAL PRIMARY KEY,
    zone_name       VARCHAR(100) NOT NULL,
    min_temp        INT,
    max_temp        INT,
    description     TEXT
);

INSERT INTO learning.planting_zones (zone_name, min_temp, max_temp, description) VALUES
    ('Tropical (10-13)', 60, 90, 'Year-round growing season, frost-free'),
    ('Subtropical (8-9)', 40, 80, 'Mild winters, long growing season'),
    ('Temperate (5-7)', 0, 75, 'Four distinct seasons, moderate winters'),
    ('Continental (3-4)', -30, 70, 'Cold winters, warm summers'),
    ('Boreal (1-2)', -50, 60, 'Short growing season, harsh winters')
ON CONFLICT DO NOTHING;

-- Monthly Planting Tasks
CREATE TABLE IF NOT EXISTS learning.planting_tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month           INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    season          VARCHAR(20) NOT NULL,
    task_type       VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    plant_names     TEXT,
    zone_ids        INT[],
    priority        VARCHAR(20) DEFAULT 'normal',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planting_tasks_month ON learning.planting_tasks(month);

-- Seasonal Guides
CREATE TABLE IF NOT EXISTS learning.seasonal_guides (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season          VARCHAR(20) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    cover_image     TEXT,
    tips            JSONB,
    is_published    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed monthly tasks
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM learning.planting_tasks LIMIT 1) THEN
        INSERT INTO learning.planting_tasks (month, season, task_type, title, description, plant_names) VALUES
        -- January
        (1, 'Winter', 'planning', 'Plan Your Spring Garden', 'Start planning your garden layout. Order seeds and bulbs for spring planting. Review last year''s notes.', 'All flowers'),
        (1, 'Winter', 'indoor', 'Start Seeds Indoors', 'Begin starting seeds indoors for annuals that need a head start.', 'Petunias, Marigolds, Zinnias'),
        (1, 'Winter', 'maintenance', 'Prune Dormant Trees', 'Prune dormant fruit trees and ornamental shrubs while they''re bare.', 'Roses, Fruit trees'),

        -- February
        (2, 'Winter', 'indoor', 'Continue Indoor Seeding', 'Start more seeds indoors. Check stored bulbs for sprouting.', 'Geraniums, Begonias, Impatiens'),
        (2, 'Winter', 'planning', 'Test Soil and Amend', 'Test soil pH and nutrient levels. Add compost and amendments as needed.', 'All flowers'),
        (2, 'Winter', 'maintenance', 'Clean and Sharpen Tools', 'Clean, sharpen, and oil garden tools before the busy season.', 'All'),

        -- March
        (3, 'Spring', 'outdoor', 'Plant Cool-Season Annuals', 'Plant cool-season annuals directly outdoors as soil becomes workable.', 'Pansies, Snapdragons, Dianthus'),
        (3, 'Spring', 'outdoor', 'Plant Summer Bulbs Indoors', 'Start gladiolus and dahlia tubers indoors for earlier blooms.', 'Gladiolus, Dahlias'),
        (3, 'Spring', 'maintenance', 'Remove Winter Mulch', 'Gradually remove winter mulch from perennial beds as shoots emerge.', 'All perennials'),

        -- April
        (4, 'Spring', 'outdoor', 'Plant Spring Annuals', 'After last frost, plant spring annuals in prepared beds.', 'Tulips, Daffodils, Hyacinths'),
        (4, 'Spring', 'outdoor', 'Divide Perennials', 'Divide overgrown perennials to rejuvenate and propagate.', 'Hostas, Daylilies, Irises'),
        (4, 'Spring', 'maintenance', 'Apply Pre-Emergent Herbicide', 'Apply pre-emergent to prevent weed seeds from germinating.', 'All beds'),

        -- May
        (5, 'Spring', 'outdoor', 'Plant Warm-Season Annuals', 'Plant warm-season annuals after danger of frost has passed.', 'Petunias, Marigolds, Zinnias, Sunflowers'),
        (5, 'Spring', 'outdoor', 'Stake Tall Perennials', 'Install stakes and supports for tall-growing perennials.', 'Peonies, Delphiniums, Hollyhocks'),
        (5, 'Spring', 'maintenance', 'Mulch Beds', 'Apply 2-3 inches of mulch to retain moisture and suppress weeds.', 'All beds'),

        -- June
        (6, 'Summer', 'outdoor', 'Plant Summer Bloomers', 'Plant heat-loving annuals and perennials for summer color.', 'Lantana, Pentas, Cannas, Salvia'),
        (6, 'Summer', 'maintenance', 'Deadhead Spent Blooms', 'Remove faded flowers to encourage continuous blooming.', 'Roses, Petunias, Marigolds'),
        (6, 'Summer', 'watering', 'Deep Watering Schedule', 'Establish deep watering schedule for summer heat.', 'All flowers'),

        -- July
        (7, 'Summer', 'outdoor', 'Plant Fall-Blooming Plants', 'Plant chrysanthemums and asters for fall color.', 'Mums, Asters, Sedum'),
        (7, 'Summer', 'maintenance', 'Mid-Season Pruning', 'Prune spring-blooming shrubs after they finish flowering.', 'Lilacs, Forsythia, Azaleas'),
        (7, 'Summer', 'watering', 'Monitor for Heat Stress', 'Watch for signs of heat stress and adjust watering as needed.', 'All flowers'),

        -- August
        (8, 'Summer', 'outdoor', 'Sow Fall Annuals', 'Sow seeds for fall-blooming annuals.', 'Asters, Chrysanthemums, Pansies'),
        (8, 'Summer', 'harvesting', 'Collect Seeds', 'Collect seeds from annuals for next year''s garden.', 'Zinnias, Marigolds, Sunflowers'),
        (8, 'Summer', 'maintenance', 'Prepare for Fall', 'Start planning fall garden tasks and ordering spring bulbs.', 'All'),

        -- September
        (9, 'Fall', 'outdoor', 'Plant Spring Bulbs', 'Plant spring-blooming bulbs 6-8 weeks before first frost.', 'Tulips, Daffodils, Crocuses, Alliums'),
        (9, 'Fall', 'outdoor', 'Plant Cool-Season Vegetables', 'Plant cool-season crops for fall harvest.', 'Pansies, Ornamental Kale'),
        (9, 'Fall', 'maintenance', 'Reduce Fertilizing', 'Stop fertilizing perennials to prepare them for winter.', 'All perennials'),

        -- October
        (10, 'Fall', 'outdoor', 'Plant Garlic and Spring Bulbs', 'Continue planting garlic and spring-flowering bulbs.', 'Garlic, Tulips, Daffodils'),
        (10, 'Fall', 'harvesting', 'Lift Tender Bulbs', 'Dig up tender bulbs like dahlias and gladiolus before frost.', 'Dahlias, Gladiolus, Cannas'),
        (10, 'Fall', 'maintenance', 'Clean Up Garden Beds', 'Remove spent annuals and clean up debris from garden beds.', 'All annuals'),

        -- November
        (11, 'Fall', 'maintenance', 'Protect Perennials', 'Apply mulch to protect perennial roots from winter cold.', 'All perennials'),
        (11, 'Fall', 'maintenance', 'Store Tender Bulbs', 'Store lifted bulbs in cool, dry location for winter.', 'Dahlias, Gladiolus'),
        (11, 'Fall', 'indoor', 'Force Bulbs Indoors', 'Start forcing paperwhites and amaryllis for holiday blooms.', 'Paperwhites, Amaryllis'),

        -- December
        (12, 'Winter', 'indoor', 'Force Indoor Blooms', 'Force bulbs indoors for winter color.', 'Paperwhites, Amaryllis, Hyacinths'),
        (12, 'Winter', 'planning', 'Review and Plan', 'Review the past year and plan improvements for next season.', 'All'),
        (12, 'Winter', 'maintenance', 'Protect Container Plants', 'Move container plants to sheltered location or wrap for insulation.', 'Container plants');
    END IF;
END $$;

-- Seed seasonal guides
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM learning.seasonal_guides LIMIT 1) THEN
        INSERT INTO learning.seasonal_guides (season, title, content, tips) VALUES
        ('Spring', 'Spring Planting Guide', 'Spring is the most exciting time in the garden. As temperatures warm and days lengthen, its time to prepare beds, start seeds, and plant new additions.', '["Start seeds indoors 6-8 weeks before last frost","Prepare beds with compost and amendments","Plant cool-season annuals as soon as soil is workable","Divide perennials before active growth begins","Apply pre-emergent herbicide to prevent weeds"]'),
        ('Summer', 'Summer Care Guide', 'Summer brings vibrant blooms but also heat stress. Focus on watering, deadheading, and keeping plants healthy through the warmest months.', '["Water deeply early in the morning","Mulch to retain moisture and cool roots","Deadhead spent blooms to encourage more flowers","Watch for pests and treat early","Provide shade for heat-sensitive plants"]'),
        ('Fall', 'Fall Planting Guide', 'Fall is the perfect time to plant trees, shrubs, and spring-blooming bulbs. Cooler temperatures and fall rains help plants establish root systems.', '["Plant spring bulbs 6-8 weeks before first frost","Lift tender bulbs before ground freezes","Plant cool-season annuals for fall color","Apply mulch to protect perennial roots","Clean up spent annuals and garden debris"]'),
        ('Winter', 'Winter Garden Planning', 'Winter is planning season. Use this time to dream, research, and prepare for the growing ahead.', '["Order seeds and bulbs early for best selection","Review past seasons and note successes and failures","Clean and maintain garden tools","Force bulbs indoors for winter blooms","Plan new garden beds and designs"]');
    END IF;
END $$;
