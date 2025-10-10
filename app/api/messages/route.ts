import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase with service role for bypassing RLS
const supabase = createClient(
  'https://kifcevffaputepvpjpip.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
)

// GET /api/messages?bookingId=xxx
// Fetch all messages for a booking from Supabase
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingIdentifier = searchParams.get('bookingId')

    if (!bookingIdentifier) {
      return NextResponse.json(
        { error: 'bookingId is required' },
        { status: 400 }
      )
    }

    console.log('📥 Fetching messages for booking:', bookingIdentifier)

    // Check if it's a UUID or booking code
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier)
    
    let bookingId = bookingIdentifier
    
    // If it's a booking code, look up the UUID
    if (!isUUID) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id')
        .eq('booking_code', bookingIdentifier)
        .single()
      
      if (!booking) {
        console.error('❌ Booking not found for code:', bookingIdentifier)
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        )
      }
      
      bookingId = booking.id
      console.log('✅ Resolved booking code to UUID:', bookingId)
    }

    // Fetch messages from Supabase using messages table
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Fetched ${messages?.length || 0} messages from database`)

    // Transform messages to match expected format
    const transformedMessages = (messages || []).map(msg => ({
      id: msg.id,
      booking_id: msg.booking_id,
      sender_id: msg.sender_id,
      sender_type: msg.sender_type,
      message: msg.content || msg.message, // ✅ Use 'content' column first, fallback to 'message'
      message_type: msg.message_type || 'text',
      metadata: msg.metadata,
      has_invoice: msg.message_type === 'invoice' || msg.has_invoice,
      invoice_data: msg.invoice_data || msg.metadata,
      is_system_message: msg.message_type === 'system',
      is_read: false,
      status: 'sent',
      created_at: msg.created_at,
      updated_at: msg.updated_at
    }))

    return NextResponse.json({
      success: true,
      data: transformedMessages,
      count: transformedMessages.length
    })

  } catch (error: any) {
    console.error('❌ Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/messages
// Send a new message and save to Supabase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      bookingId, 
      senderId, 
      senderType, 
      message, 
      content,
      messageType = 'text',
      hasInvoice = false,
      invoiceData = null,
      isSystemMessage = false
    } = body

    const messageContent = content || message

    if (!bookingId || !messageContent) {
      console.error('❌ Missing required fields:', { bookingId, message: messageContent })
      return NextResponse.json(
        { error: 'bookingId and message are required' },
        { status: 400 }
      )
    }

    console.log('📤 Sending message to database:', {
      bookingId,
      senderType,
      messageType,
      hasInvoice,
      messageLength: messageContent.length
    })

    // Check if it's a UUID or booking code
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)
    
    let actualBookingId = bookingId
    
    // If it's a booking code, look up the UUID
    if (!isUUID) {
      const { data: bookingLookup } = await supabase
        .from('bookings')
        .select('id')
        .eq('booking_code', bookingId)
        .single()
      
      if (!bookingLookup) {
        console.error('❌ Booking not found for code:', bookingId)
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        )
      }
      
      actualBookingId = bookingLookup.id
      console.log('✅ Resolved booking code to UUID:', actualBookingId)
    }

    // Get the actual client ID from the booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('client_id')
      .eq('id', actualBookingId)
      .single()

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Insert message into messages table - try multiple column names
    let newMessage, error;
    
    // Try with 'message' column first
    const insertData = {
      booking_id: actualBookingId,
      sender_id: senderId || booking.client_id,
      recipient_id: senderType === 'client' ? booking.client_id : booking.client_id,
      sender_type: senderType || 'client',
      message_type: messageType,
      metadata: invoiceData
    };
    
    // Set both content and message columns for maximum compatibility
    const testData = {
      ...insertData,
      content: messageContent,
      message: messageContent
    };
    
    const result = await supabase
      .from('messages')
      .insert(testData)
      .select()
      .single();
    
    let insertSuccessful = false;
    if (!result.error) {
      newMessage = result.data;
      error = null;
      insertSuccessful = true;
      console.log(`✅ Message inserted successfully`);
    } else {
      error = result.error;
      console.log(`❌ Failed to insert message:`, result.error.message);
    }

    if (error) {
      console.error('❌ Supabase insert error:', error)
      return NextResponse.json(
        { error: 'Failed to send message', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Message saved to database:', newMessage.id)

    // Transform response to match expected format
    const responseMessage = {
      id: newMessage.id,
      booking_id: newMessage.booking_id,
      sender_id: newMessage.sender_id,
      sender_type: newMessage.sender_type,
      message: newMessage.message || newMessage.content, // ✅ Use 'message' column, fallback to 'content'
      message_type: newMessage.message_type,
      metadata: newMessage.metadata,
      has_invoice: newMessage.message_type === 'invoice',
      invoice_data: newMessage.metadata,
      is_system_message: newMessage.message_type === 'system',
      is_read: false,
      status: 'sent',
      created_at: newMessage.created_at,
      updated_at: newMessage.updated_at
    }

    return NextResponse.json({
      success: true,
      data: responseMessage,
      message: 'Message sent successfully'
    })

  } catch (error: any) {
    console.error('❌ Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    )
  }
}