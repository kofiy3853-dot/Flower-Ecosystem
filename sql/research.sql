-- =============================================================================
-- Floriculture Research Hub — Schema
-- =============================================================================

-- Research Categories
CREATE TABLE IF NOT EXISTS research.categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL UNIQUE,
    slug            VARCHAR(255) UNIQUE,
    icon            VARCHAR(10),
    description     TEXT,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO research.categories (name, slug, icon, sort_order) VALUES
    ('Plant Biology', 'plant-biology', '🌱', 1),
    ('Flower Breeding', 'flower-breeding', '🌼', 2),
    ('Irrigation & Water', 'irrigation', '💧', 3),
    ('Sustainable Farming', 'sustainable-farming', '🌿', 4),
    ('Pollination', 'pollination', '🐝', 5),
    ('Climate Change', 'climate-change', '🌍', 6),
    ('Plant Diseases', 'plant-diseases', '🦠', 7),
    ('Pest Management', 'pest-management', '🐞', 8),
    ('Floriculture Business', 'floriculture-business', '📈', 9),
    ('Biotechnology', 'biotechnology', '🧪', 10)
ON CONFLICT (name) DO NOTHING;

-- Institutions
CREATE TABLE IF NOT EXISTS research.institutions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    country         VARCHAR(100),
    website         VARCHAR(500),
    logo_url        TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Authors
CREATE TABLE IF NOT EXISTS research.authors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    biography       TEXT,
    institution_id  UUID REFERENCES research.institutions(id) ON DELETE SET NULL,
    profile_image   TEXT,
    orcid           VARCHAR(50),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Research Articles
CREATE TABLE IF NOT EXISTS research.articles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(500) NOT NULL,
    slug            VARCHAR(500) UNIQUE,
    abstract        TEXT,
    content         TEXT,
    publication_date DATE,
    category_id     UUID REFERENCES research.categories(id) ON DELETE SET NULL,
    institution_id  UUID REFERENCES research.institutions(id) ON DELETE SET NULL,
    doi             VARCHAR(100),
    journal         VARCHAR(255),
    volume          VARCHAR(50),
    pages           VARCHAR(50),
    methodology     TEXT,
    key_findings    JSONB,
    practical_apps  TEXT,
    references_list JSONB,
    cover_image     TEXT,
    pdf_path        TEXT,
    status          VARCHAR(20) DEFAULT 'published',
    views           INT DEFAULT 0,
    downloads       INT DEFAULT 0,
    bookmark_count  INT DEFAULT 0,
    submitted_by    UUID REFERENCES auth.users(id),
    approved_by     UUID REFERENCES auth.users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_research_slug ON research.articles(slug);
CREATE INDEX IF NOT EXISTS idx_research_category ON research.articles(category_id);
CREATE INDEX IF NOT EXISTS idx_research_status ON research.articles(status);
CREATE INDEX IF NOT EXISTS idx_research_date ON research.articles(publication_date DESC);

-- Article Authors (many-to-many)
CREATE TABLE IF NOT EXISTS research.article_authors (
    article_id      UUID NOT NULL REFERENCES research.articles(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL REFERENCES research.authors(id) ON DELETE CASCADE,
    sort_order      INT DEFAULT 0,
    PRIMARY KEY (article_id, author_id)
);

-- Keywords
CREATE TABLE IF NOT EXISTS research.keywords (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword         VARCHAR(255) NOT NULL UNIQUE
);

-- Article Keywords (many-to-many)
CREATE TABLE IF NOT EXISTS research.article_keywords (
    article_id      UUID NOT NULL REFERENCES research.articles(id) ON DELETE CASCADE,
    keyword_id      UUID NOT NULL REFERENCES research.keywords(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, keyword_id)
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS research.bookmarks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id      UUID NOT NULL REFERENCES research.articles(id) ON DELETE CASCADE,
    folder          VARCHAR(255) DEFAULT 'Default',
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON research.bookmarks(user_id);

-- Research Files (PDFs, supplementary materials)
CREATE TABLE IF NOT EXISTS research.files (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id      UUID NOT NULL REFERENCES research.articles(id) ON DELETE CASCADE,
    file_path       TEXT NOT NULL,
    file_name       VARCHAR(255),
    file_type       VARCHAR(50),
    file_size       INT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Article Views (for analytics)
CREATE TABLE IF NOT EXISTS research.article_views (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id      UUID NOT NULL REFERENCES research.articles(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    viewed_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_article_views_article ON research.article_views(article_id);

-- Related Articles
CREATE TABLE IF NOT EXISTS research.related_articles (
    article_id      UUID NOT NULL REFERENCES research.articles(id) ON DELETE CASCADE,
    related_id      UUID NOT NULL REFERENCES research.articles(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, related_id)
);

-- Seed sample research if empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM research.articles LIMIT 1) THEN
        -- Get a category ID
        INSERT INTO research.articles (title, slug, abstract, publication_date, category_id, status, key_findings, practical_apps, methodology)
        SELECT
            'Impact of Climate Change on Flower Production in Tropical Regions',
            'climate-change-tropical-flowers',
            'This study examines how shifting weather patterns affect commercial flower production in tropical regions, analyzing data from 50 farms across 5 countries over 3 years.',
            '2024-03-15',
            id,
            'published',
            '["Average yield decreased 12% in regions with irregular rainfall", "Heat-tolerant varieties showed 23% better survival rates", "Drip irrigation reduced water waste by 40%"]'::jsonb,
            'Commercial growers should consider heat-tolerant cultivars and invest in water-efficient irrigation systems. Early warning systems for weather changes can help protect crops.',
            'Longitudinal study with controlled and test groups across 50 farms in Ghana, Kenya, Colombia, Netherlands, and Japan.'
        FROM research.categories WHERE slug = 'climate-change' LIMIT 1;

        INSERT INTO research.articles (title, slug, abstract, publication_date, category_id, status, key_findings, practical_apps, methodology)
        SELECT
            'Advances in Rose Breeding: Disease Resistance and Fragrance Optimization',
            'rose-breeding-advances',
            'A comprehensive review of modern rose breeding techniques combining molecular markers with traditional selection to develop disease-resistant varieties while maintaining fragrance profiles.',
            '2024-01-20',
            id,
            'published',
            '["Molecular markers can predict disease resistance with 87% accuracy", "Fragrance genes can be stacked with resistance genes", "New cultivars showed 95% black spot resistance"]'::jsonb,
            'Breeders can use marker-assisted selection to accelerate development of disease-resistant roses. Commercial growers should trial new resistant cultivars to reduce fungicide use.',
            'Literary review of 150 studies combined with original breeding experiments over 5 years.'
        FROM research.categories WHERE slug = 'flower-breeding' LIMIT 1;

        INSERT INTO research.articles (title, slug, abstract, publication_date, category_id, status, key_findings, practical_apps, methodology)
        SELECT
            'Sustainable Water Management in Commercial Floriculture',
            'sustainable-water-floriculture',
            'Evaluation of water-saving technologies in flower production, comparing drip irrigation, rainwater harvesting, and recirculation systems across different climate zones.',
            '2024-06-01',
            id,
            'published',
            '["Drip irrigation saves 30-50% water vs flood irrigation", "Recirculation systems reduce water use by 60%", "ROI achieved within 2-3 seasons"]'::jsonb,
            'Growers should adopt drip irrigation as baseline technology. Recirculation systems are viable for greenhouse operations. Government subsidies can accelerate adoption.',
            'Comparative analysis across 30 commercial farms with different irrigation systems over 2 growing seasons.'
        FROM research.categories WHERE slug = 'irrigation' LIMIT 1;
    END IF;
END $$;
