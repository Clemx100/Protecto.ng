#!/usr/bin/env node

/**
 * Test the operator bookings API directly
 */

// Using built-in fetch (Node 18+)

async function testOperatorAPI() {
  console.log('🧪 Testing Operator Bookings API')
  console.log('=' .repeat(50))
  
  try {
    const response = await fetch('http://localhost:3000/api/operator/bookings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ Error response:', errorText)
      return
    }

    const result = await response.json()
    console.log('✅ API Response:')
    console.log('Success:', result.success)
    console.log('Count:', result.count)
    console.log('Data length:', result.data?.length || 0)
    
    if (result.data && result.data.length > 0) {
      console.log('\n📋 Sample booking:')
      const booking = result.data[0]
      console.log('  ID:', booking.id)
      console.log('  Status:', booking.status)
      console.log('  Client:', booking.client?.first_name, booking.client?.last_name)
      console.log('  Pickup:', booking.pickup_address)
      console.log('  Created:', booking.created_at)
    } else {
      console.log('\n⚠️  No bookings found in API response')
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.message)
  }
}

testOperatorAPI()

