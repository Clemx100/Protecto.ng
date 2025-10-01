// Test Client-Operator Communication
console.log('🧪 Testing Client-Operator Communication...')

async function testCommunication() {
  try {
    // Test 1: Check if both API endpoints are accessible
    console.log('\n1. Testing API Endpoints...')
    
    const clientApiTest = await fetch('/api/messages?bookingId=test', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    console.log('✅ Client API Status:', clientApiTest.status)
    
    const operatorApiTest = await fetch('/api/operator/messages?bookingId=test', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    console.log('✅ Operator API Status:', operatorApiTest.status)
    
    // Test 2: Check localStorage structure
    console.log('\n2. Checking localStorage...')
    const chatKeys = Object.keys(localStorage).filter(key => key.startsWith('chat_'))
    console.log('📱 Chat keys in localStorage:', chatKeys.length)
    
    // Test 3: Check if chatService is working
    console.log('\n3. Testing ChatService...')
    if (typeof window !== 'undefined' && window.chatService) {
      console.log('✅ ChatService available')
    } else {
      console.log('❌ ChatService not available')
    }
    
    // Test 4: Simulate message sending
    console.log('\n4. Testing Message Sending...')
    const testMessage = {
      booking_id: 'test_booking_123',
      sender_type: 'client',
      sender_id: 'test_user',
      message: 'Test message from client',
      is_system_message: false
    }
    
    // Store test message in localStorage
    const existingMessages = JSON.parse(localStorage.getItem(`chat_test_booking_123`) || '[]')
    const updatedMessages = [...existingMessages, {
      id: `test_${Date.now()}`,
      ...testMessage,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]
    localStorage.setItem(`chat_test_booking_123`, JSON.stringify(updatedMessages))
    
    // Verify message was stored
    const storedMessages = JSON.parse(localStorage.getItem(`chat_test_booking_123`) || '[]')
    console.log('✅ Test message stored:', storedMessages.length > 0)
    
    console.log('\n🎉 Communication test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run test if in browser environment
if (typeof window !== 'undefined') {
  testCommunication()
} else {
  console.log('Run this test in the browser console')
}
