-- Fix ALL foreign keys referencing auth.users to use ON DELETE CASCADE
-- This allows admin user deletion without constraint violations

-- platform.conversations
ALTER TABLE platform.conversations DROP CONSTRAINT IF EXISTS conversations_participant_1_fkey;
ALTER TABLE platform.conversations DROP CONSTRAINT IF EXISTS conversations_participant_2_fkey;
ALTER TABLE platform.conversations ADD CONSTRAINT conversations_participant_1_fkey FOREIGN KEY (participant_1) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE platform.conversations ADD CONSTRAINT conversations_participant_2_fkey FOREIGN KEY (participant_2) REFERENCES auth.users(id) ON DELETE CASCADE;

-- platform.messages
ALTER TABLE platform.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE platform.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- platform.reviews
ALTER TABLE platform.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE platform.reviews ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- admin.platform_settings (may not exist)
DO $$ BEGIN
    ALTER TABLE admin.platform_settings DROP CONSTRAINT IF EXISTS platform_settings_updated_by_fkey;
    ALTER TABLE admin.platform_settings ADD CONSTRAINT platform_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- events.events
ALTER TABLE events.events DROP CONSTRAINT IF EXISTS events_organizer_id_fkey;
ALTER TABLE events.events ADD CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- growers.bulk_orders
ALTER TABLE growers.bulk_orders DROP CONSTRAINT IF EXISTS bulk_orders_buyer_id_fkey;
ALTER TABLE growers.bulk_orders ADD CONSTRAINT bulk_orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- learning.instructor_reviews
ALTER TABLE learning.instructor_reviews DROP CONSTRAINT IF EXISTS instructor_reviews_reviewer_id_fkey;
ALTER TABLE learning.instructor_reviews ADD CONSTRAINT instructor_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- research.articles
ALTER TABLE research.articles DROP CONSTRAINT IF EXISTS articles_submitted_by_fkey;
ALTER TABLE research.articles DROP CONSTRAINT IF EXISTS articles_approved_by_fkey;
ALTER TABLE research.articles ADD CONSTRAINT articles_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE research.articles ADD CONSTRAINT articles_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- marketplace.order_items
ALTER TABLE marketplace.order_items DROP CONSTRAINT IF EXISTS order_items_seller_id_fkey;
ALTER TABLE marketplace.order_items ADD CONSTRAINT order_items_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- admin.audit_log
ALTER TABLE admin.audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE admin.audit_log ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- sellers.orders
ALTER TABLE sellers.orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;
ALTER TABLE sellers.orders ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- sellers.reviews
ALTER TABLE sellers.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE sellers.reviews ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- sellers.messages
ALTER TABLE sellers.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE sellers.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- community.competitions
ALTER TABLE community.competitions DROP CONSTRAINT IF EXISTS competitions_created_by_fkey;
ALTER TABLE community.competitions ADD CONSTRAINT competitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- learning.instructor_applications
ALTER TABLE learning.instructor_applications DROP CONSTRAINT IF EXISTS instructor_applications_reviewed_by_fkey;
ALTER TABLE learning.instructor_applications ADD CONSTRAINT instructor_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
