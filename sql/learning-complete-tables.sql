-- =============================================================================
-- Learning Paths, Quizzes, Discussions, Resources, Certificates Tables
-- Execute with: psql -U postgres -d flower_ecosystem -f sql/learning-complete-tables.sql
-- =============================================================================

-- 1. Learning Paths
CREATE TABLE IF NOT EXISTS learning.learning_paths (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    slug            VARCHAR(255) UNIQUE,
    icon            VARCHAR(50),
    image           TEXT,
    level           VARCHAR(50) DEFAULT 'Beginner',
    duration_hours  INT DEFAULT 0,
    course_count    INT DEFAULT 0,
    student_count   INT DEFAULT 0,
    rating          DECIMAL(2,1) DEFAULT 0,
    price           VARCHAR(50) DEFAULT 'Free',
    is_published    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_slug ON learning.learning_paths(slug);
CREATE INDEX IF NOT EXISTS idx_learning_paths_published ON learning.learning_paths(is_published);

-- 2. Learning Path Courses (junction table)
CREATE TABLE IF NOT EXISTS learning.learning_path_courses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path_id         UUID NOT NULL REFERENCES learning.learning_paths(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    sort_order      INT DEFAULT 0,
    UNIQUE(path_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_lpc_path ON learning.learning_path_courses(path_id);
CREATE INDEX IF NOT EXISTS idx_lpc_course ON learning.learning_path_courses(course_id);

-- 3. Learning Path Enrollments
CREATE TABLE IF NOT EXISTS learning.path_enrollments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    path_id         UUID NOT NULL REFERENCES learning.learning_paths(id) ON DELETE CASCADE,
    enrolled_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP,
    UNIQUE(user_id, path_id)
);

-- 4. Quizzes (extend existing if needed)
CREATE TABLE IF NOT EXISTS learning.quizzes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID REFERENCES learning.courses(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    time_minutes    INT DEFAULT 15,
    difficulty      VARCHAR(50) DEFAULT 'Beginner',
    max_attempts    INT DEFAULT 3,
    pass_score      INT DEFAULT 70,
    is_published    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course ON learning.quizzes(course_id);

-- 5. Quiz Questions
CREATE TABLE IF NOT EXISTS learning.quiz_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id         UUID NOT NULL REFERENCES learning.quizzes(id) ON DELETE CASCADE,
    question        TEXT NOT NULL,
    options         TEXT[] NOT NULL,
    correct_answer  INT NOT NULL DEFAULT 0,
    explanation     TEXT,
    sort_order      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON learning.quiz_questions(quiz_id);

-- 6. Quiz Attempts
CREATE TABLE IF NOT EXISTS learning.quiz_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id         UUID NOT NULL REFERENCES learning.quizzes(id) ON DELETE CASCADE,
    answers         JSONB,
    score           INT DEFAULT 0,
    attempt_number  INT DEFAULT 1,
    completed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON learning.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON learning.quiz_attempts(quiz_id);

-- 7. Discussions
CREATE TABLE IF NOT EXISTS learning.discussions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    category        VARCHAR(100) DEFAULT 'general',
    is_pinned       BOOLEAN DEFAULT FALSE,
    reply_count     INT DEFAULT 0,
    view_count      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discussions_category ON learning.discussions(category);
CREATE INDEX IF NOT EXISTS idx_discussions_created ON learning.discussions(created_at DESC);

-- 8. Discussion Replies
CREATE TABLE IF NOT EXISTS learning.discussion_replies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id   UUID NOT NULL REFERENCES learning.discussions(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discussion_replies_disc ON learning.discussion_replies(discussion_id);

-- 9. Resources
CREATE TABLE IF NOT EXISTS learning.resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    file_url        TEXT,
    file_type       VARCHAR(50),
    file_size       VARCHAR(50),
    category        VARCHAR(100),
    download_count  INT DEFAULT 0,
    is_published    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resources_category ON learning.resources(category);

-- 10. Certificates
CREATE TABLE IF NOT EXISTS learning.certificates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id       UUID REFERENCES learning.courses(id) ON DELETE SET NULL,
    path_id         UUID REFERENCES learning.learning_paths(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    certificate_url TEXT,
    verification_code VARCHAR(50) UNIQUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns if table existed without them
ALTER TABLE learning.certificates ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE learning.certificates ADD COLUMN IF NOT EXISTS verification_code VARCHAR(50) UNIQUE;
ALTER TABLE learning.certificates ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_certificates_user ON learning.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON learning.certificates(verification_code);

-- 11. Class Attendance
CREATE TABLE IF NOT EXISTS learning.class_attendance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES learning.live_classes(id) ON DELETE CASCADE,
    attended_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, class_id)
);

-- =============================================================================
-- No seed data — all content is created by instructors and admins
-- =============================================================================

-- =============================================================================
-- Verification
-- =============================================================================
SELECT 'learning_paths' AS t, COUNT(*) AS n FROM learning.learning_paths
UNION ALL SELECT 'learning_path_courses', COUNT(*) FROM learning.learning_path_courses
UNION ALL SELECT 'quizzes', COUNT(*) FROM learning.quizzes
UNION ALL SELECT 'quiz_questions', COUNT(*) FROM learning.quiz_questions
UNION ALL SELECT 'discussions', COUNT(*) FROM learning.discussions
UNION ALL SELECT 'resources', COUNT(*) FROM learning.resources
UNION ALL SELECT 'certificates', COUNT(*) FROM learning.certificates;
