#!/usr/bin/env node

/**
 * Debug script to check chat message persistence and real-time
 */

const { createClient } = require('@supabase/supabase-js')

const DATABASE_CONFIG = {
  SUPABASE_URL: 'https://kifcevffaputepvpjpip.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
}

async function debugChatPersistence() {
  console.log('🔍 Debugging Chat Persistence & Real-Time...\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const supabase = createClient(DATABASE_CONFIG.SUPABASE_URL, DATABASE_CONFIG.SUPABASE_SERVICE_ROLE_KEY)

  // Test 1: Check messages table
  console.log('1️⃣ Checking Messages Table...')
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.log('❌ Error:', error.message)
    } else {
      console.log(`✅ Found ${messages.length} messages`)
      
      if (messages.length > 0) {
        console.log('\n📋 Recent Messages:')
        messages.forEach((msg, index) => {
          console.log(`   ${index + 1}. ${msg.sender_type}: "${msg.content?.substring(0, 50)}..." (${new Date(msg.created_at).toLocaleString()})`)
        })
      } else {
        console.log('⚠️ No messages found in database!')
      }
    }
  } catch (error) {
    console.log('❌ Failed:', error.message)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Test 2: Check messages by sender type
  console.log('2️⃣ Messages by Sender Type...')
  try {
    const senders = ['client', 'operator', 'system']
    
    for (const sender of senders) {
      const { data, error } = await supabase
        .from('messages')
        .select('id')
        .eq('sender_type', sender)

      if (!error) {
        console.log(`   ${sender.padEnd(10)}: ${data.length} messages`)
      }
    }
  } catch (error) {
    console.log('❌ Failed:', error.message)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Test 3: Check real-time configuration
  console.log('3️⃣ Testing Real-Time Subscription...')
  try {
    const testChannel = supabase
      .channel('test-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        console.log('   📨 Real-time event received:', payload.eventType)
      })
      .subscribe((status) => {
        console.log(`   📡 Subscription status: ${status}`)
        if (status === 'SUBSCRIBED') {
          console.log('   ✅ Real-time working!')
        }
      })

    // Wait for subscription
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    await supabase.removeChannel(testChannel)
  } catch (error) {
    console.log('   ❌ Real-time test failed:', error.message)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Test 4: Check if messages have booking IDs
  console.log('4️⃣ Checking Message-Booking Relationships...')
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('booking_id, sender_type')
      .not('booking_id', 'is', null)
      .limit(5)

    if (error) {
      console.log('❌ Error:', error.message)
    } else {
      console.log(`✅ ${messages.length} messages have booking IDs`)
      const uniqueBookings = new Set(messages.map(m => m.booking_id))
      console.log(`📊 Unique bookings with messages: ${uniqueBookings.size}`)
    }
  } catch (error) {
    console.log('❌ Failed:', error.message)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('📋 POTENTIAL ISSUES')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('If messages disappear, check:')
  console.log('1. localStorage being cleared')
  console.log('2. Component unmounting/remounting')
  console.log('3. Real-time subscription disconnecting')
  console.log('4. API route not persisting to database')
  console.log('5. Booking ID mapping issues')
  console.log('\n')
}

debugChatPersistence().catch(console.error)

