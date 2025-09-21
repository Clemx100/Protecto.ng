// Test booking creation using operator user
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testOperatorBooking() {
  try {
    console.log('🔄 Testing booking creation with operator user...')
    
    // Get the operator user
    const { data: operatorProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'operator')
      .limit(1)
      .single()
    
    if (!operatorProfile) {
      console.error('❌ No operator user found')
      return false
    }
    
    console.log('Using operator user:', operatorProfile.email)
    
    // Sign in as operator
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: operatorProfile.email,
      password: 'operator123' // This might not work, but let's try
    })
    
    if (authError) {
      console.log('❌ Operator signin failed:', authError.message)
      console.log('This is expected - we need the operator password')
      return false
    }
    
    console.log('✅ Signed in as operator')
    
    // Get a service ID
    const { data: services } = await supabase
      .from('services')
      .select('id')
      .eq('type', 'armed_protection')
      .limit(1)
    
    const serviceId = services[0].id
    
    // Create a test booking
    const testBooking = {
      booking_code: `OP_TEST_${Date.now()}`,
      client_id: operatorProfile.id, // Use operator as client for testing
      service_id: serviceId,
      service_type: 'armed_protection',
      protector_count: 1,
      protectee_count: 1,
      dress_code: 'tactical_casual',
      duration_hours: 4,
      pickup_address: 'Test Location',
      pickup_coordinates: null,
      destination_address: 'Test Destination',
      destination_coordinates: null,
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '12:00:00',
      base_price: 100000,
      total_price: 100000,
      special_instructions: 'Test booking by operator',
      emergency_contact: 'Test Contact',
      emergency_phone: '1234567890',
      status: 'pending'
    }
    
    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert([testBooking])
      .select()
    
    if (bookingError) {
      console.error('❌ Booking creation failed:', bookingError.message)
      return false
    }
    
    console.log('✅ Booking created successfully!')
    console.log('Booking ID:', newBooking[0].id)
    
    // Clean up
    await supabase
      .from('bookings')
      .delete()
      .eq('id', newBooking[0].id)
    
    console.log('✅ Test booking cleaned up')
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

async function testDirectBookingCreation() {
  try {
    console.log('\n🔄 Testing direct booking creation (bypassing RLS)...')
    
    // Get a service ID
    const { data: services } = await supabase
      .from('services')
      .select('id')
      .eq('type', 'armed_protection')
      .limit(1)
    
    const serviceId = services[0].id
    
    // Get a client user ID
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'client')
      .limit(1)
      .single()
    
    if (!clientProfile) {
      console.error('❌ No client user found')
      return false
    }
    
    // Create a test booking
    const testBooking = {
      booking_code: `DIRECT_TEST_${Date.now()}`,
      client_id: clientProfile.id,
      service_id: serviceId,
      service_type: 'armed_protection',
      protector_count: 1,
      protectee_count: 1,
      dress_code: 'tactical_casual',
      duration_hours: 4,
      pickup_address: 'Test Location',
      pickup_coordinates: null,
      destination_address: 'Test Destination',
      destination_coordinates: null,
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '12:00:00',
      base_price: 100000,
      total_price: 100000,
      special_instructions: 'Test booking direct',
      emergency_contact: 'Test Contact',
      emergency_phone: '1234567890',
      status: 'pending'
    }
    
    const { data: newBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert([testBooking])
      .select()
    
    if (bookingError) {
      console.error('❌ Direct booking creation failed:', bookingError.message)
      console.error('Error details:', bookingError)
      return false
    }
    
    console.log('✅ Direct booking created successfully!')
    console.log('Booking ID:', newBooking[0].id)
    
    // Clean up
    await supabase
      .from('bookings')
      .delete()
      .eq('id', newBooking[0].id)
    
    console.log('✅ Test booking cleaned up')
    return true
    
  } catch (error) {
    console.error('❌ Direct test failed:', error.message)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting Operator Booking Tests...\n')
  
  const operatorOk = await testOperatorBooking()
  const directOk = await testDirectBookingCreation()
  
  if (directOk) {
    console.log('\n✅ SUCCESS: Direct booking creation works!')
    console.log('The issue might be with user authentication in the client app')
  } else {
    console.log('\n❌ ISSUE: Even direct booking creation fails')
    console.log('There might be a database schema or RLS policy issue')
  }
}

runTests().catch(console.error)
