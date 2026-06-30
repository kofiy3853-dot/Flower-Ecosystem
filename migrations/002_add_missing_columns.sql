-- Migration 002: Add missing tables and columns to existing databases

-- Password reset tokens
CREATE TABLE IF NOT EXISTS auth.password_resets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) NOT NULL,
    token       TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON auth.password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON auth.password_resets(email);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS auth.email_verifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verify_token ON auth.email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON auth.email_verifications(user_id);

-- Add missing user columns
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS business_type VARCHAR(100);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS business_phone VARCHAR(30);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS business_email VARCHAR(255);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS social_instagram VARCHAR(500);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS social_facebook VARCHAR(500);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS social_twitter VARCHAR(500);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Add missing product columns
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'GHS';
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Piece';
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS size VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS fragrance VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS care_level VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS sunlight VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS water_frequency VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS bloom_season VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}';
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS origin VARCHAR(255);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS low_stock_alert INT DEFAULT 10;
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS delivery_areas TEXT[] DEFAULT '{}';
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(100);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS pickup_available BOOLEAN DEFAULT TRUE;
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS seo_slug VARCHAR(255);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published';
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1) DEFAULT 0;
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS flower_type VARCHAR(50);

-- Event speakers table
CREATE TABLE IF NOT EXISTS events.event_speakers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    title           VARCHAR(255),
    bio             TEXT,
    photo_url       TEXT,
    experience_years INT,
    students_count  INT DEFAULT 0,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_speakers_event ON events.event_speakers(event_id);

-- Articles table
CREATE TABLE IF NOT EXISTS learning.articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    content TEXT,
    excerpt TEXT,
    image_url TEXT,
    category VARCHAR(100),
    author VARCHAR(255),
    read_time VARCHAR(50),
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token blacklist
CREATE TABLE IF NOT EXISTS auth.token_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blacklist_hash ON auth.token_blacklist(token_hash);

-- Platform schema for notifications and messages
CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE IF NOT EXISTS platform.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON platform.notifications(user_id);

CREATE TABLE IF NOT EXISTS platform.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_1 UUID NOT NULL REFERENCES auth.users(id),
    participant_2 UUID NOT NULL REFERENCES auth.users(id),
    last_message TEXT,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(participant_1, participant_2)
);

CREATE TABLE IF NOT EXISTS platform.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES platform.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Identification categories table
CREATE TABLE IF NOT EXISTS learning.id_categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) UNIQUE,
    icon            VARCHAR(10),
    description     TEXT,
    sort_order      INT DEFAULT 0
);

INSERT INTO learning.id_categories (name, slug, icon, sort_order) VALUES
    ('Roses', 'roses', '🌹', 1),
    ('Tulips', 'tulips', '🌷', 2),
    ('Orchids', 'orchids', '🌺', 3),
    ('Lilies', 'lilies', '💮', 4),
    ('Preservation', 'preservation', '🏺', 5),
    ('General', 'general', '🔍', 6)
ON CONFLICT (name) DO NOTHING;

-- Seed marketplace categories if empty
INSERT INTO marketplace.categories (name, slug, description) VALUES
    ('Bouquets', 'bouquets', 'Curated arrangements for every moment'),
    ('Roses', 'roses', 'Timeless romance in every petal'),
    ('Orchids', 'orchids', 'Exotic & sophisticated blooms'),
    ('Wildflowers', 'wildflowers', 'Natural & free-spirited'),
    ('Succulents', 'succulents', 'Low maintenance, high beauty'),
    ('Indoor Plants', 'indoor-plants', 'Green your living space')
ON CONFLICT (slug) DO NOTHING;
