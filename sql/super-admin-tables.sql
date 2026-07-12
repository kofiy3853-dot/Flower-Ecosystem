-- =============================================================================
-- Super Admin Dashboard — Additional Tables
-- =============================================================================

-- Platform settings key-value store
CREATE TABLE IF NOT EXISTS admin.platform_settings (
    key         VARCHAR(255) PRIMARY KEY,
    value       JSONB,
    updated_by  UUID REFERENCES auth.users(id),
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System health snapshots (optional — for historical tracking)
CREATE TABLE IF NOT EXISTS admin.system_health_log (
    id          SERIAL PRIMARY KEY,
    component   VARCHAR(100) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'ok',
    details     JSONB,
    checked_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_health_log_component ON admin.system_health_log(component);
CREATE INDEX IF NOT EXISTS idx_health_log_time ON admin.system_health_log(checked_at DESC);
