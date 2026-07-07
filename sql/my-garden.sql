-- My Garden tables

CREATE TABLE IF NOT EXISTS learning.user_gardens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    flower_id UUID NOT NULL REFERENCES learning.flowers(id) ON DELETE CASCADE,
    nickname VARCHAR(100),
    location VARCHAR(100),
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_watered TIMESTAMP,
    last_fertilized TIMESTAMP,
    last_pruned TIMESTAMP,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'healthy',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, flower_id)
);

CREATE INDEX IF NOT EXISTS idx_user_gardens_user ON learning.user_gardens(user_id);

-- Garden Care Logs
CREATE TABLE IF NOT EXISTS learning.garden_care_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garden_id UUID NOT NULL REFERENCES learning.user_gardens(id) ON DELETE CASCADE,
    care_type VARCHAR(50) NOT NULL,
    notes TEXT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_garden_care_logs_garden ON learning.garden_care_logs(garden_id);

-- Garden Photos (Growth Journal)
CREATE TABLE IF NOT EXISTS learning.garden_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garden_id UUID NOT NULL REFERENCES learning.user_gardens(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    height VARCHAR(50),
    notes TEXT,
    bloom_date DATE,
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_garden_photos_garden ON learning.garden_photos(garden_id);
