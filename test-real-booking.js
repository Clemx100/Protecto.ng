// Test the real booking API (not demo)
const API_BASE = 'http://192.168.1.142:3000/api';

async function testRealBooking() {
  console.log('📱 Testing REAL booking API...');
  
  const realBooking = {
    id: `REAL_MOBILE_${Date.now()}`,
    serviceType: 'armed-protection',
    protectionType: 'armed',
    pickupDetails: {
      location: 'Victoria Island, Lagos',
      date: '2025-02-22',
      time: '14:00',
      duration: '6 hours',
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
        firstName: 'Mobile',
        lastName: 'User'
      },
      phone: '08012345678'
    }
  };

  try {
    console.log('📤 Sending booking to REAL API /api/bookings...');
    
    const response = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(realBooking)
    });

    console.log('📥 Response status:', response.status);
    const result = await response.json();
    console.log('📥 Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ REAL booking created successfully!');
      console.log('Booking Code:', result.data?.booking_code);
      return result.data;
    } else {
      console.error('❌ REAL booking creation failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

// Run the test
testRealBooking();








