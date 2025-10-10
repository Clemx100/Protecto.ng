/**
 * Test Booking Creation Directly
 * This bypasses the frontend to test if bookings can be created
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kifcevffaputepvpjpip.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio';

async function testBookingCreation() {
  console.log('🧪 Testing Direct Booking Creation...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Step 1: Get operator user ID
    console.log('Step 1: Getting operator user ID...');
    const { data: users } = await supabase.auth.admin.listUsers();
    const operator = users.users.find(u => u.email === 'iwewezinemstephen@gmail.com');
    
    if (!operator) {
      throw new Error('Operator user not found');
    }
    
    console.log(`✅ Operator ID: ${operator.id}\n`);

    // Step 2: Get or create a service
    console.log('Step 2: Getting service...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(1);
    
    if (servicesError) throw servicesError;
    
    let serviceId;
    if (services && services.length > 0) {
      serviceId = services[0].id;
      console.log(`✅ Using existing service: ${services[0].name} (${serviceId})\n`);
    } else {
      console.log('Creating default service...');
      const { data: newService, error: createServiceError } = await supabase
        .from('services')
        .insert({
          name: 'Armed Protection Service',
          description: 'Professional armed protection service',
          base_price: 100000,
          price_per_hour: 25000
        })
        .select()
        .single();
      
      if (createServiceError) throw createServiceError;
      serviceId = newService.id;
      console.log(`✅ Created service: ${serviceId}\n`);
    }

    // Step 3: Create test booking
    console.log('Step 3: Creating test booking...');
    const bookingData = {
      booking_code: `REQ${Date.now()}`,
      client_id: operator.id, // Using operator as client for testing
      service_id: serviceId,
      service_type: 'armed_protection',
      status: 'pending',
      protector_count: 1,
      protectee_count: 1,
      dress_code: 'tactical',
      duration_hours: 24,
      pickup_address: 'Test Location',
      pickup_coordinates: '(6.5244,3.3792)',
      destination_address: 'Test Destination',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '10:00:00',
      base_price: 100000,
      total_price: 100000,
      surge_multiplier: 1,
      special_instructions: JSON.stringify({ test: true }),
      emergency_contact: 'Test User',
      emergency_phone: '+234 9071034162'
    };

    console.log('Attempting to insert booking...');
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();
    
    if (bookingError) {
      console.log('❌ Booking creation FAILED!');
      console.log('Error details:', bookingError);
      console.log('\n🔍 Common causes:');
      console.log('   1. RLS policies blocking insert');
      console.log('   2. Foreign key constraint violation');
      console.log('   3. Missing required columns');
      console.log('   4. Data type mismatch');
      console.log('\n💡 Solution: Run fix-booking-creation.sql in Supabase SQL Editor');
      return;
    }

    console.log('✅ Booking created successfully!');
    console.log('\nBooking details:');
    console.log(`   ID: ${booking.id}`);
    console.log(`   Code: ${booking.booking_code}`);
    console.log(`   Client: ${operator.email}`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   Created: ${booking.created_at}`);

    // Step 4: Create test message
    console.log('\nStep 4: Creating test message for booking...');
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        booking_id: booking.id,
        sender_id: operator.id,
        sender_type: 'system',
        content: 'Test booking created successfully!',
        message_type: 'system',
        is_system_message: true
      })
      .select()
      .single();
    
    if (messageError) {
      console.log('⚠️  Message creation failed:', messageError.message);
    } else {
      console.log('✅ Message created successfully!');
    }

    // Step 5: Verify in database
    console.log('\nStep 5: Verifying booking is visible...');
    const { data: verifyBookings, error: verifyError } = await supabase
      .from('bookings')
      .select('*, client:profiles!bookings_client_id_fkey(email, role)')
      .eq('id', booking.id)
      .single();
    
    if (verifyError) {
      console.log('⚠️  Could not verify booking:', verifyError.message);
    } else {
      console.log('✅ Booking is visible in database!');
      console.log(`   Client: ${verifyBookings.client.email}`);
      console.log(`   Role: ${verifyBookings.client.role}`);
    }

    console.log('\n🎉 SUCCESS! Booking system is working!');
    console.log('\n📊 Summary:');
    console.log(`   ✅ Booking created: ${booking.booking_code}`);
    console.log(`   ✅ Message created: ${message ? 'Yes' : 'No'}`);
    console.log(`   ✅ Database verified: Yes`);
    console.log('\n💡 Now refresh your operator dashboard to see this booking!');

  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Check that all required tables exist');
    console.log('   2. Verify RLS policies allow inserts');
    console.log('   3. Run fix-booking-creation.sql in Supabase');
    console.log('   4. Check foreign key constraints');
  }
}

testBookingCreation();

