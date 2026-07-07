-- Bouquet Customization System tables

-- Bouquet Styles
CREATE TABLE IF NOT EXISTS marketplace.bouquet_styles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    base_price DECIMAL(10,2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bouquet Wrappings
CREATE TABLE IF NOT EXISTS marketplace.bouquet_wrappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bouquet Ribbons
CREATE TABLE IF NOT EXISTS marketplace.bouquet_ribbons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    colors TEXT[],
    image_url TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bouquet Extras
CREATE TABLE IF NOT EXISTS marketplace.bouquet_extras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Bouquet Designs
CREATE TABLE IF NOT EXISTS marketplace.bouquet_designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    occasion VARCHAR(100),
    style_id UUID REFERENCES marketplace.bouquet_styles(id),
    wrapping_id UUID REFERENCES marketplace.bouquet_wrappings(id),
    ribbon_id UUID REFERENCES marketplace.bouquet_ribbons(id),
    ribbon_color VARCHAR(50),
    subtotal DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bouquet_designs_user ON marketplace.bouquet_designs(user_id);

-- Bouquet Design Items (flowers and extras)
CREATE TABLE IF NOT EXISTS marketplace.bouquet_design_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_id UUID REFERENCES marketplace.bouquet_designs(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_id UUID,
    item_name VARCHAR(255),
    quantity INT DEFAULT 1,
    price_per_unit DECIMAL(10,2) DEFAULT 0,
    color VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bouquet_design_items_design ON marketplace.bouquet_design_items(design_id);

-- Seed bouquet styles
INSERT INTO marketplace.bouquet_styles (name, description, image_url, base_price, sort_order) VALUES
('Classic Bouquet', 'Traditional round arrangement with balanced colors', 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?q=400&auto=format&fit=crop', 15.00, 1),
('Round Bouquet', 'Symmetrical dome-shaped arrangement', 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=400&auto=format&fit=crop', 18.00, 2),
('Cascade Bouquet', 'Waterfall-style flowing arrangement', 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=400&auto=format&fit=crop', 25.00, 3),
('Hand-Tied Bouquet', 'Casual wrapped bouquet with visible stems', 'https://images.unsplash.com/photo-1507290439931-a861b5a38200?q=400&auto=format&fit=crop', 12.00, 4),
('Rustic Bouquet', 'Natural, garden-inspired arrangement', 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?q=400&auto=format&fit=crop', 16.00, 5),
('Luxury Bouquet', 'Premium arrangement with exotic flowers', 'https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=400&auto=format&fit=crop', 35.00, 6),
('Modern Bouquet', 'Contemporary minimalist design', 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=400&auto=format&fit=crop', 20.00, 7),
('Wild Garden Bouquet', 'Loose, natural garden-style arrangement', 'https://images.unsplash.com/photo-1507290439931-a861b5a38200?q=400&auto=format&fit=crop', 18.00, 8)
ON CONFLICT DO NOTHING;

-- Seed wrappings
INSERT INTO marketplace.bouquet_wrappings (name, image_url, price, sort_order) VALUES
('White Paper', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=200&auto=format&fit=crop', 2.00, 1),
('Kraft Paper', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=200&auto=format&fit=crop', 2.50, 2),
('Luxury Black Wrap', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=200&auto=format&fit=crop', 4.00, 3),
('Transparent Wrap', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=200&auto=format&fit=crop', 1.50, 4),
('Floral Print Wrap', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=200&auto=format&fit=crop', 3.00, 5),
('Satin Wrap', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=200&auto=format&fit=crop', 3.50, 6)
ON CONFLICT DO NOTHING;

-- Seed ribbons
INSERT INTO marketplace.bouquet_ribbons (name, colors, price, sort_order) VALUES
('Satin Ribbon', ARRAY['White', 'Red', 'Gold', 'Silver', 'Pink', 'Black'], 1.50, 1),
('Silk Ribbon', ARRAY['White', 'Pink', 'Gold', 'Ivory'], 2.50, 2),
('Burlap Ribbon', ARRAY['Natural', 'White'], 1.00, 3),
('Lace Ribbon', ARRAY['White', 'Ivory', 'Pink'], 3.00, 4)
ON CONFLICT DO NOTHING;

-- Seed extras
INSERT INTO marketplace.bouquet_extras (name, description, image_url, price, sort_order) VALUES
('Greeting Card', 'Personalized message card', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=100&auto=format&fit=crop', 2.00, 1),
('Chocolates', 'Box of premium chocolates', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=100&auto=format&fit=crop', 8.00, 2),
('Teddy Bear', 'Cute plush teddy bear', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=100&auto=format&fit=crop', 12.00, 3),
('Balloon', 'Helium balloon bouquet', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=100&auto=format&fit=crop', 5.00, 4),
('Vase', 'Decorative glass vase', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=100&auto=format&fit=crop', 15.00, 5),
('Gift Box', 'Premium gift box packaging', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=100&auto=format&fit=crop', 10.00, 6)
ON CONFLICT DO NOTHING;
