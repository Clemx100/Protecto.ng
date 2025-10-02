import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Service role client (bypasses RLS for admin operations)
const getServiceClient = () => {
  return createClient(
    'https://mjdbhusnplveeaveeovd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
  )
}

// User client (respects RLS)
const getUserClient = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    'https://mjdbhusnplveeaveeovd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDU5NTMsImV4cCI6MjA3MzUyMTk1M30.C1eS4c3MJxh4GTnBMUmvnbmfVwLVHPmxGhX5wg0Mev0',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

// GET /api/messages?bookingId=xxx
// Fetch all messages for a booking
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json(
        { error: 'bookingId is required' },
        { status: 400 }
      )
    }

    console.log('📥 Fetching messages for booking:', bookingId)

    // Get authenticated user
    const userClient = await getUserClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use service client to fetch messages (bypass RLS)
    const serviceClient = getServiceClient()
    
    const { data: messages, error: messagesError } = await serviceClient
      .from('messages')
      .select(`
        id,
        booking_id,
        content,
        message_type,
        sender_id,
        sender_role,
        recipient_id,
        metadata,
        is_edited,
        is_deleted,
        created_at,
        updated_at,
        sender:profiles!messages_sender_id_fkey(
          id,
          first_name,
          last_name,
          role
        )
      `)
      .eq('booking_id', bookingId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: messagesError },
        { status: 500 }
      )
    }

    console.log(`✅ Fetched ${messages?.length || 0} messages`)

    return NextResponse.json({
      success: true,
      data: messages || [],
      count: messages?.length || 0
    })

  } catch (error) {
    console.error('❌ Messages API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/messages
// Send a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, content, messageType = 'text', metadata = {} } = body

    if (!bookingId || !content) {
      return NextResponse.json(
        { error: 'bookingId and content are required' },
        { status: 400 }
      )
    }

    console.log('📤 Sending message to booking:', bookingId)

    // Get authenticated user
    const userClient = await getUserClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's role
    const serviceClient = getServiceClient()
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get or create conversation
    const { data: conversationData, error: convError } = await serviceClient
      .rpc('get_or_create_conversation', { p_booking_id: bookingId })

    if (convError) {
      console.error('❌ Error getting/creating conversation:', convError)
      return NextResponse.json(
        { error: 'Failed to create conversation', details: convError },
        { status: 500 }
      )
    }

    // Create the message
    const { data: message, error: messageError } = await serviceClient
      .from('messages')
      .insert({
        booking_id: bookingId,
        conversation_id: conversationData,
        content: content,
        message_type: messageType,
        sender_id: user.id,
        sender_role: profile.role,
        metadata: metadata
      })
      .select(`
        id,
        booking_id,
        content,
        message_type,
        sender_id,
        sender_role,
        metadata,
        created_at,
        sender:profiles!messages_sender_id_fkey(
          id,
          first_name,
          last_name,
          role
        )
      `)
      .single()

    if (messageError) {
      console.error('❌ Error creating message:', messageError)
      return NextResponse.json(
        { error: 'Failed to create message', details: messageError },
        { status: 500 }
      )
    }

    console.log('✅ Message created:', message.id)

    return NextResponse.json({
      success: true,
      data: message
    })

  } catch (error) {
    console.error('❌ Send message API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/messages?messageId=xxx
// Soft delete a message (mark as deleted)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const userClient = await getUserClient()
    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Soft delete the message (only sender can delete)
    const serviceClient = getServiceClient()
    const { error: deleteError } = await serviceClient
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('sender_id', user.id)

    if (deleteError) {
      console.error('❌ Error deleting message:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete message', details: deleteError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    })

  } catch (error) {
    console.error('❌ Delete message API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
