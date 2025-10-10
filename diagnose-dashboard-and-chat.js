/**
 * Diagnose Dashboard Display and Chat Issues
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kifcevffaputepvpjpip.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio';

async function diagnose() {
  console.log('🔍 Diagnosing Dashboard and Chat Issues...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Check bookings
    console.log('1️⃣  Checking bookings in database...');
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*, client:profiles!bookings_client_id_fkey(id, email, role, first_name, last_name), service:services(id, name)')
      .order('created_at', { ascending: false });
    
    if (bookingsError) {
      console.log('❌ Error fetching bookings:', bookingsError.message);
    } else {
      console.log(`✅ Found ${bookings.length} booking(s)\n`);
      
      bookings.forEach((b, i) => {
        console.log(`Booking ${i + 1}:`);
        console.log(`  ID: ${b.id}`);
        console.log(`  Code: ${b.booking_code}`);
        console.log(`  Client ID: ${b.client_id}`);
        console.log(`  Client Email: ${b.client?.email || 'NULL - MISSING PROFILE!'}`);
        console.log(`  Client Role: ${b.client?.role || 'NULL'}`);
        console.log(`  Service ID: ${b.service_id}`);
        console.log(`  Service Name: ${b.service?.name || 'NULL - MISSING SERVICE!'}`);
        console.log(`  Status: ${b.status}`);
        console.log(`  Created: ${new Date(b.created_at).toLocaleString()}`);
        console.log('');
      });
      
      // Check for orphaned bookings (missing client profile)
      const orphanedBookings = bookings.filter(b => !b.client);
      if (orphanedBookings.length > 0) {
        console.log('⚠️  WARNING: Found bookings with missing client profiles:');
        orphanedBookings.forEach(b => {
          console.log(`   - Booking ${b.booking_code} has client_id ${b.client_id} but no matching profile!`);
        });
        console.log('\n🔧 These bookings won\'t display properly in the dashboard\n');
      }
    }

    // Check messages
    console.log('2️⃣  Checking messages in database...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (messagesError) {
      console.log('❌ Error fetching messages:', messagesError.message);
    } else {
      console.log(`✅ Found ${messages.length} message(s)\n`);
      
      if (messages.length > 0) {
        messages.forEach((m, i) => {
          console.log(`Message ${i + 1}:`);
          console.log(`  ID: ${m.id}`);
          console.log(`  Booking ID: ${m.booking_id}`);
          console.log(`  Sender: ${m.sender_type} (${m.sender_id})`);
          console.log(`  Content: ${(m.content || m.message || '').substring(0, 50)}...`);
          console.log('');
        });
      }
    }

    // Check what the operator API would return
    console.log('3️⃣  Testing what operator dashboard API sees...');
    const { data: operatorBookings, error: opError } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!bookings_client_id_fkey(
          id,
          email,
          phone,
          first_name,
          last_name
        ),
        service:services(
          id,
          name,
          base_price,
          description,
          price_per_hour
        )
      `)
      .order('created_at', { ascending: false });
    
    if (opError) {
      console.log('❌ Operator API query failed:', opError.message);
      console.log('   This is why the dashboard is empty!');
      console.log('   Error details:', opError);
    } else {
      console.log(`✅ Operator API would return ${operatorBookings.length} booking(s)`);
      console.log('   This is what the dashboard should show:\n');
      
      operatorBookings.forEach((b, i) => {
        console.log(`${i + 1}. ${b.booking_code || b.id.substring(0, 8)}`);
        console.log(`   Client: ${b.client?.email || 'MISSING'}`);
        console.log(`   Service: ${b.service?.name || 'MISSING'}`);
        console.log(`   Status: ${b.status}`);
        console.log('');
      });
    }

    // Check profiles completeness
    console.log('4️⃣  Checking profiles completeness...');
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, role, first_name, last_name');
    
    console.log(`✅ Found ${profiles.length} profile(s):`);
    profiles.forEach(p => {
      console.log(`   - ${p.email}: role=${p.role}, name=${p.first_name} ${p.last_name}`);
    });
    console.log('');

    // RECOMMENDATIONS
    console.log('💡 RECOMMENDATIONS:\n');
    
    if (orphanedBookings && orphanedBookings.length > 0) {
      console.log('🔧 FIX ORPHANED BOOKINGS:');
      console.log('   Some bookings reference client_ids that don\'t exist in profiles table');
      console.log('   Solution: Ensure profile is created when user signs up\n');
    }
    
    if (bookings && bookings.length > 0 && (!operatorBookings || operatorBookings.length === 0)) {
      console.log('🔧 FIX OPERATOR API:');
      console.log('   Bookings exist but operator API can\'t fetch them');
      console.log('   This is likely a JOIN or RLS issue\n');
    }
    
    console.log('✅ Diagnosis complete!');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

diagnose();

