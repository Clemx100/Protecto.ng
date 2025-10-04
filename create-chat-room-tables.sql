-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_code VARCHAR(50) NOT NULL,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message TEXT,
  unread_count_client INTEGER DEFAULT 0,
  unread_count_operator INTEGER DEFAULT 0,
  
  -- Ensure one chat room per booking
  UNIQUE(booking_id),
  UNIQUE(booking_code)
);

-- Create chat_room_messages table
CREATE TABLE IF NOT EXISTS chat_room_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id VARCHAR(255) NOT NULL, -- Can be user ID or 'operator' or 'system'
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('client', 'operator', 'system')),
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'invoice', 'status_update')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking_id ON chat_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking_code ON chat_rooms(booking_code);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_client_id ON chat_rooms(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_status ON chat_rooms(status);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_room_messages_room_id ON chat_room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_messages_booking_id ON chat_room_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_messages_sender_id ON chat_room_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_messages_created_at ON chat_room_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_room_messages_status ON chat_room_messages(status);

-- Enable Row Level Security
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_rooms
CREATE POLICY "Users can view their own chat rooms" ON chat_rooms
  FOR SELECT USING (
    auth.uid() = client_id OR 
    auth.uid() = operator_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Users can insert their own chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (
    auth.uid() = client_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators can update chat rooms" ON chat_rooms
  FOR UPDATE USING (
    auth.uid() = operator_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'operator')
    )
  );

-- Create RLS policies for chat_room_messages
CREATE POLICY "Users can view messages in their chat rooms" ON chat_room_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE id = room_id AND (
        client_id = auth.uid() OR 
        operator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'operator')
        )
      )
    )
  );

CREATE POLICY "Users can insert messages in their chat rooms" ON chat_room_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_rooms 
      WHERE id = room_id AND (
        client_id = auth.uid() OR 
        operator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'operator')
        )
      )
    )
  );

CREATE POLICY "Users can update their own messages" ON chat_room_messages
  FOR UPDATE USING (
    sender_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'operator')
    )
  );

-- Create function to automatically create chat room when booking is created
CREATE OR REPLACE FUNCTION create_chat_room_for_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create chat room for new bookings
  IF TG_OP = 'INSERT' THEN
    INSERT INTO chat_rooms (booking_id, booking_code, client_id, status)
    VALUES (NEW.id, NEW.booking_code, NEW.client_id, 'active');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create chat room
DROP TRIGGER IF EXISTS trigger_create_chat_room ON bookings;
CREATE TRIGGER trigger_create_chat_room
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_room_for_booking();

-- Create function to update chat room last message
CREATE OR REPLACE FUNCTION update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update chat room with last message info
  UPDATE chat_rooms 
  SET 
    last_message = NEW.message,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.room_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update chat room when message is inserted
DROP TRIGGER IF EXISTS trigger_update_chat_room_message ON chat_room_messages;
CREATE TRIGGER trigger_update_chat_room_message
  AFTER INSERT ON chat_room_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_room_last_message();





