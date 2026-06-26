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

-- Seed grower profile if none exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM growers.profiles LIMIT 1) THEN
        INSERT INTO growers.profiles (user_id, farm_name, description, location, acreage, specialties, rating)
        SELECT id, 'Green Valley Flower Farm', 'Premium flower cultivation specializing in roses, tulips, and exotic varieties.', 'Portland, OR', 25.5, ARRAY['Roses', 'Tulips', 'Orchids'], 4.8
        FROM auth.users WHERE role IN ('SELLER', 'FLORIST') LIMIT 1;
    END IF;
END $$;
