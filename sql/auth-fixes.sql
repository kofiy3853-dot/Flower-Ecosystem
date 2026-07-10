-- =============================================================================
-- Auth Security Migration
-- =============================================================================
-- Run with: psql -U postgres -d flower_ecosystem -f sql/auth-fixes.sql
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

-- Add password_changed_at for user-level token invalidation
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- 2FA / TOTP columns
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

-- Password history for reuse prevention
CREATE TABLE IF NOT EXISTS auth.password_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_history_user ON auth.password_history(user_id);

-- Refresh tokens for token rotation
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    revoked     BOOLEAN DEFAULT FALSE,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON auth.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON auth.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON auth.refresh_tokens(expires_at);

-- Sessions tracking
CREATE TABLE IF NOT EXISTS auth.sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_agent      TEXT,
    ip_address      INET,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL,
    last_activity   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth.sessions(expires_at);

-- Login attempts tracking for account lockout
CREATE TABLE IF NOT EXISTS auth.login_attempts (
    email           TEXT PRIMARY KEY,
    failed_attempts INTEGER DEFAULT 0,
    last_attempt    TIMESTAMP,
    locked_until    TIMESTAMP
);

-- Login attempt history for audit
CREATE TABLE IF NOT EXISTS auth.login_attempts_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    success         BOOLEAN NOT NULL,
    failure_reason  TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON auth.login_attempts_history(email);
CREATE INDEX IF NOT EXISTS idx_login_history_created ON auth.login_attempts_history(created_at);

-- Password history for reuse prevention
CREATE TABLE IF NOT EXISTS auth.password_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_history_user ON auth.password_history(user_id);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS auth.email_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token           TEXT UNIQUE NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_verify_token ON auth.email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON auth.email_verifications(user_id);

-- Add email_verified column to users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Add 2FA columns to users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

-- Add password_changed_at for user-level token invalidation
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Password reset tokens
CREATE TABLE IF NOT EXISTS auth.password_resets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token       TEXT UNIQUE NOT NULL,
    email       TEXT NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON auth.password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON auth.password_resets(email);

-- Password history for reuse prevention
CREATE TABLE IF NOT EXISTS auth.password_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_history_user ON auth.password_history(user_id);

-- Refresh tokens for token rotation
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON auth.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON auth.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON auth.refresh_tokens(expires_at);

-- Sessions tracking
CREATE TABLE IF NOT EXISTS auth.sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_agent      TEXT,
    ip_address      INET,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL,
    last_activity   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth.sessions(expires_at);

-- Token blacklist for logout / forced invalidation
CREATE TABLE IF NOT EXISTS auth.token_blacklist (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash      TEXT NOT NULL,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blacklist_hash ON auth.token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON auth.token_blacklist(expires_at);

-- Add 2FA columns to users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

-- Add password_changed_at for user-level token invalidation
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Email verification tokens
CREATE TABLE IF NOT EXISTS auth.email_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token           TEXT UNIQUE NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_verify_token ON auth.email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON auth.email_verifications(user_id);

-- Cleanup job: delete expired blacklist entries (run periodically)
-- INSERT INTO auth.token_blacklist cleanup handled in application code

-- Password reset tokens
CREATE TABLE IF NOT EXISTS auth.password_resets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token           TEXT UNIQUE NOT NULL,
    email           TEXT NOT NULL,
    used            BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON auth.password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON auth.password_resets(email);

-- Password history for reuse prevention
CREATE TABLE IF NOT EXISTS auth.password_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_history_user ON auth.password_history(user_id);

-- Refresh tokens for token rotation
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON auth.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON auth.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON auth.refresh_tokens(expires_at);

-- Sessions tracking
CREATE TABLE IF NOT EXISTS auth.sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_agent      TEXT,
    ip_address      INET,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL,
    last_activity   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth.sessions(expires_at);

-- Token blacklist for logout / forced invalidation
CREATE TABLE IF NOT EXISTS auth.token_blacklist (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash      TEXT NOT NULL,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blacklist_hash ON auth.token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON auth.token_blacklist(expires_at);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS auth.email_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token           TEXT UNIQUE NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_verify_token ON auth.email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON auth.email_verifications(user_id);

-- Add email_verified column to users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Cleanup job: delete expired blacklist entries (run periodically)
-- INSERT INTO auth.token_blacklist cleanup handled in application code

-- Add password_changed_at for user-level token invalidation
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Password reset tokens
CREATE TABLE IF NOT EXISTS auth.password_resets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token           TEXT UNIQUE NOT NULL,
    email           TEXT NOT NULL,
    used            BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON auth.password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON auth.password_resets(email);

-- Password history for reuse prevention
CREATE TABLE IF NOT EXISTS auth.password_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_history_user ON auth.password_history(user_id);

-- Refresh tokens for token rotation
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON auth.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON auth.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON auth.refresh_tokens(expires_at);

-- Sessions tracking
CREATE TABLE IF NOT EXISTS auth.sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_agent      TEXT,
    ip_address      INET,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL,
    last_activity   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth.sessions(expires_at);

-- Token blacklist for logout / forced invalidation
CREATE TABLE IF NOT EXISTS auth.token_blacklist (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash      TEXT NOT NULL,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blacklist_hash ON auth.token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON auth.token_blacklist(expires_at);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS auth.email_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token           TEXT UNIQUE NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_verify_token ON auth.email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON auth.email_verifications(user_id);

-- Add email_verified column to users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Cleanup job: delete expired blacklist entries (run periodically)
-- INSERT INTO auth.token_blacklist cleanup handled in application code

-- Add password_changed_at for user-level token invalidation
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Password reset tokens
CREATE TABLE IF NOT EXISTS auth.password_resets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token           TEXT UNIQUE NOT NULL,
    email           TEXT NOT NULL,
    used            BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON auth.password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON auth.password_resets(email);

-- Password history for reuse prevention
CREATE TABLE IF NOT EXISTS auth.password_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_history_user ON auth.password_history(user_id);

-- Refresh tokens for token rotation
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON auth.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON auth.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON auth.refresh_tokens(expires_at);

-- Sessions tracking
CREATE TABLE IF NOT EXISTS auth.sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_agent      TEXT,
    ip_address      INET,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL,
    last_activity   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth.sessions(expires_at);

-- Token blacklist for logout / forced invalidation
CREATE TABLE IF NOT EXISTS auth.token_blacklist (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash      TEXT NOT NULL,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blacklist_hash ON auth.token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON auth.token_blacklist(expires_at);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS auth.email_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token           TEXT UNIQUE NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_verify_token ON auth.email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON auth.email_verifications(user_id);

-- Add email_verified column to users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Cleanup job: delete expired blacklist entries (run periodically)
-- INSERT INTO auth.token_blacklist cleanup handled in application code

-- Add password_changed_at for user-level token invalidation
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Password reset tokens
CREATE TABLE IF NOT EXISTS auth.password_resets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token           TEXT UNIQUE NOT NULL,
    email           TEXT NOT NULL,
    used            BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON auth.password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON auth.password_resets(email);

-- Password history for reuse prevention
CREATE TABLE IF NOT EXISTS auth.password_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_history_user ON auth.password_history(user_id);

-- Refresh tokens for token rotation
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON auth.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON auth.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON auth.refresh_tokens(expires_at);

-- Sessions tracking
CREATE TABLE IF NOT EXISTS auth.sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_agent      TEXT,
    ip_address      INET,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL,
    last_activity   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth.sessions(expires_at);

-- Token blacklist for logout / forced invalidation
CREATE TABLE IF NOT EXISTS auth.token_blacklist (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash      TEXT NOT NULL,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blacklist_hash ON auth.token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON auth.token_blacklist(expires_at);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS auth.email_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token           TEXT UNIQUE NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_verify_token ON auth.email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON auth.email_verifications(user_id);

-- Add email_verified column to users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Cleanup job: delete expired blacklist entries (run periodically)
-- INSERT INTO auth.token_blacklist cleanup handled in application code

-- Add password_changed_at for user-level token invalidation
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Password reset tokens
CREATE TABLE IF NOT EXISTS auth.password_resets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token           TEXT UNIQUE NOT NULL,
    email           TEXT NOT NULL,
    used            BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON auth.password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON auth.password_resets(email);

-- Password history for reuse prevention
CREATE TABLE IF NOT EXISTS auth.password_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_history_user ON auth.password_history(user_id);

-- Refresh tokens for token rotation
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON auth.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON auth.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON auth.refresh_tokens(expires_at);

-- Sessions tracking
CREATE TABLE IF NOT EXISTS auth.sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_agent      TEXT,
    ip_address      INET,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL,
    last_activity   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth.sessions(expires_at);

-- Token blacklist for logout / forced invalidation
CREATE TABLE IF NOT EXISTS auth.token_blacklist (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash      TEXT NOT NULL,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blacklist_hash ON auth.token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON auth.token_blacklist(expires_at);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS auth.email_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token           TEXT UNIQUE NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_verify_token ON auth.email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verify_user ON auth.email_verifications(user_id);

-- Add email_verified column to users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Cleanup job: delete expired blacklist entries (run periodically)
-- INSERT INTO auth.token_blacklist cleanup handled in application code

-- Add password_changed_at for user-level token invalidation
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;