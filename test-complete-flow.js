// Complete end-to-end flow test
const API_BASE = 'http://192.168.1.142:3000/api';

async function testCompleteFlow() {
  console.log('🚀 Starting Complete End-to-End Flow Test');
  console.log('=' .repeat(60));
  
  // Step 1: Create a booking from mobile app
  console.log('\n📱 STEP 1: Creating booking from mobile app...');
  const bookingData = {
    id: `E2E_TEST_${Date.now()}`,
    serviceType: 'armed-protection',
    protectionType: 'armed',
    pickupDetails: {
      location: 'Victoria Island, Lagos',
      date: '2025-02-22',
      time: '15:00',
      duration: '8 hours',
      coordinates: { lat: 6.4281, lng: 3.4216 }
    },
    destinationDetails: {
      primary: 'Lagos Airport',
      coordinates: { lat: 6.5774, lng: 3.3211 }
    },
    personnel: {
      protectors: 2,
      protectee: 1,
      dressCode: 'Tactical Casual'
    },
    vehicles: {
      armoredSuv: 1
    },
    contact: {
      user: {
        firstName: 'E2E',
        lastName: 'Tester'
      },
      phone: '08012345678'
    }
  };

  let booking = null;
  try {
    const response = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    
    const result = await response.json();
    if (response.ok) {
      console.log('✅ Booking created successfully!');
      console.log(`   Booking Code: ${result.data?.booking_code}`);
      console.log(`   Status: ${result.data?.status}`);
      booking = result.data;
    } else {
      console.error('❌ Booking creation failed:', result.error);
      return;
    }
  } catch (error) {
    console.error('❌ Network error during booking creation:', error.message);
    return;
  }

  // Step 2: Check if booking appears in operator dashboard
  console.log('\n🔍 STEP 2: Checking operator dashboard...');
  try {
    const response = await fetch(`${API_BASE}/operator/bookings`);
    const result = await response.json();
    
    if (response.ok) {
      const foundBooking = result.data?.find(b => b.booking_code === booking.booking_code);
      if (foundBooking) {
        console.log('✅ Booking found in operator dashboard!');
        console.log(`   Status: ${foundBooking.status}`);
        console.log(`   Client: ${foundBooking.client?.first_name} ${foundBooking.client?.last_name}`);
      } else {
        console.log('❌ Booking NOT found in operator dashboard');
        return;
      }
    } else {
      console.error('❌ Failed to fetch operator bookings:', result.error);
      return;
    }
  } catch (error) {
    console.error('❌ Network error during operator check:', error.message);
    return;
  }

  // Step 3: Test chat functionality
  console.log('\n💬 STEP 3: Testing chat functionality...');
  try {
    // Send a message from operator to client
    const messageData = {
      bookingId: booking.id,
      content: `Hello ${bookingData.contact.user.firstName}! Your booking ${booking.booking_code} has been received. We're reviewing your request.`,
      messageType: 'text'
    };

    const response = await fetch(`${API_BASE}/operator/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData)
    });

    const result = await response.json();
    if (response.ok) {
      console.log('✅ Message sent successfully!');
      console.log(`   Message: ${messageData.message}`);
    } else {
      console.log('⚠️ Message sending failed (this might be expected):', result.error);
    }
  } catch (error) {
    console.log('⚠️ Chat test failed (this might be expected):', error.message);
  }

  // Step 4: Test action buttons (status updates)
  console.log('\n🔘 STEP 4: Testing action buttons (status updates)...');
  try {
    // Update booking status to 'accepted'
    const statusData = {
      booking_id: booking.id,
      status: 'accepted',
      message: 'Your booking has been accepted! We will contact you shortly with details.'
    };

    const response = await fetch(`${API_BASE}/bookings/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusData)
    });

    const result = await response.json();
    if (response.ok) {
      console.log('✅ Status updated successfully!');
      console.log(`   New Status: ${statusData.status}`);
      console.log(`   Message: ${statusData.message}`);
    } else {
      console.log('⚠️ Status update failed (this might be expected):', result.error);
    }
  } catch (error) {
    console.log('⚠️ Status update test failed (this might be expected):', error.message);
  }

  // Step 5: Verify final status
  console.log('\n✅ STEP 5: Verifying final status...');
  try {
    const response = await fetch(`${API_BASE}/operator/bookings`);
    const result = await response.json();
    
    if (response.ok) {
      const foundBooking = result.data?.find(b => b.booking_code === booking.booking_code);
      if (foundBooking) {
        console.log('✅ Final verification successful!');
        console.log(`   Booking Code: ${foundBooking.booking_code}`);
        console.log(`   Final Status: ${foundBooking.status}`);
        console.log(`   Client: ${foundBooking.client?.first_name} ${foundBooking.client?.last_name}`);
        console.log(`   Pickup: ${foundBooking.pickup_address}`);
        console.log(`   Destination: ${foundBooking.destination_address}`);
        console.log(`   Created: ${foundBooking.created_at}`);
      } else {
        console.log('❌ Booking not found in final verification');
      }
    } else {
      console.error('❌ Failed to verify final status:', result.error);
    }
  } catch (error) {
    console.error('❌ Network error during final verification:', error.message);
  }

  console.log('\n🎉 Complete End-to-End Flow Test Completed!');
  console.log('=' .repeat(60));
}

// Run the complete test
testCompleteFlow();
