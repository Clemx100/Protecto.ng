const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
);

async function testStatusUpdate() {
  console.log('🧪 Testing booking status update...');
  
  const targetBookingId = '5233b3d2-92c4-40de-8717-0eb0c505d3e3'; // Database ID for REQ1759281266086
  
  try {
    // Test 1: Check if booking exists
    console.log('1. Checking if booking exists...');
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, booking_code, status')
      .eq('id', targetBookingId)
      .single();

    if (fetchError || !existingBooking) {
      console.error('❌ Booking not found:', fetchError);
      return;
    }

    console.log('✅ Booking found:', existingBooking);

    // Test 2: Try to update status
    console.log('2. Testing status update...');
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', targetBookingId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update failed:', updateError);
      return;
    }

    console.log('✅ Status update successful:', updatedBooking);

    // Test 3: Revert back to pending
    console.log('3. Reverting to pending...');
    const { data: revertedBooking, error: revertError } = await supabase
      .from('bookings')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', targetBookingId)
      .select()
      .single();

    if (revertError) {
      console.error('❌ Revert failed:', revertError);
      return;
    }

    console.log('✅ Reverted to pending:', revertedBooking);
    console.log('🎉 All tests passed! The API should work.');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testStatusUpdate();
