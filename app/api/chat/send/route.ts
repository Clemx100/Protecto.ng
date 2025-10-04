import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('💬 Chat send API called')
    
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )

    const messageData = await request.json()
    console.log('📝 Send message data:', JSON.stringify(messageData, null, 2))

    const { booking_id, sender_type, message, sender_id } = messageData

    if (!booking_id || !sender_type || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: booking_id, sender_type, message' 
      }, { status: 400 })
    }

    // Verify booking exists
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_code, client_id')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      console.error('❌ Booking not found:', bookingError)
      return NextResponse.json({ 
        error: 'Booking not found' 
      }, { status: 404 })
    }

    // Use provided sender_id or generate one for testing
    const finalSenderId = sender_id || (sender_type === 'client' ? booking.client_id : 'test-operator-id')

    // Create chat message
    const { data: chatMessage, error: messageError } = await supabase
      .from('chat_messages')
      .insert([{
        booking_id,
        sender_id: finalSenderId,
        sender_type,
        message: message.trim(),
        created_at: new Date().toISOString()
      }])
      .select(`
        *,
        booking:bookings(booking_code),
        sender:profiles(first_name, last_name, email)
      `)
      .single()

    if (messageError) {
      console.error('❌ Error creating chat message:', messageError)
      return NextResponse.json({ 
        error: 'Failed to create chat message', 
        details: messageError.message 
      }, { status: 500 })
    }

    console.log('✅ Chat message sent successfully:', chatMessage.id)
    
    return NextResponse.json({ 
      success: true, 
      data: chatMessage,
      message: 'Message sent successfully'
    })

  } catch (error) {
    console.error('❌ Error in chat send API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
