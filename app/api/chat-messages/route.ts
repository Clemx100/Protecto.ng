import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('💬 Chat Messages GET API called')
    
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')
    const roomId = searchParams.get('roomId')

    if (!bookingId && !roomId) {
      return NextResponse.json({ error: 'Booking ID or Room ID is required' }, { status: 400 })
    }

    // Use bookingId or roomId to fetch real messages from Supabase
    const identifier = bookingId || roomId

    console.log('📥 Fetching real messages for booking:', identifier)

    // Check if it's a UUID or booking code
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier!)
    
    let actualBookingId = identifier
    
    // If it's a booking code, look up the UUID
    if (!isUUID) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id')
        .eq('booking_code', identifier)
        .single()
      
      if (booking) {
        actualBookingId = booking.id
        console.log('✅ Resolved booking code to UUID:', actualBookingId)
      }
    }

    // Fetch real messages from Supabase
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', actualBookingId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Fetched ${messages?.length || 0} real messages from database`)

    // Transform messages to match expected format
    const transformedMessages = (messages || []).map(msg => ({
      id: msg.id,
      room_id: `chat_${actualBookingId}`,
      booking_id: msg.booking_id,
      sender_id: msg.sender_id,
      sender_type: msg.sender_type || 'client',
      message: msg.content || msg.message,
      message_type: msg.message_type || 'text',
      metadata: msg.metadata,
      is_read: msg.is_read || false,
      created_at: msg.created_at,
      updated_at: msg.updated_at || msg.created_at
    }))

    return NextResponse.json({
      success: true,
      data: transformedMessages,
      count: transformedMessages.length,
      message: 'Messages retrieved successfully'
    })

  } catch (error) {
    console.error('❌ Chat messages API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('💬 Chat Message Creation API called')
    
    const body = await request.json()
    const { room_id, booking_id, sender_id, sender_type, message, message_type = 'text', metadata } = body

    // Accept either room_id or booking_id
    const bookingIdentifier = booking_id || room_id?.replace('chat_', '')

    if (!bookingIdentifier || !sender_id || !sender_type || !message) {
      return NextResponse.json({ 
        error: 'booking_id (or room_id), sender_id, sender_type, and message are required' 
      }, { status: 400 })
    }

    console.log('📤 Sending real message to database:', {
      bookingIdentifier,
      senderType: sender_type,
      messageType: message_type,
      messageLength: message.length
    })

    // Check if it's a UUID or booking code
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier)
    
    let actualBookingId = bookingIdentifier
    
    // If it's a booking code, look up the UUID
    if (!isUUID) {
      const { data: bookingLookup } = await supabase
        .from('bookings')
        .select('id')
        .eq('booking_code', bookingIdentifier)
        .single()
      
      if (bookingLookup) {
        actualBookingId = bookingLookup.id
        console.log('✅ Resolved booking code to UUID:', actualBookingId)
      } else {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        )
      }
    }

    // Get the booking to determine recipient
    const { data: booking } = await supabase
      .from('bookings')
      .select('client_id, assigned_agent_id')
      .eq('id', actualBookingId)
      .single()

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Determine recipient based on sender type
    let recipientId = null
    if (sender_type === 'client') {
      recipientId = booking.assigned_agent_id || booking.client_id
    } else if (sender_type === 'operator') {
      recipientId = booking.client_id
    }

    // Insert real message into Supabase
    const messageData: any = {
      booking_id: actualBookingId,
      sender_id: sender_id,
      recipient_id: recipientId,
      content: message,
      message_type: message_type
    }

    if (metadata) {
      messageData.metadata = metadata
    }

    const { data: newMessage, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase insert error:', error)
      return NextResponse.json(
        { error: 'Failed to send message', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Real message saved to database:', newMessage.id)

    // Transform response to match expected format
    const responseMessage = {
      id: newMessage.id,
      room_id: `chat_${actualBookingId}`,
      booking_id: newMessage.booking_id,
      sender_id: newMessage.sender_id,
      sender_type: sender_type,
      message: newMessage.content,
      message_type: newMessage.message_type,
      metadata: newMessage.metadata,
      is_read: false,
      created_at: newMessage.created_at,
      updated_at: newMessage.updated_at || newMessage.created_at
    }

    return NextResponse.json({
      success: true,
      data: responseMessage,
      message: 'Message sent successfully'
    })

  } catch (error) {
    console.error('❌ Chat message creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


























