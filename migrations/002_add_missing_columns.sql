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
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS size VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS fragrance VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS care_level VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS sunlight VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS water_frequency VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS bloom_season VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}';
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS origin VARCHAR(255);

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
