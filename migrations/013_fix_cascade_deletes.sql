-- Fix foreign keys to use ON DELETE CASCADE for user deletion
-- conversations
ALTER TABLE platform.conversations DROP CONSTRAINT IF EXISTS conversations_participant_1_fkey;
ALTER TABLE platform.conversations DROP CONSTRAINT IF EXISTS conversations_participant_2_fkey;
ALTER TABLE platform.conversations ADD CONSTRAINT conversations_participant_1_fkey FOREIGN KEY (participant_1) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE platform.conversations ADD CONSTRAINT conversations_participant_2_fkey FOREIGN KEY (participant_2) REFERENCES auth.users(id) ON DELETE CASCADE;

-- messages
ALTER TABLE platform.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE platform.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
