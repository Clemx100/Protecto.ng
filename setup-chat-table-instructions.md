# Setup Chat Messages Table

To enable real-time chat functionality, you need to run the following SQL in your Supabase SQL Editor:

## Steps:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the following SQL:

```sql
-- Chat Messages Table for Real-time Communication
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'operator', 'system')),
  sender_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  has_invoice BOOLEAN DEFAULT FALSE,
  invoice_data JSONB,
  is_system_message BOOLEAN DEFAULT FALSE
);

-- Create index for efficient querying by booking_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_booking_id ON chat_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat messages
-- Clients can only see messages for their own bookings
CREATE POLICY "Clients can view their own booking messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = chat_messages.booking_id 
      AND bookings.user_id = auth.uid()
    )
  );

-- Operators can view all messages
CREATE POLICY "Operators can view all messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'agent', 'operator')
    )
  );

-- Clients can insert messages for their own bookings
CREATE POLICY "Clients can insert messages for their bookings" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_type = 'client' 
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = booking_id 
      AND bookings.user_id = auth.uid()
    )
  );

-- Operators can insert messages for any booking
CREATE POLICY "Operators can insert messages for any booking" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_type IN ('operator', 'system')
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('admin', 'agent', 'operator')
    )
  );

-- Enable real-time subscriptions for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_chat_messages_updated_at 
  BEFORE UPDATE ON chat_messages 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

4. Click "Run" to execute the SQL
5. Verify the table was created successfully

## After Setup:

Once the table is created, the real-time chat functionality will work between:
- Client app (when users create bookings and send messages)
- Operator dashboard (when operators respond to messages)

## Testing:

1. Open the app in two browser windows
2. Create a booking in one window (client)
3. Open operator dashboard in another window
4. Send messages from client and verify they appear in operator dashboard in real-time


