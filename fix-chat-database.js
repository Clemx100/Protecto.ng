const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
)

async function fixChatDatabase() {
  console.log('🔧 Fixing chat database...')
  
  try {
    // 1. Create chat_rooms table
    console.log('1. Creating chat_rooms table...')
    const { error: chatRoomsError } = await supabase.rpc('exec_sql', {
      sql: `
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
    })
    
    if (chatRoomsError) {
      console.log('⚠️ Chat rooms table creation warning:', chatRoomsError.message)
    } else {
      console.log('✅ Chat rooms table created')
    }

    // 2. Create chat_room_messages table
    console.log('2. Creating chat_room_messages table...')
    const { error: chatMessagesError } = await supabase.rpc('exec_sql', {
      sql: `
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
    })
    
    if (chatMessagesError) {
      console.log('⚠️ Chat room messages table creation warning:', chatMessagesError.message)
    } else {
      console.log('✅ Chat room messages table created')
    }

    // 3. Create indexes
    console.log('3. Creating indexes...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking_id ON chat_rooms(booking_id);',
      'CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking_code ON chat_rooms(booking_code);',
      'CREATE INDEX IF NOT EXISTS idx_chat_rooms_client_id ON chat_rooms(client_id);',
      'CREATE INDEX IF NOT EXISTS idx_chat_room_messages_room_id ON chat_room_messages(room_id);',
      'CREATE INDEX IF NOT EXISTS idx_chat_room_messages_booking_id ON chat_room_messages(booking_id);'
    ]

    for (const indexSql of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSql })
      if (error) {
        console.log('⚠️ Index creation warning:', error.message)
      }
    }
    console.log('✅ Indexes created')

    // 4. Enable RLS
    console.log('4. Enabling Row Level Security...')
    const rlsStatements = [
      'ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE chat_room_messages ENABLE ROW LEVEL SECURITY;'
    ]

    for (const rlsSql of rlsStatements) {
      const { error } = await supabase.rpc('exec_sql', { sql: rlsSql })
      if (error) {
        console.log('⚠️ RLS warning:', error.message)
      }
    }
    console.log('✅ RLS enabled')

    // 5. Test the tables
    console.log('5. Testing table access...')
    
    // Test chat_rooms table
    const { data: chatRooms, error: chatRoomsTestError } = await supabase
      .from('chat_rooms')
      .select('count')
      .limit(1)
    
    if (chatRoomsTestError) {
      console.log('❌ Chat rooms table test failed:', chatRoomsTestError.message)
    } else {
      console.log('✅ Chat rooms table accessible')
    }

    // Test chat_room_messages table
    const { data: chatMessages, error: chatMessagesTestError } = await supabase
      .from('chat_room_messages')
      .select('count')
      .limit(1)
    
    if (chatMessagesTestError) {
      console.log('❌ Chat room messages table test failed:', chatMessagesTestError.message)
    } else {
      console.log('✅ Chat room messages table accessible')
    }

    console.log('🎉 Chat database fix completed!')
    
  } catch (error) {
    console.error('❌ Error fixing chat database:', error)
  }
}

fixChatDatabase()
