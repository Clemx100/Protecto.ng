#!/usr/bin/env node

/**
 * Debug script to check operator booking visibility
 */

const { createClient } = require('@supabase/supabase-js')

const DATABASE_CONFIG = {
  SUPABASE_URL: 'https://kifcevffaputepvpjpip.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
}

async function debugOperatorBookings() {
  console.log('🔍 Debugging Operator Booking Visibility...\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const supabase = createClient(DATABASE_CONFIG.SUPABASE_URL, DATABASE_CONFIG.SUPABASE_SERVICE_ROLE_KEY)

  // Test 1: Check total bookings in database
  console.log('1️⃣ Checking Total Bookings in Database...')
  try {
    const { data: allBookings, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.log('❌ Error:', error.message)
    } else {
      console.log(`✅ Found ${allBookings.length} total bookings in database`)
      
      if (allBookings.length > 0) {
        console.log('\n📋 Recent Bookings:')
        allBookings.slice(0, 5).forEach((booking, index) => {
          console.log(`   ${index + 1}. ID: ${booking.id.substring(0, 8)}... Status: ${booking.status} Created: ${new Date(booking.created_at).toLocaleString()}`)
        })
      } else {
        console.log('⚠️ No bookings found in database!')
      }
    }
  } catch (error) {
    console.log('❌ Failed:', error.message)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Test 2: Check bookings with client details (operator query)
  console.log('2️⃣ Testing Operator Query (with client join)...')
  try {
    const { data: operatorBookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!bookings_client_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.log('❌ Error with operator query:', error.message)
      console.log('   This might be why operators can\'t see bookings!')
    } else {
      console.log(`✅ Operator query successful: ${operatorBookings.length} bookings`)
      
      if (operatorBookings.length > 0) {
        console.log('\n📋 Bookings with Client Info:')
        operatorBookings.slice(0, 3).forEach((booking, index) => {
          const clientName = booking.client ? 
            `${booking.client.first_name} ${booking.client.last_name}` : 
            'No client info'
          console.log(`   ${index + 1}. Client: ${clientName} | Status: ${booking.status}`)
        })
      }
    }
  } catch (error) {
    console.log('❌ Failed:', error.message)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Test 3: Check bookings by status
  console.log('3️⃣ Checking Bookings by Status...')
  try {
    const statuses = ['pending', 'accepted', 'en_route', 'arrived', 'in_service', 'completed', 'cancelled']
    
    for (const status of statuses) {
      const { data, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('status', status)

      if (!error) {
        console.log(`   ${status.padEnd(12)}: ${data.length} bookings`)
      }
    }
  } catch (error) {
    console.log('❌ Failed:', error.message)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Test 4: Check most recent booking details
  console.log('4️⃣ Detailed Info on Most Recent Booking...')
  try {
    const { data: recentBooking, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.log('❌ Error:', error.message)
    } else if (recentBooking) {
      console.log('✅ Most Recent Booking:')
      console.log(`   ID: ${recentBooking.id}`)
      console.log(`   Client ID: ${recentBooking.client_id}`)
      console.log(`   Status: ${recentBooking.status}`)
      console.log(`   Pickup: ${recentBooking.pickup_address}`)
      console.log(`   Destination: ${recentBooking.destination_address || 'N/A'}`)
      console.log(`   Created: ${new Date(recentBooking.created_at).toLocaleString()}`)
      console.log(`   Service Type: ${recentBooking.service_type || 'N/A'}`)
    }
  } catch (error) {
    console.log('❌ Failed:', error.message)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Test 5: Check RLS policies
  console.log('5️⃣ Checking Database Permissions (RLS)...')
  console.log('   Note: Using service role, so RLS is bypassed')
  console.log('   Operators might have RLS restrictions!')
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('📋 SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('If bookings exist but operators can\'t see them, check:')
  console.log('1. Row Level Security (RLS) policies on bookings table')
  console.log('2. Operator authentication/session')
  console.log('3. Foreign key relationships (client_id)')
  console.log('4. Real-time subscription channel name')
  console.log('\n')
}

debugOperatorBookings().catch(console.error)

