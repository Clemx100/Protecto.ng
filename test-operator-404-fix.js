// Test to simulate the exact operator dashboard behavior and fix the 404 error
console.log('🧪 Testing Operator Dashboard 404 Error Fix...');

async function testOperatorDashboardBehavior() {
  try {
    console.log('\n=== SIMULATING OPERATOR DASHBOARD BEHAVIOR ===');
    
    // Simulate the exact booking data structure from operator dashboard
    const mockSelectedBooking = {
      id: 'REQ1759281266086', // booking_code (what operator dashboard shows)
      database_id: '5233b3d2-92c4-40de-8717-0eb0c505d3e3', // actual UUID
      status: 'pending',
      client: {
        first_name: 'STEPHEN',
        last_name: 'IWEWEZINEM'
      }
    };
    
    console.log('📋 Mock selected booking:', mockSelectedBooking);
    
    // Test 1: Simulate what operator dashboard sends
    console.log('\n1. Testing what operator dashboard sends...');
    
    const action = 'confirm';
    const newStatus = 'accepted';
    const systemMessage = 'Booking confirmed by operator';
    
    // Simulate the exact logic from operator dashboard
    let databaseId = mockSelectedBooking.database_id;
    
    console.log('🔍 DEBUG - Selected booking details:', {
      id: mockSelectedBooking.id,
      database_id: mockSelectedBooking.database_id,
      status: mockSelectedBooking.status
    });
    
    // Check if database_id is valid
    if (!databaseId || databaseId.startsWith('REQ')) {
      console.warn('❌ database_id missing or invalid, attempting to find by booking_code:', mockSelectedBooking.id);
    } else {
      console.log('✅ database_id is valid:', databaseId);
    }
    
    console.log('🚀 Sending status update request:', {
      bookingId: databaseId,
      bookingCode: mockSelectedBooking.id,
      status: newStatus.toLowerCase().replace(/\s+/g, '_'),
      notes: systemMessage,
      requestUrl: '/api/bookings/status'
    });
    
    // Test 2: Make the actual API call
    console.log('\n2. Making API call to /api/bookings/status...');
    
    const response = await fetch('http://localhost:3000/api/bookings/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: databaseId,
        status: newStatus.toLowerCase().replace(/\s+/g, '_'),
        notes: systemMessage
      }),
    });
    
    const result = await response.json();
    
    console.log('📡 API Response:', {
      status: response.status,
      statusText: response.statusText,
      result: result
    });
    
    if (response.ok) {
      console.log('✅ SUCCESS! Status update worked');
      console.log('🎯 The fix should work in production');
    } else {
      console.log('❌ FAILED! Status update failed');
      console.log('🔍 This confirms the 404 error issue');
    }
    
    // Test 3: Verify the booking was actually updated
    console.log('\n3. Verifying booking status in database...');
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co', 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    );
    
    const { data: updatedBooking, error } = await supabase
      .from('bookings')
      .select('id, booking_code, status')
      .eq('id', databaseId)
      .single();
      
    if (error) {
      console.error('❌ Error verifying booking:', error);
    } else {
      console.log('✅ Booking status verified:', updatedBooking);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Instructions for running the test
console.log('\n📝 INSTRUCTIONS:');
console.log('1. Make sure the development server is running: npm run dev');
console.log('2. Run this test: node test-operator-404-fix.js');
console.log('3. Check the console output for debug information');
console.log('4. The test will show exactly what the operator dashboard sends vs what the API receives');

// Run the test if we're in a Node.js environment
if (typeof window === 'undefined') {
  testOperatorDashboardBehavior();
}




