-- ============================================
-- PROTECTOR.NG CHAT SYSTEM - COMPLETE REBUILD
-- ============================================
-- This script completely rebuilds the chat and messaging system
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing tables and start fresh
-- ============================================
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS message_reads CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Step 2: Create new conversations table (optional, for grouping messages)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  UNIQUE(booking_id)
);

-- Add index for quick lookups
CREATE INDEX idx_conversations_booking_id ON conversations(booking_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- Step 3: Create new messages table with clean structure
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'invoice', 'status_update', 'image', 'file')),
  
  -- Sender information
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('client', 'operator', 'admin', 'system')),
  
  -- Optional: Recipient (null means broadcast to all participants)
  recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Message metadata
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  -- Optional: Attachments or special data (JSON)
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_booking_created ON messages(booking_id, created_at DESC);

-- Step 4: Create message_reads table for read receipts
-- ============================================
CREATE TABLE message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX idx_message_reads_user_id ON message_reads(user_id);

-- Step 5: Enable Row Level Security
-- ============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies
-- ============================================

-- Conversations Policies
-- Users can view conversations for their bookings
CREATE POLICY "Users can view their booking conversations"
ON conversations FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM bookings 
    WHERE client_id = auth.uid()
  )
);

-- Operators can view all conversations
CREATE POLICY "Operators can view all conversations"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('operator', 'admin')
  )
);

-- Messages Policies
-- Users can view messages for their bookings
CREATE POLICY "Users can view messages for their bookings"
ON messages FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM bookings 
    WHERE client_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('operator', 'admin')
  )
);

-- Users can send messages to their bookings
CREATE POLICY "Users can send messages to their bookings"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND booking_id IN (
    SELECT id FROM bookings 
    WHERE client_id = auth.uid()
  )
);

-- Operators can send messages to any booking
CREATE POLICY "Operators can send messages to any booking"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('operator', 'admin')
  )
);

-- Users can edit their own messages
CREATE POLICY "Users can edit their own messages"
ON messages FOR UPDATE
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- Message reads policies
CREATE POLICY "Users can view their own read receipts"
ON message_reads FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can mark messages as read"
ON message_reads FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Step 7: Create helper functions
-- ============================================

-- Function to get or create conversation for a booking
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_booking_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Try to get existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE booking_id = p_booking_id;
  
  -- If not exists, create it
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (booking_id, last_message_at)
    VALUES (p_booking_id, NOW())
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$;

-- Function to update conversation timestamp when message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE booking_id = NEW.booking_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Step 8: Enable Realtime for messages table
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;

-- Step 9: Create system message helper function
-- ============================================
CREATE OR REPLACE FUNCTION create_system_message(
  p_booking_id UUID,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
  v_conversation_id UUID;
  v_system_user_id UUID;
BEGIN
  -- Get or create conversation
  v_conversation_id := get_or_create_conversation(p_booking_id);
  
  -- Get system user (or use a default system UUID)
  SELECT id INTO v_system_user_id
  FROM profiles
  WHERE role = 'admin'
  LIMIT 1;
  
  -- If no admin found, use booking's client as sender for system messages
  IF v_system_user_id IS NULL THEN
    SELECT client_id INTO v_system_user_id
    FROM bookings
    WHERE id = p_booking_id;
  END IF;
  
  -- Create system message
  INSERT INTO messages (
    booking_id,
    conversation_id,
    content,
    message_type,
    sender_id,
    sender_role,
    metadata
  ) VALUES (
    p_booking_id,
    v_conversation_id,
    p_content,
    'system',
    v_system_user_id,
    'system',
    p_metadata
  )
  RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$;

-- Step 10: Grant permissions
-- ============================================
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON message_reads TO authenticated;

GRANT ALL ON conversations TO anon;
GRANT ALL ON messages TO anon;
GRANT ALL ON message_reads TO anon;

-- Step 11: Add helpful comments
-- ============================================
COMMENT ON TABLE conversations IS 'Groups messages by booking for easier querying';
COMMENT ON TABLE messages IS 'All chat messages between clients and operators';
COMMENT ON TABLE message_reads IS 'Track which messages have been read by which users';

COMMENT ON COLUMN messages.message_type IS 'Type of message: text, system, invoice, status_update, image, file';
COMMENT ON COLUMN messages.sender_role IS 'Role of the sender: client, operator, admin, system';
COMMENT ON COLUMN messages.metadata IS 'JSON data for special message types (invoice data, file info, etc)';

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- Run this script in Supabase SQL Editor to rebuild the chat system
-- Next steps:
-- 1. Create new API endpoints
-- 2. Update frontend components
-- 3. Set up realtime subscriptions
-- ============================================

SELECT 'Chat system rebuilt successfully! ✅' as status;

