-- =============================================================================
-- Garden Journal — Schema
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/garden-journal.sql
-- =============================================================================

-- Create schema if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'garden') THEN
        CREATE SCHEMA garden;
    END IF;
END $$;

-- Garden Journal Entries
CREATE TABLE IF NOT EXISTS garden.journal_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT,
    entry_date      DATE DEFAULT CURRENT_DATE,
    weather         VARCHAR(100),
    temperature     VARCHAR(50),
    mood            VARCHAR(50),
    garden_area     VARCHAR(100),
    is_private      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON garden.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON garden.journal_entries(entry_date DESC);

-- Journal Photos
CREATE TABLE IF NOT EXISTS garden.journal_photos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id        UUID NOT NULL REFERENCES garden.journal_entries(id) ON DELETE CASCADE,
    image_url       TEXT NOT NULL,
    caption         VARCHAR(255),
    plant_name      VARCHAR(255),
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journal_photos_entry ON garden.journal_photos(entry_id);

-- Journal Plants (plants tracked in entries)
CREATE TABLE IF NOT EXISTS garden.journal_plants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id        UUID NOT NULL REFERENCES garden.journal_entries(id) ON DELETE CASCADE,
    plant_name      VARCHAR(255) NOT NULL,
    action          VARCHAR(100),
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journal_plants_entry ON garden.journal_plants(entry_id);

-- Journal Reminders
CREATE TABLE IF NOT EXISTS garden.journal_reminders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    reminder_date   DATE NOT NULL,
    plant_name      VARCHAR(255),
    task_type       VARCHAR(100),
    is_completed    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journal_reminders_user ON garden.journal_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_reminders_date ON garden.journal_reminders(reminder_date);
