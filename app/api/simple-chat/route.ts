import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Simple chat API that just works
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifcevffaputepvpjpip.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
)

export async function GET(request: NextRequest) {
  try {
    console.log('💬 Simple chat GET API called')
    
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')
    
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }
    
    console.log('📥 Fetching messages for booking:', bookingId)
    
    // First, try to find the booking by booking_code if bookingId is not a UUID
    let actualBookingId = bookingId
    
    // Check if bookingId is a booking code (starts with REQ) or a UUID
    if (bookingId.startsWith('REQ')) {
      console.log('🔍 Looking up booking by code:', bookingId)
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('booking_code', bookingId)
        .single()
      
      if (bookingError || !booking) {
        console.error('❌ Booking not found:', bookingError)
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }
      
      actualBookingId = booking.id
      console.log('✅ Found booking UUID:', actualBookingId)
    }
    
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', actualBookingId)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('❌ Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }
    
    console.log('✅ Fetched', messages.length, 'messages')
    
    return NextResponse.json({
      success: true,
      data: messages
    })
    
  } catch (error) {
    console.error('❌ Simple chat GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('💬 Simple chat PUT API called')
    
    const { messageId, content } = await request.json()
    
    if (!messageId || !content) {
      return NextResponse.json({ error: 'Message ID and content are required' }, { status: 400 })
    }
    
    console.log('📝 Updating message:', messageId)
    
    const { data: message, error } = await supabase
      .from('messages')
      .update({ content: content })
      .eq('id', messageId)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error updating message:', error)
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
    }
    
    console.log('✅ Updated message:', message.id)
    
    return NextResponse.json({
      success: true,
      data: message
    })
    
  } catch (error) {
    console.error('❌ Simple chat PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('💬 Simple chat POST API called')
    
    const { bookingId, content, senderType = 'client' } = await request.json()
    
    if (!bookingId || !content) {
      return NextResponse.json({ error: 'Booking ID and content are required' }, { status: 400 })
    }
    
    console.log('📤 Creating message:', { bookingId, senderType })
    
    // First, try to find the booking by booking_code if bookingId is not a UUID
    let actualBookingId = bookingId
    
    // Check if bookingId is a booking code (starts with REQ) or a UUID
    if (bookingId.startsWith('REQ')) {
      console.log('🔍 Looking up booking by code:', bookingId)
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, client_id')
        .eq('booking_code', bookingId)
        .single()
      
      if (bookingError || !booking) {
        console.error('❌ Booking not found:', bookingError)
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }
      
      actualBookingId = booking.id
      console.log('✅ Found booking UUID:', actualBookingId)
    }
    
    // Get the booking to find the client_id
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select('client_id')
      .eq('id', actualBookingId)
      .single()
    
    if (bookingError || !bookingData) {
      console.error('❌ Could not find booking:', bookingError)
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    
    // Determine sender and recipient IDs based on sender type
    let senderId, recipientId
    
    if (senderType === 'client') {
      // Client is sending to operator
      senderId = bookingData.client_id
      recipientId = '9882762d-93e4-484c-b055-a14737f76cba' // Default operator ID
    } else {
      // Operator is sending to client
      senderId = '9882762d-93e4-484c-b055-a14737f76cba' // Default operator ID
      recipientId = bookingData.client_id
    }
    
    console.log('📤 Message details:', {
      senderType,
      senderId,
      recipientId,
      bookingId: actualBookingId
    })
    
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        booking_id: actualBookingId,
        sender_id: senderId,
        recipient_id: recipientId,
        content: content,
        message_type: 'text',
        sender_type: senderType
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creating message:', error)
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
    }
    
    console.log('✅ Created message:', message.id)
    
    return NextResponse.json({
      success: true,
      data: message
    })
    
  } catch (error) {
    console.error('❌ Simple chat POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
