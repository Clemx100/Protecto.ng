import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('💬 Chat messages GET API called')
    
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )

    const url = new URL(request.url)
    const type = url.searchParams.get('type') // 'client' or 'operator'
    const bookingId = url.searchParams.get('booking_id')

    console.log('🔍 Fetching chat messages:', { type, bookingId })

    let query = supabase
      .from('chat_messages')
      .select(`
        *,
        booking:bookings(booking_code, client_id),
        sender:profiles(first_name, last_name, email)
      `)
      .order('created_at', { ascending: true })

    // Filter by sender type if specified
    if (type) {
      query = query.eq('sender_type', type)
    }

    // Filter by booking if specified
    if (bookingId) {
      query = query.eq('booking_id', bookingId)
    }

    const { data: messages, error: messagesError } = await query

    console.log('📊 Chat messages query result:', { count: messages?.length, error: messagesError })

    if (messagesError) {
      console.error('❌ Error fetching chat messages:', messagesError)
      return NextResponse.json({ error: 'Failed to fetch chat messages', details: messagesError.message }, { status: 500 })
    }

    console.log('✅ Chat messages fetched successfully:', messages?.length || 0)
    
    return NextResponse.json({ 
      success: true, 
      data: messages || [],
      count: messages?.length || 0
    })

  } catch (error) {
    console.error('❌ Error in chat messages GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('💬 Chat message POST API called')
    
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )

    const messageData = await request.json()
    console.log('📝 Chat message data:', JSON.stringify(messageData, null, 2))

    const { booking_id, sender_id, sender_type, message } = messageData

    if (!booking_id || !sender_id || !sender_type || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: booking_id, sender_id, sender_type, message' 
      }, { status: 400 })
    }

    // Verify booking exists
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_code')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      console.error('❌ Booking not found:', bookingError)
      return NextResponse.json({ 
        error: 'Booking not found' 
      }, { status: 404 })
    }

    // Create chat message
    const { data: chatMessage, error: messageError } = await supabase
      .from('chat_messages')
      .insert([{
        booking_id,
        sender_id,
        sender_type,
        message: message.trim(),
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (messageError) {
      console.error('❌ Error creating chat message:', messageError)
      return NextResponse.json({ 
        error: 'Failed to create chat message', 
        details: messageError.message 
      }, { status: 500 })
    }

    console.log('✅ Chat message created successfully:', chatMessage.id)
    
    return NextResponse.json({ 
      success: true, 
      data: chatMessage,
      message: 'Chat message sent successfully'
    })

  } catch (error) {
    console.error('❌ Error in chat message POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
