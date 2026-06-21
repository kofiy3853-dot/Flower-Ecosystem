-- =============================================================================
-- Seller Dashboard — Schema
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/seller-dashboard.sql
-- =============================================================================

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
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id       UUID NOT NULL REFERENCES sellers.profiles(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    price           DECIMAL(10,2) NOT NULL,
    category        VARCHAR(100),
    stock_quantity  INT DEFAULT 0,
    image_url       TEXT,
    flower_type     VARCHAR(50),
    color           VARCHAR(50),
    occasion        VARCHAR(100),
    is_active       BOOLEAN DEFAULT TRUE,
    views           INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seller_products_seller ON sellers.products(seller_id);

-- Seller Orders
CREATE TABLE IF NOT EXISTS sellers.orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id       UUID NOT NULL REFERENCES sellers.profiles(id) ON DELETE CASCADE,
    buyer_name      VARCHAR(255),
    buyer_email     VARCHAR(255),
    buyer_id        UUID REFERENCES auth.users(id),
    total_amount    DECIMAL(10,2) NOT NULL,
    status          VARCHAR(50) DEFAULT 'pending',
    shipping_address TEXT,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seller_orders_seller ON sellers.orders(seller_id);

-- Order Items
CREATE TABLE IF NOT EXISTS sellers.order_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES sellers.orders(id) ON DELETE CASCADE,
    product_id      UUID,
    product_name    VARCHAR(255),
    quantity        INT NOT NULL,
    unit_price      DECIMAL(10,2) NOT NULL,
    total_price     DECIMAL(10,2) NOT NULL
);

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

CREATE INDEX IF NOT EXISTS idx_seller_messages_seller ON sellers.sellers(seller_id);

-- Create schema if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'sellers') THEN
        CREATE SCHEMA sellers;
    END IF;
END $$;
