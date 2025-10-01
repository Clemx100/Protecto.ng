const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
);

async function checkBookings() {
  console.log('🔍 Checking booking structure...');
  
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, booking_code, status, client_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`📋 Found ${bookings.length} recent bookings:`);
    bookings.forEach((booking, index) => {
      console.log(`${index + 1}. Database ID: ${booking.id}`);
      console.log(`   Booking Code: ${booking.booking_code}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Client ID: ${booking.client_id}`);
      console.log(`   Created: ${booking.created_at}`);
      console.log('---');
    });
    
    // Check for the specific booking from the screenshot
    const targetBooking = bookings.find(b => b.booking_code === 'REQ1759281266086');
    if (targetBooking) {
      console.log('🎯 Found target booking REQ1759281266086:');
      console.log(`   Database ID: ${targetBooking.id}`);
      console.log(`   Status: ${targetBooking.status}`);
    } else {
      console.log('❌ Target booking REQ1759281266086 not found in database');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkBookings();
