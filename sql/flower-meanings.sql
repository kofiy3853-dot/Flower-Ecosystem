-- Flower Meanings table
CREATE TABLE IF NOT EXISTS learning.flower_meanings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flower_id UUID REFERENCES learning.flowers(id) ON DELETE CASCADE,
    meaning VARCHAR(255) NOT NULL,
    description TEXT,
    symbolism TEXT,
    history TEXT,
    color_meanings JSONB,
    occasions TEXT[],
    cultural_meanings JSONB,
    image_url TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flower_meanings_flower ON learning.flower_meanings(flower_id);
CREATE INDEX IF NOT EXISTS idx_flower_meanings_meaning ON learning.flower_meanings(meaning);
CREATE INDEX IF NOT EXISTS idx_flower_meanings_occasions ON learning.flower_meanings USING GIN(occasions);

-- Seed sample meanings
INSERT INTO learning.flower_meanings (flower_id, meaning, description, occasions, color_meanings, is_featured)
SELECT f.id, 
    CASE f.common_name
        WHEN 'Rose' THEN 'Love & Passion'
        WHEN 'Sunflower' THEN 'Adoration & Loyalty'
        WHEN 'Tulip' THEN 'Perfect Love'
        WHEN 'Orchid' THEN 'Luxury & Strength'
        WHEN 'Lily' THEN 'Purity & Renewal'
        WHEN 'Dahlia' THEN 'Commitment & Bond'
        WHEN 'Chrysanthemum' THEN 'Joy & Optimism'
        WHEN 'Peony' THEN 'Prosperity & Romance'
        WHEN 'Hydrangea' THEN 'Gratitude & Grace'
        WHEN 'Lavender' THEN 'Devotion & Serenity'
    END,
    CASE f.common_name
        WHEN 'Rose' THEN 'Roses are the quintessential symbol of love. Their beauty and fragrance have inspired poets and lovers for centuries.'
        WHEN 'Sunflower' THEN 'Sunflowers symbolize adoration, loyalty, and longevity. Their tendency to follow the sun represents steadfast devotion.'
        WHEN 'Tulip' THEN 'Tulips represent perfect love and are one of the most popular spring flowers. They symbolize comfort and happiness.'
        WHEN 'Orchid' THEN 'Orchids symbolize luxury, beauty, and strength. They are often given to convey refined taste and elegance.'
        WHEN 'Lily' THEN 'Lilies symbolize purity, renewal, and the restored innocence of the soul. They are popular at weddings and celebrations.'
        WHEN 'Dahlia' THEN 'Dahlias represent commitment, kindness, and an eternal bond. They are perfect for celebrating lasting relationships.'
        WHEN 'Chrysanthemum' THEN 'Chrysanthemums symbolize joy, optimism, and long life. They are celebrated in many cultures around the world.'
        WHEN 'Peony' THEN 'Peonies symbolize prosperity, romance, and good fortune. They are beloved wedding flowers in many cultures.'
        WHEN 'Hydrangea' THEN 'Hydrangeas symbolize gratitude, grace, and heartfelt emotion. They convey understanding and appreciation.'
        WHEN 'Lavender' THEN 'Lavender symbolizes devotion, serenity, and grace. Its calming scent is associated with relaxation and peace.'
    END,
    CASE f.common_name
        WHEN 'Rose' THEN ARRAY['Valentine''s Day', 'Anniversary', 'Wedding', 'Birthday', 'Sympathy']
        WHEN 'Sunflower' THEN ARRAY['Birthday', 'Congratulations', 'Get Well', 'Thank You']
        WHEN 'Tulip' THEN ARRAY['Anniversary', 'Birthday', 'Congratulations', 'Get Well']
        WHEN 'Orchid' THEN ARRAY['Birthday', 'Anniversary', 'Congratulations', 'Housewarming']
        WHEN 'Lily' THEN ARRAY['Wedding', 'Sympathy', 'Anniversary', 'New Baby']
        WHEN 'Dahlia' THEN ARRAY['Anniversary', 'Birthday', 'Congratulations']
        WHEN 'Chrysanthemum' THEN ARRAY['Birthday', 'Get Well', 'Sympathy', 'Thank You']
        WHEN 'Peony' THEN ARRAY['Wedding', 'Anniversary', 'Housewarming']
        WHEN 'Hydrangea' THEN ARRAY['Wedding', 'Thank You', 'Get Well', 'Congratulations']
        WHEN 'Lavender' THEN ARRAY['Get Well', 'Thank You', 'Relaxation']
    END,
    CASE f.common_name
        WHEN 'Rose' THEN '{"red":"Love & Romance","white":"Purity & New Beginnings","yellow":"Friendship & Joy","pink":"Gratitude & Admiration","orange":"Energy & Enthusiasm","purple":"Enchantment & Royalty"}'::jsonb
        WHEN 'Sunflower' THEN '{"yellow":"Adoration & Loyalty","orange":"Energy & Passion"}'::jsonb
        WHEN 'Tulip' THEN '{"red":"True Love","pink":"Caring","white":"Forgiveness","yellow":"Cheerful Thoughts","purple":"Royalty"}'::jsonb
        WHEN 'Orchid' THEN '{"white":"Purity & Elegance","pink":"Femininity","purple":"Respect & Admiration","yellow":"Friendship"}'::jsonb
        WHEN 'Lily' THEN '{"white":"Purity & Innocence","pink":"Prosperity & Abundance","orange":"Confidence & Pride","yellow":"Gratitude"}'::jsonb
        ELSE '{}'::jsonb
    END,
    TRUE
FROM learning.flowers f
WHERE f.common_name IN ('Rose', 'Sunflower', 'Tulip', 'Orchid', 'Lily', 'Dahlia', 'Chrysanthemum', 'Peony', 'Hydrangea', 'Lavender')
ON CONFLICT DO NOTHING;
