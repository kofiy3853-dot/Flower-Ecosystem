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
-- 12. Lesson Notes (User personal notes per lesson)
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.lesson_notes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id       UUID NOT NULL REFERENCES learning.course_lessons(id) ON DELETE CASCADE,
    content         TEXT,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_notes_user ON learning.lesson_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_lesson ON learning.lesson_notes(lesson_id);

-- =============================================================================
-- 13. Lesson Discussions (Q&A per lesson)
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.lesson_discussions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id       UUID NOT NULL REFERENCES learning.course_lessons(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    is_pinned       BOOLEAN DEFAULT FALSE,
    reply_count     INT DEFAULT 0,
    view_count      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lesson_discussions_lesson ON learning.lesson_discussions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_discussions_created ON learning.lesson_discussions(created_at DESC);

-- 14. Lesson Discussion Replies
CREATE TABLE IF NOT EXISTS learning.lesson_discussion_replies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id   UUID NOT NULL REFERENCES learning.lesson_discussions(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lesson_discussion_replies_disc ON learning.lesson_discussion_replies(discussion_id);

-- =============================================================================
-- 15. Lesson Quizzes (Per-lesson quizzes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.lesson_quizzes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id       UUID NOT NULL REFERENCES learning.course_lessons(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    time_minutes    INT DEFAULT 10,
    pass_score      INT DEFAULT 70,
    is_published    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lesson_quizzes_lesson ON learning.lesson_quizzes(lesson_id);

-- 16. Lesson Quiz Questions
CREATE TABLE IF NOT EXISTS learning.lesson_quiz_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id         UUID NOT NULL REFERENCES learning.lesson_quizzes(id) ON DELETE CASCADE,
    question        TEXT NOT NULL,
    options         TEXT[] NOT NULL,
    correct_answer  INT NOT NULL DEFAULT 0,
    explanation     TEXT,
    sort_order      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lesson_quiz_questions_quiz ON learning.lesson_quiz_questions(quiz_id);

-- 17. Lesson Quiz Attempts
CREATE TABLE IF NOT EXISTS learning.lesson_quiz_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id         UUID NOT NULL REFERENCES learning.lesson_quizzes(id) ON DELETE CASCADE,
    lesson_id       UUID NOT NULL REFERENCES learning.course_lessons(id) ON DELETE CASCADE,
    answers         JSONB,
    score           INT DEFAULT 0,
    attempt_number  INT DEFAULT 1,
    completed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lesson_quiz_attempts_user ON learning.lesson_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_quiz_attempts_quiz ON learning.lesson_quiz_attempts(quiz_id);

-- =============================================================================
-- 18. Lesson Completions (Track lesson completion per user)
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.lesson_completions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id       UUID NOT NULL REFERENCES learning.course_lessons(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    completed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_user ON learning.lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_lesson ON learning.lesson_completions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_course ON learning.lesson_completions(course_id);

-- =============================================================================
-- 19. Notes & Discussion Tables for Courses (Legacy compatibility)
-- =============================================================================
CREATE TABLE IF NOT EXISTS learning.course_discussions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    is_pinned       BOOLEAN DEFAULT FALSE,
    reply_count     INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_discussions_course ON learning.course_discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_discussions_created ON learning.course_discussions(created_at DESC);

CREATE TABLE IF NOT EXISTS learning.course_discussion_replies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id   UUID NOT NULL REFERENCES learning.course_discussions(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_discussion_replies_disc ON learning.course_discussion_replies(discussion_id);

-- =============================================================================
-- Triggers for Auto-updating Counts
-- =============================================================================

-- Function to update course lesson_count
CREATE OR REPLACE FUNCTION learning.update_course_lesson_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE learning.courses
        SET lesson_count = (
            SELECT COUNT(*)
            FROM learning.course_lessons cl
            JOIN learning.course_sections cs ON cs.id = cl.section_id
            WHERE cs.course_id = NEW.course_id
        )
        WHERE id = NEW.course_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE learning.courses
        SET lesson_count = (
            SELECT COUNT(*)
            FROM learning.course_lessons cl
            JOIN learning.course_sections cs ON cs.id = cl.section_id
            WHERE cs.course_id = OLD.course_id
        )
        WHERE id = OLD.course_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_course_lesson_count ON learning.course_lessons;
CREATE TRIGGER trigger_course_lesson_count
AFTER INSERT OR UPDATE OR DELETE ON learning.course_lessons
FOR EACH ROW EXECUTE FUNCTION learning.update_course_lesson_count();

-- Function to update learning path course_count
CREATE OR REPLACE FUNCTION learning.update_path_course_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE learning.learning_paths
        SET course_count = (
            SELECT COUNT(*)
            FROM learning.learning_path_courses
            WHERE path_id = NEW.path_id
        )
        WHERE id = NEW.path_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE learning.learning_paths
        SET course_count = (
            SELECT COUNT(*)
            FROM learning.learning_path_courses
            WHERE path_id = OLD.path_id
        )
        WHERE id = OLD.path_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_path_course_count ON learning.learning_path_courses;
CREATE TRIGGER trigger_path_course_count
AFTER INSERT OR UPDATE OR DELETE ON learning.learning_path_courses
FOR EACH ROW EXECUTE FUNCTION learning.update_path_course_count();

-- Function to update course students_count on enrollment
CREATE OR REPLACE FUNCTION learning.update_course_students_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE learning.courses
        SET students_count = (
            SELECT COUNT(*)
            FROM learning.enrollments
            WHERE course_id = NEW.course_id
        )
        WHERE id = NEW.course_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE learning.courses
        SET students_count = (
            SELECT COUNT(*)
            FROM learning.enrollments
            WHERE course_id = OLD.course_id
        )
        WHERE id = OLD.course_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_course_students_count ON learning.enrollments;
CREATE TRIGGER trigger_course_students_count
AFTER INSERT OR DELETE ON learning.enrollments
FOR EACH ROW EXECUTE FUNCTION learning.update_course_students_count();

-- Function to update course completion percentage
CREATE OR REPLACE FUNCTION learning.update_course_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Update course completion percentage for user
        UPDATE learning.progress
        SET progress = (
            SELECT COALESCE(ROUND(COUNT(CASE WHEN lc.completed_at IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2), 0)
            FROM learning.course_lessons cl
            LEFT JOIN learning.lesson_completions lc ON lc.lesson_id = cl.id AND lc.user_id = NEW.user_id
            WHERE cl.course_id = NEW.course_id
        )
        WHERE user_id = NEW.user_id AND course_id = NEW.course_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_course_progress ON learning.lesson_completions;
CREATE TRIGGER trigger_course_progress
AFTER INSERT OR UPDATE ON learning.lesson_completions
FOR EACH ROW EXECUTE FUNCTION learning.update_course_progress();

-- Function to auto-generate verification code for certificates
CREATE OR REPLACE FUNCTION learning.generate_certificate_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.verification_code IS NULL THEN
        NEW.verification_code := 'CERT-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_certificate_code ON learning.certificates;
CREATE TRIGGER trigger_certificate_code
BEFORE INSERT ON learning.certificates
FOR EACH ROW EXECUTE FUNCTION learning.generate_certificate_code();

-- Function to update learning path student_count
CREATE OR REPLACE FUNCTION learning.update_path_student_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE learning.learning_paths
        SET student_count = (
            SELECT COUNT(*)
            FROM learning.path_enrollments
            WHERE path_id = NEW.path_id
        )
        WHERE id = NEW.path_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE learning.learning_paths
        SET student_count = (
            SELECT COUNT(*)
            FROM learning.path_enrollments
            WHERE path_id = OLD.path_id
        )
        WHERE id = OLD.path_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_path_student_count ON learning.path_enrollments;
CREATE TRIGGER trigger_path_student_count
AFTER INSERT OR DELETE ON learning.path_enrollments
FOR EACH ROW EXECUTE FUNCTION learning.update_path_student_count();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION learning.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lesson_notes ON learning.lesson_notes;
CREATE TRIGGER trigger_update_lesson_notes
BEFORE UPDATE ON learning.lesson_notes
FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_lesson_discussions ON learning.lesson_discussions;
CREATE TRIGGER trigger_update_lesson_discussions
BEFORE UPDATE ON learning.lesson_discussions
FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_course_discussions ON learning.course_discussions;
CREATE TRIGGER trigger_update_course_discussions
BEFORE UPDATE ON learning.course_discussions
FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_learning_paths ON learning.learning_paths;
CREATE TRIGGER trigger_update_learning_paths
BEFORE UPDATE ON learning.learning_paths
FOR EACH ROW EXECUTE FUNCTION learning.update_updated_at();

-- =============================================================================
-- Verification
-- =============================================================================
SELECT 'learning_paths' AS t, COUNT(*) AS n FROM learning.learning_paths
UNION ALL SELECT 'learning_path_courses', COUNT(*) FROM learning.learning_path_courses
UNION ALL SELECT 'quizzes', COUNT(*) FROM learning.quizzes
UNION ALL SELECT 'quiz_questions', COUNT(*) FROM learning.quiz_questions
UNION ALL SELECT 'discussions', COUNT(*) FROM learning.discussions
UNION ALL SELECT 'resources', COUNT(*) FROM learning.resources
UNION ALL SELECT 'certificates', COUNT(*) FROM learning.certificates
UNION ALL SELECT 'lesson_notes', COUNT(*) FROM learning.lesson_notes
UNION ALL SELECT 'lesson_discussions', COUNT(*) FROM learning.lesson_discussions
UNION ALL SELECT 'lesson_quizzes', COUNT(*) FROM learning.lesson_quizzes
UNION ALL SELECT 'lesson_completions', COUNT(*) FROM learning.lesson_completions;
