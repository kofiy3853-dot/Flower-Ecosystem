-- =============================================================================
-- Instructor Application & Verification System
-- Execute with: psql -U postgres -d flower_ecosystem -f migrations/010_instructor_applications.sql
-- =============================================================================

-- 1. Instructor Applications
CREATE TABLE IF NOT EXISTS learning.instructor_applications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic Info
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    country         VARCHAR(100),
    city            VARCHAR(100),
    languages       TEXT[] DEFAULT '{}',
    profile_photo   TEXT,

    -- Professional Info
    professional_title  VARCHAR(100),
    years_experience    INT,
    current_employer    VARCHAR(255),
    own_business        VARCHAR(255),

    -- Bio
    bio             TEXT,

    -- Expertise
    expertise       TEXT[] DEFAULT '{}',

    -- Education (JSON array)
    education       JSONB DEFAULT '[]',

    -- Certifications (JSON array)
    certifications  JSONB DEFAULT '[]',

    -- Portfolio (JSON array of {url, caption, type})
    portfolio       JSONB DEFAULT '[]',

    -- Teaching Experience
    has_taught_before   BOOLEAN DEFAULT FALSE,
    teaching_format     VARCHAR(50),
    students_taught     INT DEFAULT 0,
    previous_platforms  TEXT,

    -- Introduction Video
    intro_video     TEXT,

    -- Sample Lesson
    sample_lesson_url   TEXT,
    sample_lesson_outline TEXT,

    -- Identity Verification
    gov_id_url      TEXT,
    selfie_url      TEXT,
    phone_verified  BOOLEAN DEFAULT FALSE,
    email_verified  BOOLEAN DEFAULT FALSE,

    -- Social Links
    website         TEXT,
    business_website TEXT,
    portfolio_url   TEXT,
    social_links    JSONB DEFAULT '{}',

    -- Banking / Payout
    bank_account_name   VARCHAR(255),
    bank_name           VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_routing        VARCHAR(100),
    mobile_money_number VARCHAR(50),
    tax_id              VARCHAR(100),
    payout_method       VARCHAR(50),

    -- Agreements
    terms_accepted      BOOLEAN DEFAULT FALSE,
    content_guidelines  BOOLEAN DEFAULT FALSE,
    copyright_policy    BOOLEAN DEFAULT FALSE,
    community_standards BOOLEAN DEFAULT FALSE,

    -- Status
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','rejected','needs_info')),
    rejection_reason TEXT,
    admin_notes     TEXT,
    reviewed_by     UUID REFERENCES auth.users(id),
    reviewed_at     TIMESTAMP,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_instructor_app_user ON learning.instructor_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_app_status ON learning.instructor_applications(status);

-- 2. Instructor Levels
CREATE TABLE IF NOT EXISTS learning.instructor_levels (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    level           VARCHAR(20) DEFAULT 'new' CHECK (level IN ('new','verified','professional','master')),
    course_count    INT DEFAULT 0,
    total_students  INT DEFAULT 0,
    avg_rating      DECIMAL(3,2) DEFAULT 0,
    total_reviews   INT DEFAULT 0,
    promoted_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_instructor_level_user ON learning.instructor_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_level_level ON learning.instructor_levels(level);

-- 3. Instructor Application Reviews (audit trail)
CREATE TABLE IF NOT EXISTS learning.instructor_reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id  UUID NOT NULL REFERENCES learning.instructor_applications(id) ON DELETE CASCADE,
    reviewer_id     UUID NOT NULL REFERENCES auth.users(id),
    action          VARCHAR(20) NOT NULL CHECK (action IN ('request_info','approve','reject','note')),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_instructor_review_app ON learning.instructor_reviews(application_id);

-- 4. Auto-create instructor_level row on approval
CREATE OR REPLACE FUNCTION learning.create_instructor_level()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        INSERT INTO learning.instructor_levels (user_id, level)
        VALUES (NEW.user_id, 'new')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_instructor_approved ON learning.instructor_applications;
CREATE TRIGGER trg_instructor_approved
    AFTER UPDATE OF status ON learning.instructor_applications
    FOR EACH ROW
    EXECUTE FUNCTION learning.create_instructor_level();

-- 5. Auto-update updated_at
CREATE OR REPLACE FUNCTION learning.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_instructor_app_updated ON learning.instructor_applications;
CREATE TRIGGER trg_instructor_app_updated
    BEFORE UPDATE ON learning.instructor_applications
    FOR EACH ROW
    EXECUTE FUNCTION learning.update_timestamp();

DROP TRIGGER IF EXISTS trg_instructor_level_updated ON learning.instructor_levels;
CREATE TRIGGER trg_instructor_level_updated
    BEFORE UPDATE ON learning.instructor_levels
    FOR EACH ROW
    EXECUTE FUNCTION learning.update_timestamp();
