// Test chat system directly via API
async function testChatSystem() {
  console.log('🧪 Testing Chat System via API...');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Create a booking first
    console.log('1️⃣ Creating a booking...');
    
    const bookingData = {
      id: `CHAT_TEST_${Date.now()}`,
      serviceType: 'armed-protection',
      protectionType: 'high',
      personnel: {
        protectors: 1,
        protectee: 1,
        dressCode: 'Tactical'
      },
      pickupDetails: {
        location: 'Test Location for Chat',
        date: '2024-01-23',
        time: '15:00:00',
        duration: '2 hours',
        coordinates: { lat: 6.5244, lng: 3.3792 }
      },
      destinationDetails: {
        primary: 'Test Destination',
        coordinates: { lat: 6.4474, lng: 3.4356 }
      },
      vehicles: {
        clientVehicle: true,
        vehicleType: 'Sedan',
        vehicleDetails: 'Test Vehicle'
      },
      contact: {
        user: {
          email: 'test@protector.ng',
          firstName: 'Chat',
          lastName: 'Test'
        },
        phone: '+2348012345670'
      }
    };

    const bookingResponse = await fetch('http://localhost:3004/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });

    const bookingResult = await bookingResponse.json();
    
    if (!bookingResponse.ok) {
      console.error('❌ Booking creation failed:', bookingResult);
      return;
    }
    
    console.log('✅ Booking created:', bookingResult.data.booking_code);
    const bookingCode = bookingResult.data.booking_code;
    
    // Test 2: Try to get/create chat room
    console.log('\n2️⃣ Testing chat room creation...');
    
    const chatResponse = await fetch(`http://localhost:3004/api/chat-rooms?bookingId=${bookingCode}`);
    const chatResult = await chatResponse.json();
    
    if (chatResponse.ok) {
      console.log('✅ Chat room operation successful!');
      console.log('📋 Chat room data:', {
        id: chatResult.data.id,
        booking_id: chatResult.data.booking_id,
        status: chatResult.data.status,
        message: chatResult.message
      });
    } else {
      console.error('❌ Chat room operation failed:', chatResult);
    }
    
    // Test 3: Check if booking appears in operator dashboard
    console.log('\n3️⃣ Checking operator dashboard...');
    
    const operatorResponse = await fetch('http://localhost:3004/api/operator/bookings');
    const operatorResult = await operatorResponse.json();
    
    if (operatorResult.success) {
      const bookingExists = operatorResult.data.find(b => b.booking_code === bookingCode);
      if (bookingExists) {
        console.log('✅ Booking visible in operator dashboard!');
        console.log('📋 Booking details:', {
          booking_code: bookingExists.booking_code,
          status: bookingExists.status,
          pickup_address: bookingExists.pickup_address
        });
      } else {
        console.log('❌ Booking not found in operator dashboard');
      }
    } else {
      console.log('❌ Operator dashboard check failed');
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎯 CHAT SYSTEM TEST COMPLETE');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testChatSystem();



























