-- =============================================================================
-- Events & Workshops — Enhanced Schema Extension
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/events-enhanced.sql
-- =============================================================================

-- Enhanced events table (extends existing events.events)
ALTER TABLE events.events ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE events.events ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;
ALTER TABLE events.events ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE events.events ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE events.events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'upcoming';
ALTER TABLE events.events ADD COLUMN IF NOT EXISTS event_category VARCHAR(100);
ALTER TABLE events.events ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT 'All Levels';
ALTER TABLE events.events ADD COLUMN IF NOT EXISTS prerequisites TEXT;
ALTER TABLE events.events ADD COLUMN IF NOT EXISTS agenda JSONB;
ALTER TABLE events.events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE events.events ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES auth.users(id);
ALTER TABLE events.events ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_events_slug ON events.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON events.events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events.events(event_category);
CREATE INDEX IF NOT EXISTS idx_events_featured ON events.events(is_featured) WHERE is_featured = true;

-- Event Speakers / Instructors
CREATE TABLE IF NOT EXISTS events.event_speakers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    title           VARCHAR(255),
    bio             TEXT,
    photo_url       TEXT,
    experience_years INT,
    students_count  INT DEFAULT 0,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_speakers_event ON events.event_speakers(event_id);

-- Event Resources (PDFs, slides, videos, assignments)
CREATE TABLE IF NOT EXISTS events.event_resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    resource_name   VARCHAR(255) NOT NULL,
    resource_type   VARCHAR(50) NOT NULL,
    resource_url    TEXT,
    file_size       VARCHAR(50),
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_resources_event ON events.event_resources(event_id);

-- Event Certificates
CREATE TABLE IF NOT EXISTS events.event_certificates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    certificate_url TEXT,
    issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_certificates_event ON events.event_certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_event_certificates_user ON events.event_certificates(user_id);

-- Enhanced registrations with status
ALTER TABLE events.event_registrations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'confirmed';
ALTER TABLE events.event_registrations ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT FALSE;

-- Event Categories
CREATE TABLE IF NOT EXISTS events.event_categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) UNIQUE,
    icon            VARCHAR(10),
    sort_order      INT DEFAULT 0
);

INSERT INTO events.event_categories (name, slug, icon, sort_order) VALUES
    ('Floristry Workshops', 'floristry-workshops', '✂️', 1),
    ('Flower Care', 'flower-care', '🌿', 2),
    ('Gardening', 'gardening', '🌱', 3),
    ('Medicinal Plants', 'medicinal-plants', '💊', 4),
    ('Business & Marketing', 'business-marketing', '💼', 5),
    ('Flower Identification', 'flower-identification', '🔍', 6),
    ('Webinars', 'webinars', '💻', 7),
    ('Exhibitions', 'exhibitions', '🖼️', 8),
    ('Competitions', 'competitions', '🏆', 9)
ON CONFLICT (name) DO NOTHING;

-- Seed sample events if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM events.events LIMIT 1) THEN
        INSERT INTO events.events (title, description, location, event_date, end_date, event_type, event_category, image_url, max_participants, price, status, difficulty, is_featured, agenda) VALUES
        ('Advanced Flower Arrangement Workshop', 'Master the art of professional flower arrangement with hands-on training from industry experts. Learn bouquet design, color theory, and structural mechanics.', 'Online (Zoom)', '2026-08-20 10:00:00', '2026-08-20 13:00:00', 'WORKSHOP', 'Floristry Workshops', 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=800&auto=format&fit=crop', 150, 20.00, 'upcoming', 'Advanced', true, '["Welcome & Introductions","Bouquet Design Fundamentals","Color Theory for Florists","Hands-on Arrangement Session","Q&A and Feedback"]'),
        ('Medicinal Flowers Webinar', 'Discover the healing properties of common flowers and learn how to create natural remedies for everyday wellness.', 'Online (Zoom)', '2026-09-10 14:00:00', '2026-09-10 15:30:00', 'WEBINAR', 'Medicinal Plants', 'https://images.unsplash.com/photo-1471899236350-e3016bf1e69e?q=80&w=800&auto=format&fit=crop', 500, 0, 'upcoming', 'Beginner', true, NULL),
        ('Annual Flower Exhibition', 'The largest flower exhibition in West Africa featuring international exhibitors, competitive displays, and rare plant auctions.', 'Accra International Conference Centre', '2026-10-10 09:00:00', '2026-10-12 18:00:00', 'EXHIBITION', 'Exhibitions', 'https://images.unsplash.com/photo-1567691482090-4cc36f5721f6?q=80&w=800&auto=format&fit=crop', 1000, 20.00, 'upcoming', 'All Levels', true, NULL),
        ('Wedding Flower Planning 101', 'Expert tips for planning and executing stunning wedding flower designs on any budget. Perfect for aspiring wedding florists.', 'Online (Zoom)', '2026-08-05 18:00:00', '2026-08-05 19:30:00', 'WEBINAR', 'Floristry Workshops', 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=800&auto=format&fit=crop', 500, 0, 'upcoming', 'Beginner', false, NULL),
        ('Succulent Terrarium Building', 'Build your own beautiful succulent terrarium to take home. All materials included. Fun for all ages!', 'Takoradi Community Center', '2026-08-18 14:00:00', '2026-08-18 16:00:00', 'WORKSHOP', 'Gardening', 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=800&auto=format&fit=crop', 15, 25.00, 'upcoming', 'Beginner', false, NULL),
        ('Floral Photography Masterclass', 'Capture your floral arrangements beautifully with smartphone or DSLR. Learn lighting, composition and editing techniques.', 'Online (Live)', '2026-09-02 16:00:00', '2026-09-02 18:00:00', 'WEBINAR', 'Flower Care', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=800&auto=format&fit=crop', 100, 15.00, 'upcoming', 'Intermediate', false, NULL),
        ('Best Bouquet Competition', 'Show off your floral artistry! Compete against other florists and win prizes. Open to all skill levels.', 'Kumasi Flower Garden', '2026-11-15 10:00:00', '2026-11-15 17:00:00', 'TRAINING', 'Competitions', 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?q=80&w=800&auto=format&fit=crop', 50, 10.00, 'upcoming', 'All Levels', false, NULL),
        ('Growing Roses from Cuttings', 'Learn the complete process of propagating roses from cuttings. Includes soil prep, timing, and care tips.', 'Online (Zoom)', '2026-09-20 11:00:00', '2026-09-20 12:30:00', 'WEBINAR', 'Gardening', 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?q=80&w=800&auto=format&fit=crop', 300, 0, 'upcoming', 'Beginner', false, NULL);
    END IF;
END $$;

-- Event Discussions
CREATE TABLE IF NOT EXISTS events.event_discussions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    parent_id       UUID REFERENCES events.event_discussions(id) ON DELETE CASCADE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_discussions_event ON events.event_discussions(event_id);

-- Event Reviews
CREATE TABLE IF NOT EXISTS events.event_reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content         TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_reviews_event ON events.event_reviews(event_id);

-- Event Gallery
CREATE TABLE IF NOT EXISTS events.event_gallery (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    caption         TEXT,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_gallery_event ON events.event_gallery(event_id);
