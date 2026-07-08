-- =============================================================================
-- Grower Dashboard — Schema
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/grower-dashboard.sql
-- =============================================================================

-- Create schema if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'growers') THEN
        CREATE SCHEMA growers;
    END IF;
END $$;

-- Grower Profiles
CREATE TABLE IF NOT EXISTS growers.profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_name       VARCHAR(255) NOT NULL,
    description     TEXT,
    logo_url        TEXT,
    location        VARCHAR(255),
    acreage         DECIMAL(10,2),
    established_year INT,
    specialties     TEXT[],
    rating          DECIMAL(3,2) DEFAULT 0,
    total_sales     INT DEFAULT 0,
    is_verified     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Flower Crops
CREATE TABLE IF NOT EXISTS growers.crops (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grower_id       UUID NOT NULL REFERENCES growers.profiles(id) ON DELETE CASCADE,
    flower_name     VARCHAR(255) NOT NULL,
    variety         VARCHAR(255),
    quantity         INT NOT NULL DEFAULT 0,
    growth_stage    VARCHAR(50) DEFAULT 'Seed',
    status          VARCHAR(50) DEFAULT 'Healthy',
    field_location  VARCHAR(255),
    planting_date   DATE,
    expected_harvest DATE,
    price_per_unit  DECIMAL(10,2),
    quality_grade   VARCHAR(20),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crops_grower ON growers.crops(grower_id);

-- Crop Health Records
CREATE TABLE IF NOT EXISTS growers.crop_health (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id         UUID NOT NULL REFERENCES growers.crops(id) ON DELETE CASCADE,
    health_score    INT CHECK (health_score BETWEEN 0 AND 100),
    issue           VARCHAR(500),
    issue_type      VARCHAR(100),
    treatment       TEXT,
    reported_date   DATE DEFAULT CURRENT_DATE,
    resolved        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crop_health_crop ON growers.crop_health(crop_id);

-- Harvests
CREATE TABLE IF NOT EXISTS growers.harvests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id         UUID NOT NULL REFERENCES growers.crops(id) ON DELETE CASCADE,
    grower_id       UUID NOT NULL REFERENCES growers.profiles(id) ON DELETE CASCADE,
    harvest_date    DATE NOT NULL,
    quantity        INT NOT NULL,
    quality_grade   VARCHAR(20),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_harvests_grower ON growers.harvests(grower_id);
CREATE INDEX IF NOT EXISTS idx_harvests_date ON growers.harvests(harvest_date DESC);

-- Bulk Orders
CREATE TABLE IF NOT EXISTS growers.bulk_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grower_id       UUID NOT NULL REFERENCES growers.profiles(id) ON DELETE CASCADE,
    buyer_id        UUID REFERENCES auth.users(id),
    buyer_name      VARCHAR(255),
    buyer_type      VARCHAR(50),
    flower_name     VARCHAR(255) NOT NULL,
    quantity        INT NOT NULL,
    unit_price      DECIMAL(10,2),
    total_price     DECIMAL(10,2),
    status          VARCHAR(50) DEFAULT 'pending',
    delivery_date   DATE,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bulk_orders_grower ON growers.bulk_orders(grower_id);

-- Grower Listings (marketplace)
CREATE TABLE IF NOT EXISTS growers.listings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grower_id       UUID NOT NULL REFERENCES growers.profiles(id) ON DELETE CASCADE,
    flower_name     VARCHAR(255) NOT NULL,
    variety         VARCHAR(255),
    description     TEXT,
    price_per_unit  DECIMAL(10,2) NOT NULL,
    unit_type       VARCHAR(50) DEFAULT 'stem',
    min_quantity    INT DEFAULT 100,
    available_qty   INT NOT NULL,
    quality_grade   VARCHAR(20),
    harvest_date    DATE,
    image_url       TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_listings_grower ON growers.listings(grower_id);

-- =============================================================================
-- Flower Farm — Services, Reviews, Gallery, Events
-- =============================================================================

-- Farm Services
CREATE TABLE IF NOT EXISTS growers.farm_services (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grower_id       UUID NOT NULL REFERENCES growers.profiles(id) ON DELETE CASCADE,
    service_name    VARCHAR(255) NOT NULL,
    description     TEXT,
    price_range     VARCHAR(100),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farm_services_grower ON growers.farm_services(grower_id);

-- Farm Reviews
CREATE TABLE IF NOT EXISTS growers.farm_reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grower_id       UUID NOT NULL REFERENCES growers.profiles(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title           VARCHAR(255),
    comment         TEXT,
    photos          TEXT[],
    visit_type      VARCHAR(50),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(grower_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_farm_reviews_grower ON growers.farm_reviews(grower_id);

-- Farm Gallery
CREATE TABLE IF NOT EXISTS growers.farm_gallery (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grower_id       UUID NOT NULL REFERENCES growers.profiles(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    caption         VARCHAR(255),
    category        VARCHAR(50) DEFAULT 'general',
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farm_gallery_grower ON growers.farm_gallery(grower_id);

-- Farm Events
CREATE TABLE IF NOT EXISTS growers.farm_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grower_id       UUID NOT NULL REFERENCES growers.profiles(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    event_type      VARCHAR(50) DEFAULT 'tour',
    event_date      TIMESTAMP NOT NULL,
    end_date        TIMESTAMP,
    location        VARCHAR(255),
    capacity        INT,
    registered      INT DEFAULT 0,
    price           DECIMAL(10,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farm_events_grower ON growers.farm_events(grower_id);
CREATE INDEX IF NOT EXISTS idx_farm_events_date ON growers.farm_events(event_date DESC);

-- Farm Followers
CREATE TABLE IF NOT EXISTS growers.farm_followers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grower_id       UUID NOT NULL REFERENCES growers.profiles(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(grower_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_farm_followers_grower ON growers.farm_followers(grower_id);

-- Add columns to growers.profiles for farm features
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS email_contact VARCHAR(255);
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS organic_certified BOOLEAN DEFAULT FALSE;
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS farm_tours BOOLEAN DEFAULT FALSE;
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS workshops BOOLEAN DEFAULT FALSE;
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN DEFAULT FALSE;
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS pickup_available BOOLEAN DEFAULT TRUE;
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS wholesale_available BOOLEAN DEFAULT FALSE;
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS social_instagram VARCHAR(500);
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS social_facebook VARCHAR(500);
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS business_hours JSONB;
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS certifications TEXT[];
ALTER TABLE growers.profiles ADD COLUMN IF NOT EXISTS follower_count INT DEFAULT 0;

-- Seed farm services if none exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM growers.farm_services LIMIT 1) THEN
        INSERT INTO growers.farm_services (grower_id, service_name, description, price_range)
        SELECT id, 'Wholesale Supply', 'Bulk flower supply for events and businesses', 'Contact for pricing'
        FROM growers.profiles LIMIT 1;
        INSERT INTO growers.farm_services (grower_id, service_name, description, price_range)
        SELECT id, 'Farm Tours', 'Guided tours of our flower fields and greenhouses', '$15-25 per person'
        FROM growers.profiles LIMIT 1;
        INSERT INTO growers.farm_services (grower_id, service_name, description, price_range)
        SELECT id, 'Workshops', 'Learn flower arrangement and gardening basics', '$30-50 per session'
        FROM growers.profiles LIMIT 1;
    END IF;
END $$;

-- Seed grower profile if none exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM growers.profiles LIMIT 1) THEN
        INSERT INTO growers.profiles (user_id, farm_name, description, location, acreage, specialties, rating)
        SELECT id, 'Green Valley Flower Farm', 'Premium flower cultivation specializing in roses, tulips, and exotic varieties.', 'Portland, OR', 25.5, ARRAY['Roses', 'Tulips', 'Orchids'], 4.8
        FROM auth.users WHERE role IN ('SELLER', 'FLORIST') LIMIT 1;
    END IF;
END $$;
