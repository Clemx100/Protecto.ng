// Test Supabase connection with proper environment loading
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Testing Supabase Connection...')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'Not set')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Environment variables not found!')
  console.error('Make sure .env.local file exists with:')
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_url')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key')
  process.exit(1)
}

if (!supabaseUrl.includes('.supabase.co')) {
  console.error('❌ Invalid Supabase URL format!')
  console.error('Expected: https://your-project-id.supabase.co')
  process.exit(1)
}

if (!supabaseKey.startsWith('eyJ')) {
  console.error('❌ Invalid Supabase key format!')
  console.error('Expected: eyJ...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('🔄 Testing connection...')
    
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      console.error('This might be normal if the database schema is not set up yet.')
      return false
    } else {
      console.log('✅ Connection successful!')
    }
    
    // Test bookings table
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('count')
      .limit(1)
    
    if (bookingsError) {
      console.error('❌ Bookings table error:', bookingsError.message)
      return false
    } else {
      console.log('✅ Bookings table accessible!')
    }
    
    // Test services table
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('count')
      .limit(1)
    
    if (servicesError) {
      console.error('❌ Services table error:', servicesError.message)
      return false
    } else {
      console.log('✅ Services table accessible!')
    }
    
    // Test auth
    const { data: authData, error: authError } = await supabase.auth.getSession()
    if (authError) {
      console.log('ℹ️  Auth test:', authError.message)
    } else {
      console.log('✅ Auth service working!')
    }
    
    return true
    
  } catch (err) {
    console.error('❌ Test failed:', err.message)
    return false
  }
}

async function testBookingCreation() {
  try {
    console.log('\n🔄 Testing booking creation...')
    
    // Create a test booking
    const testBooking = {
      booking_code: `TEST_${Date.now()}`,
      client_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      service_id: '550e8400-e29b-41d4-a716-446655440001', // Default service ID
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
    
    const { data, error } = await supabase
      .from('bookings')
      .insert([testBooking])
      .select()
    
    if (error) {
      console.error('❌ Booking creation failed:', error.message)
      return false
    } else {
      console.log('✅ Test booking created successfully!')
      console.log('Booking ID:', data[0].id)
      
      // Clean up test booking
      await supabase
        .from('bookings')
        .delete()
        .eq('id', data[0].id)
      
      console.log('✅ Test booking cleaned up')
      return true
    }
    
  } catch (err) {
    console.error('❌ Booking creation test failed:', err.message)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting Supabase Tests...\n')
  
  const connectionOk = await testConnection()
  if (!connectionOk) {
    console.log('\n❌ Connection test failed. Please check your database setup.')
    return
  }
  
  const bookingOk = await testBookingCreation()
  if (!bookingOk) {
    console.log('\n❌ Booking creation test failed. Please check your database schema.')
    return
  }
  
  console.log('\n✅ All tests passed! Database is ready for booking synchronization.')
}

runTests().catch(console.error)




