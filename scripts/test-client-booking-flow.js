// Test the complete client booking flow
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDU5NTMsImV4cCI6MjA3MzUyMTk1M30.C1eS4c3MJxh4GTnBMUmvnbmfVwLVHPmxGhX5wg0Mev0'
);

async function testClientBookingFlow() {
  console.log('🧪 Testing complete client booking flow...');
  
  // Test booking data similar to what the client app would send
  const bookingData = {
    id: `CLIENT_TEST_${Date.now()}`,
    serviceType: 'armed-protection',
    protectionType: 'high',
    personnel: {
      protectors: 2,
      protectee: 1,
      dressCode: 'Tactical Casual'
    },
    pickupDetails: {
      location: 'Lekki Phase 1, Lagos',
      date: '2024-01-21',
      time: '09:00:00',
      duration: '6 hours',
      coordinates: {
        lat: 6.4698,
        lng: 3.5852
      }
    },
    destinationDetails: {
      primary: 'Victoria Island, Lagos',
      additional: [],
      coordinates: {
        lat: 6.4281,
        lng: 3.4219
      }
    },
    vehicles: {
      clientVehicle: true,
      vehicleType: 'Sedan',
      vehicleDetails: 'White Honda Accord'
    },
    contact: {
      user: {
        email: 'testclient@protector.ng', // Use existing client
        firstName: 'Test',
        lastName: 'Client'
      },
      phone: '+2348012345679'
    }
  };

  try {
    console.log('📤 Creating booking via API...');
    
    const response = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    });

    const responseText = await response.text();
    console.log('📄 Raw response:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
      return;
    }
    
    if (response.ok) {
      console.log('✅ Client booking created successfully!');
      console.log('📋 Booking details:', {
        id: result.data.id,
        booking_code: result.data.booking_code,
        client_id: result.data.client_id,
        status: result.data.status,
        pickup_address: result.data.pickup_address
      });
      
      // Now test if operator can see it
      console.log('\n🔍 Checking if operator can see the booking...');
      
      const operatorResponse = await fetch('http://localhost:3000/api/operator/bookings');
      const operatorResult = await operatorResponse.json();
      
      if (operatorResult.success) {
        const bookingExists = operatorResult.data.find(b => b.booking_code === bookingData.id);
        if (bookingExists) {
          console.log('✅ Operator can see the new booking!');
          console.log('📋 Operator view:', {
            booking_code: bookingExists.booking_code,
            status: bookingExists.status,
            client_name: bookingExists.client_name,
            pickup_address: bookingExists.pickup_address
          });
        } else {
          console.log('❌ Operator cannot see the new booking');
        }
      } else {
        console.log('❌ Failed to check operator bookings');
      }
      
    } else {
      console.error('❌ Client booking creation failed:');
      console.error('Status:', response.status);
      console.error('Error:', result);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testClientBookingFlow();









