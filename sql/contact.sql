-- =============================================================================
-- Contact Form — Schema Extension
-- =============================================================================
-- Usage:
--   psql -U postgres -d flower_ecosystem -f sql/contact.sql
-- =============================================================================

-- Contact Submissions
CREATE TABLE IF NOT EXISTS community.contact_submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    subject         VARCHAR(255),
    category        VARCHAR(100),
    message         TEXT NOT NULL,
    phone           VARCHAR(50),
    company         VARCHAR(255),
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status          VARCHAR(50) DEFAULT 'pending',
    admin_notes     TEXT,
    responded_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_status ON community.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_created ON community.contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_email ON community.contact_submissions(email);

-- FAQ Table
CREATE TABLE IF NOT EXISTS community.faqs (
    id              SERIAL PRIMARY KEY,
    question        VARCHAR(500) NOT NULL,
    answer          TEXT NOT NULL,
    category        VARCHAR(100),
    sort_order      INT DEFAULT 0,
    is_published    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_faqs_category ON community.faqs(category);

-- Seed FAQs
INSERT INTO community.faqs (question, answer, category, sort_order) VALUES
    ('How do I create an account?', 'Click the "Sign Up" button in the top right corner. You can register with your email address and create a password. Once registered, you can start browsing, buying, and selling flowers immediately.', 'Getting Started', 1),
    ('How do I list flowers for sale?', 'After logging in, go to your Seller Dashboard and click "Create Listing." Add photos, set your price, write a description, and choose a category. Your listing will be visible to buyers once published.', 'Selling', 2),
    ('What payment methods do you accept?', 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers. All transactions are securely processed through our payment partners.', 'Payments', 3),
    ('How do I request a refund?', 'Go to your Orders page, find the order, and click "Request Refund." Our team reviews refund requests within 24-48 hours. Refunds are processed to your original payment method within 5-7 business days.', 'Orders', 4),
    ('Can I attend workshops for free?', 'Many of our webinars and introductory workshops are free. Premium workshops and masterclasses have a fee. Check the Events page for pricing details on each event.', 'Events', 5),
    ('How do I become a verified florist?', 'Submit a verification request from your Seller Dashboard. You''ll need to provide business documentation and proof of floristry experience. Verification typically takes 2-3 business days.', 'Selling', 6),
    ('Do you ship flowers internationally?', 'Shipping depends on individual sellers. Many sellers offer local delivery and national shipping. Check the product listing for shipping options available from each seller.', 'Orders', 7),
    ('How do I contact a seller directly?', 'Visit the seller''s profile page from any product listing. You can send them a message directly through our platform''s messaging system.', 'General', 8)
ON CONFLICT DO NOTHING;
