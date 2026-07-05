-- =============================================================================
-- Flower Ecosystem Platform — PostgreSQL Schema
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/schema.sql
-- =============================================================================

-- 1. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. ENUMS
-- =============================================================================
DO $$ BEGIN
    CREATE TYPE flower_condition AS ENUM ('NATURAL', 'ARTIFICIAL', 'PRESERVED', 'DRIED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'CUSTOMER', 'SELLER', 'FLORIST', 'GROWER', 'INSTRUCTOR', 'MODERATOR', 'SUPERADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
    'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'
);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_type AS ENUM (
    'WORKSHOP', 'WEBINAR', 'FLOWER_SHOW', 'EXHIBITION', 'TRAINING'
);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. SCHEMAS
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS marketplace;
CREATE SCHEMA IF NOT EXISTS learning;
CREATE SCHEMA IF NOT EXISTS community;
CREATE SCHEMA IF NOT EXISTS events;
CREATE SCHEMA IF NOT EXISTS admin;
CREATE SCHEMA IF NOT EXISTS analytics;

-- =============================================================================
-- AUTH SCHEMA
-- =============================================================================

CREATE TABLE IF NOT EXISTS auth.users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            user_role NOT NULL DEFAULT 'CUSTOMER',
    phone           VARCHAR(30),
    location        VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    country         VARCHAR(100),
    zip_code        VARCHAR(20),
    description     TEXT,
    profile_image   TEXT,
    cover_image     TEXT,
    business_name   VARCHAR(255),
    business_type   VARCHAR(100),
    business_phone  VARCHAR(30),
    business_email  VARCHAR(255),
    website         VARCHAR(500),
    social_instagram VARCHAR(500),
    social_facebook  VARCHAR(500),
    social_twitter   VARCHAR(500),
    is_verified     BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users(role);

CREATE TABLE IF NOT EXISTS auth.sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token           TEXT UNIQUE NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth.sessions(token);

-- =============================================================================
-- MARKETPLACE SCHEMA
-- =============================================================================

CREATE TABLE IF NOT EXISTS marketplace.categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) UNIQUE,
    description     TEXT,
    image_url       TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marketplace.products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id     INT REFERENCES marketplace.categories(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    price           NUMERIC(10,2) CHECK (price >= 0),
    currency        VARCHAR(10) DEFAULT 'GHS',
    stock_quantity  INT DEFAULT 0 CHECK (stock_quantity >= 0),
    flower_cond     flower_condition,
    is_active       BOOLEAN DEFAULT TRUE,
    badge           VARCHAR(50),
    occasion        VARCHAR(100),
    color           VARCHAR(50),
    fresh           BOOLEAN DEFAULT FALSE,
    featured        BOOLEAN DEFAULT FALSE,
    best_seller     BOOLEAN DEFAULT FALSE,
    new_arrival     BOOLEAN DEFAULT FALSE,
    image_url       TEXT,
    images          TEXT[] DEFAULT '{}',
    video_url       TEXT,
    harvest_date    DATE DEFAULT CURRENT_DATE,
    shelf_life_days INT DEFAULT 7 CHECK (shelf_life_days > 0),
    size            VARCHAR(50),
    fragrance       VARCHAR(50),
    care_level      VARCHAR(50),
    sunlight        VARCHAR(50),
    water_frequency VARCHAR(50),
    bloom_season    VARCHAR(50),
    features        TEXT[] DEFAULT '{}',
    origin          VARCHAR(255),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_seller ON marketplace.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON marketplace.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON marketplace.products(name);
CREATE INDEX IF NOT EXISTS idx_products_active ON marketplace.products(is_active);

CREATE TABLE IF NOT EXISTS marketplace.product_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES marketplace.products(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    sort_order      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON marketplace.product_images(product_id);

CREATE TABLE IF NOT EXISTS marketplace.carts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marketplace.cart_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id         UUID NOT NULL REFERENCES marketplace.carts(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES marketplace.products(id) ON DELETE CASCADE,
    quantity        INT NOT NULL CHECK (quantity > 0),
    UNIQUE(cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS marketplace.orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_amount    NUMERIC(10,2) CHECK (total_amount >= 0),
    status          order_status NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON marketplace.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON marketplace.orders(status);

CREATE TABLE IF NOT EXISTS marketplace.order_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES marketplace.orders(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES marketplace.products(id),
    seller_id       UUID REFERENCES auth.users(id),
    quantity        INT NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON marketplace.order_items(order_id);

-- =============================================================================
-- REVIEWS (marketplace schema)
-- =============================================================================

CREATE TABLE IF NOT EXISTS marketplace.product_reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES marketplace.products(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review          TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON marketplace.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON marketplace.product_reviews(user_id);

-- COUPONS / PROMO CODES
CREATE TABLE IF NOT EXISTS marketplace.coupons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50) UNIQUE NOT NULL,
    discount_type   VARCHAR(10) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value  DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_uses        INT DEFAULT 0,
    current_uses    INT DEFAULT 0,
    expires_at      TIMESTAMP,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON marketplace.coupons(code);

-- =============================================================================
-- LEARNING SCHEMA
-- =============================================================================

CREATE TABLE IF NOT EXISTS learning.courses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    thumbnail_url   TEXT,
    level           VARCHAR(20) DEFAULT 'BEGINNER',
    instructor      VARCHAR(255),
    duration_minutes INT DEFAULT 0,
    price           NUMERIC(10,2) DEFAULT 0,
    rating          NUMERIC(2,1) DEFAULT 0,
    students_count  INT DEFAULT 0,
    reviews_count   INT DEFAULT 0,
    category        VARCHAR(100),
    has_certificate BOOLEAN DEFAULT FALSE,
    lesson_count    INT DEFAULT 0,
    is_featured     BOOLEAN DEFAULT FALSE,
    is_published    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courses_published ON learning.courses(is_published);

CREATE TABLE IF NOT EXISTS learning.lessons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT,
    video_url       TEXT,
    duration_minutes INT DEFAULT 0,
    sort_order      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lessons_course ON learning.lessons(course_id);

CREATE TABLE IF NOT EXISTS learning.course_progress (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    progress_pct    INT DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
    last_lesson_id  UUID REFERENCES learning.lessons(id),
    UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS learning.enrollments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    enrolled_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP,
    UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS learning.quizzes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course ON learning.quizzes(course_id);

CREATE TABLE IF NOT EXISTS learning.quiz_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id         UUID NOT NULL REFERENCES learning.quizzes(id) ON DELETE CASCADE,
    question        TEXT NOT NULL,
    options         JSONB NOT NULL,
    correct_answer  INT NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
    sort_order      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON learning.quiz_questions(quiz_id);

CREATE TABLE IF NOT EXISTS learning.quiz_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id         UUID NOT NULL REFERENCES learning.quizzes(id) ON DELETE CASCADE,
    score           INT NOT NULL CHECK (score BETWEEN 0 AND 100),
    answers         JSONB,
    completed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning.certificates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON learning.certificates(user_id);

-- =============================================================================
-- FLOWER IDENTIFICATION (learning schema)
-- =============================================================================

CREATE TABLE IF NOT EXISTS learning.flower_library (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    common_name     VARCHAR(255),
    scientific_name VARCHAR(255),
    flower_type     flower_condition,
    description     TEXT,
    image_url       TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flower_library_name ON learning.flower_library(common_name);

CREATE TABLE IF NOT EXISTS learning.identification_topics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    category        VARCHAR(100),
    level           VARCHAR(20) DEFAULT 'Beginner',
    duration        VARCHAR(20),
    is_published    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_identification_topics_slug ON learning.identification_topics(slug);

CREATE TABLE IF NOT EXISTS learning.identification_guides (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flower_id       UUID NOT NULL REFERENCES learning.flower_library(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT,
    sort_order      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_guides_flower ON learning.identification_guides(flower_id);

-- =============================================================================
-- COMMUNITY SCHEMA
-- =============================================================================

CREATE TABLE IF NOT EXISTS community.posts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    is_pinned       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON community.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON community.posts(created_at DESC);

CREATE TABLE IF NOT EXISTS community.comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID NOT NULL REFERENCES community.posts(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON community.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON community.comments(user_id);

-- =============================================================================
-- EVENTS SCHEMA
-- =============================================================================

CREATE TABLE IF NOT EXISTS events.events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    location        VARCHAR(255),
    event_date      TIMESTAMP NOT NULL,
    event_type      event_type,
    image_url       TEXT,
    max_participants INT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events.events(event_date);

CREATE TABLE IF NOT EXISTS events.event_registrations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    registered_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_event ON events.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON events.event_registrations(user_id);

-- =============================================================================
-- ADMIN SCHEMA
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin.audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES auth.users(id),
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    details         JSONB,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON admin.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin.audit_log(created_at DESC);

-- =============================================================================
-- FULL-TEXT SEARCH
-- =============================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'marketplace' AND table_name = 'products' AND column_name = 'search_vector') THEN
        ALTER TABLE marketplace.products
        ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
        ) STORED;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_search ON marketplace.products USING GIN(search_vector);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'learning' AND table_name = 'courses' AND column_name = 'search_vector') THEN
        ALTER TABLE learning.courses
        ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
        ) STORED;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_courses_search ON learning.courses USING GIN(search_vector);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'community' AND table_name = 'posts' AND column_name = 'search_vector') THEN
        ALTER TABLE community.posts
        ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
        ) STORED;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_search ON community.posts USING GIN(search_vector);

-- =============================================================================
-- UPDATED AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON marketplace.products
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON marketplace.orders
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON learning.courses
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON community.posts
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- AI Scans Table
CREATE TABLE IF NOT EXISTS analytics.ai_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    predicted_flower VARCHAR(255),
    confidence NUMERIC(5,2),
    flower_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_scans_user ON analytics.ai_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_scans_created ON analytics.ai_scans(created_at);

-- =============================================================================
-- FLOWER KNOWLEDGE SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS learning.flower_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    common_name VARCHAR(255) NOT NULL,
    scientific_name VARCHAR(255),
    family VARCHAR(255),
    origin VARCHAR(255),
    description TEXT,
    image_url TEXT,
    emoji VARCHAR(10) DEFAULT '🌸',
    sunlight VARCHAR(100),
    water VARCHAR(100),
    soil VARCHAR(100),
    difficulty VARCHAR(50),
    growth_rate VARCHAR(50),
    height VARCHAR(100),
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flower_knowledge_slug ON learning.flower_knowledge(slug);

CREATE TABLE IF NOT EXISTS learning.knowledge_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT '🌸',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning.flower_category_mapping (
    flower_id UUID NOT NULL REFERENCES learning.flower_knowledge(id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES learning.knowledge_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (flower_id, category_id)
);

CREATE TABLE IF NOT EXISTS learning.flower_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flower_id UUID NOT NULL REFERENCES learning.flower_knowledge(id) ON DELETE CASCADE,
    benefit_type VARCHAR(50) NOT NULL CHECK (benefit_type IN ('Medicinal', 'Health', 'Perfume', 'Ornamental', 'Religious', 'Culinary', 'Landscaping')),
    benefit_description TEXT NOT NULL,
    sort_order INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_flower_benefits_flower ON learning.flower_benefits(flower_id);
CREATE INDEX IF NOT EXISTS idx_flower_benefits_type ON learning.flower_benefits(benefit_type);

CREATE TABLE IF NOT EXISTS learning.flower_care_tips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flower_id UUID NOT NULL REFERENCES learning.flower_knowledge(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_flower_care_tips_flower ON learning.flower_care_tips(flower_id);

ALTER TABLE learning.flower_knowledge ADD COLUMN IF NOT EXISTS marketplace_tags TEXT[] DEFAULT '{}';
ALTER TABLE learning.flower_knowledge ADD COLUMN IF NOT EXISTS bloom_season VARCHAR(50) DEFAULT 'Year-round';

CREATE TABLE IF NOT EXISTS learning.user_flower_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    flower_slug VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, flower_slug)
);

CREATE INDEX IF NOT EXISTS idx_flower_favorites_user ON learning.user_flower_favorites(user_id);

CREATE TABLE IF NOT EXISTS learning.user_garden_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'My Garden',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_garden_plans_user ON learning.user_garden_plans(user_id);

CREATE TABLE IF NOT EXISTS learning.garden_plan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES learning.user_garden_plans(id) ON DELETE CASCADE,
    flower_slug VARCHAR(100) NOT NULL,
    quantity INT DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_garden_items_plan ON learning.garden_plan_items(plan_id);

CREATE TABLE IF NOT EXISTS community.flower_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flower_slug VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    display_name VARCHAR(100) DEFAULT 'Anonymous',
    comment TEXT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flower_comments_slug ON community.flower_comments(flower_slug);
