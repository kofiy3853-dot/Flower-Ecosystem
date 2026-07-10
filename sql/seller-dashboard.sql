-- =============================================================================
-- Seller Dashboard — Schema
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/seller-dashboard.sql
-- =============================================================================

-- Create schema if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'sellers') THEN
        CREATE SCHEMA sellers;
    END IF;
END $$;

-- Seller Profiles
CREATE TABLE IF NOT EXISTS sellers.profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_name       VARCHAR(255) NOT NULL,
    description     TEXT,
    logo_url        TEXT,
    location        VARCHAR(255),
    phone           VARCHAR(50),
    specialties     TEXT[],
    rating          DECIMAL(3,2) DEFAULT 0,
    total_sales     INT DEFAULT 0,
    total_revenue   DECIMAL(10,2) DEFAULT 0,
    is_verified     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Seller Products (enhanced marketplace)
CREATE TABLE IF NOT EXISTS sellers.products (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id           UUID NOT NULL REFERENCES sellers.profiles(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    price               DECIMAL(10,2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'GHS',
    unit                VARCHAR(50) DEFAULT 'Piece',
    category            VARCHAR(100),
    stock_quantity      INT DEFAULT 0,
    low_stock_alert     INT DEFAULT 10,
    image_url           TEXT,
    images              TEXT[],
    video_url           TEXT,
    flower_type         VARCHAR(50),
    flower_form         VARCHAR(50),
    foliage_type        VARCHAR(50),
    color               VARCHAR(50),
    occasion            VARCHAR(100),
    height              VARCHAR(50),
    light               VARCHAR(50),
    flowering_time      VARCHAR(50),
    bloom_time          VARCHAR(50),
    bloom_season        VARCHAR(50),
    fragrance           VARCHAR(20),
    lifespan_days       INT DEFAULT 7,
    care_level          VARCHAR(20),
    origin              VARCHAR(100),
    sunlight            VARCHAR(100),
    watering            VARCHAR(100),
    soil_type           VARCHAR(100),
    temperature         VARCHAR(50),
    fertilizer          VARCHAR(100),
    care_tips           TEXT,
    guarantee           VARCHAR(100),
    guarantee_details   TEXT,
    headline            VARCHAR(255),
    sku                 VARCHAR(100),
    delivery_areas      TEXT[],
    delivery_time       VARCHAR(50),
    shipping_fee        DECIMAL(10,2) DEFAULT 0,
    pickup_available    BOOLEAN DEFAULT TRUE,
    tags                TEXT[],
    seo_slug            VARCHAR(255),
    meta_description    TEXT,
    featured            BOOLEAN DEFAULT FALSE,
    best_seller         BOOLEAN DEFAULT FALSE,
    new_arrival         BOOLEAN DEFAULT FALSE,
    is_active           BOOLEAN DEFAULT TRUE,
    status              VARCHAR(20) DEFAULT 'published',
    views               INT DEFAULT 0,
    sales               INT DEFAULT 0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seller_products_seller ON sellers.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_products_status ON sellers.products(status);
CREATE INDEX IF NOT EXISTS idx_seller_products_category ON sellers.products(category);

-- Seller Orders
CREATE TABLE IF NOT EXISTS sellers.orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id       UUID NOT NULL REFERENCES sellers.profiles(id) ON DELETE CASCADE,
    buyer_name      VARCHAR(255),
    buyer_email     VARCHAR(255),
    buyer_phone     VARCHAR(50),
    buyer_id        UUID REFERENCES auth.users(id),
    total_amount    DECIMAL(10,2) NOT NULL,
    seller_total    DECIMAL(10,2),
    currency        VARCHAR(3) DEFAULT 'GHS',
    status          VARCHAR(50) DEFAULT 'pending',
    item_count      INT DEFAULT 0,
    shipping_address TEXT,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seller_orders_seller ON sellers.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_orders_status ON sellers.orders(status);

-- Order Items
CREATE TABLE IF NOT EXISTS sellers.order_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES sellers.orders(id) ON DELETE CASCADE,
    product_id      UUID,
    product_name    VARCHAR(255),
    product_sku     VARCHAR(100),
    quantity        INT NOT NULL,
    unit_price      DECIMAL(10,2) NOT NULL,
    total_price     DECIMAL(10,2) NOT NULL,
    image_url       TEXT
);

CREATE INDEX IF NOT EXISTS idx_seller_order_items_order ON sellers.order_items(order_id);

-- Seller Reviews
CREATE TABLE IF NOT EXISTS sellers.reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id       UUID NOT NULL REFERENCES sellers.profiles(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id),
    reviewer_name   VARCHAR(255),
    rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller ON sellers.reviews(seller_id);

-- Seller Messages
CREATE TABLE IF NOT EXISTS sellers.messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id       UUID NOT NULL REFERENCES sellers.profiles(id) ON DELETE CASCADE,
    sender_id       UUID REFERENCES auth.users(id),
    sender_name     VARCHAR(255),
    subject         VARCHAR(255),
    content         TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seller_messages_seller ON sellers.messages(seller_id);

-- Seller Notifications
CREATE TABLE IF NOT EXISTS sellers.notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id       UUID NOT NULL REFERENCES sellers.profiles(id) ON DELETE CASCADE,
    type            VARCHAR(50),
    title           VARCHAR(255),
    message         TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    reference_id    UUID,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seller_notifications_seller ON sellers.notifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_read ON sellers.notifications(is_read);