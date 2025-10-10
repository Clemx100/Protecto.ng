const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
);

async function clearAllBookings() {
  console.log('🗑️  CLEARING ALL BOOKINGS...');
  console.log('=' .repeat(50));
  
  try {
    // First, check how many bookings exist
    const { data: existingBookings, error: countError } = await supabase
      .from('bookings')
      .select('id, booking_code, client_id, status', { count: 'exact' });
    
    if (countError) {
      console.error('❌ Error checking bookings:', countError);
      return;
    }
    
    console.log(`📊 Found ${existingBookings.length} bookings to delete:`);
    existingBookings.forEach((booking, index) => {
      console.log(`${index + 1}. ${booking.booking_code} - Status: ${booking.status}`);
    });
    
    if (existingBookings.length === 0) {
      console.log('✅ No bookings to delete!');
      return;
    }
    
    console.log('\n🗑️  Deleting chat messages first...');
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (messagesError) {
      console.log('⚠️  Error deleting chat messages:', messagesError.message);
    } else {
      console.log('✅ Chat messages deleted');
    }
    
    console.log('\n🗑️  Deleting chat rooms...');
    const { error: roomsError } = await supabase
      .from('chat_rooms')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (roomsError) {
      console.log('⚠️  Error deleting chat rooms:', roomsError.message);
    } else {
      console.log('✅ Chat rooms deleted');
    }
    
    console.log('\n🗑️  Deleting old messages...');
    const { error: oldMessagesError } = await supabase
      .from('messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (oldMessagesError) {
      console.log('⚠️  Error deleting old messages:', oldMessagesError.message);
    } else {
      console.log('✅ Old messages deleted');
    }
    
    console.log('\n🗑️  Deleting all bookings...');
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) {
      console.error('❌ Error deleting bookings:', deleteError);
      return;
    }
    
    console.log('✅ All bookings deleted successfully!');
    
    // Verify deletion
    const { data: remainingBookings } = await supabase
      .from('bookings')
      .select('id', { count: 'exact' });
    
    console.log(`\n📊 Remaining bookings: ${remainingBookings.length}`);
    
    console.log('\n✅ DATABASE CLEARED SUCCESSFULLY!');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

clearAllBookings();







