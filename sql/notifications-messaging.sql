-- =============================================================================
-- Notifications, Messaging, Reviews — Schema
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/notifications-messaging.sql
-- =============================================================================

-- Create schema if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'platform') THEN
        CREATE SCHEMA platform;
    END IF;
END $$;

-- Notifications
CREATE TABLE IF NOT EXISTS platform.notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    message         TEXT,
    link            VARCHAR(500),
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON platform.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON platform.notifications(user_id, is_read) WHERE is_read = false;

-- Messages (conversations)
CREATE TABLE IF NOT EXISTS platform.conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_1   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant_2   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message    TEXT,
    last_message_at TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(participant_1, participant_2)
);

CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON platform.conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON platform.conversations(participant_2);

-- Messages
CREATE TABLE IF NOT EXISTS platform.messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES platform.conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON platform.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON platform.messages(conversation_id, is_read) WHERE is_read = false;

-- Product Reviews
CREATE TABLE IF NOT EXISTS platform.reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id),
    product_id      UUID,
    seller_id       UUID,
    rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title           VARCHAR(255),
    content         TEXT,
    is_verified     BOOLEAN DEFAULT FALSE,
    helpful_count   INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON platform.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_seller ON platform.reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON platform.reviews(user_id);
