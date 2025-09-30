import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Get messages for the booking
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(
          id,
          first_name,
          last_name,
          role
        ),
        recipient:profiles!messages_recipient_id_fkey(
          id,
          first_name,
          last_name,
          role
        )
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Transform messages to match expected format
    const transformedMessages = (messages || []).map(message => ({
      id: message.id,
      booking_id: message.booking_id,
      sender_type: message.sender?.role === 'operator' || message.sender?.role === 'admin' ? 'operator' : 'client',
      sender_id: message.sender_id,
      sender_name: message.sender ? `${message.sender.first_name} ${message.sender.last_name}` : 'Unknown',
      message: message.content,
      created_at: message.created_at,
      is_encrypted: message.is_encrypted || false,
      message_type: message.message_type || 'text'
    }))

    return NextResponse.json({
      success: true,
      data: transformedMessages
    })

  } catch (error) {
    console.error('Client messages API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookingId, content, messageType = 'text', recipientId } = await request.json()

    if (!bookingId || !content) {
      return NextResponse.json({ error: 'Booking ID and content are required' }, { status: 400 })
    }

    // Get booking to find the client and operator
    const { data: booking } = await supabase
      .from('bookings')
      .select('client_id')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Determine recipient - if user is client, send to operator, and vice versa
    let actualRecipientId = recipientId
    if (!actualRecipientId) {
      // Find an operator to send the message to
      const { data: operators } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['operator', 'admin'])
        .limit(1)
        .single()
      
      actualRecipientId = operators?.id || booking.client_id
    }

    // Create message
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        sender_id: user.id,
        recipient_id: actualRecipientId,
        content: content,
        message_type: messageType,
        is_encrypted: false
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: newMessage
    })

  } catch (error) {
    console.error('Create message API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






