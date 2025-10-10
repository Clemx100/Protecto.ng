import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('💬 Chat Messages GET API called')
    
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')
    const roomId = searchParams.get('roomId')

    if (!bookingId && !roomId) {
      return NextResponse.json({ error: 'Booking ID or Room ID is required' }, { status: 400 })
    }

    // For now, return mock messages that work with the frontend
    // This ensures the chat interface works while we resolve the database issues
    const mockMessages = [
      {
        id: `msg_${bookingId || roomId}_1`,
        room_id: `chat_${bookingId || roomId}`,
        sender_id: '9882762d-93e4-484c-b055-a14737f76cba',
        sender_type: 'client',
        message: 'Hello! I need protection services.',
        message_type: 'text',
        metadata: null,
        is_read: false,
        created_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        updated_at: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: `msg_${bookingId || roomId}_2`,
        room_id: `chat_${bookingId || roomId}`,
        sender_id: 'system',
        sender_type: 'system',
        message: 'Your booking has been received and is being processed. An operator will be with you shortly.',
        message_type: 'system',
        metadata: null,
        is_read: true,
        created_at: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        updated_at: new Date(Date.now() - 120000).toISOString()
      }
    ]

    return NextResponse.json({
      success: true,
      data: mockMessages,
      count: mockMessages.length,
      message: 'Messages retrieved successfully (mock)'
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
    const { room_id, sender_id, sender_type, message, message_type = 'text' } = body

    if (!room_id || !sender_id || !sender_type || !message) {
      return NextResponse.json({ 
        error: 'room_id, sender_id, sender_type, and message are required' 
      }, { status: 400 })
    }

    // Create a mock message
    const mockMessage = {
      id: `msg_${room_id}_${Date.now()}`,
      room_id,
      sender_id,
      sender_type,
      message,
      message_type,
      metadata: null,
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('✅ Mock message created:', mockMessage.id)

    return NextResponse.json({
      success: true,
      data: mockMessage,
      message: 'Message sent successfully (mock)'
    })

  } catch (error) {
    console.error('❌ Chat message creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




