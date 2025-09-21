// Test booking creation with proper authentication
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBookingCreation() {
  try {
    console.log('🔄 Testing booking creation with authentication...')
    
    // First, let's try to sign up a test user
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'testpassword123'
    
    console.log('Creating test user:', testEmail)
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User'
        }
      }
    })
    
    if (authError) {
      console.error('❌ Auth signup failed:', authError.message)
      return false
    }
    
    console.log('✅ Test user created:', authData.user?.id)
    
    // Wait a moment for the profile to be created
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Get a service ID
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id')
      .eq('type', 'armed_protection')
      .limit(1)
    
    if (servicesError || !services || services.length === 0) {
      console.error('❌ No services found:', servicesError?.message)
      return false
    }
    
    const serviceId = services[0].id
    console.log('Using service ID:', serviceId)
    
    // Create a test booking with the authenticated user
    const testBooking = {
      booking_code: `TEST_${Date.now()}`,
      client_id: authData.user.id,
      service_id: serviceId,
      service_type: 'armed_protection',
      protector_count: 1,
      protectee_count: 1,
      dress_code: 'tactical_casual',
      duration_hours: 4,
      pickup_address: 'Test Location',
      pickup_coordinates: 'POINT(0 0)',
      destination_address: 'Test Destination',
      destination_coordinates: 'POINT(0 0)',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '12:00:00',
      base_price: 100000,
      total_price: 100000,
      special_instructions: 'Test booking',
      emergency_contact: 'Test Contact',
      emergency_phone: '1234567890',
      status: 'pending'
    }
    
    console.log('Creating booking with authenticated user...')
    
    const { data, error } = await supabase
      .from('bookings')
      .insert([testBooking])
      .select()
    
    if (error) {
      console.error('❌ Booking creation failed:', error.message)
      console.error('Error details:', error)
      return false
    } else {
      console.log('✅ Test booking created successfully!')
      console.log('Booking ID:', data[0].id)
      console.log('Booking Code:', data[0].booking_code)
      
      // Test retrieving the booking
      const { data: retrievedBooking, error: retrieveError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', data[0].id)
        .single()
      
      if (retrieveError) {
        console.error('❌ Failed to retrieve booking:', retrieveError.message)
      } else {
        console.log('✅ Booking retrieved successfully!')
        console.log('Retrieved booking status:', retrievedBooking.status)
        console.log('Retrieved booking client_id:', retrievedBooking.client_id)
      }
      
      // Clean up test booking
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', data[0].id)
      
      if (deleteError) {
        console.error('❌ Failed to clean up test booking:', deleteError.message)
      } else {
        console.log('✅ Test booking cleaned up')
      }
      
      return true
    }
    
  } catch (err) {
    console.error('❌ Booking creation test failed:', err.message)
    console.error('Full error:', err)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting Authenticated Booking Creation Tests...\n')
  
  const bookingOk = await testBookingCreation()
  if (!bookingOk) {
    console.log('\n❌ Booking creation test failed.')
    return
  }
  
  console.log('\n✅ Booking creation test passed! Database is ready for booking synchronization.')
}

runTests().catch(console.error)
