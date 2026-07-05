-- =============================================================================
-- Workshops, Live Classes, and Assignments Tables
-- Execute with: psql -U postgres -d flower_ecosystem -f sql/learning-extra-tables.sql
-- =============================================================================

-- 1. Workshops table
CREATE TABLE IF NOT EXISTS learning.workshops (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    instructor      VARCHAR(255),
    instructor_title VARCHAR(255),
    instructor_img  TEXT,
    instructor_bio  TEXT,
    instructor_courses INT DEFAULT 0,
    instructor_students INT DEFAULT 0,
    instructor_experience INT DEFAULT 0,
    date            VARCHAR(100),
    time            VARCHAR(100),
    duration        VARCHAR(50),
    location        VARCHAR(255),
    type            VARCHAR(20) DEFAULT 'online',
    price           VARCHAR(50) DEFAULT 'Free',
    seats           INT DEFAULT 50,
    seats_left      INT DEFAULT 50,
    rating          DECIMAL(2,1) DEFAULT 0,
    image           TEXT,
    outcomes        TEXT[] DEFAULT '{}',
    tools           TEXT[] DEFAULT '{}',
    materials       TEXT[] DEFAULT '{}',
    is_published    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workshops_date ON learning.workshops(date);
CREATE INDEX IF NOT EXISTS idx_workshops_published ON learning.workshops(is_published);

-- 2. Live Classes table
CREATE TABLE IF NOT EXISTS learning.live_classes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    instructor      VARCHAR(255),
    instructor_img  TEXT,
    day             VARCHAR(20),
    time            VARCHAR(50),
    duration        VARCHAR(50),
    level           VARCHAR(50) DEFAULT 'Beginner',
    seats           INT DEFAULT 100,
    enrolled        INT DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'upcoming',
    image           TEXT,
    scheduled_at    TIMESTAMP,
    is_published    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_live_classes_day ON learning.live_classes(day);
CREATE INDEX IF NOT EXISTS idx_live_classes_status ON learning.live_classes(status);

-- 3. Assignments table
CREATE TABLE IF NOT EXISTS learning.assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id       UUID REFERENCES learning.courses(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    due_date        DATE,
    status          VARCHAR(20) DEFAULT 'pending',
    points          INT DEFAULT 100,
    type            VARCHAR(100) DEFAULT 'Submission',
    file_url        TEXT,
    notes           TEXT,
    grade           INT,
    feedback        TEXT,
    submitted_at    TIMESTAMP,
    graded_at       TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assignments_user ON learning.assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON learning.assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON learning.assignments(due_date);

-- =============================================================================
-- =============================================================================
-- No seed data — workshops and live classes are created by instructors
-- =============================================================================

-- =============================================================================
-- Verification
-- =============================================================================
SELECT 'workshops' AS table_name, COUNT(*) AS row_count FROM learning.workshops
UNION ALL
SELECT 'live_classes', COUNT(*) FROM learning.live_classes;
