#!/usr/bin/env node

/**
 * Debug why bookings aren't syncing to operator dashboard
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugBookingSync() {
  console.log('🔍 DEBUGGING BOOKING SYNC ISSUE')
  console.log('=' .repeat(60))
  
  try {
    // 1. Check what's in the bookings table
    console.log('\n1️⃣ Checking bookings table...')
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (bookingsError) {
      console.log('❌ Error:', bookingsError.message)
      return
    }
    
    console.log(`✅ Found ${bookings.length} bookings in database`)
    
    if (bookings.length > 0) {
      console.log('\n📋 Recent bookings:')
      bookings.slice(0, 3).forEach((booking, index) => {
        console.log(`${index + 1}. ID: ${booking.id}`)
        console.log(`   Code: ${booking.booking_code}`)
        console.log(`   Status: ${booking.status}`)
        console.log(`   Client ID: ${booking.client_id}`)
        console.log(`   Created: ${new Date(booking.created_at).toLocaleString()}`)
        console.log('')
      })
    }
    
    // 2. Check profiles table
    console.log('\n2️⃣ Checking profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .order('created_at', { ascending: false })
    
    if (profilesError) {
      console.log('❌ Error:', profilesError.message)
    } else {
      console.log(`✅ Found ${profiles.length} profiles`)
      profiles.forEach((profile, index) => {
        const roleEmoji = profile.role === 'agent' ? '🛡️' : '👤'
        console.log(`${index + 1}. ${roleEmoji} ${profile.email} (${profile.first_name} ${profile.last_name}) - ${profile.role}`)
      })
    }
    
    // 3. Test the exact query the API uses
    console.log('\n3️⃣ Testing API query...')
    const { data: apiBookings, error: apiError } = await supabase
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
    
    if (apiError) {
      console.log('❌ API query error:', apiError.message)
    } else {
      console.log(`✅ API query returned ${apiBookings.length} bookings`)
      
      if (apiBookings.length > 0) {
        console.log('\n📋 API query results:')
        apiBookings.forEach((booking, index) => {
          console.log(`${index + 1}. Code: ${booking.booking_code}`)
          console.log(`   Client: ${booking.client?.first_name} ${booking.client?.last_name}`)
          console.log(`   Status: ${booking.status}`)
          console.log('')
        })
      }
    }
    
    // 4. Check if there are any foreign key issues
    console.log('\n4️⃣ Checking foreign key relationships...')
    if (bookings.length > 0) {
      const sampleBooking = bookings[0]
      console.log(`Sample booking client_id: ${sampleBooking.client_id}`)
      
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sampleBooking.client_id)
        .single()
      
      if (clientProfile) {
        console.log('✅ Client profile found:', clientProfile.email)
      } else {
        console.log('❌ Client profile NOT found for booking')
      }
    }
    
    console.log('\n' + '=' .repeat(60))
    console.log('🎯 DIAGNOSIS')
    console.log('=' .repeat(60))
    
    if (bookings.length === 0) {
      console.log('❌ ISSUE: No bookings in database')
      console.log('   The booking creation might have failed')
    } else if (apiBookings.length === 0) {
      console.log('❌ ISSUE: API query returns no results')
      console.log('   There might be a foreign key relationship issue')
    } else {
      console.log('✅ Bookings exist and API query works')
      console.log('   The issue might be in the frontend or real-time sync')
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  }
}

debugBookingSync()










