-- Migration 006: Success Stories Enhancement
-- Adds columns for richer story content

ALTER TABLE community.success_stories
    ADD COLUMN IF NOT EXISTS challenges TEXT,
    ADD COLUMN IF NOT EXISTS lessons_learned TEXT,
    ADD COLUMN IF NOT EXISTS advice TEXT,
    ADD COLUMN IF NOT EXISTS timeline_events JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_success_stories_rating ON community.success_stories(rating DESC);
