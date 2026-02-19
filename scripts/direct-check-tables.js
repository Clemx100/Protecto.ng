#!/usr/bin/env node

/**
 * Direct check of chat tables
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTables() {
  console.log('🔍 Direct Table Check\n')
  
  // Try to select from chat_rooms
  console.log('1️⃣ Checking chat_rooms table...')
  const { data: rooms, error: roomsError } = await supabase
    .from('chat_rooms')
    .select('*')
    .limit(5)
  
  if (roomsError) {
    console.log('❌ Error:', roomsError.message)
  } else {
    console.log(`✅ chat_rooms table EXISTS! Found ${rooms.length} rooms`)
    if (rooms.length > 0) {
      console.log('   Sample room:', rooms[0])
    }
  }
  
  // Try to select from chat_messages
  console.log('\n2️⃣ Checking chat_messages table...')
  const { data: messages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('*')
    .limit(5)
  
  if (messagesError) {
    console.log('❌ Error:', messagesError.message)
  } else {
    console.log(`✅ chat_messages table EXISTS! Found ${messages.length} messages`)
    if (messages.length > 0) {
      console.log('   Sample message:', messages[0])
    }
  }
  
  // Count total
  console.log('\n📊 Summary:')
  if (!roomsError) {
    const { count } = await supabase
      .from('chat_rooms')
      .select('*', { count: 'exact', head: true })
    console.log(`   Total chat rooms: ${count}`)
  }
  
  if (!messagesError) {
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
    console.log(`   Total chat messages: ${count}`)
  }
}

checkTables()

































