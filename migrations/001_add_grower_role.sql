-- Migration: Add GROWER to user_role enum
-- Run: psql -U postgres -d flower_ecosystem -f migrations/001_add_grower_role.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GROWER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE user_role ADD VALUE 'GROWER' AFTER 'FLORIST';
    END IF;
END $$;
