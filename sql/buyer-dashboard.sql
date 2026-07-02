-- =============================================================================
-- Buyer Dashboard — Schema
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/buyer-dashboard.sql
-- =============================================================================

-- Create schema if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'buyers') THEN
        CREATE SCHEMA buyers;
    END IF;
END $$;

-- Buyer Profiles
CREATE TABLE IF NOT EXISTS buyers.profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name   VARCHAR(255),
    business_type   VARCHAR(100),
    description     TEXT,
    location        VARCHAR(255),
    phone           VARCHAR(50),
    preferred_flowers TEXT[],
    budget_range    VARCHAR(100),
    delivery_address TEXT,
    is_verified     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Buyer Purchase History
CREATE TABLE IF NOT EXISTS buyers.purchase_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_name     VARCHAR(255),
    flower_name     VARCHAR(255),
    quantity        INT,
    unit_price      DECIMAL(10,2),
    total_price     DECIMAL(10,2),
    purchase_date   DATE DEFAULT CURRENT_DATE,
    status          VARCHAR(50) DEFAULT 'completed',
    rating          INT,
    review          TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_history_user ON buyers.purchase_history(user_id);

-- Buyer Saved Sellers
CREATE TABLE IF NOT EXISTS buyers.saved_sellers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id       UUID,
    seller_name     VARCHAR(255),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, seller_id)
);

-- Buyer Watchlist (flowers they want to buy)
CREATE TABLE IF NOT EXISTS buyers.watchlist (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    flower_name     VARCHAR(255) NOT NULL,
    target_price    DECIMAL(10,2),
    max_quantity    INT,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON buyers.watchlist(user_id);

-- Buyer Delivery Schedule
CREATE TABLE IF NOT EXISTS buyers.delivery_schedule (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id        UUID,
    flower_name     VARCHAR(255),
    quantity        INT,
    delivery_date   DATE NOT NULL,
    address         TEXT,
    status          VARCHAR(50) DEFAULT 'scheduled',
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Favorites / Wishlist
CREATE TABLE IF NOT EXISTS buyers.favorites (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON buyers.favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_delivery_schedule_user ON buyers.delivery_schedule(user_id);
