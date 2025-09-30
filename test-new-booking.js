// Test the new simplified booking API
const API_BASE = 'http://192.168.1.142:3000/api';

async function testNewBooking() {
  console.log('🧪 Testing new simplified booking API...');
  
  const simpleBooking = {
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
    console.log('📤 Sending booking data to /api/test-booking...');
    
    const response = await fetch(`${API_BASE}/test-booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(simpleBooking)
    });

    console.log('📥 Response status:', response.status);
    const result = await response.json();
    console.log('📥 Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Test booking created successfully!');
      console.log('Booking Code:', result.data?.booking_code);
      return result.data;
    } else {
      console.error('❌ Test booking creation failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

// Run the test
testNewBooking();



