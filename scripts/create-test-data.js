#!/usr/bin/env node

/**
 * Create test data for the clean database
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestData() {
  console.log('🧪 CREATING TEST DATA')
  console.log('=' .repeat(70))
  
  try {
    // 1. Create test client
    console.log('\n1️⃣ Creating test client...')
    
    const { data: clientUser, error: clientError } = await supabase.auth.admin.createUser({
      email: 'testclient@protector.ng',
      password: 'TestPass123!',
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'Client'
      }
    })
    
    if (clientError) {
      console.log('❌ Client creation error:', clientError.message)
      return
    }
    
    console.log('✅ Test client created:', clientUser.user.email)
    
    // 2. Create client profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: clientUser.user.id,
        email: 'testclient@protector.ng',
        first_name: 'Test',
        last_name: 'Client',
        role: 'client',
        phone: '+234-800-000-0000',
        is_verified: true,
        is_active: true
      })
    
    if (profileError) {
      console.log('❌ Profile creation error:', profileError.message)
    } else {
      console.log('✅ Client profile created')
    }
    
    // 3. Create test booking
    console.log('\n2️⃣ Creating test booking...')
    
    const bookingId = `test-booking-${Date.now()}`
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({
        id: bookingId,
        booking_code: `REQ${Date.now()}`,
        client_id: clientUser.user.id,
        service_type: 'armed_protection',
        status: 'pending',
        pickup_address: 'Test Location, Lagos',
        scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        base_price: 100000,
        total_price: 100000,
        special_instructions: 'Test booking for system verification'
      })
    
    if (bookingError) {
      console.log('❌ Booking creation error:', bookingError.message)
    } else {
      console.log('✅ Test booking created:', bookingId)
    }
    
    // 4. Create chat room for the booking
    console.log('\n3️⃣ Creating chat room...')
    
    const { error: chatRoomError } = await supabase
      .from('chat_rooms')
      .insert({
        booking_id: bookingId,
        client_id: clientUser.user.id,
        status: 'active'
      })
    
    if (chatRoomError) {
      console.log('❌ Chat room creation error:', chatRoomError.message)
    } else {
      console.log('✅ Chat room created for booking')
    }
    
    // 5. Create test messages
    console.log('\n4️⃣ Creating test messages...')
    
    // Get the chat room ID
    const { data: chatRoom } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('booking_id', bookingId)
      .single()
    
    if (chatRoom) {
      // Client message
      const { error: clientMessageError } = await supabase
        .from('chat_messages')
        .insert({
          room_id: chatRoom.id,
          sender_id: clientUser.user.id,
          sender_type: 'client',
          message: 'Hello! I need protection services for tomorrow.',
          message_type: 'text'
        })
      
      if (clientMessageError) {
        console.log('❌ Client message error:', clientMessageError.message)
      } else {
        console.log('✅ Client message created')
      }
      
      // Operator message
      const operatorId = '3f5325cb-96f1-47b3-9de5-1a009787abfd' // Stephen's ID
      const { error: operatorMessageError } = await supabase
        .from('chat_messages')
        .insert({
          room_id: chatRoom.id,
          sender_id: operatorId,
          sender_type: 'agent',
          message: 'Hello! I received your request. I will be your protection agent for tomorrow.',
          message_type: 'text'
        })
      
      if (operatorMessageError) {
        console.log('❌ Operator message error:', operatorMessageError.message)
      } else {
        console.log('✅ Operator message created')
      }
    }
    
    // 6. Verify everything
    console.log('\n5️⃣ Verifying test data...')
    
    const { data: profiles } = await supabase.from('profiles').select('*')
    const { data: bookings } = await supabase.from('bookings').select('*')
    const { data: chatRooms } = await supabase.from('chat_rooms').select('*')
    const { data: messages } = await supabase.from('chat_messages').select('*')
    
    console.log(`   Profiles: ${profiles?.length || 0}`)
    console.log(`   Bookings: ${bookings?.length || 0}`)
    console.log(`   Chat Rooms: ${chatRooms?.length || 0}`)
    console.log(`   Messages: ${messages?.length || 0}`)
    
    console.log('\n' + '=' .repeat(70))
    console.log('🎉 TEST DATA CREATED SUCCESSFULLY!')
    console.log('=' .repeat(70))
    console.log('\n📋 Test Accounts:')
    console.log('   👤 Client: testclient@protector.ng')
    console.log('   🛡️  Operator: iwewezinemstephen@gmail.com')
    console.log('\n🔑 Passwords:')
    console.log('   Client: TestPass123!')
    console.log('   Operator: [your existing password]')
    console.log('\n🚀 Ready to test!')
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  }
}

createTestData()










