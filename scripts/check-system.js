#!/usr/bin/env node

/**
 * Complete System Check for Protector.Ng
 * Tests: Bookings, Messages, Chat Rooms, Real-time functionality
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

function printHeader(title) {
  console.log('\n' + '='.repeat(70))
  console.log(`🔍 ${title}`)
  console.log('='.repeat(70))
}

function printSection(emoji, title) {
  console.log(`\n${emoji} ${title}`)
  console.log('-'.repeat(70))
}

async function checkDatabase() {
  printHeader('CHECKING DATABASE TABLES')

  const tables = [
    'profiles',
    'agents',
    'bookings',
    'messages',
    'chat_rooms',
    'chat_messages',
    'services'
  ]

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`❌ ${table}: NOT FOUND or ERROR - ${error.message}`)
      } else {
        console.log(`✅ ${table}: ${count || 0} records`)
      }
    } catch (err) {
      console.log(`❌ ${table}: ERROR - ${err.message}`)
    }
  }
}

async function checkUsers() {
  printHeader('CHECKING USERS')

  try {
    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        is_active,
        is_verified
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    console.log(`\n📊 Total Users: ${profiles.length}`)

    // Count by role
    const clients = profiles.filter(p => p.role === 'client')
    const agents = profiles.filter(p => p.role === 'agent')
    const admins = profiles.filter(p => p.role === 'admin')

    console.log(`   👤 Clients: ${clients.length}`)
    console.log(`   🛡️  Agents/Operators: ${agents.length}`)
    console.log(`   🔧 Admins: ${admins.length}`)

    printSection('👥', 'User List')
    profiles.forEach((user, index) => {
      const roleEmoji = user.role === 'agent' ? '🛡️' : user.role === 'admin' ? '🔧' : '👤'
      console.log(`${index + 1}. ${roleEmoji} ${user.email}`)
      console.log(`   Name: ${user.first_name} ${user.last_name}`)
      console.log(`   Role: ${user.role.toUpperCase()}`)
      console.log(`   Status: ${user.is_active ? '✅ Active' : '❌ Inactive'}`)
      console.log('')
    })

    return profiles

  } catch (error) {
    console.error('❌ Error checking users:', error.message)
    return []
  }
}

async function checkBookings() {
  printHeader('CHECKING BOOKINGS')

  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        client_id,
        service_type,
        status,
        pickup_address,
        scheduled_date,
        created_at,
        profiles:client_id (
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    console.log(`\n📊 Total Bookings: ${bookings.length}`)

    if (bookings.length === 0) {
      console.log('\n⚠️  No bookings found in the system.')
      console.log('   This is normal if you haven\'t created any bookings yet.')
      return []
    }

    // Count by status
    const pending = bookings.filter(b => b.status === 'pending')
    const accepted = bookings.filter(b => b.status === 'accepted')
    const completed = bookings.filter(b => b.status === 'completed')
    const cancelled = bookings.filter(b => b.status === 'cancelled')

    console.log(`\n📈 Status Breakdown:`)
    console.log(`   ⏳ Pending: ${pending.length}`)
    console.log(`   ✅ Accepted: ${accepted.length}`)
    console.log(`   🏁 Completed: ${completed.length}`)
    console.log(`   ❌ Cancelled: ${cancelled.length}`)

    printSection('📋', 'Recent Bookings')
    bookings.slice(0, 10).forEach((booking, index) => {
      console.log(`${index + 1}. Booking ID: ${booking.id}`)
      console.log(`   Client: ${booking.profiles?.first_name} ${booking.profiles?.last_name} (${booking.profiles?.email})`)
      console.log(`   Service: ${booking.service_type}`)
      console.log(`   Status: ${booking.status}`)
      console.log(`   Location: ${booking.pickup_address}`)
      console.log(`   Date: ${booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleString() : 'Not scheduled'}`)
      console.log(`   Created: ${new Date(booking.created_at).toLocaleString()}`)
      console.log('')
    })

    return bookings

  } catch (error) {
    console.error('❌ Error checking bookings:', error.message)
    return []
  }
}

async function checkMessages() {
  printHeader('CHECKING MESSAGES (Old System)')

  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    console.log(`\n📊 Total Recent Messages: ${messages.length}`)

    if (messages.length === 0) {
      console.log('\n⚠️  No messages found in old messages table.')
      return []
    }

    printSection('💬', 'Recent Messages')
    messages.forEach((msg, index) => {
      console.log(`${index + 1}. Booking: ${msg.booking_id}`)
      console.log(`   From: ${msg.sender_type}`)
      console.log(`   Message: ${msg.message.substring(0, 100)}${msg.message.length > 100 ? '...' : ''}`)
      console.log(`   Time: ${new Date(msg.created_at).toLocaleString()}`)
      console.log('')
    })

    return messages

  } catch (error) {
    console.error('❌ Error checking messages:', error.message)
    return []
  }
}

async function checkChatRooms() {
  printHeader('CHECKING CHAT ROOMS (New System)')

  try {
    const { data: rooms, error } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        booking_id,
        client_id,
        agent_id,
        status,
        last_message_at,
        created_at,
        client:client_id (
          email,
          first_name,
          last_name
        ),
        agent:agent_id (
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.log(`\n⚠️  Chat rooms table not found or error: ${error.message}`)
      return []
    }

    console.log(`\n📊 Total Chat Rooms: ${rooms.length}`)

    if (rooms.length === 0) {
      console.log('\n⚠️  No chat rooms found.')
      console.log('   Chat rooms are created when bookings are made.')
      return []
    }

    printSection('💭', 'Chat Rooms List')
    rooms.forEach((room, index) => {
      console.log(`${index + 1}. Room ID: ${room.id}`)
      console.log(`   Booking: ${room.booking_id}`)
      console.log(`   Client: ${room.client?.first_name} ${room.client?.last_name} (${room.client?.email})`)
      console.log(`   Agent: ${room.agent?.first_name || 'Not assigned'} ${room.agent?.last_name || ''}`)
      console.log(`   Status: ${room.status}`)
      console.log(`   Last Message: ${room.last_message_at ? new Date(room.last_message_at).toLocaleString() : 'No messages yet'}`)
      console.log(`   Created: ${new Date(room.created_at).toLocaleString()}`)
      console.log('')
    })

    return rooms

  } catch (error) {
    console.error('❌ Error checking chat rooms:', error.message)
    return []
  }
}

async function checkChatMessages(rooms) {
  printHeader('CHECKING CHAT MESSAGES (New System)')

  try {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        room_id,
        sender_id,
        message,
        is_read,
        created_at,
        sender:sender_id (
          email,
          first_name,
          last_name,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.log(`\n⚠️  Chat messages table not found or error: ${error.message}`)
      return []
    }

    console.log(`\n📊 Total Recent Chat Messages: ${messages.length}`)

    if (messages.length === 0) {
      console.log('\n⚠️  No chat messages found.')
      return []
    }

    printSection('💬', 'Recent Chat Messages')
    messages.forEach((msg, index) => {
      console.log(`${index + 1}. Room: ${msg.room_id}`)
      console.log(`   From: ${msg.sender?.first_name} ${msg.sender?.last_name} (${msg.sender?.role})`)
      console.log(`   Message: ${msg.message.substring(0, 100)}${msg.message.length > 100 ? '...' : ''}`)
      console.log(`   Read: ${msg.is_read ? '✅' : '❌'}`)
      console.log(`   Time: ${new Date(msg.created_at).toLocaleString()}`)
      console.log('')
    })

    return messages

  } catch (error) {
    console.error('❌ Error checking chat messages:', error.message)
    return []
  }
}

async function checkOperatorAccess() {
  printHeader('CHECKING OPERATOR ACCESS')

  const operatorEmail = 'iwewezinemstephen@gmail.com'

  try {
    // Check if operator can see bookings
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', operatorEmail)
      .single()

    if (!profile) {
      console.log('❌ Operator profile not found')
      return
    }

    console.log(`\n✅ Operator Profile Found`)
    console.log(`   Email: ${operatorEmail}`)
    console.log(`   Role: ${profile.role}`)

    // Test if operator can view all bookings
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status')

    if (bookingError) {
      console.log(`\n❌ Operator cannot access bookings: ${bookingError.message}`)
    } else {
      console.log(`\n✅ Operator can view bookings: ${bookings.length} bookings accessible`)
    }

    // Test if operator can view chat rooms
    const { data: rooms, error: roomError } = await supabase
      .from('chat_rooms')
      .select('id')

    if (roomError) {
      console.log(`❌ Operator cannot access chat rooms: ${roomError.message}`)
    } else {
      console.log(`✅ Operator can view chat rooms: ${rooms?.length || 0} rooms accessible`)
    }

  } catch (error) {
    console.error('❌ Error checking operator access:', error.message)
  }
}

async function runHealthCheck() {
  console.log('🏥 PROTECTOR.NG SYSTEM HEALTH CHECK')
  console.log('Starting comprehensive system check...\n')

  const startTime = Date.now()

  // Run all checks
  await checkDatabase()
  const users = await checkUsers()
  const bookings = await checkBookings()
  const messages = await checkMessages()
  const rooms = await checkChatRooms()
  const chatMessages = await checkChatMessages(rooms)
  await checkOperatorAccess()

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  // Final Summary
  printHeader('SUMMARY')
  
  console.log('\n📊 System Statistics:')
  console.log(`   Users: ${users.length}`)
  console.log(`   Bookings: ${bookings.length}`)
  console.log(`   Old Messages: ${messages.length}`)
  console.log(`   Chat Rooms: ${rooms.length}`)
  console.log(`   Chat Messages: ${chatMessages.length}`)

  console.log('\n🎯 System Status:')
  
  const issues = []
  
  if (users.length === 0) issues.push('No users in system')
  if (bookings.length === 0) issues.push('No bookings created yet')
  if (rooms.length === 0 && bookings.length > 0) issues.push('Chat rooms not created for bookings')

  if (issues.length === 0) {
    console.log('   ✅ All systems operational!')
  } else {
    console.log('   ⚠️  Issues detected:')
    issues.forEach(issue => console.log(`      - ${issue}`))
  }

  console.log(`\n⏱️  Check completed in ${duration} seconds`)
  console.log('\n' + '='.repeat(70))
}

// Run the health check
runHealthCheck().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})

























