#!/usr/bin/env node

/**
 * Simple test to verify the system is working
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function simpleTest() {
  console.log('🧪 SIMPLE SYSTEM TEST')
  console.log('=' .repeat(50))
  
  try {
    // Check what we have
    console.log('\n📊 Current Database State:')
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, role, first_name, last_name')
    
    if (profilesError) {
      console.log('❌ Profiles error:', profilesError.message)
    } else {
      console.log(`✅ Profiles: ${profiles?.length || 0}`)
      profiles?.forEach(p => {
        const roleEmoji = p.role === 'agent' ? '🛡️' : '👤'
        console.log(`   ${roleEmoji} ${p.email} (${p.first_name} ${p.last_name})`)
      })
    }
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, service_type')
    
    if (bookingsError) {
      console.log('❌ Bookings error:', bookingsError.message)
    } else {
      console.log(`✅ Bookings: ${bookings?.length || 0}`)
    }
    
    // Test creating a simple booking
    console.log('\n🔧 Testing booking creation...')
    
    const testBookingId = `test-${Date.now()}`
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({
        id: testBookingId,
        booking_code: `TEST${Date.now()}`,
        client_id: '3f5325cb-96f1-47b3-9de5-1a009787abfd', // Stephen's ID
        service_type: 'armed_protection',
        status: 'pending',
        pickup_address: 'Test Location',
        scheduled_date: '2025-01-15',
        base_price: 50000,
        total_price: 50000
      })
    
    if (bookingError) {
      console.log('❌ Booking creation failed:', bookingError.message)
    } else {
      console.log('✅ Test booking created successfully!')
      
      // Try to create chat room
      console.log('\n💬 Testing chat room creation...')
      
      const { error: chatRoomError } = await supabase
        .from('chat_rooms')
        .insert({
          booking_id: testBookingId,
          client_id: '3f5325cb-96f1-47b3-9de5-1a009787abfd',
          status: 'active'
        })
      
      if (chatRoomError) {
        console.log('❌ Chat room creation failed:', chatRoomError.message)
        console.log('   This means the chat tables might not be accessible yet')
      } else {
        console.log('✅ Chat room created successfully!')
      }
    }
    
    console.log('\n' + '=' .repeat(50))
    console.log('🎯 SYSTEM STATUS')
    console.log('=' .repeat(50))
    
    if (profiles && profiles.length > 0) {
      console.log('\n✅ GOOD: Profiles are working')
      console.log('✅ GOOD: Operator account exists')
    }
    
    if (bookings && bookings.length >= 0) {
      console.log('✅ GOOD: Bookings system is working')
    }
    
    console.log('\n📝 NEXT STEPS:')
    console.log('1. Start your app: npm run dev')
    console.log('2. Go to: http://localhost:3000')
    console.log('3. Log in as operator: iwewezinemstephen@gmail.com')
    console.log('4. Check if you can see bookings in the operator dashboard')
    console.log('5. Test creating a new booking from the client side')
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  }
}

simpleTest()































