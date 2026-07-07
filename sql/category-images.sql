-- Category Images table
CREATE TABLE IF NOT EXISTS marketplace.category_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id     INT NOT NULL REFERENCES marketplace.categories(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    storage_path    TEXT NOT NULL,
    alt_text        VARCHAR(255),
    caption         TEXT,
    photographer    VARCHAR(255),
    is_featured     BOOLEAN DEFAULT FALSE,
    display_order   INT DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_category_images_category ON marketplace.category_images(category_id);
CREATE INDEX IF NOT EXISTS idx_category_images_featured ON marketplace.category_images(category_id, is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_category_images_status ON marketplace.category_images(status);
