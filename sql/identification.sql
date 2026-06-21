-- =============================================================================
-- Flower Identification — Schema Extension
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/identification.sql
-- =============================================================================

-- Identification Categories
CREATE TABLE IF NOT EXISTS learning.id_categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) UNIQUE,
    icon            VARCHAR(10),
    description     TEXT,
    sort_order      INT DEFAULT 0
);

INSERT INTO learning.id_categories (name, slug, icon, sort_order) VALUES
    ('Roses', 'roses', '🌹', 1),
    ('Tulips', 'tulips', '🌷', 2),
    ('Orchids', 'orchids', '🌺', 3),
    ('Lilies', 'lilies', '💮', 4),
    ('Preservation', 'preservation', '🏺', 5),
    ('General', 'general', '🔍', 6)
ON CONFLICT (name) DO NOTHING;

-- Identification Topics (enhanced)
CREATE TABLE IF NOT EXISTS learning.identification_topics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE,
    description     TEXT,
    content         TEXT,
    category_id     INT REFERENCES learning.id_categories(id) ON DELETE SET NULL,
    difficulty      VARCHAR(50) DEFAULT 'Beginner',
    duration        VARCHAR(50),
    cover_image     TEXT,
    is_published    BOOLEAN DEFAULT TRUE,
    views           INTEGER DEFAULT 0,
    quiz_data       JSONB,
    checklist       JSONB,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_id_topics_slug ON learning.identification_topics(slug);
CREATE INDEX IF NOT EXISTS idx_id_topics_category ON learning.identification_topics(category_id);

-- Identification Images
CREATE TABLE IF NOT EXISTS learning.id_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id        UUID NOT NULL REFERENCES learning.identification_topics(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    label           VARCHAR(255),
    image_type      VARCHAR(50),
    sort_order      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_id_images_topic ON learning.id_images(topic_id);

-- Identification Videos
CREATE TABLE IF NOT EXISTS learning.id_videos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id        UUID NOT NULL REFERENCES learning.identification_topics(id) ON DELETE CASCADE,
    video_url       TEXT NOT NULL,
    title           VARCHAR(255),
    duration        VARCHAR(50)
);

-- Seed sample topics if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM learning.identification_topics LIMIT 1) THEN
        INSERT INTO learning.identification_topics (title, slug, description, category_id, difficulty, duration, quiz_data, checklist) VALUES
        ('Natural vs Artificial Roses', 'rose-id',
         'Learn how to identify real roses from high-quality artificial roses using visual inspection, touch tests, scent evaluation, and expert techniques.',
         (SELECT id FROM learning.id_categories WHERE slug = 'roses'), 'Beginner', '15 min',
         '[{"q":"What is the first thing to check when identifying a rose?","options":["Color","Thorn texture","Price","Vase"],"correct":1},{"q":"Real rose petals feel:","options":["Smooth and plastic","Soft and velvety","Hard and brittle","Sticky"],"correct":1},{"q":"Artificial roses typically have:","options":["Irregular thorns","Moist stems","Uniform plastic thorns","Natural scent"],"correct":2}]',
         '[{"text":"Check the thorns — real thorns are woody and irregular","done":false},{"text":"Smell the petals — real roses have natural fragrance","done":false},{"text":"Examine petal texture — real petals feel velvety","done":false},{"text":"Look at the stem — real stems are fibrous, not wired","done":false},{"text":"Check for pollen on stamens","done":false}]'),

        ('Natural vs Artificial Tulips', 'tulip-id',
         'Master the art of identifying real tulips from artificial replicas. Learn to spot the differences in stem structure, petal behavior, and color patterns.',
         (SELECT id FROM learning.id_categories WHERE slug = 'tulips'), 'Beginner', '12 min',
         '[{"q":"How do real tulip stems feel?","options":["Wired and smooth","Fleshy and firm","Dry and brittle","Hollow plastic"],"correct":1},{"q":"Real tulip petals when gently pulled:","options":["Come off easily","Stay firmly attached","Feel sticky","Crinkle like paper"],"correct":0}]',
         '[{"text":"Check stem — real tulips have thick, fleshy stems","done":false},{"text":"Gently pull a petal — real ones detach easily","done":false},{"text":"Examine color — real tulips have subtle gradients","done":false},{"text":"Feel the weight — real tulips feel heavier","done":false}]'),

        ('Fresh vs Preserved Flowers', 'preserved-vs-fresh',
         'Understand the differences between fresh-cut flowers and preserved blooms. Learn about glycerin treatment, texture changes, and longevity expectations.',
         (SELECT id FROM learning.id_categories WHERE slug = 'preservation'), 'Intermediate', '10 min',
         '[{"q":"Preserved flowers are treated with:","options":["Water only","Glycerin solution","Plastic coating","Chemical preservatives"],"correct":1},{"q":"Preserved flowers typically last:","options":["1-2 weeks","1-3 months","1-3 years","Forever"],"correct":2}]',
         '[{"text":"Feel the petals — preserved petals feel slightly leathery","done":false},{"text":"Check for moisture — preserved flowers are dry","done":false},{"text":"Smell — preserved flowers have no natural scent","done":false},{"text":"Bend test — preserved petals are flexible, not brittle","done":false}]'),

        ('Dried vs Preserved Flowers', 'dried-vs-preserved',
         'Learn to distinguish dried flowers from preserved ones. While both are long-lasting, their care, feel, and appearance are very different.',
         (SELECT id FROM learning.id_categories WHERE slug = 'preservation'), 'Intermediate', '8 min',
         '[{"q":"Dried flowers are typically:","options":["Flexible and soft","Brittle and crunchy","Moist and cool","Sticky to touch"],"correct":1},{"q":"Preserved flowers can last:","options":["1 week","1 month","1-3 years","Indefinitely"],"correct":2}]',
         '[{"text":"Bend test — dried flowers crack, preserved ones flex","done":false},{"text":"Color — dried flowers are more faded","done":false},{"text":"Weight — preserved flowers feel slightly heavier","done":false},{"text":"Touch — preserved flowers feel smooth, dried feel rough","done":false}]'),

        ('Orchid Identification Guide', 'orchid-id',
         'Learn to identify different orchid species and distinguish real orchids from artificial ones. Covers Phalaenopsis, Dendrobium, and Cattleya.',
         (SELECT id FROM learning.id_categories WHERE slug = 'orchids'), 'Beginner', '12 min', NULL,
         '[{"text":"Check the roots — real orchid roots are thick and silvery","done":false},{"text":"Examine leaves — real orchid leaves are thick and waxy","done":false},{"text":"Feel the flowers — real orchid petals are delicate","done":false},{"text":"Look at the base — real orchids grow from bark or moss","done":false}]');
    END IF;
END $$;
