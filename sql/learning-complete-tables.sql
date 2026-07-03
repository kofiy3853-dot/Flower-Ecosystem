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
    verification_code VARCHAR(50) UNIQUE
);

-- Add missing columns if table existed without them
ALTER TABLE learning.certificates ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE learning.certificates ADD COLUMN IF NOT EXISTS verification_code VARCHAR(50) UNIQUE;

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
-- Seed Data
-- =============================================================================

-- Seed Learning Paths
INSERT INTO learning.learning_paths (id, title, description, slug, level, duration_hours, course_count, student_count, rating, price) VALUES
('c1b2c3d4-0001-0000-0000-000000000001', 'Beginner Florist', 'Start your floristry journey from scratch. Learn flower identification, basic care, simple arrangements, and wrapping techniques.', 'beginner-florist', 'Beginner', 16, 4, 2850, 4.8, 'Free'),
('c1b2c3d4-0002-0000-0000-000000000002', 'Professional Florist', 'Master advanced floral design, wedding arrangements, luxury bouquets, and professional event styling.', 'professional-florist', 'Intermediate', 32, 6, 4850, 4.9, 'GHS 450'),
('c1b2c3d4-0003-0000-0000-000000000003', 'Professional Flower Farmer', 'Learn soil preparation, cultivation, pest control, harvesting, and wholesale selling of cut flowers.', 'flower-farmer', 'Intermediate', 48, 8, 1920, 4.7, 'GHS 650'),
('c1b2c3d4-0004-0000-0000-000000000004', 'Flower Business Owner', 'Learn to start, brand, manage, and grow a successful flower shop or floral service business.', 'flower-business', 'Intermediate', 36, 7, 3200, 4.8, 'GHS 550'),
('c1b2c3d4-0005-0000-0000-000000000005', 'Wedding & Event Decorator', 'Master floral decoration for weddings, corporate events, birthdays, and special celebrations.', 'event-decorator', 'Advanced', 24, 5, 2100, 4.9, 'GHS 400')
ON CONFLICT (id) DO NOTHING;

-- Seed Learning Path Courses
INSERT INTO learning.learning_path_courses (path_id, course_id, sort_order) VALUES
('c1b2c3d4-0001-0000-0000-000000000001', 'c24f45f7-daf7-44ee-9743-de1070133b2a', 1),
('c1b2c3d4-0001-0000-0000-000000000001', 'ba27993f-16fc-4ba1-9f7a-7a1ce2a2c1ec', 2),
('c1b2c3d4-0001-0000-0000-000000000001', 'a83601e0-9f1e-42b5-954c-24d7525f5291', 3)
ON CONFLICT DO NOTHING;

INSERT INTO learning.learning_path_courses (path_id, course_id, sort_order) VALUES
('c1b2c3d4-0002-0000-0000-000000000002', 'c24f45f7-daf7-44ee-9743-de1070133b2a', 1),
('c1b2c3d4-0002-0000-0000-000000000002', 'd4d98995-ad22-436d-9be6-b45a363cd667', 2),
('c1b2c3d4-0002-0000-0000-000000000002', 'a83601e0-9f1e-42b5-954c-24d7525f5291', 3),
('c1b2c3d4-0002-0000-0000-000000000002', 'ba27993f-16fc-4ba1-9f7a-7a1ce2a2c1ec', 4)
ON CONFLICT DO NOTHING;

-- Seed Quizzes
INSERT INTO learning.quizzes (id, course_id, title, description, time_minutes, difficulty, pass_score) VALUES
('d1b2c3d4-0001-0000-0000-000000000001', 'c24f45f7-daf7-44ee-9743-de1070133b2a', 'Arrangement Fundamentals Quiz', 'Test your knowledge of basic floral arrangement techniques.', 15, 'Beginner', 70),
('d1b2c3d4-0002-0000-0000-000000000002', 'a83601e0-9f1e-42b5-954c-24d7525f5291', 'Flower Identification Test', 'Test your ability to identify different flower types.', 15, 'Beginner', 70),
('d1b2c3d4-0003-0000-0000-000000000003', 'd4d98995-ad22-436d-9be6-b45a363cd667', 'Wedding Floristry Exam', 'Comprehensive exam covering wedding floral design concepts.', 30, 'Advanced', 80)
ON CONFLICT (id) DO NOTHING;

-- Seed Quiz Questions
INSERT INTO learning.quiz_questions (quiz_id, question, options, correct_answer, sort_order) VALUES
('d1b2c3d4-0001-0000-0000-000000000001', 'Which element of floral design refers to the visual path the eye follows?', to_jsonb(ARRAY['Line', 'Form', 'Texture', 'Space']), 0, 1),
('d1b2c3d4-0001-0000-0000-000000000001', 'What is the recommended stem cutting angle for optimal water absorption?', to_jsonb(ARRAY['90 degrees', '45 degrees', '30 degrees', '60 degrees']), 1, 2),
('d1b2c3d4-0001-0000-0000-000000000001', 'Which flower type is NOT suitable for a hand-tied bouquet?', to_jsonb(ARRAY['Roses', 'Tulips', 'Sunflowers', 'Broken-stemmed flowers']), 3, 3),
('d1b2c3d4-0001-0000-0000-000000000001', 'What does the golden ratio in floral design help achieve?', to_jsonb(ARRAY['Color harmony', 'Visual balance', 'Faster arrangement', 'Longer vase life']), 1, 4),
('d1b2c3d4-0001-0000-0000-000000000001', 'Which tool is essential for removing thorns from rose stems?', to_jsonb(ARRAY['Floral shears', 'Stem stripper', 'Ribbon scissors', 'Floral tape']), 1, 5),
('d1b2c3d4-0002-0000-0000-000000000002', 'Which feature usually indicates a natural flower?', to_jsonb(ARRAY['Uniform coloring', 'Irregular petal patterns', 'Wire stems', 'Perfect symmetry']), 1, 1),
('d1b2c3d4-0002-0000-0000-000000000002', 'What is the most reliable test for identifying silk flowers?', to_jsonb(ARRAY['Smell test', 'Burn test for fabric', 'Water test', 'Weight test']), 1, 2),
('d1b2c3d4-0002-0000-0000-000000000002', 'Preserved flowers are best characterized by:', to_jsonb(ARRAY['Artificial appearance', 'Natural look with extended life', 'Synthetic materials', 'No scent']), 1, 3),
('d1b2c3d4-0003-0000-0000-000000000003', 'What is the primary role of a wedding florist?', to_jsonb(ARRAY['Only making bouquets', 'Creating the entire floral experience', 'Just delivering flowers', 'Only doing centerpieces']), 1, 1),
('d1b2c3d4-0003-0000-0000-000000000003', 'How far in advance should wedding flowers be ordered?', to_jsonb(ARRAY['1 week', '2-3 months', '6 months', 'Day before']), 1, 2)
ON CONFLICT DO NOTHING;

-- Seed Discussions
INSERT INTO learning.discussions (id, user_id, title, content, category) VALUES
('e1b2c3d4-0001-0000-0000-000000000001', NULL, 'Best flowers for beginner arrangements?', 'I am new to floristry and want to know which flowers are easiest to work with for my first arrangements.', 'questions'),
('e1b2c3d4-0002-0000-0000-000000000002', NULL, 'How to keep flowers fresh longer?', 'What are the best practices for extending the life of cut flowers? I have tried changing water daily but they still wilt quickly.', 'questions'),
('e1b2c3d4-0003-0000-0000-000000000003', NULL, 'My first wedding arrangement', 'Just completed my first wedding centerpiece using techniques from the Wedding Floristry course. So proud of the result!', 'showcase')
ON CONFLICT (id) DO NOTHING;

-- Seed Resources
INSERT INTO learning.resources (id, title, description, file_type, file_size, category) VALUES
('f1b2c3d4-0001-0000-0000-000000000001', 'Flower Care Guide', 'Complete guide to keeping flowers fresh and healthy.', 'PDF', '2.4 MB', 'guides'),
('f1b2c3d4-0002-0000-0000-000000000002', 'Color Theory Cheat Sheet', 'Quick reference for floral color combinations.', 'PDF', '1.1 MB', 'references'),
('f1b2c3d4-0003-0000-0000-000000000003', 'Wedding Planning Template', 'Template for planning wedding floral arrangements.', 'PDF', '3.2 MB', 'templates'),
('f1b2c3d4-0004-0000-0000-000000000004', 'Flower Pricing Calculator', 'Spreadsheet for calculating flower arrangement pricing.', 'XLSX', '0.5 MB', 'tools'),
('f1b2c3d4-0005-0000-0000-000000000005', 'Seasonal Flower Calendar', 'Month-by-month guide to available flowers.', 'PDF', '1.8 MB', 'guides')
ON CONFLICT (id) DO NOTHING;

-- Seed Certificates
INSERT INTO learning.certificates (id, user_id, course_id, title, verification_code)
SELECT uuid_generate_v4(), u.id, c.id, c.title || ' Certificate', 'CERT-' || upper(substr(uuid_generate_v4()::text, 1, 8))
FROM auth.users u, learning.courses c
WHERE u.role = 'ADMIN' AND c.title ILIKE '%arrangement%'
LIMIT 1
ON CONFLICT DO NOTHING;

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
