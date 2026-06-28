-- =============================================================================
-- Auth Fixes Migration
-- =============================================================================

-- Token blacklist for logout / forced invalidation
CREATE TABLE IF NOT EXISTS auth.token_blacklist (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash  TEXT NOT NULL,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blacklist_hash ON auth.token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON auth.token_blacklist(expires_at);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS auth.email_verifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verify_token ON auth.email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON auth.email_verifications(user_id);

-- Add email_verified column to users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Cleanup job: delete expired blacklist entries (run periodically)
-- INSERT INTO auth.token_blacklist cleanup handled in application code

-- Add password_changed_at for user-level token invalidation
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
