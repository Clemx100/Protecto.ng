// Test real-time chat flow between client and operator
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
)

async function testRealTimeChatFlow() {
  console.log('🔄 TESTING REAL-TIME CHAT FLOW')
  console.log('=' .repeat(50))
  console.log('This test simulates actual client-operator communication')
  console.log('')
  
  try {
    // 1. Get a real booking
    console.log('1. 📋 Getting test booking...')
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_code, client_id')
      .limit(1)
    
    if (bookingsError || !bookings || bookings.length === 0) {
      console.log('❌ No bookings found')
      return
    }
    
    const booking = bookings[0]
    console.log(`✅ Using booking: ${booking.booking_code} (${booking.id})`)
    
    // 2. Set up real-time subscription (simulating operator dashboard)
    console.log('\n2. 🔄 Setting up real-time subscription (Operator Dashboard)...')
    let operatorReceivedMessages = []
    let clientReceivedMessages = []
    
    const operatorSubscription = supabase
      .channel('operator-chat-test')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${booking.id}`
        },
        (payload) => {
          const message = payload.new
          console.log(`📨 OPERATOR RECEIVED: [${message.sender_type}] ${message.content}`)
          operatorReceivedMessages.push(message)
        }
      )
      .subscribe()
    
    // 3. Set up client subscription (simulating client app)
    console.log('3. 🔄 Setting up client subscription (Client App)...')
    const clientSubscription = supabase
      .channel('client-chat-test')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${booking.id}`
        },
        (payload) => {
          const message = payload.new
          console.log(`📨 CLIENT RECEIVED: [${message.sender_type}] ${message.content}`)
          clientReceivedMessages.push(message)
        }
      )
      .subscribe()
    
    console.log('✅ Both subscriptions active')
    
    // 4. Simulate client sending message
    console.log('\n4. 👤 CLIENT SENDS MESSAGE...')
    const clientMessage = {
      booking_id: booking.id,
      sender_id: booking.client_id,
      recipient_id: booking.client_id,
      content: 'Hello operator! I need help with my booking.',
      message_type: 'text',
      sender_type: 'client'
    }
    
    const { data: clientMsg, error: clientError } = await supabase
      .from('messages')
      .insert(clientMessage)
      .select()
      .single()
    
    if (clientError) {
      console.log('❌ Client message failed:', clientError.message)
    } else {
      console.log('✅ Client message sent:', clientMsg.id)
    }
    
    // Wait a moment for real-time delivery
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 5. Simulate operator sending response
    console.log('\n5. 🛡️ OPERATOR SENDS RESPONSE...')
    const operatorMessage = {
      booking_id: booking.id,
      sender_id: '4d2535f4-e7c7-4e06-b78a-469f68cc96be', // Known operator ID
      recipient_id: booking.client_id,
      content: 'Hello! I can help you with your booking. What do you need?',
      message_type: 'text',
      sender_type: 'operator'
    }
    
    const { data: operatorMsg, error: operatorError } = await supabase
      .from('messages')
      .insert(operatorMessage)
      .select()
      .single()
    
    if (operatorError) {
      console.log('❌ Operator message failed:', operatorError.message)
    } else {
      console.log('✅ Operator message sent:', operatorMsg.id)
    }
    
    // Wait for real-time delivery
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 6. Simulate client sending another message
    console.log('\n6. 👤 CLIENT SENDS FOLLOW-UP...')
    const followUpMessage = {
      booking_id: booking.id,
      sender_id: booking.client_id,
      recipient_id: booking.client_id,
      content: 'Thank you! Can you confirm my pickup time?',
      message_type: 'text',
      sender_type: 'client'
    }
    
    const { data: followUpMsg, error: followUpError } = await supabase
      .from('messages')
      .insert(followUpMessage)
      .select()
      .single()
    
    if (followUpError) {
      console.log('❌ Follow-up message failed:', followUpError.message)
    } else {
      console.log('✅ Follow-up message sent:', followUpMsg.id)
    }
    
    // Wait for final delivery
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 7. Clean up subscriptions
    console.log('\n7. 🧹 Cleaning up...')
    operatorSubscription.unsubscribe()
    clientSubscription.unsubscribe()
    
    // 8. Clean up test messages
    try {
      await supabase.from('messages').delete().eq('id', clientMsg.id)
      await supabase.from('messages').delete().eq('id', operatorMsg.id)
      await supabase.from('messages').delete().eq('id', followUpMsg.id)
      console.log('✅ Test messages cleaned up')
    } catch (cleanupError) {
      console.log('⚠️ Cleanup warning:', cleanupError.message)
    }
    
    // 9. Results
    console.log('\n' + '=' .repeat(50))
    console.log('📊 REAL-TIME CHAT FLOW RESULTS')
    console.log('=' .repeat(50))
    console.log(`📨 Operator received ${operatorReceivedMessages.length} messages`)
    console.log(`📨 Client received ${clientReceivedMessages.length} messages`)
    
    if (operatorReceivedMessages.length >= 2) {
      console.log('✅ OPERATOR REAL-TIME: WORKING')
    } else {
      console.log('❌ OPERATOR REAL-TIME: NOT WORKING')
    }
    
    if (clientReceivedMessages.length >= 2) {
      console.log('✅ CLIENT REAL-TIME: WORKING')
    } else {
      console.log('❌ CLIENT REAL-TIME: NOT WORKING')
    }
    
    if (operatorReceivedMessages.length >= 2 && clientReceivedMessages.length >= 2) {
      console.log('\n🎉 REAL-TIME CHAT IS FULLY FUNCTIONAL!')
      console.log('💬 Client and operator can communicate in real-time')
      console.log('🔄 Messages are delivered instantly to both parties')
    } else {
      console.log('\n⚠️ REAL-TIME CHAT HAS ISSUES')
      console.log('🔍 Check subscription setup and message delivery')
    }
    
  } catch (error) {
    console.error('❌ Real-time chat test failed:', error)
  }
}

// Run the test
testRealTimeChatFlow()

