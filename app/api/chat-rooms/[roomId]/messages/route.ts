import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params
    console.log('📥 Chat room messages GET API called for room:', roomId)
    
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://kifcevffaputepvpjpip.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )

    // Get messages for the chat room
    const { data: messages, error } = await supabase
      .from('chat_room_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: messages || []
    })

  } catch (error) {
    console.error('Chat room messages API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params
    console.log('📤 Chat room message POST API called for room:', roomId)
    
    const body = await request.json()
    const { bookingId, senderId, senderType, message, messageType = 'text', metadata } = body

    if (!bookingId || !senderId || !senderType || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: bookingId, senderId, senderType, message' 
      }, { status: 400 })
    }

    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://kifcevffaputepvpjpip.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )

    // Create message
    const { data: chatMessage, error } = await supabase
      .from('chat_room_messages')
      .insert([{
        room_id: roomId,
        booking_id: bookingId,
        sender_id: senderId,
        sender_type: senderType,
        message: message,
        message_type: messageType,
        metadata: metadata,
        status: 'sent'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating message:', error)
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
    }

    // Update chat room last message info
    await supabase
      .from('chat_rooms')
      .update({
        last_message: message,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)

    // Update unread counts
    const unreadField = senderType === 'client' ? 'unread_count_operator' : 'unread_count_client'
    await supabase.rpc('increment_unread_count', {
      room_id: roomId,
      field_name: unreadField
    })

    return NextResponse.json({
      success: true,
      data: chatMessage
    })

  } catch (error) {
    console.error('Chat room message creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}










