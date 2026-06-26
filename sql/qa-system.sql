-- =============================================================================
-- Questions & Answers — Schema
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/qa-system.sql
-- =============================================================================

-- Create schema if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'qa') THEN
        CREATE SCHEMA qa;
    END IF;
END $$;

-- Q&A Categories
CREATE TABLE IF NOT EXISTS qa.categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) UNIQUE,
    icon            VARCHAR(10),
    description     TEXT,
    sort_order      INT DEFAULT 0
);

INSERT INTO qa.categories (name, slug, icon, sort_order) VALUES
    ('Flower Identification', 'flower-identification', '🌹', 1),
    ('Flower Care', 'flower-care', '🌿', 2),
    ('Floristry', 'floristry', '💐', 3),
    ('Medicinal Flowers', 'medicinal-flowers', '💊', 4),
    ('Palm Trees', 'palm-trees', '🌴', 5),
    ('Gardening', 'gardening', '🌱', 6),
    ('Marketplace', 'marketplace', '🛒', 7),
    ('Growing Flowers', 'growing-flowers', '🌸', 8),
    ('Events & Workshops', 'events-workshops', '🎪', 9)
ON CONFLICT (name) DO NOTHING;

-- Questions
CREATE TABLE IF NOT EXISTS qa.questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    category_id     INT REFERENCES qa.categories(id) ON DELETE SET NULL,
    views           INTEGER DEFAULT 0,
    answer_count    INTEGER DEFAULT 0,
    has_accepted    BOOLEAN DEFAULT FALSE,
    is_solved       BOOLEAN DEFAULT FALSE,
    tags            TEXT[],
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_user ON qa.questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_category ON qa.questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_created ON qa.questions(created_at DESC);

-- Question Images
CREATE TABLE IF NOT EXISTS qa.question_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id     UUID NOT NULL REFERENCES qa.questions(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    caption         VARCHAR(255),
    sort_order      INT DEFAULT 0
);

-- Answers
CREATE TABLE IF NOT EXISTS qa.answers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id     UUID NOT NULL REFERENCES qa.questions(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    is_accepted     BOOLEAN DEFAULT FALSE,
    vote_count      INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_answers_question ON qa.answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_user ON qa.answers(user_id);

-- Answer Votes
CREATE TABLE IF NOT EXISTS qa.answer_votes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    answer_id       UUID NOT NULL REFERENCES qa.answers(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type       VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(answer_id, user_id)
);

-- User Points
CREATE TABLE IF NOT EXISTS qa.user_points (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points          INTEGER DEFAULT 0,
    questions_asked INTEGER DEFAULT 0,
    answers_given   INTEGER DEFAULT 0,
    best_answers    INTEGER DEFAULT 0,
    UNIQUE(user_id)
);
