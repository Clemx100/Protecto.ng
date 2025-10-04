// Simple test to debug booking creation
const API_BASE = 'http://192.168.1.142:3000/api';

async function testSimpleBooking() {
  console.log('🧪 Testing simple booking creation...');
  
  const simpleBooking = {
    id: `SIMPLE_TEST_${Date.now()}`,
    serviceType: 'armed-protection',
    protectionType: 'armed',
    pickupDetails: {
      location: 'Test Location',
      date: '2025-02-22',
      time: '12:00',
      duration: '4 hours',
      coordinates: { lat: 6.5244, lng: 3.3792 }
    },
    destinationDetails: {
      primary: 'Test Destination',
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
    console.log('📤 Sending booking data:', JSON.stringify(simpleBooking, null, 2));
    
    const response = await fetch(`${API_BASE}/bookings-demo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(simpleBooking)
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    console.log('📥 Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Booking created successfully!');
      console.log('Booking ID:', result.data?.booking_code);
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

// Run the test
testSimpleBooking();








