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
-- Seed Data
-- =============================================================================

-- Seed workshops
INSERT INTO learning.workshops (id, title, description, instructor, instructor_title, date, time, duration, location, type, price, seats, seats_left, rating) VALUES
('a1b2c3d4-0001-0000-0000-000000000001', 'Advanced Wedding Floral Design Masterclass', 'Learn professional wedding floral design techniques through live demonstration and guided practice. Build elegant bridal bouquets, centerpieces, and venue decorations.', 'Sarah Mensah', 'Master Florist', 'Saturday, July 18', '9:00 AM – 1:00 PM', '4 Hours', 'Online (Zoom)', 'online', 'GHS 150', 45, 12, 4.9),
('a1b2c3d4-0002-0000-0000-000000000002', 'Bouquet Design Fundamentals', 'Master the basics of bouquet design from color theory to wrapping techniques. Perfect for beginners starting their floristry journey.', 'Efua Osei', 'Event Decoration Expert', 'Saturday, July 25', '10:00 AM – 12:00 PM', '2 Hours', 'Online (Zoom)', 'online', 'Free', 60, 28, 4.7),
('a1b2c3d4-0003-0000-0000-000000000003', 'Sustainable Flower Farming Workshop', 'Learn organic farming techniques for growing cut flowers. Cover soil preparation, planting, pest control, and harvesting.', 'Kwame Asante', 'Flower Farm Expert', 'Saturday, August 1', '8:00 AM – 12:00 PM', '4 Hours', 'Flower Ecosystem Farm, Kumasi', 'physical', 'GHS 200', 20, 8, 4.8),
('a1b2c3d4-0004-0000-0000-000000000004', 'Floral Photography Workshop', 'Learn to photograph flowers and arrangements for social media and marketing. Master lighting, composition, and editing.', 'Nana Agyeman', 'Floral Photographer', 'Saturday, August 8', '10:00 AM – 1:00 PM', '3 Hours', 'Online (Zoom)', 'online', 'GHS 100', 40, 22, 4.6),
('a1b2c3d4-0005-0000-0000-000000000005', 'Flower Business Startup Workshop', 'Turn your passion into profit. Learn business planning, pricing strategies, and customer acquisition for your flower business.', 'Kofi Mensah', 'Business Coach', 'Saturday, August 15', '2:00 PM – 5:00 PM', '3 Hours', 'Online (Zoom)', 'online', 'GHS 120', 50, 35, 4.8)
ON CONFLICT (id) DO NOTHING;

-- Seed live classes
INSERT INTO learning.live_classes (id, title, description, instructor, day, time, duration, level, seats, enrolled, status) VALUES
('b1b2c3d4-0001-0000-0000-000000000001', 'Floral Design Fundamentals', 'Learn the fundamentals of floral design including color theory, flower selection, and basic arrangement techniques.', 'Sarah Mensah', 'Monday', '6:00 PM', '2 Hours', 'Beginner', 120, 85, 'upcoming'),
('b1b2c3d4-0002-0000-0000-000000000002', 'Wedding Floristry Masterclass', 'Master wedding floral design from bridal bouquets to venue decoration with hands-on practice.', 'Efua Osei', 'Tuesday', '7:00 PM', '2.5 Hours', 'Intermediate', 80, 72, 'upcoming'),
('b1b2c3d4-0003-0000-0000-000000000003', 'Indoor Plant Care', 'Everything you need to know about keeping your indoor plants healthy and thriving.', 'Ama Darko', 'Wednesday', '5:00 PM', '1.5 Hours', 'Beginner', 100, 45, 'upcoming'),
('b1b2c3d4-0004-0000-0000-000000000004', 'Flower Farming Basics', 'Introduction to flower farming including soil prep, planting, and basic care.', 'Kwame Asante', 'Thursday', '6:00 PM', '2 Hours', 'Beginner', 60, 38, 'upcoming'),
('b1b2c3d4-0005-0000-0000-000000000005', 'Advanced Color Theory', 'Deep dive into color theory for professional floral arrangements and event design.', 'Sarah Mensah', 'Friday', '6:00 PM', '2 Hours', 'Advanced', 50, 48, 'upcoming'),
('b1b2c3d4-0006-0000-0000-000000000006', 'Floral Photography Workshop', 'Learn to photograph flowers and arrangements for social media and marketing.', 'Nana Agyeman', 'Saturday', '10:00 AM', '3 Hours', 'Intermediate', 40, 22, 'upcoming')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Verification
-- =============================================================================
SELECT 'workshops' AS table_name, COUNT(*) AS row_count FROM learning.workshops
UNION ALL
SELECT 'live_classes', COUNT(*) FROM learning.live_classes;
