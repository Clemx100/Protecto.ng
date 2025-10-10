import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('💬 Simple Chat Rooms API called')
    
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Since we can't reliably check the chat tables due to schema cache,
    // we'll create a mock chat room response that works with the frontend
    console.log('💬 Creating mock chat room for booking:', bookingId)
    
    // Create a mock chat room that the frontend can use
    const mockChatRoom = {
      id: `chat_${bookingId}`,
      booking_id: bookingId,
      client_id: '9882762d-93e4-484c-b055-a14737f76cba',
      assigned_agent_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: null,
      last_message: null,
      unread_count_client: 0,
      unread_count_agent: 0
    }

    return NextResponse.json({
      success: true,
      data: mockChatRoom,
      message: 'Chat room ready (mock)'
    })

  } catch (error) {
    console.error('❌ Simple chat rooms API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('💬 Simple Chat Room Creation API called')
    
    const body = await request.json()
    const { booking_id, client_id, assigned_agent_id } = body

    if (!booking_id || !client_id) {
      return NextResponse.json({ 
        error: 'booking_id and client_id are required' 
      }, { status: 400 })
    }

    // Create a mock chat room
    const mockChatRoom = {
      id: `chat_${booking_id}`,
      booking_id,
      client_id,
      assigned_agent_id,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: null,
      last_message: null,
      unread_count_client: 0,
      unread_count_agent: 0
    }

    console.log('✅ Mock chat room created:', mockChatRoom.id)

    return NextResponse.json({
      success: true,
      data: mockChatRoom,
      message: 'Chat room created successfully (mock)'
    })

  } catch (error) {
    console.error('❌ Simple chat room creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}







