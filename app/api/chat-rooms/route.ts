import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('📥 Chat rooms GET API called')
    
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )

    // Get all active chat rooms
    const { data: chatRooms, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        client:profiles!chat_rooms_client_id_fkey(first_name, last_name, email, phone),
        booking:bookings(id, status, pickup_address, destination_address, scheduled_date, scheduled_time)
      `)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('Error fetching chat rooms:', error)
      return NextResponse.json({ error: 'Failed to fetch chat rooms' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: chatRooms || []
    })

  } catch (error) {
    console.error('Chat rooms API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Chat room POST API called')
    
    const body = await request.json()
    const { bookingId, bookingCode, clientId } = body

    if (!bookingId || !bookingCode || !clientId) {
      return NextResponse.json({ 
        error: 'Missing required fields: bookingId, bookingCode, clientId' 
      }, { status: 400 })
    }

    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )

    // Create chat room
    const { data: chatRoom, error } = await supabase
      .from('chat_rooms')
      .insert([{
        booking_id: bookingId,
        booking_code: bookingCode,
        client_id: clientId,
        status: 'active',
        unread_count_client: 0,
        unread_count_operator: 0
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating chat room:', error)
      return NextResponse.json({ error: 'Failed to create chat room' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: chatRoom
    })

  } catch (error) {
    console.error('Chat room creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}





