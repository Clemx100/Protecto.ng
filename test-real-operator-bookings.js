// Test the real operator bookings API (not demo)
const API_BASE = 'http://192.168.1.142:3000/api';

async function testRealOperatorBookings() {
  console.log('🔍 Testing REAL operator bookings API...');
  
  try {
    const response = await fetch(`${API_BASE}/operator/bookings`);
    const result = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ REAL operator bookings API successful!');
      console.log(`Found ${result.count} bookings:`);
      result.data?.forEach((booking, index) => {
        console.log(`  ${index + 1}. ${booking.booking_code} - ${booking.client?.first_name} ${booking.client?.last_name} (${booking.status})`);
      });
      return result.data;
    } else {
      console.error('❌ REAL operator bookings API failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

// Run the test
testRealOperatorBookings();








