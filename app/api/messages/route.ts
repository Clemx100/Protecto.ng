import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'

// Initialize Supabase with centralized configuration
import { createServiceRoleClient } from '@/lib/config/database'
import { fallbackAuth } from '@/lib/services/fallbackAuth'
import { shouldUseMockDatabase } from '@/lib/config/database-backup'

const supabase = createServiceRoleClient()
const useMockDatabase = shouldUseMockDatabase()
const PRIVILEGED_ROLES = new Set(['operator', 'admin', 'agent'])

async function getRequestUserContext(request: NextRequest): Promise<{ id: string; role: string | null } | null> {
  let userId: string | null = null

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const { data, error } = await supabase.auth.getUser(token)
    if (!error && data.user) {
      userId = data.user.id
    }
  }

  if (!userId) {
    try {
      const sessionSupabase = await createServerSupabaseClient()
      const {
        data: { user },
        error
      } = await sessionSupabase.auth.getUser()
      if (!error && user) {
        userId = user.id
      }
    } catch {
      userId = null
    }
  }

  if (!userId) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return { id: userId, role: profile?.role || null }
}

// GET /api/messages?bookingId=xxx&limit=300
// Fetch messages for a booking from Supabase (with limit and cache headers for speed)
export async function GET(request: NextRequest) {
  try {
    const requestUser = await getRequestUserContext(request)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bookingIdentifier = searchParams.get('bookingId')
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '300', 10), 1), 500)

    if (!bookingIdentifier) {
      return NextResponse.json(
        { error: 'bookingId is required' },
        { status: 400 }
      )
    }

    // Use mock database if configured
    if (useMockDatabase) {
      console.log('🔄 Using mock database for messages')
      const messages = await fallbackAuth.getBookingMessages(bookingIdentifier)
      return NextResponse.json({ messages })
    }

    // Check if it's a UUID or booking code
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier)

    let booking: { id: string; client_id: string; assigned_agent_id: string | null } | null = null

    if (isUUID) {
      const { data } = await supabase
        .from('bookings')
        .select('id, client_id, assigned_agent_id')
        .eq('id', bookingIdentifier)
        .single()
      booking = data
    } else {
      const { data } = await supabase
        .from('bookings')
        .select('id, client_id, assigned_agent_id')
        .eq('booking_code', bookingIdentifier)
        .single()
      booking = data
    }

    if (!booking) {
      console.error('❌ Booking not found for identifier:', bookingIdentifier)
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    const isPrivileged = requestUser.role ? PRIVILEGED_ROLES.has(requestUser.role) : false
    const isBookingParticipant =
      requestUser.id === booking.client_id ||
      (booking.assigned_agent_id != null && requestUser.id === booking.assigned_agent_id)
    if (!isPrivileged && !isBookingParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bookingId = booking.id

    // Fetch messages from Supabase (limit for faster response)
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })
      .limit(limit)

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
      sender_type: msg.sender_type || msg.sender_role || 'client', // Support both column names, fallback to client
      message: msg.content || msg.message, // ✅ Use 'content' column first, fallback to 'message'
      message_type: msg.message_type || 'text',
      metadata: msg.metadata,
      has_invoice: msg.message_type === 'invoice' || msg.has_invoice,
      invoice_data: msg.invoice_data || msg.metadata,
      is_system_message: msg.message_type === 'system',
      is_read: false,
      status: 'sent',
      created_at: msg.created_at,
      updated_at: msg.updated_at || msg.created_at
    }))

    return NextResponse.json(
      {
        success: true,
        data: transformedMessages,
        count: transformedMessages.length,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
        },
      }
    )

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
    const requestUser = await getRequestUserContext(request)
    if (!requestUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Use mock database if configured
    if (useMockDatabase) {
      console.log('🔄 Using mock database for sending message')
      const result = await fallbackAuth.sendMessage({
        sender_id: requestUser.id || senderId || 'mock-user',
        sender_type: senderType || 'client',
        message: messageContent,
        booking_id: bookingId
      })
      return NextResponse.json({ success: true, data: result })
    }

    // Check if it's a UUID or booking code
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)

    let booking: { id: string; client_id: string; assigned_agent_id: string | null } | null = null
    if (isUUID) {
      const { data } = await supabase
        .from('bookings')
        .select('id, client_id, assigned_agent_id')
        .eq('id', bookingId)
        .single()
      booking = data
    } else {
      const { data } = await supabase
        .from('bookings')
        .select('id, client_id, assigned_agent_id')
        .eq('booking_code', bookingId)
        .single()
      booking = data
    }

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    const actualBookingId = booking.id
    const isPrivileged = requestUser.role ? PRIVILEGED_ROLES.has(requestUser.role) : false
    const isBookingParticipant =
      requestUser.id === booking.client_id ||
      (booking.assigned_agent_id != null && requestUser.id === booking.assigned_agent_id)
    if (!isPrivileged && !isBookingParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const effectiveSenderType: 'client' | 'operator' | 'system' =
      senderType === 'operator' || senderType === 'system' ? senderType : 'client'
    if (effectiveSenderType === 'system' && !isPrivileged) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Determine sender and recipient based on sender type
    let actualSenderId = requestUser.id
    let recipientId = null
    
    if (effectiveSenderType === 'client') {
      // Client is sending to operator/agent
      recipientId = booking.assigned_agent_id || booking.client_id // Fallback to client_id for compatibility
    } else if (effectiveSenderType === 'operator') {
      // Operator is sending to client
      recipientId = booking.client_id
    } else {
      // System message
      recipientId = booking.client_id
    }

    // Insert message into messages table
    let newMessage, error;
    
    // Prepare message data - only include columns that exist in the database
    const messageData: any = {
      booking_id: actualBookingId,
      sender_id: actualSenderId,
      sender_type: effectiveSenderType,
      recipient_id: recipientId,
      content: messageContent, // Primary column name
      message_type: messageType
    };

    // Add optional fields if provided
    if (invoiceData) {
      messageData.metadata = invoiceData
    }

    // Try inserting with current schema
    console.log('💾 Inserting message into database...')
    const result = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();
    
    let insertSuccessful = false;
    if (!result.error) {
      newMessage = result.data;
      error = null;
      insertSuccessful = true;
      console.log(`✅ Message inserted successfully with ID: ${newMessage.id}`);
    } else {
      error = result.error;
      console.log(`❌ Failed to insert message:`, result.error.message);
      
      // If error mentions unknown column, provide helpful debug info
      if (result.error.message.includes('column')) {
        console.log('📋 Attempted to insert columns:', Object.keys(messageData));
        console.log('💡 Tip: Check if messages table schema matches the insert data');
      }
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
      sender_type: effectiveSenderType,
      message: newMessage.content || newMessage.message, // ✅ Use 'content' column first, fallback to 'message'
      message_type: newMessage.message_type,
      metadata: newMessage.metadata,
      has_invoice: newMessage.message_type === 'invoice',
      invoice_data: newMessage.metadata,
      is_system_message: newMessage.message_type === 'system',
      is_read: false,
      status: 'sent',
      created_at: newMessage.created_at,
      updated_at: newMessage.updated_at || newMessage.created_at
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