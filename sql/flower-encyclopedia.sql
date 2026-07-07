-- Flower Encyclopedia tables

CREATE TABLE IF NOT EXISTS learning.flowers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    common_name VARCHAR(255) NOT NULL,
    scientific_name VARCHAR(255),
    family VARCHAR(255),
    origin TEXT,
    description TEXT,
    care_level VARCHAR(50) DEFAULT 'Easy',
    sunlight VARCHAR(100),
    water_requirements VARCHAR(100),
    soil_type VARCHAR(100),
    bloom_season VARCHAR(100),
    colors TEXT[],
    indoor_outdoor VARCHAR(50) DEFAULT 'Outdoor',
    toxicity VARCHAR(100),
    fragrance VARCHAR(100),
    height VARCHAR(100),
    spread VARCHAR(100),
    hardiness_zone VARCHAR(50),
    slug VARCHAR(255) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flowers_slug ON learning.flowers(slug);
CREATE INDEX IF NOT EXISTS idx_flowers_name ON learning.flowers(common_name);
CREATE INDEX IF NOT EXISTS idx_flowers_status ON learning.flowers(status);

CREATE TABLE IF NOT EXISTS learning.flower_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flower_id UUID NOT NULL REFERENCES learning.flowers(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flower_images_flower ON learning.flower_images(flower_id);

CREATE TABLE IF NOT EXISTS learning.flower_care (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flower_id UUID NOT NULL REFERENCES learning.flowers(id) ON DELETE CASCADE,
    water_frequency VARCHAR(100),
    sunlight_hours VARCHAR(100),
    temperature_range VARCHAR(100),
    soil_ph VARCHAR(50),
    fertilizer VARCHAR(255),
    pruning_time VARCHAR(100),
    propagation_methods TEXT,
    common_problems TEXT,
    tips TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flower_care_flower ON learning.flower_care(flower_id);

CREATE TABLE IF NOT EXISTS learning.flower_diseases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flower_id UUID NOT NULL REFERENCES learning.flowers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    symptoms TEXT,
    treatment TEXT,
    prevention TEXT,
    severity VARCHAR(50) DEFAULT 'Medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flower_diseases_flower ON learning.flower_diseases(flower_id);

CREATE TABLE IF NOT EXISTS learning.flower_seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flower_id UUID NOT NULL REFERENCES learning.flowers(id) ON DELETE CASCADE,
    season VARCHAR(50) NOT NULL,
    activity VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flower_seasons_flower ON learning.flower_seasons(flower_id);

-- Seed some sample flowers
INSERT INTO learning.flowers (common_name, scientific_name, family, origin, description, care_level, sunlight, water_requirements, bloom_season, colors, indoor_outdoor, slug) VALUES
('Rose', 'Rosa', 'Rosaceae', 'Asia', 'Roses are one of the most popular and widely grown flowers in the world. They are known for their beautiful blooms and intoxicating fragrance.', 'Intermediate', 'Full Sun', 'Regular', 'Spring, Summer', ARRAY['Red', 'Pink', 'White', 'Yellow', 'Purple'], 'Outdoor', 'rose'),
('Sunflower', 'Helianthus annuus', 'Asteraceae', 'North America', 'Sunflowers are cheerful, bright flowers that follow the sun across the sky. They are easy to grow and attract pollinators.', 'Easy', 'Full Sun', 'Regular', 'Summer', ARRAY['Yellow', 'Orange', 'Red'], 'Outdoor', 'sunflower'),
('Tulip', 'Tulipa', 'Liliaceae', 'Central Asia', 'Tulips are spring-blooming perennials that grow from bulbs. They come in almost every color of the rainbow.', 'Easy', 'Full Sun', 'Moderate', 'Spring', ARRAY['Red', 'Pink', 'White', 'Yellow', 'Purple'], 'Outdoor', 'tulip'),
('Orchid', 'Orchidaceae', 'Orchidaceae', 'Tropical Regions', 'Orchids are exotic flowers known for their stunning beauty and long-lasting blooms. They are popular houseplants.', 'Advanced', 'Indirect Light', 'Low', 'Varies', ARRAY['White', 'Pink', 'Purple', 'Yellow'], 'Indoor', 'orchid'),
('Lily', 'Lilium', 'Liliaceae', 'Northern Hemisphere', 'Lilies are elegant flowers with large, dramatic blooms. They come in many colors and have a sweet fragrance.', 'Intermediate', 'Full Sun', 'Regular', 'Summer', ARRAY['White', 'Pink', 'Orange', 'Yellow'], 'Outdoor', 'lily'),
('Dahlia', 'Dahlia', 'Asteraceae', 'Mexico', 'Dahlias are stunning flowers with complex, layered petals. They bloom from midsummer through fall.', 'Intermediate', 'Full Sun', 'Regular', 'Summer, Autumn', ARRAY['Red', 'Pink', 'White', 'Yellow', 'Purple'], 'Outdoor', 'dahlia'),
('Chrysanthemum', 'Chrysanthemum', 'Asteraceae', 'Asia', 'Chrysanthemums are fall-blooming flowers that come in a wide variety of colors and shapes.', 'Easy', 'Full Sun', 'Regular', 'Autumn', ARRAY['Yellow', 'White', 'Pink', 'Red', 'Purple'], 'Outdoor', 'chrysanthemum'),
('Peony', 'Paeonia', 'Paeoniaceae', 'Asia', 'Peonies are lush, romantic flowers with large, fragrant blooms. They are long-lived perennials.', 'Intermediate', 'Full Sun', 'Regular', 'Spring', ARRAY['Pink', 'White', 'Red'], 'Outdoor', 'peony'),
('Hydrangea', 'Hydrangea', 'Hydrangeaceae', 'Asia', 'Hydrangeas are known for their large, showy flower clusters that change color based on soil pH.', 'Easy', 'Partial Shade', 'Regular', 'Summer', ARRAY['Blue', 'Pink', 'White', 'Purple'], 'Outdoor', 'hydrangea'),
('Lavender', 'Lavandula', 'Lamiaceae', 'Mediterranean', 'Lavender is prized for its purple flowers and calming fragrance. It is drought-tolerant and attracts pollinators.', 'Easy', 'Full Sun', 'Low', 'Summer', ARRAY['Purple', 'Blue'], 'Outdoor', 'lavender')
ON CONFLICT (slug) DO NOTHING;
