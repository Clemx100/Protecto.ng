import { NextRequest, NextResponse } from 'next/server'
import { requireOperatorAuth } from '@/lib/auth/operatorAuth'

export async function GET(request: NextRequest) {
  try {
    console.log('💬 Operator messages GET API called')
    
    // ✅ SECURITY: Verify operator authentication
    const authResult = await requireOperatorAuth(request)
    if (authResult.error) {
      console.log('❌ Unauthorized access attempt to operator messages')
      return authResult.response
    }
    
    console.log('✅ Operator authenticated:', { userId: authResult.userId, role: authResult.role })
    
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use centralized database configuration
    const { createServiceRoleClient } = await import('@/lib/config/database')
    const supabase = createServiceRoleClient()

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

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
        )
      `)
      .eq('booking_id', actualBookingId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    console.log(`📨 Found ${messages?.length || 0} messages for booking:`, bookingId)

    // Transform messages to match expected format
    const transformedMessages = (messages || []).map(message => {
      const isInvoice = message.message_type === 'invoice'
      const hasMetadata = message.metadata || message.invoice_data
      
      return {
        id: message.id,
        booking_id: message.booking_id,
        sender_type: message.sender_type || (message.message_type === 'system' ? 'system' : 'client'),
        sender_id: message.sender_id,
        message: message.content || message.message, // ✅ Use 'content' column, fallback to 'message'
        created_at: message.created_at,
        is_system_message: message.message_type === 'system',
        has_invoice: isInvoice,
        hasInvoice: isInvoice, // Alternative naming
        invoice_data: hasMetadata,
        invoiceData: hasMetadata, // Alternative naming
        metadata: message.metadata,
        // Add fields for client compatibility
        is_encrypted: message.is_encrypted || false,
        message_type: message.message_type || 'text',
        sender_name: message.sender ? `${message.sender.first_name} ${message.sender.last_name}` : 'Unknown',
        sender: message.sender
      }
    })

    return NextResponse.json({
      success: true,
      data: transformedMessages
    })

  } catch (error) {
    console.error('Operator messages API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('💬 Operator messages POST API called')
    
    // ✅ SECURITY: Verify operator authentication
    const authResult = await requireOperatorAuth(request)
    if (authResult.error) {
      console.log('❌ Unauthorized access attempt to send operator message')
      return authResult.response
    }
    
    console.log('✅ Operator authenticated:', { userId: authResult.userId, role: authResult.role })
    
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use centralized database configuration
    const { createServiceRoleClient } = await import('@/lib/config/database')
    const supabase = createServiceRoleClient()

    const { bookingId, content, messageType = 'text', recipientId, metadata = {} } = await request.json()

    if (!bookingId || !content) {
      return NextResponse.json({ error: 'Booking ID and content are required' }, { status: 400 })
    }

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

    console.log('📝 Creating operator message:', { bookingId: actualBookingId, messageType, hasMetadata: Object.keys(metadata).length > 0 })

    // Get booking to find the client
    const { data: booking } = await supabase
      .from('bookings')
      .select('client_id')
      .eq('id', actualBookingId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Get operator ID from request or use a system operator ID
    // For now, we'll use the client ID as operator for testing, but this should be replaced with actual operator authentication
    const operatorId = recipientId || booking.client_id
    
    // Prepare base message data
    const baseData: any = {
      booking_id: actualBookingId,
      sender_id: operatorId,
      recipient_id: recipientId || booking.client_id,
      sender_type: 'operator', // ✅ FIX: Set correct sender type
      message_type: messageType
    }
    
    // Add metadata if available (for invoices, etc.)
    if (Object.keys(metadata).length > 0) {
      baseData.metadata = metadata
      baseData.invoice_data = metadata
      baseData.has_invoice = true
    }
    
    // Set is_system_message for system messages
    if (messageType === 'system') {
      baseData.is_system_message = true
    }
    
    // Try different column names for message content (schema cache issue workaround)
    const messageColumns = ['content', 'message', 'text', 'body']
    let newMessage, messageError
    let insertSuccessful = false
    
    // Set both content and message columns for maximum compatibility
    const messageData = {
      ...baseData,
      content: content,
      message: content
    }
    
    const result = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()
    
    if (!result.error) {
      newMessage = result.data
      messageError = null
      insertSuccessful = true
      console.log(`✅ Operator message inserted successfully`)
    } else {
      messageError = result.error
      console.log(`❌ Failed to insert message:`, result.error.message)
    }
    
    if (!insertSuccessful) {
      messageError = { message: 'Failed to insert message with any column name' }
    }

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json({ error: 'Failed to create message', details: messageError.message }, { status: 500 })
    }

    console.log('✅ Operator message created successfully:', newMessage.id)

    // Transform response to match expected format
    const responseData = {
      id: newMessage.id,
      booking_id: newMessage.booking_id,
      sender_id: newMessage.sender_id,
      sender_type: newMessage.sender_type,
      message: newMessage.message || newMessage.content, // ✅ Handle both column names
      message_type: newMessage.message_type,
      metadata: newMessage.metadata || metadata,
      has_invoice: newMessage.message_type === 'invoice',
      invoice_data: newMessage.invoice_data || newMessage.metadata || metadata,
      is_system_message: newMessage.message_type === 'system',
      is_read: false,
      status: 'sent',
      created_at: newMessage.created_at,
      updated_at: newMessage.updated_at,
      invoiceData: metadata // For backward compatibility
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Create message API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
