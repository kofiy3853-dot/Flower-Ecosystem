-- =============================================================================
-- Learning System Database Fixes
-- Execute with: psql -U postgres -d flower_ecosystem -f sql/learning-system-fixes.sql
-- =============================================================================

-- 1. Add missing duration_minutes column to lessons table (now in base schema)
-- ALTER TABLE learning.lessons ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 0;

-- 2. Add missing columns to courses table (added to base schema)
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS reviews_count INT DEFAULT 0;
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS has_certificate BOOLEAN DEFAULT FALSE;
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS lesson_count INT DEFAULT 0;
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- 3. Add missing lesson_completions table for tracking which lessons users completed
CREATE TABLE IF NOT EXISTS learning.lesson_completions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id       UUID NOT NULL REFERENCES learning.lessons(id) ON DELETE CASCADE,
    completed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_user ON learning.lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_lesson ON learning.lesson_completions(lesson_id);

-- 3. Create progress table (if referenced by routes but not in schema)
CREATE TABLE IF NOT EXISTS learning.progress (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    lesson_id       UUID REFERENCES learning.lessons(id),
    progress        INT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON learning.progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_course ON learning.progress(course_id);

-- 4. Add missing columns to quizzes table
ALTER TABLE learning.quizzes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE learning.quizzes ADD COLUMN IF NOT EXISTS time_minutes INT DEFAULT 15;
ALTER TABLE learning.quizzes ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT 'Beginner';
ALTER TABLE learning.quizzes ADD COLUMN IF NOT EXISTS pass_score INT DEFAULT 70;
ALTER TABLE learning.quizzes ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE learning.quizzes ADD COLUMN IF NOT EXISTS max_attempts INT DEFAULT 3;-- 5. Add attempt_number tracking to quiz_attempts table
ALTER TABLE learning.quiz_attempts ADD COLUMN IF NOT EXISTS attempt_number INT DEFAULT 1;

-- 6. Create article_categories table
CREATE TABLE IF NOT EXISTS learning.article_categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) UNIQUE,
    icon            VARCHAR(50),
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_article_categories_slug ON learning.article_categories(slug);

-- 7. Create articles table for learning content management
CREATE TABLE IF NOT EXISTS learning.articles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE,
    excerpt         TEXT,
    content         TEXT,
    author_name     VARCHAR(255),
    author_title    VARCHAR(255),
    thumbnail_url   TEXT,
    reading_time    INT,
    category_id     INT REFERENCES learning.article_categories(id),
    is_featured     BOOLEAN DEFAULT FALSE,
    is_published    BOOLEAN DEFAULT FALSE,
    views           INT DEFAULT 0,
    published_at    TIMESTAMP,
    table_of_contents TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_articles_published ON learning.articles(is_published);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON learning.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_category ON learning.articles(category_id);

-- 8. Create article_images table for multi-image support
CREATE TABLE IF NOT EXISTS learning.article_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id      UUID NOT NULL REFERENCES learning.articles(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    caption         TEXT,
    sort_order      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_article_images_article ON learning.article_images(article_id);

-- 9. Create article_videos table
CREATE TABLE IF NOT EXISTS learning.article_videos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id      UUID NOT NULL REFERENCES learning.articles(id) ON DELETE CASCADE,
    video_url       TEXT NOT NULL,
    title           VARCHAR(255),
    duration        VARCHAR(20),
    sort_order      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_article_videos_article ON learning.article_videos(article_id);

-- 10. Create article_downloads table for downloadable resources
CREATE TABLE IF NOT EXISTS learning.article_downloads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id      UUID NOT NULL REFERENCES learning.articles(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    file_url        TEXT NOT NULL,
    file_type       VARCHAR(50),
    file_size       VARCHAR(50),
    sort_order      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_article_downloads_article ON learning.article_downloads(article_id);

-- =============================================================================
-- Data Consistency Fixes
-- =============================================================================

-- Standardize course instructor field (currently uses email, should reference user)
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add course tags for better categorization
ALTER TABLE learning.courses ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add course prerequisites
CREATE TABLE IF NOT EXISTS learning.course_prerequisites (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    prerequisite_course_id UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    UNIQUE(course_id, prerequisite_course_id)
);

-- Add resources table for downloadable course materials
CREATE TABLE IF NOT EXISTS learning.course_resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id       UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    resource_url    TEXT NOT NULL,
    resource_type   VARCHAR(50),
    sort_order      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_course_resources_course ON learning.course_resources(course_id);

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Verify all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'learning' 
ORDER BY table_name;
