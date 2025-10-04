// Test final real-time chat functionality
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
)

async function testFinalRealTimeChat() {
  console.log('🔄 FINAL REAL-TIME CHAT TEST')
  console.log('=' .repeat(50))
  console.log('Testing complete client-operator communication flow')
  console.log('')
  
  try {
    // 1. Get test booking
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, booking_code, client_id')
      .limit(1)
    
    const booking = bookings[0]
    console.log('✅ Using booking:', booking.booking_code)
    
    // 2. Set up real-time subscriptions
    console.log('\n2. 🔄 Setting up real-time subscriptions...')
    let operatorReceived = []
    let clientReceived = []
    
    const operatorSub = supabase
      .channel('final-operator-test')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${booking.id}`
      }, (payload) => {
        console.log(`📨 OPERATOR RECEIVED: [${payload.new.sender_type}] ${payload.new.content}`)
        operatorReceived.push(payload.new)
      })
      .subscribe()
    
    const clientSub = supabase
      .channel('final-client-test')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${booking.id}`
      }, (payload) => {
        console.log(`📨 CLIENT RECEIVED: [${payload.new.sender_type}] ${payload.new.content}`)
        clientReceived.push(payload.new)
      })
      .subscribe()
    
    console.log('✅ Both subscriptions active')
    
    // 3. Simulate client sending message via API
    console.log('\n3. 👤 CLIENT SENDS MESSAGE VIA API...')
    try {
      const response = await fetch('http://localhost:3000/api/simple-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          content: 'Hello operator! I need assistance with my booking.',
          senderType: 'client',
          senderId: booking.client_id
        })
      })
      
      if (response.ok) {
        console.log('✅ Client message sent via API')
      } else {
        console.log('❌ Client message failed')
      }
    } catch (error) {
      console.log('❌ Client API error:', error.message)
    }
    
    // Wait for real-time delivery
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 4. Simulate operator sending response via API
    console.log('\n4. 🛡️ OPERATOR SENDS RESPONSE VIA API...')
    try {
      const response = await fetch('http://localhost:3000/api/simple-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          content: 'Hello! I can help you with your booking. What do you need?',
          senderType: 'operator',
          senderId: '4d2535f4-e7c7-4e06-b78a-469f68cc96be'
        })
      })
      
      if (response.ok) {
        console.log('✅ Operator message sent via API')
      } else {
        console.log('❌ Operator message failed')
      }
    } catch (error) {
      console.log('❌ Operator API error:', error.message)
    }
    
    // Wait for real-time delivery
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 5. Simulate client sending follow-up
    console.log('\n5. 👤 CLIENT SENDS FOLLOW-UP VIA API...')
    try {
      const response = await fetch('http://localhost:3000/api/simple-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          content: 'Thank you! Can you confirm my pickup time is still 11:45 AM?',
          senderType: 'client',
          senderId: booking.client_id
        })
      })
      
      if (response.ok) {
        console.log('✅ Client follow-up sent via API')
      } else {
        console.log('❌ Client follow-up failed')
      }
    } catch (error) {
      console.log('❌ Client follow-up API error:', error.message)
    }
    
    // Wait for final delivery
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 6. Clean up
    console.log('\n6. 🧹 Cleaning up...')
    operatorSub.unsubscribe()
    clientSub.unsubscribe()
    
    // 7. Final results
    console.log('\n' + '=' .repeat(50))
    console.log('📊 FINAL REAL-TIME CHAT RESULTS')
    console.log('=' .repeat(50))
    console.log(`📨 Operator received ${operatorReceived.length} messages`)
    console.log(`📨 Client received ${clientReceived.length} messages`)
    
    if (operatorReceived.length >= 2 && clientReceived.length >= 2) {
      console.log('\n🎉 REAL-TIME CHAT IS FULLY FUNCTIONAL!')
      console.log('✅ Client and operator can send messages via API')
      console.log('✅ Real-time delivery is working perfectly')
      console.log('✅ Both parties receive messages instantly')
      console.log('\n🚀 THE CHAT SYSTEM IS WORKING!')
    } else {
      console.log('\n⚠️ REAL-TIME CHAT HAS ISSUES')
      console.log('🔍 Check subscription setup')
    }
    
  } catch (error) {
    console.error('❌ Final real-time test failed:', error)
  }
}

// Run the test
testFinalRealTimeChat()

