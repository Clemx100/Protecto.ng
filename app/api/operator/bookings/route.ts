import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is operator or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'operator' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden - Operator access required' }, { status: 403 })
    }

    // Get all bookings with client details
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!bookings_client_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        service:services(
          id,
          name,
          description,
          base_price,
          price_per_hour
        )
      `)
      .order('created_at', { ascending: false })

    console.log('Raw bookings from database:', bookings)

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    // Transform bookings to match operator dashboard format
    const transformedBookings = (bookings || []).map(booking => ({
      id: booking.booking_code || booking.id, // Use booking_code as display ID
      booking_code: booking.booking_code,
      database_id: booking.id, // Keep database ID for internal operations
      client: {
        first_name: booking.client?.first_name || 'Unknown',
        last_name: booking.client?.last_name || 'User',
        phone: booking.client?.phone || 'N/A',
        email: booking.client?.email || 'N/A'
      },
      pickup_address: booking.pickup_address || 'N/A',
      destination_address: booking.destination_address || 'N/A',
      status: booking.status || 'pending',
      created_at: booking.created_at,
      scheduled_date: booking.scheduled_date,
      scheduled_time: booking.scheduled_time,
      service: {
        name: booking.service?.name || 'Unknown Service',
        type: booking.service_type,
        description: booking.service?.description || ''
      },
      duration: `${booking.duration_hours || 1} hour(s)`,
      total_price: booking.total_price || 0,
      personnel: {
        protectors: booking.protector_count || 0,
        protectee: booking.protectee_count || 1
      },
      dress_code: booking.dress_code || 'N/A',
      special_instructions: booking.special_instructions || 'N/A',
      emergency_contact: booking.emergency_contact || 'N/A',
      emergency_phone: booking.emergency_phone || 'N/A'
    }))

    return NextResponse.json({
      success: true,
      data: transformedBookings,
      count: transformedBookings.length
    })

  } catch (error) {
    console.error('Operator bookings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is operator or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'operator' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden - Operator access required' }, { status: 403 })
    }

    const { bookingId, updates } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: updatedBooking
    })

  } catch (error) {
    console.error('Update booking API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
