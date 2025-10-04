// Test database schema and tables
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
)

async function testDatabaseSchema() {
  console.log('🔍 Testing Database Schema...')
  
  try {
    // 1. Check if messages table exists and get its structure
    console.log('\n1. Checking messages table...')
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1)
    
    if (messagesError) {
      console.log('❌ Messages table error:', messagesError.message)
    } else {
      console.log('✅ Messages table exists')
      console.log('📋 Messages table structure:', Object.keys(messagesData[0] || {}))
    }

    // 2. Check if chat_rooms table exists
    console.log('\n2. Checking chat_rooms table...')
    const { data: chatRoomsData, error: chatRoomsError } = await supabase
      .from('chat_rooms')
      .select('*')
      .limit(1)
    
    if (chatRoomsError) {
      console.log('❌ Chat rooms table error:', chatRoomsError.message)
    } else {
      console.log('✅ Chat rooms table exists')
      console.log('📋 Chat rooms table structure:', Object.keys(chatRoomsData[0] || {}))
    }

    // 3. Check if chat_room_messages table exists
    console.log('\n3. Checking chat_room_messages table...')
    const { data: chatMessagesData, error: chatMessagesError } = await supabase
      .from('chat_room_messages')
      .select('*')
      .limit(1)
    
    if (chatMessagesError) {
      console.log('❌ Chat room messages table error:', chatMessagesError.message)
    } else {
      console.log('✅ Chat room messages table exists')
      console.log('📋 Chat room messages table structure:', Object.keys(chatMessagesData[0] || {}))
    }

    // 4. Check bookings table
    console.log('\n4. Checking bookings table...')
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1)
    
    if (bookingsError) {
      console.log('❌ Bookings table error:', bookingsError.message)
    } else {
      console.log('✅ Bookings table exists')
      console.log('📋 Bookings table structure:', Object.keys(bookingsData[0] || {}))
    }

    // 5. Check profiles table
    console.log('\n5. Checking profiles table...')
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (profilesError) {
      console.log('❌ Profiles table error:', profilesError.message)
    } else {
      console.log('✅ Profiles table exists')
      console.log('📋 Profiles table structure:', Object.keys(profilesData[0] || {}))
    }

    // 6. Test message creation in messages table
    console.log('\n6. Testing message creation...')
    const testMessage = {
      booking_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      sender_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      recipient_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      content: 'Test message',
      message_type: 'text'
    }

    const { data: newMessage, error: createError } = await supabase
      .from('messages')
      .insert(testMessage)
      .select()
      .single()

    if (createError) {
      console.log('❌ Message creation error:', createError.message)
    } else {
      console.log('✅ Message created successfully:', newMessage.id)
      
      // Clean up test message
      await supabase
        .from('messages')
        .delete()
        .eq('id', newMessage.id)
      console.log('🧹 Test message cleaned up')
    }

  } catch (error) {
    console.error('❌ Database schema test failed:', error)
  }
}

// Run the test
testDatabaseSchema()

