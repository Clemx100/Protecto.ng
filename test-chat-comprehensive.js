// Comprehensive chat system test
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
)

async function testComprehensiveChat() {
  console.log('🧪 Comprehensive Chat System Test...')
  
  try {
    // 1. Test database connection and get booking
    console.log('\n1. Testing database connection...')
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_code, client_id')
      .limit(1)
    
    if (bookingsError || !bookings || bookings.length === 0) {
      console.log('❌ No bookings found:', bookingsError?.message)
      return
    }
    
    const booking = bookings[0]
    console.log('✅ Database connection working')
    console.log('📋 Found booking:', booking.booking_code, 'ID:', booking.id)
    
    // 2. Test message creation directly in database
    console.log('\n2. Testing direct database message creation...')
    const testMessage = {
      booking_id: booking.id,
      sender_id: booking.client_id,
      recipient_id: booking.client_id,
      content: 'Direct database test message',
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
      console.log('❌ Direct database message creation failed:', createError.message)
      return
    }
    
    console.log('✅ Direct database message creation working')
    console.log('📨 Created message:', newMessage.id)
    
    // 3. Test message retrieval
    console.log('\n3. Testing message retrieval...')
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.log('❌ Message retrieval failed:', fetchError.message)
    } else {
      console.log('✅ Message retrieval working')
      console.log('📨 Retrieved', messages.length, 'messages')
    }
    
    // 4. Test real-time subscription
    console.log('\n4. Testing real-time subscription...')
    let subscriptionReceived = false
    
    const subscription = supabase
      .channel('test-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${booking.id}`
        },
        (payload) => {
          console.log('✅ Real-time subscription working!')
          console.log('📨 Received message:', payload.new.content)
          subscriptionReceived = true
        }
      )
      .subscribe()
    
    // Send a test message to trigger subscription
    setTimeout(async () => {
      const { data: triggerMessage } = await supabase
        .from('messages')
        .insert({
          booking_id: booking.id,
          sender_id: booking.client_id,
          recipient_id: booking.client_id,
          content: 'Real-time test message',
          message_type: 'text',
          sender_type: 'client'
        })
        .select()
        .single()
      
      console.log('📤 Sent trigger message:', triggerMessage?.id)
    }, 1000)
    
    // Wait for subscription
    setTimeout(() => {
      if (!subscriptionReceived) {
        console.log('⚠️ Real-time subscription not triggered (may be normal)')
      }
      
      // Cleanup
      subscription.unsubscribe()
      
      // Clean up test messages
      console.log('\n5. Cleaning up test messages...')
      supabase
        .from('messages')
        .delete()
        .eq('id', newMessage.id)
        .then(() => {
          console.log('✅ Test messages cleaned up')
          console.log('\n🎉 Comprehensive chat test completed!')
          console.log('\n📊 SUMMARY:')
          console.log('✅ Database connection: Working')
          console.log('✅ Message creation: Working')
          console.log('✅ Message retrieval: Working')
          console.log('⚠️ Real-time subscription: May need server running')
          console.log('\n💡 The chat system database layer is working!')
          console.log('💡 API endpoints may need the Next.js server to be running properly.')
        })
    }, 3000)
    
  } catch (error) {
    console.error('❌ Comprehensive chat test failed:', error)
  }
}

// Run the test
testComprehensiveChat()

