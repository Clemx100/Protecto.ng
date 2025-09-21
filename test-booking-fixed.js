// Test booking creation with correct PostGIS format
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
    
    // Create a test booking with proper PostGIS format
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
      pickup_coordinates: 'POINT(0 0)', // This should work with PostGIS
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
    
    // Try different coordinate formats
    const formats = [
      'POINT(0 0)',
      'POINT(0,0)',
      '0,0',
      { x: 0, y: 0 },
      { lng: 0, lat: 0 }
    ]
    
    for (let i = 0; i < formats.length; i++) {
      const format = formats[i]
      console.log(`\nTrying format ${i + 1}:`, format)
      
      const testBookingWithFormat = {
        ...testBooking,
        pickup_coordinates: format,
        destination_coordinates: format
      }
      
      try {
        const { data, error } = await supabase
          .from('bookings')
          .insert([testBookingWithFormat])
          .select()
        
        if (error) {
          console.log(`❌ Format ${i + 1} failed:`, error.message)
        } else {
          console.log(`✅ Format ${i + 1} worked!`)
          console.log('Booking ID:', data[0].id)
          
          // Clean up
          await supabase
            .from('bookings')
            .delete()
            .eq('id', data[0].id)
          
          console.log('✅ Test booking cleaned up')
          return true
        }
      } catch (err) {
        console.log(`❌ Format ${i + 1} error:`, err.message)
      }
    }
    
    console.log('❌ All coordinate formats failed')
    return false
    
  } catch (err) {
    console.error('❌ Booking creation test failed:', err.message)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting Booking Format Tests...\n')
  
  const bookingOk = await testBookingCreation()
  if (!bookingOk) {
    console.log('\n❌ All booking creation attempts failed.')
    return
  }
  
  console.log('\n✅ Booking creation test passed!')
}

runTests().catch(console.error)
