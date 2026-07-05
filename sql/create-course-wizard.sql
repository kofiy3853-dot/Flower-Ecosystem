-- =============================================================================
-- Course Creation Wizard Tables
-- Execute with: psql -U postgres -d flower_ecosystem -f sql/create-course-wizard.sql
-- =============================================================================

-- 1. Add new columns to courses table
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS subtitle VARCHAR(500);
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'English';
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS learning_outcomes TEXT[] DEFAULT '{}';
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS requirements TEXT[] DEFAULT '{}';
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS target_audience TEXT[] DEFAULT '{}';
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS promo_video_url TEXT;
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS gallery TEXT[] DEFAULT '{}';
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS discount_price NUMERIC(10,2);
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS enrollment_limit INT DEFAULT 0;
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public';
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';

-- 2. Course Sections
CREATE TABLE IF NOT EXISTS learning.course_sections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_sections_course ON learning.course_sections(course_id);

-- 3. Course Lessons (enhanced version of learning.lessons)
CREATE TABLE IF NOT EXISTS learning.course_lessons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id      UUID NOT NULL REFERENCES learning.course_sections(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    type            VARCHAR(50) DEFAULT 'video',
    content         TEXT,
    video_url       TEXT,
    duration_minutes INT DEFAULT 0,
    sort_order      INT DEFAULT 0,
    is_preview      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_section ON learning.course_lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON learning.course_lessons(course_id);

-- 4. Course Resources (downloadable files)
CREATE TABLE IF NOT EXISTS learning.course_downloadable_resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    file_url        TEXT NOT NULL,
    file_type       VARCHAR(50),
    file_size       VARCHAR(50),
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_resources_dl ON learning.course_downloadable_resources(course_id);

-- 5. Course Quizzes (instructor-created quizzes per course)
CREATE TABLE IF NOT EXISTS learning.course_quizzes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    passing_score   INT DEFAULT 70,
    time_minutes    INT DEFAULT 15,
    is_published    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_quizzes_course ON learning.course_quizzes(course_id);

-- 6. Course Quiz Questions
CREATE TABLE IF NOT EXISTS learning.course_quiz_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id         UUID NOT NULL REFERENCES learning.course_quizzes(id) ON DELETE CASCADE,
    question        TEXT NOT NULL,
    options         TEXT[] NOT NULL,
    correct_answer  INT NOT NULL DEFAULT 0,
    explanation     TEXT,
    sort_order      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cqq_quiz ON learning.course_quiz_questions(quiz_id);

-- 7. Course Assignments
CREATE TABLE IF NOT EXISTS learning.course_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    instructions    TEXT,
    deadline        TIMESTAMP,
    points          INT DEFAULT 100,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_assignments_course ON learning.course_assignments(course_id);

-- Verification
SELECT 'course_sections' AS t, COUNT(*) AS n FROM learning.course_sections
UNION ALL SELECT 'course_lessons', COUNT(*) FROM learning.course_lessons
UNION ALL SELECT 'course_downloadable_resources', COUNT(*) FROM learning.course_downloadable_resources
UNION ALL SELECT 'course_quizzes', COUNT(*) FROM learning.course_quizzes
UNION ALL SELECT 'course_quiz_questions', COUNT(*) FROM learning.course_quiz_questions
UNION ALL SELECT 'course_assignments', COUNT(*) FROM learning.course_assignments;
