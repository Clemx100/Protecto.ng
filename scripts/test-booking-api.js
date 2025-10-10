// Using built-in fetch (Node.js 18+)

async function testBookingCreation() {
  console.log('🧪 Testing booking creation API...');
  
  const testBookingData = {
    id: `TEST_${Date.now()}`,
    serviceType: 'armed-protection',
    protectionType: 'high',
    personnel: {
      protectors: 2,
      protectee: 1,
      dressCode: 'Tactical Casual'
    },
    pickupDetails: {
      location: 'Victoria Island, Lagos',
      date: '2024-01-20',
      time: '14:00:00',
      duration: '8 hours',
      coordinates: {
        lat: 6.4281,
        lng: 3.4219
      }
    },
    destinationDetails: {
      primary: 'Ikeja, Lagos',
      additional: [],
      coordinates: {
        lat: 6.5244,
        lng: 3.3792
      }
    },
    vehicles: {
      clientVehicle: true,
      vehicleType: 'SUV',
      vehicleDetails: 'Black Toyota Highlander'
    },
    contact: {
      user: {
        email: 'test@protector.ng',
        firstName: 'Test',
        lastName: 'User'
      },
      phone: '+2348012345678'
    }
  };

  try {
    console.log('📤 Sending booking data:', testBookingData.id);
    
    const response = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBookingData)
    });

    const responseText = await response.text();
    console.log('📄 Raw response:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
      console.error('Raw response was:', responseText.substring(0, 500));
      return;
    }
    
    if (response.ok) {
      console.log('✅ Booking created successfully!');
      console.log('📋 Booking details:', {
        id: result.data.id,
        booking_code: result.data.booking_code,
        client_id: result.data.client_id,
        status: result.data.status
      });
    } else {
      console.error('❌ Booking creation failed:');
      console.error('Status:', response.status);
      console.error('Error:', result);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Run the test
testBookingCreation();
