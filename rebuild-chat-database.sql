-- =====================================================
-- REBUILD CHAT DATABASE FOR PROPER CLIENT-OPERATOR MESSAGING
-- =====================================================

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS chat_room_messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS messages CASCADE;

-- =====================================================
-- 1. CREATE MESSAGES TABLE (Main chat table)
-- =====================================================
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'invoice', 'status_update')),
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('client', 'operator', 'system')),
    is_system_message BOOLEAN DEFAULT FALSE,
    has_invoice BOOLEAN DEFAULT FALSE,
    invoice_data JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE CHAT_ROOMS TABLE (Optional - for future use)
-- =====================================================
CREATE TABLE chat_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    operator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    room_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(booking_id)
);

-- =====================================================
-- 3. CREATE CHAT_ROOM_MESSAGES TABLE (Optional - for future use)
-- =====================================================
CREATE TABLE chat_room_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'invoice', 'status_update')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Messages table indexes
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_sender_type ON messages(sender_type);
CREATE INDEX idx_messages_booking_sender ON messages(booking_id, sender_id);

-- Chat rooms indexes
CREATE INDEX idx_chat_rooms_booking_id ON chat_rooms(booking_id);
CREATE INDEX idx_chat_rooms_client_id ON chat_rooms(client_id);
CREATE INDEX idx_chat_rooms_operator_id ON chat_rooms(operator_id);

-- Chat room messages indexes
CREATE INDEX idx_chat_room_messages_room_id ON chat_room_messages(room_id);
CREATE INDEX idx_chat_room_messages_sender_id ON chat_room_messages(sender_id);
CREATE INDEX idx_chat_room_messages_created_at ON chat_room_messages(created_at DESC);

-- =====================================================
-- 5. CREATE ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_messages ENABLE ROW LEVEL SECURITY;

-- Messages table policies
CREATE POLICY "Users can view messages for their bookings" ON messages
    FOR SELECT USING (
        sender_id = auth.uid() OR 
        recipient_id = auth.uid() OR
        booking_id IN (
            SELECT id FROM bookings WHERE client_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages for their bookings" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        booking_id IN (
            SELECT id FROM bookings WHERE client_id = auth.uid()
        )
    );

CREATE POLICY "Operators can insert messages for any booking" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        sender_type = 'operator'
    );

CREATE POLICY "System can insert system messages" ON messages
    FOR INSERT WITH CHECK (
        sender_type = 'system'
    );

-- Chat rooms policies
CREATE POLICY "Users can view chat rooms for their bookings" ON chat_rooms
    FOR SELECT USING (
        client_id = auth.uid() OR 
        operator_id = auth.uid() OR
        booking_id IN (
            SELECT id FROM bookings WHERE client_id = auth.uid()
        )
    );

CREATE POLICY "Users can create chat rooms for their bookings" ON chat_rooms
    FOR INSERT WITH CHECK (
        client_id = auth.uid() AND
        booking_id IN (
            SELECT id FROM bookings WHERE client_id = auth.uid()
        )
    );

-- Chat room messages policies
CREATE POLICY "Users can view messages in their chat rooms" ON chat_room_messages
    FOR SELECT USING (
        room_id IN (
            SELECT id FROM chat_rooms WHERE 
            client_id = auth.uid() OR 
            operator_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their chat rooms" ON chat_room_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        room_id IN (
            SELECT id FROM chat_rooms WHERE 
            client_id = auth.uid() OR 
            operator_id = auth.uid()
        )
    );

-- =====================================================
-- 6. CREATE FUNCTIONS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_room_messages_updated_at BEFORE UPDATE ON chat_room_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get or create a chat room for a booking
CREATE OR REPLACE FUNCTION get_or_create_chat_room(booking_uuid UUID)
RETURNS UUID AS $$
DECLARE
    room_id UUID;
    client_uuid UUID;
BEGIN
    -- Get the client_id for the booking
    SELECT client_id INTO client_uuid FROM bookings WHERE id = booking_uuid;
    
    -- Try to get existing chat room
    SELECT id INTO room_id FROM chat_rooms WHERE booking_id = booking_uuid;
    
    -- If no room exists, create one
    IF room_id IS NULL THEN
        INSERT INTO chat_rooms (booking_id, client_id, room_name)
        VALUES (booking_uuid, client_uuid, 'Chat for Booking ' || booking_uuid)
        RETURNING id INTO room_id;
    END IF;
    
    RETURN room_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a system message
CREATE OR REPLACE FUNCTION create_system_message(
    booking_uuid UUID,
    message_content TEXT,
    message_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    message_id UUID;
    client_uuid UUID;
BEGIN
    -- Get the client_id for the booking
    SELECT client_id INTO client_uuid FROM bookings WHERE id = booking_uuid;
    
    -- Insert system message
    INSERT INTO messages (
        booking_id,
        sender_id,
        recipient_id,
        content,
        message_type,
        sender_type,
        is_system_message,
        metadata
    ) VALUES (
        booking_uuid,
        client_uuid, -- Use client_id as sender_id for system messages
        client_uuid, -- Use client_id as recipient_id for system messages
        message_content,
        'system',
        'system',
        TRUE,
        message_metadata
    ) RETURNING id INTO message_id;
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. INSERT SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample messages for existing bookings (if any)
-- This will create system messages for existing bookings
DO $$
DECLARE
    booking_record RECORD;
    message_id UUID;
BEGIN
    -- Loop through existing bookings and create initial system messages
    FOR booking_record IN 
        SELECT id, booking_code, client_id, status, created_at 
        FROM bookings 
        WHERE status IS NOT NULL
    LOOP
        -- Create initial booking system message
        SELECT create_system_message(
            booking_record.id,
            '🛡️ **New Protection Request Received** - #' || booking_record.booking_code || E'\n\n**Status:** ' || booking_record.status || E'\n**Created:** ' || booking_record.created_at::text,
            jsonb_build_object(
                'booking_code', booking_record.booking_code,
                'status', booking_record.status,
                'created_at', booking_record.created_at
            )
        ) INTO message_id;
        
        RAISE NOTICE 'Created system message % for booking %', message_id, booking_record.booking_code;
    END LOOP;
END $$;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chat_room_messages TO authenticated;

-- Grant permissions to service role
GRANT ALL ON messages TO service_role;
GRANT ALL ON chat_rooms TO service_role;
GRANT ALL ON chat_room_messages TO service_role;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================

-- Verify tables were created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('messages', 'chat_rooms', 'chat_room_messages')
ORDER BY table_name, ordinal_position;

-- Verify indexes were created
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('messages', 'chat_rooms', 'chat_room_messages')
ORDER BY tablename, indexname;

-- Verify RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('messages', 'chat_rooms', 'chat_room_messages')
ORDER BY tablename, policyname;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'CHAT DATABASE REBUILT SUCCESSFULLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Tables created: messages, chat_rooms, chat_room_messages';
    RAISE NOTICE 'Indexes created: 8 performance indexes';
    RAISE NOTICE 'RLS policies: 8 security policies';
    RAISE NOTICE 'Functions created: 3 helper functions';
    RAISE NOTICE 'Triggers created: 3 update triggers';
    RAISE NOTICE 'Sample data: System messages for existing bookings';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'The chat system is now ready for client-operator messaging!';
    RAISE NOTICE '=====================================================';
END $$;
