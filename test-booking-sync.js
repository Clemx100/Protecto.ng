// Test script to check if bookings are being created in the database
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBookingSync() {
  console.log('🔍 Testing booking synchronization...')
  
  try {
    // Check if there are any bookings in the database
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ Error fetching bookings:', error)
      return
    }

    console.log(`📊 Found ${bookings.length} bookings in database:`)
    bookings.forEach((booking, index) => {
      console.log(`${index + 1}. ID: ${booking.id}`)
      console.log(`   Booking Code: ${booking.booking_code}`)
      console.log(`   Status: ${booking.status}`)
      console.log(`   Client ID: ${booking.client_id}`)
      console.log(`   Created: ${booking.created_at}`)
      console.log('   ---')
    })

    // Check if there are any messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError)
    } else {
      console.log(`💬 Found ${messages.length} messages in database:`)
      messages.forEach((message, index) => {
        console.log(`${index + 1}. ID: ${message.id}`)
        console.log(`   Booking ID: ${message.booking_id}`)
        console.log(`   Content: ${message.content?.substring(0, 50)}...`)
        console.log(`   Created: ${message.created_at}`)
        console.log('   ---')
      })
    }

    // Check if there are any profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
    } else {
      console.log(`👥 Found ${profiles.length} profiles in database:`)
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ID: ${profile.id}`)
        console.log(`   Email: ${profile.email}`)
        console.log(`   Role: ${profile.role}`)
        console.log(`   Created: ${profile.created_at}`)
        console.log('   ---')
      })
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testBookingSync()