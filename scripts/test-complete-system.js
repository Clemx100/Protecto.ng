// Test the complete system after chat tables are set up
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
);

async function testCompleteSystem() {
  console.log('🧪 Testing Complete System After Chat Setup');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Create a booking
    console.log('1️⃣ Creating a new booking...');
    
    const bookingData = {
      id: `SYSTEM_TEST_${Date.now()}`,
      serviceType: 'armed-protection',
      protectionType: 'high',
      personnel: {
        protectors: 2,
        protectee: 1,
        dressCode: 'Tactical Casual'
      },
      pickupDetails: {
        location: 'Lagos Airport, Lagos',
        date: '2024-01-22',
        time: '10:00:00',
        duration: '4 hours',
        coordinates: {
          lat: 6.5774,
          lng: 3.3210
        }
      },
      destinationDetails: {
        primary: 'Ikoyi, Lagos',
        additional: [],
        coordinates: {
          lat: 6.4474,
          lng: 3.4356
        }
      },
      vehicles: {
        clientVehicle: true,
        vehicleType: 'Luxury SUV',
        vehicleDetails: 'Black Mercedes G-Class'
      },
      contact: {
        user: {
          email: 'test@protector.ng',
          firstName: 'System',
          lastName: 'Test'
        },
        phone: '+2348012345670'
      }
    };

    const response = await fetch('http://localhost:3004/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    });

    const responseText = await response.text();
    let result;
    
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError);
      console.log('Raw response:', responseText.substring(0, 200));
      return;
    }
    
    if (response.ok) {
      console.log('✅ Booking created successfully!');
      console.log(`   Booking Code: ${result.data.booking_code}`);
      console.log(`   Status: ${result.data.status}`);
      console.log(`   Client ID: ${result.data.client_id}`);
      
      const bookingId = result.data.id;
      const bookingCode = result.data.booking_code;
      
      // Test 2: Check if chat room was automatically created
      console.log('\n2️⃣ Checking if chat room was created...');
      
      // Wait a moment for triggers to execute
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const { data: chatRooms, error: chatError } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('booking_id', bookingCode);
        
        if (chatError) {
          console.log('⚠️  Could not check chat rooms:', chatError.message);
          console.log('   This might be a caching issue - tables exist in Supabase');
        } else if (chatRooms && chatRooms.length > 0) {
          console.log('✅ Chat room created automatically!');
          console.log(`   Chat Room ID: ${chatRooms[0].id}`);
          console.log(`   Status: ${chatRooms[0].status}`);
        } else {
          console.log('⚠️  No chat room found for this booking');
          console.log('   The trigger might not have fired yet');
        }
      } catch (chatError) {
        console.log('⚠️  Chat room check failed (table might still be syncing):', chatError.message);
      }
      
      // Test 3: Check operator dashboard
      console.log('\n3️⃣ Checking operator dashboard...');
      
      const operatorResponse = await fetch('http://localhost:3004/api/operator/bookings');
      const operatorResult = await operatorResponse.json();
      
      if (operatorResult.success) {
        const bookingExists = operatorResult.data.find(b => b.booking_code === bookingCode);
        if (bookingExists) {
          console.log('✅ Operator dashboard can see the booking!');
          console.log(`   Status: ${bookingExists.status}`);
          console.log(`   Pickup: ${bookingExists.pickup_address}`);
        } else {
          console.log('❌ Operator dashboard cannot see the booking');
        }
      } else {
        console.log('❌ Operator dashboard check failed');
      }
      
    } else {
      console.error('❌ Booking creation failed:');
      console.error('Status:', response.status);
      console.error('Error:', result);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 SYSTEM TEST COMPLETE');
    
  } catch (error) {
    console.error('❌ System test failed:', error.message);
  }
}

testCompleteSystem();






























