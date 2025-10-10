
-- ====================================================================
-- Protector.Ng Chat System Setup (CORRECTED - Clean Install)
-- Run this in Supabase SQL Editor
-- ====================================================================

-- STEP 0: Drop existing tables if they exist (to fix any schema issues)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;

-- Step 1: Create chat_rooms table with correct column names
CREATE TABLE chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message TEXT,
  unread_count_client INTEGER DEFAULT 0,
  unread_count_agent INTEGER DEFAULT 0
);

-- Step 2: Create chat_messages table
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('client', 'agent', 'system')),
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'invoice', 'status_update')),
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_chat_rooms_booking_id ON chat_rooms(booking_id);
CREATE INDEX idx_chat_rooms_client_id ON chat_rooms(client_id);
CREATE INDEX idx_chat_rooms_assigned_agent_id ON chat_rooms(assigned_agent_id);
CREATE INDEX idx_chat_rooms_status ON chat_rooms(status);
CREATE INDEX idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);

CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Step 4: Enable Row Level Security
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for chat_rooms
CREATE POLICY "Users can view their own chat rooms" ON chat_rooms
  FOR SELECT USING (
    auth.uid() = client_id OR 
    auth.uid() = assigned_agent_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Users can insert their own chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = client_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Agents can update chat rooms" ON chat_rooms
  FOR UPDATE USING (
    auth.uid() = assigned_agent_id OR
    auth.uid() = client_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

-- Step 6: Create RLS policies for chat_messages
CREATE POLICY "Users can view messages in their chat rooms" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE id = room_id AND (
        client_id = auth.uid() OR 
        assigned_agent_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'agent')
        )
      )
    )
  );

CREATE POLICY "Users can insert messages in their chat rooms" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE id = room_id AND (
        client_id = auth.uid() OR 
        assigned_agent_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'agent')
        )
      )
    )
  );

CREATE POLICY "Users can update their own messages" ON chat_messages
  FOR UPDATE USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'agent')
    )
  );

-- Step 7: Create function to update chat room last message
CREATE OR REPLACE FUNCTION update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms 
  SET 
    last_message = NEW.message,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.room_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to update chat room when message is inserted
CREATE TRIGGER trigger_update_chat_room_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_room_last_message();

-- Step 9: Create chat rooms for existing bookings
INSERT INTO chat_rooms (booking_id, client_id, assigned_agent_id, status)
SELECT 
  id::TEXT,
  client_id,
  assigned_agent_id,
  CASE 
    WHEN status IN ('completed', 'cancelled') THEN 'closed'
    ELSE 'active'
  END
FROM bookings;

-- ====================================================================
-- Success! Chat system is now set up
-- ====================================================================
-- ✅ chat_rooms table created
-- ✅ chat_messages table created
-- ✅ Security policies set up
-- ✅ Chat rooms created for all existing bookings
-- ====================================================================
