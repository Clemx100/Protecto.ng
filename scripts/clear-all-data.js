#!/usr/bin/env node

/**
 * Clear all data from the current Supabase instance
 * This ensures we're working with a clean slate
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function clearAllData() {
  console.log('🧹 CLEARING ALL DATA FROM SUPABASE')
  console.log('=' .repeat(70))
  console.log(`📍 Supabase URL: ${supabaseUrl}`)
  console.log('=' .repeat(70))
  
  console.log('\n⚠️  WARNING: This will delete ALL data!')
  console.log('   - All bookings')
  console.log('   - All messages')
  console.log('   - All chat rooms')
  console.log('   - All chat messages')
  console.log('   - All users (except auth.users)')
  console.log('   - All profiles')
  console.log('   - All agents')
  
  try {
    // 1. Clear chat messages first (due to foreign keys)
    console.log('\n1️⃣ Clearing chat messages...')
    const { error: chatMessagesError } = await supabase
      .from('chat_messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    
    if (chatMessagesError) {
      console.log('⚠️  Chat messages error (might not exist):', chatMessagesError.message)
    } else {
      console.log('✅ Chat messages cleared')
    }
    
    // 2. Clear chat rooms
    console.log('\n2️⃣ Clearing chat rooms...')
    const { error: chatRoomsError } = await supabase
      .from('chat_rooms')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (chatRoomsError) {
      console.log('⚠️  Chat rooms error (might not exist):', chatRoomsError.message)
    } else {
      console.log('✅ Chat rooms cleared')
    }
    
    // 3. Clear old messages
    console.log('\n3️⃣ Clearing old messages...')
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .neq('id', 0)
    
    if (messagesError) {
      console.log('⚠️  Messages error:', messagesError.message)
    } else {
      console.log('✅ Old messages cleared')
    }
    
    // 4. Clear bookings
    console.log('\n4️⃣ Clearing bookings...')
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (bookingsError) {
      console.log('❌ Bookings error:', bookingsError.message)
    } else {
      console.log('✅ Bookings cleared')
    }
    
    // 5. Clear agents
    console.log('\n5️⃣ Clearing agents...')
    const { error: agentsError } = await supabase
      .from('agents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (agentsError) {
      console.log('⚠️  Agents error:', agentsError.message)
    } else {
      console.log('✅ Agents cleared')
    }
    
    // 6. Clear profiles (but keep auth.users)
    console.log('\n6️⃣ Clearing profiles...')
    const { error: profilesError } = await supabase
      .from('profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (profilesError) {
      console.log('❌ Profiles error:', profilesError.message)
    } else {
      console.log('✅ Profiles cleared')
    }
    
    // 7. Verify everything is cleared
    console.log('\n7️⃣ Verifying cleanup...')
    
    const tables = ['profiles', 'agents', 'bookings', 'messages', 'chat_rooms', 'chat_messages']
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.log(`   ${table}: ❌ Error - ${error.message}`)
        } else {
          console.log(`   ${table}: ✅ ${count || 0} records`)
        }
      } catch (err) {
        console.log(`   ${table}: ⚠️  ${err.message}`)
      }
    }
    
    console.log('\n' + '=' .repeat(70))
    console.log('🎉 CLEANUP COMPLETE!')
    console.log('=' .repeat(70))
    console.log('\n✅ Database is now clean and ready for fresh data')
    console.log('✅ You can now test with new bookings and messages')
    console.log('\n📝 Next steps:')
    console.log('   1. Create a new test user account')
    console.log('   2. Create a test booking')
    console.log('   3. Test the operator dashboard')
    console.log('   4. Test messaging between client and operator')
    
  } catch (error) {
    console.error('\n❌ Fatal error during cleanup:', error)
  }
}

clearAllData()









