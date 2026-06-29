-- Migration 002: Add missing columns to existing tables
-- Run this on existing databases to add columns that were added to schema.sql after initial deployment

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
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'GHS';
