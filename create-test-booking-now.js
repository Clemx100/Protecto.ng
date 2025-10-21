// Create a test booking to see if it appears in operator dashboard
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createTestBooking() {
  console.log('\n📝 CREATING TEST BOOKING\n')
  console.log('='.repeat(70))

  try {
    // Get a client ID
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1)
      .single()

    if (!profiles) {
      console.error('❌ No client found')
      return
    }

    // Get a service
    const { data: service } = await supabase
      .from('services')
      .select('id, name, base_price')
      .limit(1)
      .single()

    console.log(`\nUsing client: ${profiles.email}`)
    console.log(`Using service: ${service.name}`)

    // Create booking
    const bookingCode = `REQ${Date.now()}`
    const newBooking = {
      booking_code: bookingCode,
      client_id: profiles.id,
      service_id: service.id,
      status: 'pending',
      service_type: 'armed_protection',
      protector_count: 1,
      protectee_count: 1,
      dress_code: 'tactical',
      duration_hours: 24,
      pickup_address: 'Test Location - ' + new Date().toLocaleTimeString(),
      destination_address: 'Test Destination',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '10:00:00',
      base_price: service.base_price,
      total_price: service.base_price,
      surge_multiplier: 1
    }

    console.log('\n🔄 Creating booking...')
    const { data: created, error } = await supabase
      .from('bookings')
      .insert([newBooking])
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating booking:', error.message)
      return
    }

    console.log('\n✅ ✅ ✅ BOOKING CREATED! ✅ ✅ ✅\n')
    console.log('=' .repeat(70))
    console.log(`   Booking Code: ${created.booking_code}`)
    console.log(`   Status: ${created.status}`)
    console.log(`   Created: ${new Date(created.created_at).toLocaleString()}`)
    console.log('=' .repeat(70))

    // Now check if operator API can see it
    console.log('\n🔍 Checking if operator API can see this booking...\n')
    
    const { data: allBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!bookings_client_id_fkey(first_name, last_name),
        service:services(name)
      `)
      .order('created_at', { ascending: false })
      .limit(3)

    console.log('   Latest 3 bookings in database:')
    allBookings.forEach((b, i) => {
      const isNew = b.booking_code === created.booking_code ? '⭐ NEW' : ''
      console.log(`   ${i + 1}. ${b.booking_code} - ${b.status} ${isNew}`)
    })

    console.log('\n' + '='.repeat(70))
    console.log('\n🎯 NEXT STEP:\n')
    console.log('   Go to operator dashboard and check if this booking appears:')
    console.log(`   Look for: ${created.booking_code}`)
    console.log('\n   The dashboard refreshes every 3 seconds automatically.')
    console.log('   If it does NOT appear after 5-10 seconds, there is an issue.')
    console.log('\n' + '='.repeat(70) + '\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

createTestBooking().catch(console.error)

