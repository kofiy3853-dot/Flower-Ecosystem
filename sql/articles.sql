-- =============================================================================
-- Articles & Guides — Schema Extension
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/articles.sql
-- =============================================================================

-- Article Categories
CREATE TABLE IF NOT EXISTS learning.article_categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) UNIQUE,
    icon            VARCHAR(10),
    description     TEXT,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO learning.article_categories (name, slug, icon, sort_order) VALUES
    ('Flower Identification', 'flower-identification', '🌹', 1),
    ('Medicinal Flowers', 'medicinal-flowers', '🌿', 2),
    ('Floristry', 'floristry', '💐', 3),
    ('Gardening', 'gardening', '🌱', 4),
    ('Palm Trees', 'palm-trees', '🌴', 5),
    ('Flower Care', 'flower-care', '🌸', 6),
    ('Perfume Flowers', 'perfume-flowers', '🧴', 7),
    ('Landscaping', 'landscaping', '🏡', 8),
    ('Edible Flowers', 'edible-flowers', '🍵', 9)
ON CONFLICT (name) DO NOTHING;

-- Articles (enhanced)
CREATE TABLE IF NOT EXISTS learning.articles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE,
    excerpt         TEXT,
    content         TEXT NOT NULL,
    thumbnail_url   TEXT,
    author_name     VARCHAR(255),
    author_title    VARCHAR(255),
    author_avatar   TEXT,
    category_id     INT REFERENCES learning.article_categories(id) ON DELETE SET NULL,
    reading_time    INT DEFAULT 5,
    is_featured     BOOLEAN DEFAULT FALSE,
    is_published    BOOLEAN DEFAULT TRUE,
    views           INTEGER DEFAULT 0,
    table_of_contents JSONB,
    published_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON learning.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_category ON learning.articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON learning.articles(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_articles_published ON learning.articles(published_at DESC);

-- Article Images (inline content images)
CREATE TABLE IF NOT EXISTS learning.article_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id      UUID NOT NULL REFERENCES learning.articles(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    caption         VARCHAR(255),
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_article_images_article ON learning.article_images(article_id);

-- Article Videos
CREATE TABLE IF NOT EXISTS learning.article_videos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id      UUID NOT NULL REFERENCES learning.articles(id) ON DELETE CASCADE,
    video_url       TEXT NOT NULL,
    title           VARCHAR(255),
    duration        VARCHAR(50),
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_article_videos_article ON learning.article_videos(article_id);

-- Article Downloads (PDFs, checklists, etc.)
CREATE TABLE IF NOT EXISTS learning.article_downloads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id      UUID NOT NULL REFERENCES learning.articles(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    file_url        TEXT NOT NULL,
    file_type       VARCHAR(50),
    file_size       VARCHAR(50),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_article_downloads_article ON learning.article_downloads(article_id);

-- Seed sample articles if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM learning.articles LIMIT 1) THEN
        INSERT INTO learning.articles (title, slug, excerpt, content, thumbnail_url, author_name, author_title, category_id, reading_time, is_featured, table_of_contents) VALUES
        ('Natural vs Artificial Flowers',
         'natural-vs-artificial-flowers',
         'A comprehensive guide to understanding the differences between natural and artificial flowers, including identification tips, advantages, and best use cases.',
         '## What Are Natural Flowers?

Natural flowers are living organisms that grow from plants, requiring water, sunlight, and nutrients to thrive. They offer authentic beauty, natural fragrance, and the satisfaction of nurturing something alive.

## What Are Artificial Flowers?

Artificial flowers are man-made replicas crafted from materials like silk, polyester, plastic, or latex. Modern manufacturing techniques have made them remarkably realistic, often requiring close inspection to distinguish from natural blooms.

## Side-by-Side Comparison

| Feature | Natural | Artificial |
|---------|---------|------------|
| Fragrance | Yes, natural | No or synthetic |
| Lifespan | 5-14 days | Years |
| Maintenance | High | Low |
| Cost (long-term) | Higher | Lower |
| Environmental | Biodegradable | Plastic waste |
| Allergies | May trigger | Hypoallergenic |

## Advantages of Natural Flowers

- Authentic beauty and fragrance
- Support local growers and ecosystems
- Biodegradable and eco-friendly
- Unique, one-of-a-kind arrangements
- Therapeutic benefits of gardening

## Advantages of Artificial Flowers

- Long-lasting with minimal maintenance
- Cost-effective for permanent decor
- Available year-round regardless of season
- Hypoallergenic — safe for allergy sufferers
- Ideal for difficult environments (outdoor, low light)

## How to Identify Natural vs Artificial

### Touch Test
Natural petals feel soft, slightly waxy, and may have tiny imperfections. Artificial petals feel uniform, smooth, and may feel slightly stiff or plastic-like.

### Smell Test
Natural flowers have a distinct, multi-layered fragrance. Even scented artificial flowers produce only a surface-level aroma that fades quickly.

### Stem Examination
Natural stems are fibrous, moist when freshly cut, and have irregular thorns or nodes. Artificial stems are smooth, often wire-based, with uniform textures.

### Petal Analysis
Look for subtle color gradients in natural petals — they rarely have perfectly uniform coloring. Artificial petals often have printed or dyed patterns that appear too perfect.

## Best Use Cases

### Choose Natural For:
- Weddings and special events
- Gift bouquets
- Home arrangements where fragrance matters
- Photography and styling

### Choose Artificial For:
- Office and commercial spaces
- Outdoor installations
- Allergy-sensitive environments
- Long-term home decor

## Conclusion

Both natural and artificial flowers have their place in modern floristry. The best choice depends on your specific needs, budget, and values. Many florists and designers use a combination of both to achieve the perfect balance of beauty, practicality, and sustainability.',
         'https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=800&auto=format&fit=crop',
         'Sarah Chen', 'Master Florist',
         (SELECT id FROM learning.article_categories WHERE slug = 'flower-identification'),
         8, true,
         '[{"id":"s1","title":"What Are Natural Flowers?"},{"id":"s2","title":"What Are Artificial Flowers?"},{"id":"s3","title":"Side-by-Side Comparison"},{"id":"s4","title":"Advantages of Natural Flowers"},{"id":"s5","title":"Advantages of Artificial Flowers"},{"id":"s6","title":"How to Identify Natural vs Artificial"},{"id":"s7","title":"Best Use Cases"},{"id":"s8","title":"Conclusion"}]'),

        ('Top 10 Medicinal Flowers You Should Know',
         'top-10-medicinal-flowers',
         'Discover the healing properties of common flowers and how to use them for natural remedies and wellness.',
         '## 1. Chamomile (Matricaria chamomilla)

Chamomile is one of the most widely used medicinal flowers. Its calming properties make it ideal for teas that promote sleep and reduce anxiety. It also has anti-inflammatory benefits for skin conditions.

## 2. Lavender (Lavandula)

Lavender is renowned for its relaxing aroma. Used in aromatherapy, it helps reduce stress, improve sleep quality, and relieve headaches. Lavender oil is also antiseptic and can help heal minor burns.

## 3. Hibiscus (Hibiscus sabdariffa)

Hibiscus tea is rich in antioxidants and vitamin C. Studies show it may help lower blood pressure and cholesterol levels. It also supports liver health and has natural diuretic properties.

## 4. Echinacea (Echinacea purpurea)

Echinacea is famous for boosting the immune system. It is commonly used to prevent and treat colds and flu. The flower contains compounds that stimulate white blood cell production.

## 5. Calendula (Calendula officinalis)

Calendula has powerful anti-inflammatory and wound-healing properties. It is used in salves and creams to treat skin irritations, minor cuts, and burns. It also has antifungal benefits.

## 6. St. John''s Wort (Hypericum perforatum)

This bright yellow flower is widely used for treating mild to moderate depression. It works by increasing serotonin levels in the brain. Also used for nerve pain and menopausal symptoms.

## 7. Elderflower (Sambucus nigra)

Elderflower has antiviral and anti-inflammatory properties. It is commonly used in syrups and teas to treat colds, sinus infections, and hay fever. It also supports skin health.

## 8. Rose (Rosa spp.)

Rose petals and rose oil have been used in medicine for centuries. Rose water soothes skin irritation, while rose tea aids digestion and reduces menstrual cramps. Rose hips are rich in vitamin C.

## 9. Jasmine (Jasminum)

Jasmine tea is known for its calming effects. The scent of jasmine reduces anxiety and promotes better sleep. In traditional medicine, jasmine is used to treat skin conditions and digestive issues.

## 10. Peony (Paeonia)

Peony root has been used in traditional Chinese medicine for thousands of years. It helps regulate menstrual cycles, reduce inflammation, and support liver function. Peony tea also aids relaxation.

## Safety Note

Always consult a healthcare professional before using flowers medicinally. Some flowers can interact with medications or cause allergic reactions. Use organic, pesticide-free flowers for medicinal preparations.',
         'https://images.unsplash.com/photo-1471899236350-e3016bf1e69e?q=80&w=800&auto=format&fit=crop',
         'Dr. Amara Singh', 'Herbal Medicine Specialist',
         (SELECT id FROM learning.article_categories WHERE slug = 'medicinal-flowers'),
         10, true,
         '[{"id":"s1","title":"Chamomile"},{"id":"s2","title":"Lavender"},{"id":"s3","title":"Hibiscus"},{"id":"s4","title":"Echinacea"},{"id":"s5","title":"Calendula"},{"id":"s6","title":"St. John''s Wort"},{"id":"s7","title":"Elderflower"},{"id":"s8","title":"Rose"},{"id":"s9","title":"Jasmine"},{"id":"s10","title":"Peony"}]'),

        ('Rose Care Guide: Keep Your Roses Fresh for Weeks',
         'rose-care-guide',
         'Learn the secrets to extending the vase life of your premium cut roses and keeping them fresh for up to 2 weeks.',
         '## Choosing the Right Roses

Look for roses with firm petals and tight buds. Avoid flowers with brown spots, wilting petals, or open blooms that are past their prime. The stem should be green and firm, not slimy or dried out.

## Preparing Your Vase

Start with a clean vase — bacteria is the number one enemy of cut roses. Wash with soap and hot water, then rinse thoroughly. Fill with lukewarm water and add the provided flower food packet.

## Cutting the Stems

Use sharp, clean floral scissors. Cut stems at a 45-degree angle under running water or in a bowl of water. This prevents air bubbles from blocking water uptake. Remove 1-2 inches from the stem.

## Removing Foliage

Strip all leaves that will sit below the waterline. Submerged leaves decompose quickly, promoting bacterial growth that shortens flower life. Leave only the top leaves for photosynthesis.

## Water Changes

Change the water every 2-3 days. Each time, re-cut the stems at a 45-degree angle. Use fresh flower food with each water change. If you don''t have flower food, add a teaspoon of sugar and a few drops of bleach.

## Placement

Keep roses away from direct sunlight, heating vents, and fruit bowls. Fruit releases ethylene gas, which accelerates wilting. The ideal temperature is 65-72°F (18-22°C).

## Reviving Wilted Roses

If your roses wilt, try the emergency revival method: cut stems underwater, submerge the entire flower in lukewarm water for 1-2 hours, then re-arrange in fresh water. This can often bring roses back to life.

## Quick Reference

| Day | Action |
|-----|--------|
| Day 1 | Trim stems, add flower food, arrange |
| Day 3 | Change water, re-trim stems |
| Day 5 | Change water, remove any spent blooms |
| Day 7 | Change water, re-trim stems |
| Day 9-14 | Roses should still look beautiful |

## Pro Tips

- Mist petals lightly with water for extra hydration
- Add a copper penny to the water — copper has antimicrobial properties
- Keep roses in the refrigerator overnight for longest life
- Avoid placing near ripening fruits',
         'https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=800&auto=format&fit=crop',
         'Flora Williams', 'Senior Florist',
         (SELECT id FROM learning.article_categories WHERE slug = 'flower-care'),
         8, true,
         '[{"id":"s1","title":"Choosing the Right Roses"},{"id":"s2","title":"Preparing Your Vase"},{"id":"s3","title":"Cutting the Stems"},{"id":"s4","title":"Removing Foliage"},{"id":"s5","title":"Water Changes"},{"id":"s6","title":"Placement"},{"id":"s7","title":"Reviving Wilted Roses"},{"id":"s8","title":"Quick Reference"},{"id":"s9","title":"Pro Tips"}]'),

        ('Flowers Used in Luxury Perfumes',
         'flowers-used-in-luxury-perfumes',
         'Explore the exquisite flowers that form the backbone of the world''s most prestigious fragrances.',
         '## The Art of Floral Perfumery

Flowers have been the foundation of perfumery for thousands of years. The extraction of scent from petals is both an art and a science, requiring thousands of flowers to produce just a few grams of precious essential oil.

## 1. Rose (Rosa damascena)

The queen of flowers in perfumery. It takes approximately 60,000 roses to produce just 1 gram of rose otto essential oil. The scent is rich, complex, and deeply romantic. Used in classics like Chanel No. 5 and modern masterpieces.

## 2. Jasmine (Jasminum grandiflorum)

Known as the "king of flowers" in perfumery. Jasmine is harvested at dawn when its scent is most potent. It has a rich, sweet, intoxicating aroma. Found in Dior J''adore and many other iconic fragrances.

## 3. Tuberose (Polianthes tuberosa)

One of the most intensely fragrant flowers in the world. Tuberose has a creamy, sweet, almost narcotic scent. It is a key ingredient in Fracas by Robert Piguet and many luxury niche fragrances.

## 4. Ylang-Ylang (Cananga odorata)

Native to Southeast Asia, ylang-ylang has a exotic, sweet, floral scent with hints of jasmine and banana. It is a prominent note in Chanel No. 5 and is used in many tropical-inspired fragrances.

## 5. Iris (Iris pallida)

The root of the iris (orris root) is used in perfumery, not the flower. It has a powdery, violet-like scent that adds depth and sophistication. It is one of the most expensive perfume ingredients.

## 6. Lily of the Valley (Convallaria majalis)

A delicate, fresh, green-floral scent that evokes spring. Due to its fleeting nature on skin, synthetic versions (Muguet) are commonly used. Diorissimo by Dior was the first to capture this scent.

## 7. Peony (Paeonia)

A light, fresh, slightly fruity floral scent. Peony is increasingly popular in modern perfumery for its youthful, romantic character. Found in many contemporary designer fragrances.

## Extraction Methods

| Method | Flowers Needed | Yield |
|--------|---------------|-------|
| Steam Distillation | 3,000-5,000 kg | 1 kg essential oil |
| Enfleurage | 3,000 kg | 1 kg absolute |
| Solvent Extraction | 1,000 kg | 1 kg absolute |
| CO2 Extraction | 500 kg | 1 kg extract |

## Conclusion

The flowers used in luxury perfumes represent some of nature''s most precious creations. Their scents have inspired artisans for centuries and continue to define the art of fragrance.',
         'https://images.unsplash.com/photo-1471899236350-e3016bf1e69e?q=80&w=800&auto=format&fit=crop',
         'Emma Laurent', 'Fragrance Specialist',
         (SELECT id FROM learning.article_categories WHERE slug = 'perfume-flowers'),
         9, true,
         '[{"id":"s1","title":"The Art of Floral Perfumery"},{"id":"s2","title":"Rose"},{"id":"s3","title":"Jasmine"},{"id":"s4","title":"Tuberose"},{"id":"s5","title":"Ylang-Ylang"},{"id":"s6","title":"Iris"},{"id":"s7","title":"Lily of the Valley"},{"id":"s8","title":"Peony"},{"id":"s9","title":"Extraction Methods"},{"id":"s10","title":"Conclusion"}]'),

        ('Beginner Guide to Palm Trees',
         'beginner-guide-to-palm-trees',
         'Everything you need to know about growing, identifying, and caring for palm trees in your garden or home.',
         '## Why Palm Trees?

Palm trees bring a tropical, vacation-like atmosphere to any space. They are versatile plants that can thrive both indoors and outdoors, depending on the species. With over 2,500 species worldwide, there''s a palm for every climate and situation.

## Popular Indoor Palm Trees

### Areca Palm (Dypsis lutescens)
The most popular indoor palm. It''s air-purifying, pet-safe, and relatively easy to care for. It grows 6-7 feet tall indoors and prefers bright, indirect light.

### Parlor Palm (Chamaedorea elegans)
A compact, slow-growing palm perfect for small spaces. It tolerates low light well, making it ideal for offices and bedrooms.

### Majesty Palm (Ravenea rivularis)
An elegant palm with arching fronds. It needs more light and water than other indoor palms but rewards you with a tropical look.

## Outdoor Palm Trees

### Coconut Palm (Cocos nucifera)
The iconic tropical palm. Requires full sun, warm temperatures, and well-draining soil. Not frost-tolerant.

### Date Palm (Phoenix dactylifera)
A majestic palm that produces edible dates. It''s drought-tolerant once established and can handle light frost.

### Royal Palm (Roystonea regia)
One of the most showy palms with a smooth, cement-like trunk and a crown of large, feathery fronds.

## Basic Care Requirements

| Factor | Indoor Palms | Outdoor Palms |
|--------|-------------|---------------|
| Light | Bright, indirect | Full sun to partial shade |
| Water | When top inch is dry | Deep watering weekly |
| Temperature | 65-80°F | Varies by species |
| Humidity | 50%+ preferred | Natural humidity |
| Fertilizer | Monthly in growing season | 2-3 times per year |

## Common Problems

- **Brown tips**: Usually caused by low humidity or over-fertilizing
- **Yellow leaves**: Can indicate overwatering or poor drainage
- **Drooping fronds**: Often a sign of underwatering or root rot
- **Pests**: Watch for spider mites, mealybugs, and scale insects

## Tips for Success

1. Choose the right species for your light conditions
2. Don''t overwater — most palms prefer to dry out slightly between waterings
3. Mist indoor palms regularly to increase humidity
4. Fertilize during the growing season (spring and summer)
5. Repot every 2-3 years or when roots circle the pot',
         'https://images.unsplash.com/photo-1567691482090-4cc36f5721f6?q=80&w=800&auto=format&fit=crop',
         'James Ofori', 'Botanical Expert',
         (SELECT id FROM learning.article_categories WHERE slug = 'palm-trees'),
         7, false,
         '[{"id":"s1","title":"Why Palm Trees?"},{"id":"s2","title":"Popular Indoor Palm Trees"},{"id":"s3","title":"Outdoor Palm Trees"},{"id":"s4","title":"Basic Care Requirements"},{"id":"s5","title":"Common Problems"},{"id":"s6","title":"Tips for Success"}]');
    END IF;
END $$;
