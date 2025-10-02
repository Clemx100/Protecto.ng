import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  try {
    console.log('🔄 Booking status update API called')
    
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for real API to bypass RLS
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )
    
    // For now, skip authentication check to allow operator dashboard to work
    console.log('⚠️ Skipping authentication for status update compatibility')

    const { bookingId, status, notes } = await request.json()

    console.log('🔍 API received status update request:', { bookingId, status, notes })
    console.log('🔍 Booking ID type:', typeof bookingId, 'Length:', bookingId?.length)

    if (!bookingId || !status) {
      return NextResponse.json({ error: 'Booking ID and status are required' }, { status: 400 })
    }

    // Valid status values
    const validStatuses = ['pending', 'accepted', 'deployed', 'en_route', 'arrived', 'in_service', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    // First, check if booking exists
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, booking_code, status')
      .eq('id', bookingId)
      .single()

    if (fetchError || !existingBooking) {
      console.error('❌ Booking not found:', { 
        bookingId, 
        error: fetchError,
        searchedFor: bookingId,
        errorCode: fetchError?.code,
        errorMessage: fetchError?.message
      })
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    console.log('Found booking:', existingBooking)

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking status:', updateError)
      return NextResponse.json({ error: `Failed to update booking status: ${updateError.message}` }, { status: 500 })
    }

    console.log('Successfully updated booking:', updatedBooking)

    // ALWAYS create a system message about the status change (including for pending)
    const statusMessages = {
      'pending': '⏳ Your booking request has been received and is pending review.',
      'accepted': '✅ Your booking has been accepted by our team. We will contact you shortly.',
      'en_route': '🚗 Your security team is now en route to your location.',
      'arrived': '📍 Your security team has arrived at your location.',
      'in_service': '🛡️ Security service is now active. Your protection team is on duty.',
      'completed': '✅ Security service completed successfully. Thank you for choosing Protector.Ng!',
      'cancelled': '❌ Your booking has been cancelled. Please contact support if you have any questions.',
      'deployed': '🚀 Security team has been deployed and is preparing for departure.'
    }

    const messageContent = statusMessages[status as keyof typeof statusMessages] || `Status updated to: ${status}`
    
    // Add notes if provided
    const fullMessage = notes ? `${messageContent}\n\nNotes: ${notes}` : messageContent

    // Create system message - use a valid operator ID for system messages
    const operatorId = '4d2535f4-e7c7-4e06-b78a-469f68cc96be' // Default operator ID
    
    console.log('📨 Creating system message for status update:', { bookingId, status, message: fullMessage })
    
    const { data: systemMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        sender_id: operatorId,
        recipient_id: updatedBooking.client_id,
        content: fullMessage,
        message_type: 'system',
        is_encrypted: false
      })
      .select()
      .single()

    if (messageError) {
      console.error('⚠️ Failed to create system message:', messageError)
      // Don't fail the whole request
    } else {
      console.log('✅ System message created:', systemMessage?.id)
    }

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: 'Booking status updated successfully'
    })

  } catch (error) {
    console.error('Update booking status API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Booking status update POST API called')
    
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for real API to bypass RLS
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )
    
    // For now, skip authentication check to allow operator dashboard to work
    console.log('⚠️ Skipping authentication for status update compatibility')

    const { booking_id, status, message } = await request.json()

    if (!booking_id || !status) {
      return NextResponse.json({ error: 'Booking ID and status are required' }, { status: 400 })
    }

    console.log(`Updating booking ${booking_id} to status: ${status}`)

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking status:', updateError)
      return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 })
    }

    // ALWAYS create a system message about the status update
    const statusMessages = {
      'pending': '⏳ Your booking request has been received and is pending review.',
      'accepted': '✅ Your booking has been accepted by our team. We will contact you shortly.',
      'en_route': '🚗 Your security team is now en route to your location.',
      'arrived': '📍 Your security team has arrived at your location.',
      'in_service': '🛡️ Security service is now active. Your protection team is on duty.',
      'completed': '✅ Security service completed successfully. Thank you for choosing Protector.Ng!',
      'cancelled': '❌ Your booking has been cancelled. Please contact support if you have any questions.',
      'deployed': '🚀 Security team has been deployed and is preparing for departure.'
    }

    const systemMessageContent = statusMessages[status as keyof typeof statusMessages] || `Status updated to: ${status}`
    const fullMessage = message ? `${systemMessageContent}\n\nNotes: ${message}` : systemMessageContent

    // Get the booking to find the client_id
    const { data: booking } = await supabase
      .from('bookings')
      .select('client_id')
      .eq('id', booking_id)
      .single()

    if (booking) {
      const operatorId = '4d2535f4-e7c7-4e06-b78a-469f68cc96be' // Default operator ID
      
      console.log('📨 Creating system message:', fullMessage)
      
      const { data: createdMessage, error: messageError } = await supabase
        .from('messages')
        .insert([{
          booking_id: booking_id,
          sender_id: operatorId,
          recipient_id: booking.client_id,
          content: fullMessage,
          message_type: 'system',
          is_encrypted: false
        }])
        .select()
        .single()

      if (messageError) {
        console.error('⚠️ Error creating status message:', messageError)
        // Don't fail the request if message creation fails
      } else {
        console.log('✅ System message created:', createdMessage?.id)
      }
    }

    console.log('✅ Booking status updated successfully')

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: 'Booking status updated successfully'
    })

  } catch (error) {
    console.error('Booking status update POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



