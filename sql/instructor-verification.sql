-- =============================================================================
-- Instructor Verification System Tables
-- Execute with: psql -U postgres -d flower_ecosystem -f sql/instructor-verification.sql
-- =============================================================================

-- 1. Instructor Levels
CREATE TABLE IF NOT EXISTS learning.instructor_levels (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    level           VARCHAR(20) DEFAULT 'new' CHECK (level IN ('new', 'verified', 'professional', 'master')),
    total_students  INT DEFAULT 0,
    total_courses   INT DEFAULT 0,
    avg_rating      DECIMAL(3,2) DEFAULT 0,
    promoted_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_instructor_levels_user ON learning.instructor_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_levels_level ON learning.instructor_levels(level);

-- 2. Instructor Reviews (audit trail)
CREATE TABLE IF NOT EXISTS learning.instructor_reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id  UUID NOT NULL REFERENCES learning.instructor_applications(id) ON DELETE CASCADE,
    reviewer_id     UUID REFERENCES auth.users(id),
    action          VARCHAR(50) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_instructor_reviews_app ON learning.instructor_reviews(application_id);

-- 3. Add instructor_level column to instructor_applications if not exists
ALTER TABLE learning.instructor_applications ADD COLUMN IF NOT EXISTS instructor_level VARCHAR(20) DEFAULT 'new';

-- Verification
SELECT 'instructor_levels' AS t, COUNT(*) AS n FROM learning.instructor_levels
UNION ALL SELECT 'instructor_reviews', COUNT(*) FROM learning.instructor_reviews;
