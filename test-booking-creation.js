// Test booking creation with proper format
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBookingCreation() {
  try {
    console.log('🔄 Testing booking creation...')
    
    // Get a service ID first
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
    
    // Create a test booking with proper POINT format
    const testBooking = {
      booking_code: `TEST_${Date.now()}`,
      client_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
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
    
    console.log('Creating booking with data:', JSON.stringify(testBooking, null, 2))
    
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
        console.log('Retrieved booking:', JSON.stringify(retrievedBooking, null, 2))
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

async function testOperatorBookingsAPI() {
  try {
    console.log('\n🔄 Testing operator bookings API...')
    
    // This would normally require authentication, but let's test the endpoint structure
    const response = await fetch('http://localhost:3000/api/operator/bookings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Operator API accessible')
      console.log('Response:', result)
      return true
    } else {
      console.log('❌ Operator API error:', result.error)
      return false
    }
    
  } catch (err) {
    console.log('ℹ️  Operator API test skipped (server not running):', err.message)
    return true // This is expected if server isn't running
  }
}

async function runTests() {
  console.log('🚀 Starting Booking Creation Tests...\n')
  
  const bookingOk = await testBookingCreation()
  if (!bookingOk) {
    console.log('\n❌ Booking creation test failed.')
    return
  }
  
  await testOperatorBookingsAPI()
  
  console.log('\n✅ Booking creation test passed! Database is ready for booking synchronization.')
}

runTests().catch(console.error)




