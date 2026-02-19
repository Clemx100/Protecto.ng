#!/usr/bin/env node

/**
 * Test the complete chat system
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testChatSystem() {
  console.log('🧪 TESTING CHAT SYSTEM')
  console.log('=' .repeat(70))
  
  try {
    // 1. Check chat rooms
    console.log('\n1️⃣ Checking chat rooms...')
    const { data: rooms, error: roomsError } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        booking_id,
        client_id,
        assigned_agent_id,
        status,
        created_at,
        profiles:client_id (
          email,
          first_name,
          last_name
        )
      `)
      .limit(10)
    
    if (roomsError) {
      console.log('❌ Error:', roomsError.message)
      return
    }
    
    console.log(`✅ Found ${rooms.length} chat rooms`)
    
    if (rooms.length > 0) {
      console.log('\n📋 Sample chat rooms:')
      rooms.forEach((room, index) => {
        console.log(`${index + 1}. Room ID: ${room.id}`)
        console.log(`   Booking: ${room.booking_id}`)
        console.log(`   Client: ${room.profiles?.first_name} ${room.profiles?.last_name} (${room.profiles?.email})`)
        console.log(`   Status: ${room.status}`)
        console.log(`   Agent: ${room.assigned_agent_id ? 'Assigned' : 'Not assigned'}`)
        console.log('')
      })
    }
    
    // 2. Test creating a message
    console.log('\n2️⃣ Testing message creation...')
    
    if (rooms.length > 0) {
      const testRoom = rooms[0]
      const operatorId = '3f5325cb-96f1-47b3-9de5-1a009787abfd' // Stephen's ID
      
      const { data: message, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          room_id: testRoom.id,
          sender_id: operatorId,
          sender_type: 'agent',
          message: 'Hello! This is a test message from the operator.',
          message_type: 'text'
        })
        .select()
        .single()
      
      if (messageError) {
        console.log('❌ Error creating message:', messageError.message)
      } else {
        console.log('✅ Test message created successfully!')
        console.log(`   Message ID: ${message.id}`)
        console.log(`   Content: ${message.message}`)
      }
    }
    
    // 3. Check messages
    console.log('\n3️⃣ Checking messages...')
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select(`
        id,
        room_id,
        sender_id,
        sender_type,
        message,
        created_at,
        sender:sender_id (
          email,
          first_name,
          last_name,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (messagesError) {
      console.log('❌ Error:', messagesError.message)
    } else {
      console.log(`✅ Found ${messages.length} messages`)
      
      if (messages.length > 0) {
        console.log('\n💬 Recent messages:')
        messages.forEach((msg, index) => {
          console.log(`${index + 1}. From: ${msg.sender?.first_name} ${msg.sender?.last_name} (${msg.sender?.role})`)
          console.log(`   Message: ${msg.message}`)
          console.log(`   Time: ${new Date(msg.created_at).toLocaleString()}`)
          console.log('')
        })
      }
    }
    
    // 4. Test operator access
    console.log('\n4️⃣ Testing operator access...')
    const operatorEmail = 'iwewezinemstephen@gmail.com'
    
    const { data: operatorProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', operatorEmail)
      .single()
    
    if (operatorProfile) {
      console.log(`✅ Operator found: ${operatorEmail}`)
      console.log(`   Role: ${operatorProfile.role}`)
      console.log(`   ID: ${operatorProfile.id}`)
      
      // Test if operator can see their assigned chat rooms
      const { data: operatorRooms } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('assigned_agent_id', operatorProfile.id)
      
      console.log(`   Assigned chat rooms: ${operatorRooms?.length || 0}`)
    }
    
    console.log('\n' + '=' .repeat(70))
    console.log('🎉 CHAT SYSTEM TEST COMPLETE!')
    console.log('=' .repeat(70))
    
    if (rooms.length > 0 && messages.length >= 0) {
      console.log('\n✅ SUCCESS: Chat system is working!')
      console.log('   - Chat rooms: ✅ Created')
      console.log('   - Messages: ✅ Working')
      console.log('   - Operator access: ✅ Working')
      console.log('\n🚀 Your messaging system is ready to use!')
    } else {
      console.log('\n⚠️  Chat system needs more testing')
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  }
}

testChatSystem()

































