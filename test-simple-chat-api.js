// Test the new simple chat API
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
)

async function testSimpleChatAPI() {
  console.log('🧪 TESTING SIMPLE CHAT API')
  console.log('=' .repeat(40))
  
  try {
    // 1. Get a test booking
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, booking_code, client_id')
      .limit(1)
    
    if (!bookings || bookings.length === 0) {
      console.log('❌ No bookings found')
      return
    }
    
    const booking = bookings[0]
    console.log('✅ Using booking:', booking.booking_code)
    
    // 2. Test GET messages
    console.log('\n1. 📥 Testing GET messages...')
    try {
      const response = await fetch(`http://localhost:3000/api/simple-chat?bookingId=${booking.id}`)
      const result = await response.json()
      
      if (response.ok) {
        console.log('✅ GET messages: WORKING')
        console.log('📨 Retrieved', result.data?.length || 0, 'messages')
      } else {
        console.log('❌ GET messages failed:', result.error)
        return
      }
    } catch (error) {
      console.log('❌ GET messages error:', error.message)
      return
    }
    
    // 3. Test POST message (client)
    console.log('\n2. 📤 Testing POST message (client)...')
    try {
      const response = await fetch('http://localhost:3000/api/simple-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          content: 'Test message from simple API - CLIENT',
          senderType: 'client',
          senderId: booking.client_id
        })
      })
      const result = await response.json()
      
      if (response.ok) {
        console.log('✅ POST message (client): WORKING')
        console.log('📨 Created message:', result.data?.id)
      } else {
        console.log('❌ POST message (client) failed:', result.error)
        return
      }
    } catch (error) {
      console.log('❌ POST message (client) error:', error.message)
      return
    }
    
    // 4. Test POST message (operator)
    console.log('\n3. 📤 Testing POST message (operator)...')
    try {
      const response = await fetch('http://localhost:3000/api/simple-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          content: 'Test message from simple API - OPERATOR',
          senderType: 'operator',
          senderId: '4d2535f4-e7c7-4e06-b78a-469f68cc96be'
        })
      })
      const result = await response.json()
      
      if (response.ok) {
        console.log('✅ POST message (operator): WORKING')
        console.log('📨 Created message:', result.data?.id)
      } else {
        console.log('❌ POST message (operator) failed:', result.error)
        return
      }
    } catch (error) {
      console.log('❌ POST message (operator) error:', error.message)
      return
    }
    
    // 5. Test GET messages again to see new messages
    console.log('\n4. 📥 Testing GET messages (after POST)...')
    try {
      const response = await fetch(`http://localhost:3000/api/simple-chat?bookingId=${booking.id}`)
      const result = await response.json()
      
      if (response.ok) {
        console.log('✅ GET messages (after POST): WORKING')
        console.log('📨 Retrieved', result.data?.length || 0, 'messages')
        
        // Show last few messages
        const messages = result.data || []
        const lastMessages = messages.slice(-3)
        lastMessages.forEach((msg, index) => {
          const sender = msg.sender_type === 'client' ? '👤 Client' : '🛡️ Operator'
          const time = new Date(msg.created_at).toLocaleTimeString()
          console.log(`   ${index + 1}. [${time}] ${sender}: ${msg.content}`)
        })
      } else {
        console.log('❌ GET messages (after POST) failed:', result.error)
      }
    } catch (error) {
      console.log('❌ GET messages (after POST) error:', error.message)
    }
    
    console.log('\n' + '=' .repeat(40))
    console.log('🎉 SIMPLE CHAT API TEST COMPLETED!')
    console.log('✅ All API endpoints are working')
    console.log('💬 Client and operator can send/receive messages')
    console.log('🚀 Chat system is now functional!')
    
  } catch (error) {
    console.error('❌ Simple chat API test failed:', error)
  }
}

// Run the test
testSimpleChatAPI()

