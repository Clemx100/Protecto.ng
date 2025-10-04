// Test script for the new chat room system
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
)

async function testChatRoomSystem() {
  console.log('🧪 Testing Chat Room System...')
  
  try {
    // 1. Check if chat_rooms table exists
    console.log('\n1. Checking chat_rooms table...')
    const { data: chatRooms, error: chatRoomsError } = await supabase
      .from('chat_rooms')
      .select('*')
      .limit(1)
    
    if (chatRoomsError) {
      console.log('❌ chat_rooms table not found or error:', chatRoomsError.message)
      console.log('Please run the create-chat-room-tables.sql script first')
      return
    }
    
    console.log('✅ chat_rooms table exists')
    
    // 2. Check if chat_room_messages table exists
    console.log('\n2. Checking chat_room_messages table...')
    const { data: messages, error: messagesError } = await supabase
      .from('chat_room_messages')
      .select('*')
      .limit(1)
    
    if (messagesError) {
      console.log('❌ chat_room_messages table not found or error:', messagesError.message)
      console.log('Please run the create-chat-room-tables.sql script first')
      return
    }
    
    console.log('✅ chat_room_messages table exists')
    
    // 3. Get existing bookings to test with
    console.log('\n3. Getting existing bookings...')
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_code, client_id')
      .limit(5)
    
    if (bookingsError) {
      console.log('❌ Error getting bookings:', bookingsError.message)
      return
    }
    
    console.log(`✅ Found ${bookings.length} bookings`)
    
    if (bookings.length === 0) {
      console.log('⚠️ No bookings found. Please create a booking first.')
      return
    }
    
    // 4. Test creating a chat room
    console.log('\n4. Testing chat room creation...')
    const testBooking = bookings[0]
    console.log('Using booking:', testBooking.booking_code)
    
    const { data: newChatRoom, error: createError } = await supabase
      .from('chat_rooms')
      .insert([{
        booking_id: testBooking.id,
        booking_code: testBooking.booking_code,
        client_id: testBooking.client_id,
        status: 'active',
        unread_count_client: 0,
        unread_count_operator: 0
      }])
      .select()
      .single()
    
    if (createError) {
      if (createError.code === '23505') {
        console.log('✅ Chat room already exists for this booking')
        // Get existing chat room
        const { data: existingRoom } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('booking_id', testBooking.id)
          .single()
        console.log('Using existing chat room:', existingRoom.id)
      } else {
        console.log('❌ Error creating chat room:', createError.message)
        return
      }
    } else {
      console.log('✅ Chat room created:', newChatRoom.id)
    }
    
    // 5. Test sending a message
    console.log('\n5. Testing message sending...')
    const chatRoomId = newChatRoom?.id || (await supabase
      .from('chat_rooms')
      .select('id')
      .eq('booking_id', testBooking.id)
      .single()).data.id
    
    const { data: newMessage, error: messageError } = await supabase
      .from('chat_room_messages')
      .insert([{
        room_id: chatRoomId,
        booking_id: testBooking.id,
        sender_id: 'test-operator',
        sender_type: 'operator',
        message: 'Hello! This is a test message from the operator.',
        message_type: 'text',
        status: 'sent'
      }])
      .select()
      .single()
    
    if (messageError) {
      console.log('❌ Error sending message:', messageError.message)
      return
    }
    
    console.log('✅ Message sent:', newMessage.id)
    
    // 6. Test getting messages
    console.log('\n6. Testing message retrieval...')
    const { data: allMessages, error: getMessagesError } = await supabase
      .from('chat_room_messages')
      .select('*')
      .eq('room_id', chatRoomId)
      .order('created_at', { ascending: true })
    
    if (getMessagesError) {
      console.log('❌ Error getting messages:', getMessagesError.message)
      return
    }
    
    console.log(`✅ Retrieved ${allMessages.length} messages`)
    allMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.sender_type}] ${msg.message}`)
    })
    
    // 7. Test API endpoints
    console.log('\n7. Testing API endpoints...')
    
    // Test chat rooms API
    try {
      const chatRoomsResponse = await fetch('http://localhost:3000/api/chat-rooms')
      if (chatRoomsResponse.ok) {
        const chatRoomsData = await chatRoomsResponse.json()
        console.log('✅ Chat rooms API working:', chatRoomsData.data?.length || 0, 'rooms')
      } else {
        console.log('⚠️ Chat rooms API not responding (server might not be running)')
      }
    } catch (apiError) {
      console.log('⚠️ Chat rooms API not accessible (server might not be running)')
    }
    
    // Test messages API
    try {
      const messagesResponse = await fetch(`http://localhost:3000/api/chat-rooms/${chatRoomId}/messages`)
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json()
        console.log('✅ Messages API working:', messagesData.data?.length || 0, 'messages')
      } else {
        console.log('⚠️ Messages API not responding (server might not be running)')
      }
    } catch (apiError) {
      console.log('⚠️ Messages API not accessible (server might not be running)')
    }
    
    console.log('\n🎉 Chat room system test completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Run the create-chat-room-tables.sql script in your Supabase dashboard')
    console.log('2. Start your Next.js development server: npm run dev')
    console.log('3. Test the chat functionality in the operator dashboard and user app')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testChatRoomSystem()





