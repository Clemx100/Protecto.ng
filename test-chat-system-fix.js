// Test the fixed chat system
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
)

async function testChatSystem() {
  console.log('🧪 Testing Fixed Chat System...')
  
  try {
    // 1. Get a real booking from the database
    console.log('\n1. Getting real booking...')
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_code, client_id')
      .limit(1)
    
    if (bookingsError || !bookings || bookings.length === 0) {
      console.log('❌ No bookings found:', bookingsError?.message)
      return
    }
    
    const booking = bookings[0]
    console.log('✅ Found booking:', booking.booking_code, 'ID:', booking.id)
    
    // 2. Test message creation
    console.log('\n2. Testing message creation...')
    const testMessage = {
      booking_id: booking.id,
      sender_id: booking.client_id,
      recipient_id: booking.client_id, // Self for testing
      content: 'Test message from fixed chat system',
      message_type: 'text',
      sender_type: 'client',
      is_system_message: false
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
      
      // 3. Test message retrieval
      console.log('\n3. Testing message retrieval...')
      const { data: messages, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true })

      if (fetchError) {
        console.log('❌ Message fetch error:', fetchError.message)
      } else {
        console.log('✅ Retrieved', messages.length, 'messages for booking')
        messages.forEach((msg, index) => {
          console.log(`  ${index + 1}. ${msg.content} (${msg.sender_type || 'unknown'})`)
        })
      }
      
      // 4. Test API endpoints
      console.log('\n4. Testing API endpoints...')
      
      // Test operator messages API
      try {
        const response = await fetch(`http://localhost:3000/api/operator/messages?bookingId=${booking.id}`)
        const result = await response.json()
        
        if (response.ok && result.success) {
          console.log('✅ Operator messages API working:', result.data.length, 'messages')
        } else {
          console.log('❌ Operator messages API error:', result.error)
        }
      } catch (error) {
        console.log('❌ Operator messages API network error:', error.message)
      }
      
      // Test client messages API
      try {
        const response = await fetch(`http://localhost:3000/api/messages?bookingId=${booking.id}`)
        const result = await response.json()
        
        if (response.ok && result.success) {
          console.log('✅ Client messages API working:', result.data.length, 'messages')
        } else {
          console.log('❌ Client messages API error:', result.error)
        }
      } catch (error) {
        console.log('❌ Client messages API network error:', error.message)
      }
      
      // 5. Clean up test message
      console.log('\n5. Cleaning up test message...')
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', newMessage.id)
      
      if (deleteError) {
        console.log('❌ Cleanup error:', deleteError.message)
      } else {
        console.log('✅ Test message cleaned up')
      }
    }

    console.log('\n🎉 Chat system test completed!')
    
  } catch (error) {
    console.error('❌ Chat system test failed:', error)
  }
}

// Run the test
testChatSystem()

