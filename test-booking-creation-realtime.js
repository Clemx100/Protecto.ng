// Test script to create a booking and verify it appears in operator dashboard
const API_BASE = 'http://192.168.1.142:3000/api';

async function createTestBooking() {
  console.log('🚀 Creating test booking...');
  
  const bookingData = {
    id: `TEST_REALTIME_${Date.now()}`,
    serviceType: 'armed-protection',
    protectionType: 'armed',
    pickupDetails: {
      location: '15 ogushefumi street',
      date: '2025-02-22',
      time: '11:45',
      duration: '1 day',
      coordinates: { lat: 6.5244, lng: 3.3792 }
    },
    destinationDetails: {
      primary: 'Heyeh',
      coordinates: { lat: 6.4281, lng: 3.4216 }
    },
    personnel: {
      protectors: 1,
      protectee: 1,
      dressCode: 'Tactical Casual'
    },
    vehicles: {
      armoredSuv: 1
    },
    contact: {
      user: {
        firstName: 'Test',
        lastName: 'User'
      },
      phone: '08012345678'
    }
  };

  try {
    const response = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Booking created successfully!');
      console.log('Booking ID:', result.data?.booking_code);
      console.log('Database ID:', result.data?.id);
      console.log('\n📱 Check the operator dashboard to see if it appears in real-time!');
      console.log('Operator Dashboard: http://192.168.1.142:3000/operator/demo');
      return result.data;
    } else {
      console.error('❌ Booking creation failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

async function checkOperatorBookings() {
  console.log('🔍 Checking operator bookings...');
  
  try {
    const response = await fetch(`${API_BASE}/operator/bookings`);
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Found ${result.count || 0} bookings in operator dashboard`);
      console.log('Recent bookings:');
      result.data?.slice(0, 3).forEach((booking, index) => {
        console.log(`${index + 1}. ${booking.booking_code} - ${booking.client?.first_name} ${booking.client?.last_name} (${booking.status})`);
      });
      return result.data;
    } else {
      console.error('❌ Failed to fetch operator bookings:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

async function runTest() {
  console.log('🧪 Starting Real-time Booking Test...\n');
  
  // First, check current bookings
  console.log('1. Checking current operator bookings...');
  await checkOperatorBookings();
  
  console.log('\n2. Creating new test booking...');
  const newBooking = await createTestBooking();
  
  if (newBooking) {
    console.log('\n3. Waiting 3 seconds for real-time sync...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n4. Checking operator bookings again...');
    await checkOperatorBookings();
    
    console.log('\n✅ Test completed!');
    console.log('📱 If the new booking appears in the operator dashboard, real-time sync is working!');
  } else {
    console.log('\n❌ Test failed - could not create booking');
  }
}

// Run the test
runTest();







