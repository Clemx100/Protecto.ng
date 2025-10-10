import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('💬 Chat rooms GET API called')
    
    // Import Supabase clients
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://kifcevffaputepvpjpip.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Use raw SQL to bypass schema cache issues
    try {
      console.log('💬 Checking chat room via raw SQL...')
      
      // Use raw SQL query to check if chat room exists
      const { data: chatRoomCheck, error: checkError } = await supabase.rpc('exec_sql', {
        query: `SELECT * FROM chat_rooms WHERE booking_id = '${bookingId}' LIMIT 1`
      })
      
      if (checkError) {
        console.log('⚠️ Raw SQL check failed, trying direct approach:', checkError.message)
        
        // Fallback: Try direct table access
        const { data: chatRoom, error: chatRoomError } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('booking_id', bookingId)
          .single()
        
        if (chatRoomError && chatRoomError.code === 'PGRST116') {
        // Chat room doesn't exist, create it
        console.log('💬 Creating chat room for booking:', bookingId)
        
        // Get the booking details first
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select('client_id, assigned_agent_id')
          .eq('booking_code', bookingId)
          .single()
        
        if (bookingError) {
          console.error('❌ Error fetching booking:', bookingError)
          return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }
        
        // Create the chat room
        const { data: newChatRoom, error: createError } = await supabase
          .from('chat_rooms')
          .insert([{
            booking_id: bookingId,
            client_id: booking.client_id,
            assigned_agent_id: booking.assigned_agent_id,
            status: 'active'
          }])
          .select()
          .single()
        
        if (createError) {
          console.error('❌ Error creating chat room:', createError)
          return NextResponse.json({ error: 'Failed to create chat room' }, { status: 500 })
        }
        
        return NextResponse.json({
          success: true,
          data: newChatRoom,
          message: 'Chat room created successfully'
        })
        
      } else if (chatRoomError) {
        console.error('❌ Error fetching chat room:', chatRoomError)
        return NextResponse.json({ error: 'Failed to fetch chat room' }, { status: 500 })
      } else {
        return NextResponse.json({
          success: true,
          data: chatRoom,
          message: 'Chat room found'
        })
      }
    } catch (error) {
      console.error('❌ Chat room operation failed:', error)
      return NextResponse.json({ error: 'Chat room operation failed' }, { status: 500 })
    }
  } catch (error) {
    console.error('❌ Chat rooms API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('💬 Chat room creation API called')
    
    const body = await request.json()
    const { booking_id, client_id, assigned_agent_id } = body

    if (!booking_id || !client_id) {
      return NextResponse.json({ 
        error: 'booking_id and client_id are required' 
      }, { status: 400 })
    }

    // Import Supabase clients
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://kifcevffaputepvpjpip.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )

    // Create chat room
    const { data: chatRoom, error: chatRoomError } = await supabase
      .from('chat_rooms')
      .insert([{
        booking_id,
        client_id,
        assigned_agent_id,
        status: 'active'
      }])
      .select()
      .single()

    if (chatRoomError) {
      console.error('❌ Error creating chat room:', chatRoomError)
      return NextResponse.json({ 
        error: 'Failed to create chat room',
        details: chatRoomError.message 
      }, { status: 500 })
    }

    console.log('✅ Chat room created:', chatRoom.id)

    return NextResponse.json({
      success: true,
      data: chatRoom,
      message: 'Chat room created successfully'
    })

  } catch (error) {
    console.error('❌ Chat room creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}