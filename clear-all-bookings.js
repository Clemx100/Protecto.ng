const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearAllBookings() {
  try {
    console.log('🗑️  Starting to clear all bookings...');

    // First, get count of bookings
    const { count: bookingCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    console.log(`Found ${bookingCount} bookings to delete`);

    // Delete all related messages first (if they reference bookings)
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (messagesError && messagesError.code !== 'PGRST116') {
      console.log('⚠️  Error deleting messages:', messagesError.message);
    } else {
      console.log('✅ Cleared all messages');
    }

    // Delete all conversations
    const { error: conversationsError } = await supabase
      .from('conversations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (conversationsError && conversationsError.code !== 'PGRST116') {
      console.log('⚠️  Error deleting conversations:', conversationsError.message);
    } else {
      console.log('✅ Cleared all conversations');
    }

    // Delete all message_reads
    const { error: readsError } = await supabase
      .from('message_reads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (readsError && readsError.code !== 'PGRST116') {
      console.log('⚠️  Error deleting message reads:', readsError.message);
    } else {
      console.log('✅ Cleared all message reads');
    }

    // Finally, delete all bookings
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (bookingsError) {
      console.error('❌ Error deleting bookings:', bookingsError);
      process.exit(1);
    }

    console.log('✅ Successfully cleared all bookings');
    console.log('🎉 Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

clearAllBookings();
