const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
)

async function testChatSyncIssues() {
  console.log('🔍 Testing Chat Sync Issues...')
  console.log('========================================')
  
  try {
    // 1. Test basic connection
    console.log('1. Testing Supabase connection...')
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.log('❌ Connection failed:', testError.message)
      return
    }
    console.log('✅ Connection successful')

    // 2. Check messages table structure
    console.log('\n2. Checking messages table...')
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1)
    
    if (messagesError) {
      console.log('❌ Messages table error:', messagesError.message)
    } else {
      console.log('✅ Messages table accessible')
      if (messages && messages.length > 0) {
        console.log('📋 Sample message structure:', Object.keys(messages[0]))
      }
    }

    // 3. Check if we have any bookings
    console.log('\n3. Checking bookings...')
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_code, client_id')
      .limit(5)
    
    if (bookingsError) {
      console.log('❌ Bookings error:', bookingsError.message)
    } else {
      console.log('✅ Bookings accessible')
      console.log(`📋 Found ${bookings?.length || 0} bookings`)
      if (bookings && bookings.length > 0) {
        console.log('📋 Sample booking:', bookings[0])
      }
    }

    // 4. Test message creation with a real booking
    if (bookings && bookings.length > 0) {
      const testBooking = bookings[0]
      console.log(`\n4. Testing message creation for booking: ${testBooking.booking_code}`)
      
      const { data: newMessage, error: createError } = await supabase
        .from('messages')
        .insert({
          booking_id: testBooking.id,
          sender_id: testBooking.client_id,
          recipient_id: testBooking.client_id,
          content: 'Test message from sync diagnosis',
          message_type: 'text',
          sender_type: 'client'
        })
        .select()
        .single()
      
      if (createError) {
        console.log('❌ Message creation failed:', createError.message)
        console.log('🔍 Error details:', createError)
      } else {
        console.log('✅ Message created successfully:', newMessage.id)
        
        // 5. Test message retrieval
        console.log('\n5. Testing message retrieval...')
        const { data: retrievedMessages, error: retrieveError } = await supabase
          .from('messages')
          .select('*')
          .eq('booking_id', testBooking.id)
          .order('created_at', { ascending: true })
        
        if (retrieveError) {
          console.log('❌ Message retrieval failed:', retrieveError.message)
        } else {
          console.log(`✅ Retrieved ${retrievedMessages?.length || 0} messages`)
        }
      }
    }

    // 6. Test real-time subscription
    console.log('\n6. Testing real-time subscription...')
    const channel = supabase
      .channel('test-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('✅ Real-time message received:', payload.new)
        }
      )
      .subscribe()

    console.log('✅ Real-time subscription active')
    
    // Wait a bit then unsubscribe
    setTimeout(() => {
      supabase.removeChannel(channel)
      console.log('✅ Real-time subscription closed')
    }, 3000)

    // 7. Check for common issues
    console.log('\n7. Checking for common issues...')
    
    // Check if RLS is blocking access
    const { data: rlsTest, error: rlsError } = await supabase
      .from('messages')
      .select('*')
      .limit(1)
    
    if (rlsError && rlsError.message.includes('RLS')) {
      console.log('⚠️ RLS might be blocking access:', rlsError.message)
    } else {
      console.log('✅ RLS not blocking access')
    }

    // Check if foreign key constraints are working
    const { data: fkTest, error: fkError } = await supabase
      .from('messages')
      .insert({
        booking_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
        sender_id: 'test',
        recipient_id: 'test',
        content: 'FK test',
        message_type: 'text',
        sender_type: 'client'
      })
      .select()
    
    if (fkError && fkError.message.includes('foreign key')) {
      console.log('✅ Foreign key constraints working')
    } else if (fkError) {
      console.log('⚠️ Other constraint error:', fkError.message)
    } else {
      console.log('⚠️ Foreign key constraints might not be working')
    }

    console.log('\n🎉 Chat sync diagnosis completed!')
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error)
  }
}

testChatSyncIssues()

