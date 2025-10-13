#!/usr/bin/env node

/**
 * Check for duplicate chat systems and missing messages
 */

const { createClient } = require('@supabase/supabase-js')

const DATABASE_CONFIG = {
  SUPABASE_URL: 'https://kifcevffaputepvpjpip.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
}

async function checkDuplicateChats() {
  console.log('🔍 Checking for Duplicate Chat Systems & Missing Messages...\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const supabase = createClient(DATABASE_CONFIG.SUPABASE_URL, DATABASE_CONFIG.SUPABASE_SERVICE_ROLE_KEY)

  // Test 1: Check messages table
  console.log('1️⃣ Messages Table Analysis...')
  try {
    const { data: allMessages, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.log('❌ Error:', error.message)
    } else {
      console.log(`✅ Total messages in database: ${allMessages.length}`)
      
      // Group by booking
      const messagesByBooking = {}
      allMessages.forEach(msg => {
        const bookingId = msg.booking_id
        if (!messagesByBooking[bookingId]) {
          messagesByBooking[bookingId] = []
        }
        messagesByBooking[bookingId].push(msg)
      })
      
      console.log(`📊 Messages distributed across ${Object.keys(messagesByBooking).length} bookings\n`)
      
      // Show distribution
      Object.entries(messagesByBooking).forEach(([bookingId, msgs]) => {
        const clientMsgs = msgs.filter(m => m.sender_type === 'client').length
        const operatorMsgs = msgs.filter(m => m.sender_type === 'operator').length
        const systemMsgs = msgs.filter(m => m.sender_type === 'system').length
        console.log(`   Booking ${bookingId.substring(0, 8)}...`)
        console.log(`      └─ Client: ${clientMsgs}, Operator: ${operatorMsgs}, System: ${systemMsgs}, Total: ${msgs.length}`)
      })
    }
  } catch (error) {
    console.log('❌ Failed:', error.message)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Test 2: Check chat_rooms table
  console.log('2️⃣ Checking chat_rooms Table...')
  try {
    const { data: rooms, error } = await supabase
      .from('chat_rooms')
      .select('*')

    if (error) {
      console.log('❌ Error:', error.message)
    } else {
      console.log(`✅ Found ${rooms.length} chat rooms`)
      
      if (rooms.length > 0) {
        rooms.forEach(room => {
          console.log(`   Room: ${room.id.substring(0, 8)}... Booking: ${room.booking_id?.substring(0, 8)}...`)
        })
      }
    }
  } catch (error) {
    console.log('⚠️ chat_rooms table might not exist:', error.message)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Test 3: Check for orphaned messages
  console.log('3️⃣ Checking for Orphaned Messages (no booking_id)...')
  try {
    const { data: orphaned, error } = await supabase
      .from('messages')
      .select('*')
      .is('booking_id', null)

    if (error) {
      console.log('❌ Error:', error.message)
    } else {
      console.log(`${orphaned.length > 0 ? '⚠️' : '✅'} Orphaned messages: ${orphaned.length}`)
      
      if (orphaned.length > 0) {
        console.log('   These messages have no booking and won\'t show in any chat!')
      }
    }
  } catch (error) {
    console.log('❌ Failed:', error.message)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Test 4: Check message content field variations
  console.log('4️⃣ Checking Message Field Consistency...')
  try {
    const { data: sampleMessages, error } = await supabase
      .from('messages')
      .select('id, content, message, booking_id, sender_type')
      .limit(10)

    if (error) {
      console.log('❌ Error:', error.message)
    } else {
      console.log('Checking field names used:')
      const hasContent = sampleMessages.some(m => m.content)
      const hasMessage = sampleMessages.some(m => m.message)
      
      console.log(`   'content' field: ${hasContent ? '✅ Used' : '❌ Not used'}`)
      console.log(`   'message' field: ${hasMessage ? '✅ Used' : '❌ Not used'}`)
      
      if (hasContent && hasMessage) {
        console.log('   ⚠️ WARNING: Both fields used - might cause confusion!')
      }
    }
  } catch (error) {
    console.log('❌ Failed:', error.message)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('📋 SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('Issues to check:')
  console.log('1. Are messages evenly distributed or concentrated in one booking?')
  console.log('2. Are there orphaned messages (no booking_id)?')
  console.log('3. Is there field name inconsistency (content vs message)?')
  console.log('4. Are both client and operator using same chat service?')
  console.log('\n')
}

checkDuplicateChats().catch(console.error)

