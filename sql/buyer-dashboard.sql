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
    order_id        UUID,
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

-- Favorites / Saved Items (unified)
CREATE TABLE IF NOT EXISTS buyers.saved_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL,
    product_type    VARCHAR(20) DEFAULT 'product', -- 'product', 'service', 'event', 'course'
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_items_user ON buyers.saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_product ON buyers.saved_items(product_id);

-- Buyer Delivery Schedule
CREATE TABLE IF NOT EXISTS buyers.delivery_schedule (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id        UUID,
    product_name    VARCHAR(255),
    quantity        INT,
    delivery_date   DATE NOT NULL,
    address         TEXT,
    status          VARCHAR(50) DEFAULT 'scheduled',
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delivery_schedule_user ON buyers.delivery_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_schedule_date ON buyers.delivery_schedule(delivery_date);

-- Buyer Activity Log
CREATE TABLE IF NOT EXISTS buyers.activity_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type   VARCHAR(50) NOT NULL, -- 'order_placed', 'item_saved', 'review_submitted', 'course_enrolled', 'event_registered'
    title           VARCHAR(255),
    description     TEXT,
    reference_id    UUID,
    metadata        JSONB,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON buyers.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON buyers.activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON buyers.activity_log(created_at);

-- Buyer Notifications
CREATE TABLE IF NOT EXISTS buyers.notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type            VARCHAR(50), -- 'order', 'message', 'system', 'review', 'payment', 'course', 'event'
    title           VARCHAR(255),
    message         TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    reference_id    UUID,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_buyer_notifications_user ON buyers.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_notifications_read ON buyers.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_buyer_notifications_type ON buyers.notifications(type);

-- Enrollments (Learning)
CREATE TABLE IF NOT EXISTS buyers.enrollments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL,
    course_name     VARCHAR(255),
    instructor_name VARCHAR(255),
    progress        INT DEFAULT 0, -- percentage 0-100
    completed       BOOLEAN DEFAULT FALSE,
    completed_at    TIMESTAMP,
    certificate     BOOLEAN DEFAULT FALSE,
    certificate_id  UUID,
    enrolled_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON buyers.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON buyers.enrollments(course_id);

-- Certificates
CREATE TABLE IF NOT EXISTS buyers.certificates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id       UUID,
    course_name     VARCHAR(255),
    certificate_url TEXT,
    issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified        BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON buyers.certificates(user_id);

-- Event Registrations
CREATE TABLE IF NOT EXISTS buyers.event_registrations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id        UUID NOT NULL,
    event_title     VARCHAR(255),
    event_date      TIMESTAMP,
    status          VARCHAR(20) DEFAULT 'registered', -- 'registered', 'attended', 'cancelled', 'waitlisted'
    ticket_type     VARCHAR(100),
    ticket_price    DECIMAL(10,2),
    registered_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attended_at     TIMESTAMP,
    UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_user ON buyers.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON buyers.event_registrations(event_id);

-- User Preferences
CREATE TABLE IF NOT EXISTS buyers.user_preferences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Profile
    phone           VARCHAR(50),
    location        VARCHAR(255),
    bio             TEXT,
    address         TEXT,
    -- Notifications
    notif_orders    BOOLEAN DEFAULT TRUE,
    notif_messages  BOOLEAN DEFAULT TRUE,
    notif_courses   BOOLEAN DEFAULT TRUE,
    notif_marketing BOOLEAN DEFAULT FALSE,
    -- Preferences
    language        VARCHAR(10) DEFAULT 'en',
    currency        VARCHAR(10) DEFAULT 'GHS',
    dark_mode       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Recently Viewed (optional - can use localStorage but good for cross-device)
CREATE TABLE IF NOT EXISTS buyers.recently_viewed (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL,
    product_type    VARCHAR(20) DEFAULT 'product',
    viewed_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recently_viewed_user ON buyers.recently_viewed(user_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_product ON buyers.recently_viewed(product_id);