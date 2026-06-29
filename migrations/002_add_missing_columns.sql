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

-- Add missing product columns
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'GHS';
