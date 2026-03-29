import { NextRequest, NextResponse } from 'next/server'
import { requireOperatorAuth } from '@/lib/auth/operatorAuth'
import { createServiceRoleClient } from '@/lib/config/database'

export async function PATCH(request: NextRequest) {
  try {
    console.log('🔄 Booking status update API called')

    const authResult = await requireOperatorAuth(request)
    if (authResult.error) {
      console.log('❌ Unauthorized access attempt to update booking status')
      return authResult.response
    }

    const supabase = createServiceRoleClient()

    const { bookingId, status, notes } = await request.json()

    console.log('🔍 API received status update request:', { bookingId, status, notes })
    console.log('🔍 Booking ID type:', typeof bookingId, 'Length:', bookingId?.length)

    if (!bookingId || !status) {
      return NextResponse.json({ error: 'Booking ID and status are required' }, { status: 400 })
    }

    // Valid status values
    const validStatuses = ['pending', 'accepted', 'paid', 'deployed', 'en_route', 'arrived', 'in_service', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    // First, check if booking exists - handle both UUID and booking code
    let existingBooking, fetchError
    
    if (bookingId.startsWith('REQ')) {
      // It's a booking code, search by booking_code
      console.log('🔍 Searching by booking code:', bookingId)
      const result = await supabase
        .from('bookings')
        .select('id, booking_code, status')
        .eq('booking_code', bookingId)
        .single()
      existingBooking = result.data
      fetchError = result.error
    } else {
      // It's a UUID, search by id
      console.log('🔍 Searching by UUID:', bookingId)
      const result = await supabase
        .from('bookings')
        .select('id, booking_code, status')
        .eq('id', bookingId)
        .single()
      existingBooking = result.data
      fetchError = result.error
    }

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

    // Update booking status using the actual UUID from the database
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    }
    
    // Set completed_at timestamp when status is completed
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }
    
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', existingBooking.id) // Use the UUID from the database, not the input bookingId
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking status:', updateError)
      return NextResponse.json({ error: `Failed to update booking status: ${updateError.message}` }, { status: 500 })
    }

    console.log('Successfully updated booking:', updatedBooking)

    // Create a new system message about the status change
    const statusMessages = {
      'pending': '⏳ Your booking request has been received and is pending review.',
      'accepted': '✅ Your booking has been accepted by our team. We will contact you shortly.',
      'paid': '💰 Payment received and confirmed! Your service will now be processed.',
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

    // Create system message - use the client ID as sender for system messages
    const operatorId = updatedBooking.client_id // Use the client ID for system messages
    
    console.log('📨 Creating system message for status update:', { bookingId, status, message: fullMessage })
    
    const { data: systemMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        booking_id: existingBooking.id, // Use the UUID from the database
        sender_id: operatorId,
        recipient_id: updatedBooking.client_id,
        content: fullMessage, // ✅ Use 'content' column (primary)
        message: fullMessage, // ✅ Also set 'message' for compatibility
        message_type: 'system',
        sender_type: 'system',
        is_system_message: true
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

    const authResult = await requireOperatorAuth(request)
    if (authResult.error) {
      console.log('❌ Unauthorized access attempt to update booking status')
      return authResult.response
    }

    const supabase = createServiceRoleClient()

    const { booking_id, status, message } = await request.json()

    if (!booking_id || !status) {
      return NextResponse.json({ error: 'Booking ID and status are required' }, { status: 400 })
    }

    console.log(`Updating booking ${booking_id} to status: ${status}`)

    // Update booking status
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    }
    
    // Set completed_at timestamp when status is completed
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }
    
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
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
      'paid': '💰 Payment received and confirmed! Your service will now be processed.',
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
      const operatorId = booking.client_id // Use the client ID for system messages
      
      console.log('📨 Creating system message:', fullMessage)
      
      const { data: createdMessage, error: messageError } = await supabase
        .from('messages')
        .insert([{
          booking_id: booking_id,
          sender_id: operatorId,
          recipient_id: booking.client_id,
          content: fullMessage, // ✅ Use 'content' column (primary)
          message: fullMessage, // ✅ Also set 'message' for compatibility
          message_type: 'system',
          sender_type: 'system',
          is_system_message: true
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



