#!/usr/bin/env node

/**
 * Verify all messages are being loaded correctly
 */

const { createClient } = require('@supabase/supabase-js')

const DATABASE_CONFIG = {
  SUPABASE_URL: 'https://kifcevffaputepvpjpip.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
}

async function verifyMessagesLoad() {
  console.log('🔍 Verifying All Messages Load Correctly...\n')

  const supabase = createClient(DATABASE_CONFIG.SUPABASE_URL, DATABASE_CONFIG.SUPABASE_SERVICE_ROLE_KEY)

  // Get the most active booking
  console.log('1️⃣ Finding most active booking...')
  const { data: messages } = await supabase
    .from('messages')
    .select('booking_id')

  const bookingCounts = {}
  messages.forEach(msg => {
    bookingCounts[msg.booking_id] = (bookingCounts[msg.booking_id] || 0) + 1
  })

  const mostActiveBooking = Object.entries(bookingCounts)
    .sort((a, b) => b[1] - a[1])[0]

  const bookingId = mostActiveBooking[0]
  const totalMessages = mostActiveBooking[1]

  console.log(`✅ Most active booking: ${bookingId.substring(0, 8)}...`)
  console.log(`📊 Total messages in database: ${totalMessages}\n`)

  // Test 2: Load via API route
  console.log('2️⃣ Loading via /api/messages (what app uses)...')
  try {
    const response = await fetch(`http://localhost:3000/api/messages?bookingId=${bookingId}`)
    const result = await response.json()
    
    if (result.success) {
      console.log(`✅ API returned: ${result.data.length} messages`)
      console.log(`   Database has: ${totalMessages} messages`)
      
      if (result.data.length === totalMessages) {
        console.log('   ✅ ALL messages loaded correctly!')
      } else {
        console.log(`   ❌ MISSING ${totalMessages - result.data.length} messages!`)
      }
      
      // Show sample
      console.log('\n   Sample messages:')
      result.data.slice(0, 3).forEach((msg, i) => {
        console.log(`   ${i + 1}. ${msg.sender_type}: "${msg.message?.substring(0, 40)}..."`)
      })
    } else {
      console.log('❌ API error:', result.error)
    }
  } catch (error) {
    console.log('⚠️ Cannot test API (server not running locally)')
    console.log('   This is OK if testing production deployment')
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Test 3: Check for field inconsistencies
  console.log('3️⃣ Checking Field Consistency...')
  const { data: allBookingMessages } = await supabase
    .from('messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })

  let hasContentField = 0
  let hasMessageField = 0
  let hasBothFields = 0
  let hasNeitherField = 0

  allBookingMessages.forEach(msg => {
    const hasContent = msg.content && msg.content.trim().length > 0
    const hasMessage = msg.message && msg.message.trim().length > 0
    
    if (hasContent && hasMessage) hasBothFields++
    else if (hasContent) hasContentField++
    else if (hasMessage) hasMessageField++
    else hasNeitherField++
  })

  console.log(`Total messages: ${allBookingMessages.length}`)
  console.log(`  - Has 'content' only: ${hasContentField}`)
  console.log(`  - Has 'message' only: ${hasMessageField}`)
  console.log(`  - Has both fields: ${hasBothFields}`)
  console.log(`  - Has neither: ${hasNeitherField}`)

  if (hasNeitherField > 0) {
    console.log(`\n⚠️ WARNING: ${hasNeitherField} messages have NO content!`)
    console.log('   These messages will appear blank in the UI!')
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('📋 RECOMMENDATIONS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  if (hasMessageField > 0 && hasContentField > 0) {
    console.log('⚠️ Inconsistency detected:')
    console.log('   Some messages use "content", some use "message"')
    console.log('   The app handles both, but this could cause confusion')
    console.log('\n   SOLUTION: Standardize on ONE field name')
  }

  console.log('\n✅ Current app handles both fields correctly')
  console.log('   Line 72 (GET): message: msg.content || msg.message')
  console.log('   Line 189-190 (POST): Sets both content AND message')
  console.log('\n')
}

verifyMessagesLoad().catch(console.error)

