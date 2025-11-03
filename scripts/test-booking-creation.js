#!/usr/bin/env node

/**
 * Test booking creation to see why it's failing
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testBookingCreation() {
  console.log('🧪 TESTING BOOKING CREATION')
  console.log('=' .repeat(50))
  
  try {
    // 1. Get a client ID
    console.log('\n1️⃣ Getting client ID...')
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'client')
      .limit(1)
    
    if (!profiles || profiles.length === 0) {
      console.log('❌ No client profiles found')
      return
    }
    
    const clientId = profiles[0].id
    console.log('✅ Using client:', profiles[0].email, clientId)
    
    // 2. Try to create a test booking
    console.log('\n2️⃣ Creating test booking...')
    const testBookingId = `test-${Date.now()}`
    
    const bookingData = {
      booking_code: testBookingId,
      client_id: clientId,
      service_id: 'd5bcc8bd-a566-4094-8ac9-d25b7b356834',
      service_type: 'armed_protection',
      protector_count: 1,
      protectee_count: 1,
      dress_code: 'tactical_casual',
      duration_hours: 24,
      pickup_address: 'Test Location, Lagos',
      pickup_coordinates: '(6.5244,3.3792)',
      destination_address: 'Test Destination',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '12:00:00',
      base_price: 100000,
      total_price: 100000,
      special_instructions: JSON.stringify({
        vehicles: { armoredSedan: 1 },
        protectionType: 'Armed',
        destinationDetails: { primary: 'Test Destination' },
        contact: { phone: '+234-800-000-0000' }
      }),
      emergency_contact: 'Test Contact',
      emergency_phone: '+234-800-000-0000'
    }
    
    console.log('📝 Booking data:', JSON.stringify(bookingData, null, 2))
    
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingData])
      .select()
    
    if (bookingError) {
      console.log('❌ Booking creation failed:', bookingError.message)
      console.log('Error details:', bookingError)
      return
    }
    
    console.log('✅ Booking created successfully!')
    console.log('Booking ID:', booking[0].id)
    
    // 3. Verify it was created
    console.log('\n3️⃣ Verifying booking...')
    const { data: verifyBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking[0].id)
      .single()
    
    if (verifyBooking) {
      console.log('✅ Booking verified in database')
      console.log('Status:', verifyBooking.status)
      console.log('Code:', verifyBooking.booking_code)
    } else {
      console.log('❌ Booking not found after creation')
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  }
}

testBookingCreation()































