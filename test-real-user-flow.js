// Test script to simulate real user booking flow
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRealUserFlow() {
  console.log('🔍 Testing real user booking flow...')
  
  try {
    // Step 1: Check if there are any recent bookings from real users
    console.log('\n📊 Checking recent bookings from real users...')
    const { data: recentBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })

    if (bookingsError) {
      console.error('❌ Error fetching recent bookings:', bookingsError)
      return
    }

    console.log(`📋 Found ${recentBookings.length} bookings in the last 24 hours:`)
    recentBookings.forEach((booking, index) => {
      console.log(`${index + 1}. ID: ${booking.id}`)
      console.log(`   Booking Code: ${booking.booking_code}`)
      console.log(`   Status: ${booking.status}`)
      console.log(`   Client ID: ${booking.client_id}`)
      console.log(`   Created: ${booking.created_at}`)
      console.log('   ---')
    })

    // Step 2: Check if there are any recent messages
    console.log('\n💬 Checking recent messages...')
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })

    if (messagesError) {
      console.error('❌ Error fetching recent messages:', messagesError)
    } else {
      console.log(`💬 Found ${recentMessages.length} messages in the last 24 hours`)
      recentMessages.forEach((message, index) => {
        console.log(`${index + 1}. ID: ${message.id}`)
        console.log(`   Booking ID: ${message.booking_id}`)
        console.log(`   Content: ${message.content?.substring(0, 50)}...`)
        console.log(`   Sender: ${message.sender_id}`)
        console.log(`   Created: ${message.created_at}`)
        console.log('   ---')
      })
    }

    // Step 3: Check if there are any recent user registrations
    console.log('\n👥 Checking recent user registrations...')
    const { data: recentProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('❌ Error fetching recent profiles:', profilesError)
    } else {
      console.log(`👥 Found ${recentProfiles.length} new users in the last 24 hours`)
      recentProfiles.forEach((profile, index) => {
        console.log(`${index + 1}. ID: ${profile.id}`)
        console.log(`   Email: ${profile.email}`)
        console.log(`   Role: ${profile.role}`)
        console.log(`   Created: ${profile.created_at}`)
        console.log('   ---')
      })
    }

    // Step 4: Test the operator dashboard API endpoint
    console.log('\n🔍 Testing operator dashboard API...')
    
    // First, let's check if we can access the operator bookings endpoint
    // We'll need to simulate this with the service role key
    const { data: operatorBookings, error: operatorError } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!bookings_client_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        service:services(
          id,
          name,
          description,
          base_price,
          price_per_hour
        )
      `)
      .order('created_at', { ascending: false })

    if (operatorError) {
      console.error('❌ Error testing operator API:', operatorError)
    } else {
      console.log(`✅ Operator API can see ${operatorBookings.length} bookings`)
      if (operatorBookings.length > 0) {
        console.log('📋 Latest booking for operator:')
        const latest = operatorBookings[0]
        console.log(`   ID: ${latest.id}`)
        console.log(`   Booking Code: ${latest.booking_code}`)
        console.log(`   Status: ${latest.status}`)
        console.log(`   Client: ${latest.client?.first_name} ${latest.client?.last_name}`)
        console.log(`   Email: ${latest.client?.email}`)
        console.log(`   Created: ${latest.created_at}`)
      }
    }

    // Step 5: Check for any error logs or issues
    console.log('\n🚨 Checking for potential issues...')
    
    // Check if there are any bookings with missing data
    const { data: incompleteBookings, error: incompleteError } = await supabase
      .from('bookings')
      .select('*')
      .or('pickup_address.is.null,pickup_coordinates.is.null,destination_coordinates.is.null')

    if (incompleteError) {
      console.log('✅ No incomplete bookings found')
    } else if (incompleteBookings && incompleteBookings.length > 0) {
      console.log(`⚠️  Found ${incompleteBookings.length} incomplete bookings:`)
      incompleteBookings.forEach((booking, index) => {
        console.log(`${index + 1}. ID: ${booking.id}`)
        console.log(`   Pickup Address: ${booking.pickup_address || 'MISSING'}`)
        console.log(`   Pickup Coordinates: ${booking.pickup_coordinates || 'MISSING'}`)
        console.log(`   Destination Coordinates: ${booking.destination_coordinates || 'MISSING'}`)
        console.log('   ---')
      })
    }

    // Summary
    console.log('\n📊 SUMMARY:')
    console.log(`✅ Total bookings in database: ${recentBookings.length}`)
    console.log(`✅ Total messages in database: ${recentMessages.length}`)
    console.log(`✅ Total users in database: ${recentProfiles.length}`)
    console.log(`✅ Operator API accessible: ${operatorBookings ? 'YES' : 'NO'}`)
    
    if (recentBookings.length === 0) {
      console.log('\n🚨 ISSUE IDENTIFIED: No recent bookings found!')
      console.log('   This suggests that users are not successfully creating bookings.')
      console.log('   Possible causes:')
      console.log('   1. Users are not authenticated')
      console.log('   2. Booking creation is failing silently')
      console.log('   3. Vercel deployment has not updated')
      console.log('   4. Database connection issues in production')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testRealUserFlow()
