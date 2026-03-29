import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/config/database'

// Service role client
const getServiceClient = () => {
  return createServiceRoleClient()
}

// POST /api/messages/system
// Create system messages (status updates, notifications, etc)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, content, messageType = 'system', metadata = {} } = body

    if (!bookingId || !content) {
      return NextResponse.json(
        { error: 'bookingId and content are required' },
        { status: 400 }
      )
    }

    console.log('🤖 Creating system message for booking:', bookingId)

    // Use service client to create system message
    const serviceClient = getServiceClient()

    // Use the helper function from database
    const { data: messageId, error: funcError } = await serviceClient
      .rpc('create_system_message', {
        p_booking_id: bookingId,
        p_content: content,
        p_metadata: metadata
      })

    if (funcError) {
      console.error('❌ Error creating system message:', funcError)
      return NextResponse.json(
        { error: 'Failed to create system message', details: funcError },
        { status: 500 }
      )
    }

    // Fetch the created message with full details
    const { data: message, error: fetchError } = await serviceClient
      .from('messages')
      .select(`
        id,
        booking_id,
        content,
        message_type,
        sender_role,
        metadata,
        created_at
      `)
      .eq('id', messageId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching created message:', fetchError)
      return NextResponse.json(
        { error: 'Message created but failed to fetch', details: fetchError },
        { status: 500 }
      )
    }

    console.log('✅ System message created:', message.id)

    return NextResponse.json({
      success: true,
      data: message
    })

  } catch (error) {
    console.error('❌ System message API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

