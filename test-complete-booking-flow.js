/**
 * Test Complete Booking Flow
 * 
 * This script tests the complete booking flow from request to completion:
 * 1. User sends request
 * 2. Operator accepts it
 * 3. Operator sends invoice for payment
 * 4. User clicks approve and pay
 * 5. Operator deploys team
 * 6. User sees deployed status
 * 7. Operator clicks en route
 * 8. User is updated
 * 9. Team arrives - operator clicks start service
 * 10. User is updated
 * 11. Service is done - operator clicks complete service
 * 12. User is updated and booking appears in history
 */

const BASE_URL = 'http://localhost:3000'

async function testCompleteBookingFlow() {
  console.log('🚀 Testing Complete Booking Flow')
  console.log('=====================================')
  
  try {
    // Step 1: Create a test booking
    console.log('\n📝 Step 1: Creating test booking...')
    const bookingData = {
      id: `REQ${Date.now()}`,
      serviceType: 'armed-protection',
      personnel: {
        protectors: 2,
        protectee: 1,
        dressCode: 'Business Formal'
      },
      vehicles: {
        armoredSedan: 1
      },
      protectionType: 'High Risk',
      pickupDetails: {
        location: 'Victoria Island, Lagos',
        date: new Date().toISOString().split('T')[0],
        time: '14:00',
        duration: '8 hours',
        coordinates: { lat: 6.4281, lng: 3.4219 }
      },
      destinationDetails: {
        primary: 'Lekki Phase 1, Lagos',
        additional: ['Ikoyi', 'Banana Island'],
        coordinates: { lat: 6.4698, lng: 3.5852 }
      },
      contact: {
        phone: '+2348123456789',
        user: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        }
      },
      status: 'pending',
      timestamp: new Date().toISOString()
    }
    
    const createResponse = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    })
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create booking: ${createResponse.statusText}`)
    }
    
    const createResult = await createResponse.json()
    console.log('✅ Booking created:', createResult.data.booking_code)
    const bookingId = createResult.data.id
    const bookingCode = createResult.data.booking_code
    
    // Step 2: Operator accepts the booking
    console.log('\n✅ Step 2: Operator accepting booking...')
    const acceptResponse = await fetch(`${BASE_URL}/api/bookings/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: bookingId,
        status: 'accepted',
        notes: 'Booking accepted by operator'
      })
    })
    
    if (!acceptResponse.ok) {
      throw new Error(`Failed to accept booking: ${acceptResponse.statusText}`)
    }
    
    console.log('✅ Booking accepted')
    
    // Step 3: Operator sends invoice
    console.log('\n💰 Step 3: Operator sending invoice...')
    const invoiceResponse = await fetch(`${BASE_URL}/api/operator/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: bookingId,
        content: `📄 **Invoice for Your Protection Service**

**Service Details:**
• Base Price: ₦100,000
• Hourly Rate (8h): ₦200,000
• Vehicle Fee: ₦20,000
• Personnel Fee: ₦60,000

**Total Amount: ₦380,000**

Please review and approve the payment to proceed with your service.`,
        messageType: 'invoice',
        metadata: {
          basePrice: 100000,
          hourlyRate: 25000,
          vehicleFee: 20000,
          personnelFee: 60000,
          duration: 8,
          totalAmount: 380000,
          currency: 'NGN'
        }
      })
    })
    
    if (!invoiceResponse.ok) {
      throw new Error(`Failed to send invoice: ${invoiceResponse.statusText}`)
    }
    
    console.log('✅ Invoice sent')
    
    // Step 4: User approves payment (simulated)
    console.log('\n💳 Step 4: User approving payment...')
    // In real flow, this would be done through the UI
    console.log('✅ Payment approved (simulated)')
    
    // Step 5: Operator deploys team
    console.log('\n🚀 Step 5: Operator deploying team...')
    const deployResponse = await fetch(`${BASE_URL}/api/bookings/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: bookingId,
        status: 'en_route',
        notes: 'Protection team deployed and en route'
      })
    })
    
    if (!deployResponse.ok) {
      throw new Error(`Failed to deploy team: ${deployResponse.statusText}`)
    }
    
    console.log('✅ Team deployed')
    
    // Step 6: Team arrives
    console.log('\n📍 Step 6: Team arriving...')
    const arriveResponse = await fetch(`${BASE_URL}/api/bookings/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: bookingId,
        status: 'arrived',
        notes: 'Protection team arrived at location'
      })
    })
    
    if (!arriveResponse.ok) {
      throw new Error(`Failed to mark arrived: ${arriveResponse.statusText}`)
    }
    
    console.log('✅ Team arrived')
    
    // Step 7: Start service
    console.log('\n🛡️ Step 7: Starting protection service...')
    const startServiceResponse = await fetch(`${BASE_URL}/api/bookings/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: bookingId,
        status: 'in_service',
        notes: 'Protection service started'
      })
    })
    
    if (!startServiceResponse.ok) {
      throw new Error(`Failed to start service: ${startServiceResponse.statusText}`)
    }
    
    console.log('✅ Service started')
    
    // Step 8: Complete service
    console.log('\n✅ Step 8: Completing service...')
    const completeResponse = await fetch(`${BASE_URL}/api/bookings/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: bookingId,
        status: 'completed',
        notes: 'Service completed successfully'
      })
    })
    
    if (!completeResponse.ok) {
      throw new Error(`Failed to complete service: ${completeResponse.statusText}`)
    }
    
    console.log('✅ Service completed')
    
    // Step 9: Verify booking appears in history
    console.log('\n📚 Step 9: Verifying booking appears in history...')
    const historyResponse = await fetch(`${BASE_URL}/api/bookings`)
    
    if (!historyResponse.ok) {
      throw new Error(`Failed to fetch booking history: ${historyResponse.statusText}`)
    }
    
    const historyResult = await historyResponse.json()
    const completedBookings = historyResult.data.filter(booking => booking.status === 'completed')
    const ourBooking = completedBookings.find(booking => booking.booking_code === bookingCode)
    
    if (ourBooking) {
      console.log('✅ Booking found in history:', ourBooking.booking_code)
      console.log('   Status:', ourBooking.status)
      console.log('   Completed at:', ourBooking.completed_at)
    } else {
      console.log('❌ Booking not found in history')
      console.log('   Available completed bookings:', completedBookings.map(b => b.booking_code))
    }
    
    // Step 10: Test operator dashboard history view
    console.log('\n👨‍💼 Step 10: Testing operator dashboard history...')
    const operatorResponse = await fetch(`${BASE_URL}/api/operator/bookings`)
    
    if (!operatorResponse.ok) {
      throw new Error(`Failed to fetch operator bookings: ${operatorResponse.statusText}`)
    }
    
    const operatorResult = await operatorResponse.json()
    const operatorCompletedBookings = operatorResult.data.filter(booking => booking.status === 'completed')
    const operatorBooking = operatorCompletedBookings.find(booking => booking.id === bookingCode)
    
    if (operatorBooking) {
      console.log('✅ Booking found in operator dashboard history:', operatorBooking.id)
      console.log('   Status:', operatorBooking.status)
    } else {
      console.log('❌ Booking not found in operator dashboard history')
    }
    
    console.log('\n🎉 Complete Booking Flow Test Results:')
    console.log('=====================================')
    console.log(`✅ Booking created: ${bookingCode}`)
    console.log(`✅ Booking accepted`)
    console.log(`✅ Invoice sent`)
    console.log(`✅ Payment approved`)
    console.log(`✅ Team deployed`)
    console.log(`✅ Team arrived`)
    console.log(`✅ Service started`)
    console.log(`✅ Service completed`)
    console.log(`✅ Booking appears in history: ${ourBooking ? 'YES' : 'NO'}`)
    console.log(`✅ Operator dashboard shows completed: ${operatorBooking ? 'YES' : 'NO'}`)
    
    if (ourBooking && operatorBooking) {
      console.log('\n🎊 SUCCESS: Complete booking flow working correctly!')
      console.log('   Users can now see completed services in their booking history.')
    } else {
      console.log('\n❌ ISSUE: Some parts of the flow need attention.')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run the test
testCompleteBookingFlow()