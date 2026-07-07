-- Enhanced Care Guides tables

CREATE TABLE IF NOT EXISTS learning.care_guides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flower_id UUID REFERENCES learning.flowers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    difficulty VARCHAR(50) DEFAULT 'Beginner',
    indoor_outdoor VARCHAR(50),
    reading_time INT DEFAULT 5,
    cover_image TEXT,
    water_frequency VARCHAR(100),
    sunlight VARCHAR(100),
    temperature VARCHAR(100),
    soil_type VARCHAR(255),
    fertilizer VARCHAR(255),
    humidity VARCHAR(100),
    content JSONB,
    care_schedule JSONB,
    is_featured BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',
    views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_care_guides_flower ON learning.care_guides(flower_id);
CREATE INDEX IF NOT EXISTS idx_care_guides_slug ON learning.care_guides(slug);
CREATE INDEX IF NOT EXISTS idx_care_guides_featured ON learning.care_guides(is_featured) WHERE is_featured = true;

-- Care Guide Problems
CREATE TABLE IF NOT EXISTS learning.care_problems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    care_guide_id UUID REFERENCES learning.care_guides(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    symptoms TEXT,
    causes TEXT,
    treatment TEXT,
    prevention TEXT,
    severity VARCHAR(50) DEFAULT 'Medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_care_problems_guide ON learning.care_problems(care_guide_id);

-- Care Guide Seasonal Tips
CREATE TABLE IF NOT EXISTS learning.care_seasonal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    care_guide_id UUID REFERENCES learning.care_guides(id) ON DELETE CASCADE,
    season VARCHAR(50) NOT NULL,
    tips TEXT,
    tasks TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_care_seasonal_guide ON learning.care_seasonal(care_guide_id);

-- Seed sample care guides
INSERT INTO learning.care_guides (flower_id, title, slug, description, difficulty, indoor_outdoor, reading_time, water_frequency, sunlight, temperature, soil_type, fertilizer, is_featured)
SELECT f.id,
    f.common_name || ' Care Guide',
    f.slug || '-care',
    'Complete care guide for ' || f.common_name || '. Learn how to keep your ' || f.common_name || ' healthy and blooming.',
    f.care_level,
    f.indoor_outdoor,
    10,
    f.water_requirements,
    f.sunlight,
    '18-26°C',
    'Well-draining potting mix',
    'Balanced liquid fertilizer every 4 weeks',
    TRUE
FROM learning.flowers f
WHERE f.status = 'active'
ON CONFLICT (slug) DO NOTHING;

-- Seed problems for roses
INSERT INTO learning.care_problems (care_guide_id, name, symptoms, causes, treatment, prevention, severity)
SELECT cg.id, p.name, p.symptoms, p.causes, p.treatment, p.prevention, p.severity
FROM learning.care_guides cg
CROSS JOIN (VALUES
    ('Yellow Leaves', 'Leaves turning yellow from bottom up', 'Overwatering, nutrient deficiency, poor drainage', 'Check soil moisture, adjust watering, add fertilizer', 'Water only when top inch of soil is dry', 'Medium'),
    ('Black Spots', 'Dark spots on leaves with yellow halos', 'Fungal infection (Diplocarpon rosae)', 'Remove affected leaves, apply fungicide', 'Water at base, ensure good air circulation', 'High'),
    ('Aphids', 'Small green/black insects on new growth', 'Aphid infestation', 'Spray with neem oil or soapy water', 'Regular inspection, companion planting', 'Low'),
    ('Powdery Mildew', 'White powdery coating on leaves', 'Fungal infection in humid conditions', 'Apply fungicide, improve air circulation', 'Avoid overhead watering, space plants properly', 'Medium')
) AS p(name, symptoms, causes, treatment, prevention, severity)
WHERE cg.slug = 'rose-care'
ON CONFLICT DO NOTHING;
