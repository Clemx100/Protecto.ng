import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setting up chat room tables...')
    
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://kifcevffaputepvpjpip.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )

    // Create chat_rooms table
    const createChatRoomsTable = `
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
        UNIQUE(booking_id),
        UNIQUE(booking_code)
      );
    `

    // Create chat_room_messages table
    const createChatRoomMessagesTable = `
      CREATE TABLE IF NOT EXISTS chat_room_messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        sender_id VARCHAR(255) NOT NULL,
        sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('client', 'operator', 'system')),
        message TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'invoice', 'status_update')),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read'))
      );
    `

    // Create indexes
    const createIndexes = `
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
    `

    // Enable RLS
    const enableRLS = `
      ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
      ALTER TABLE chat_room_messages ENABLE ROW LEVEL SECURITY;
    `

    // Create RLS policies
    const createPolicies = `
      -- Chat rooms policies
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

      -- Chat room messages policies
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
    `

    // Create functions
    const createFunctions = `
      -- Function to create chat room for booking
      CREATE OR REPLACE FUNCTION create_chat_room_for_booking()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          INSERT INTO chat_rooms (booking_id, booking_code, client_id, status)
          VALUES (NEW.id, NEW.booking_code, NEW.client_id, 'active');
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Function to update chat room last message
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

      -- Function to increment unread count
      CREATE OR REPLACE FUNCTION increment_unread_count(room_id UUID, field_name TEXT)
      RETURNS VOID AS $$
      BEGIN
        EXECUTE format('UPDATE chat_rooms SET %I = %I + 1 WHERE id = $1', field_name, field_name) USING room_id;
      END;
      $$ LANGUAGE plpgsql;
    `

    // Create triggers
    const createTriggers = `
      DROP TRIGGER IF EXISTS trigger_create_chat_room ON bookings;
      CREATE TRIGGER trigger_create_chat_room
        AFTER INSERT ON bookings
        FOR EACH ROW
        EXECUTE FUNCTION create_chat_room_for_booking();

      DROP TRIGGER IF EXISTS trigger_update_chat_room_message ON chat_room_messages;
      CREATE TRIGGER trigger_update_chat_room_message
        AFTER INSERT ON chat_room_messages
        FOR EACH ROW
        EXECUTE FUNCTION update_chat_room_last_message();
    `

    // Execute all SQL statements
    const statements = [
      createChatRoomsTable,
      createChatRoomMessagesTable,
      createIndexes,
      enableRLS,
      createPolicies,
      createFunctions,
      createTriggers
    ]

    for (let i = 0; i < statements.length; i++) {
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: statements[i] })
      
      if (error) {
        console.log(`⚠️ Statement ${i + 1} warning:`, error.message)
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Chat room tables created successfully!'
    })

  } catch (error) {
    console.error('Setup failed:', error)
    return NextResponse.json({
      error: 'Failed to setup chat room tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}










