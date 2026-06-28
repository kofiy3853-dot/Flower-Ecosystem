-- =============================================================================
-- Enhanced Product Fields Migration
-- =============================================================================

-- Inventory & SKU
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Piece';
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS low_stock_alert INT DEFAULT 10;

-- Flower Details
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS flower_type VARCHAR(100);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS fragrance VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS bloom_season VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS origin VARCHAR(255);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS care_level VARCHAR(50);

-- Delivery
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS delivery_areas TEXT[] DEFAULT '{}';
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(50);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS pickup_available BOOLEAN DEFAULT TRUE;

-- Tags & SEO
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS seo_slug VARCHAR(255);
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Currency & Status
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'GHS';
ALTER TABLE marketplace.products ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published';
