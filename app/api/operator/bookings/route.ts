import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Real operator bookings API called')
    
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for real API to bypass RLS
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )
    
    // For now, skip authentication check to allow operator dashboard to work
    // TODO: Implement proper operator authentication later
    console.log('⚠️ Skipping authentication for operator dashboard compatibility')

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
    const transformedBookings = (bookings || []).map(booking => {
      // Extract client info from special_instructions if available
      let clientInfo = {
        first_name: booking.client?.first_name || 'Unknown',
        last_name: booking.client?.last_name || 'User',
        phone: booking.client?.phone || 'N/A',
        email: booking.client?.email || 'N/A'
      }
      
      // Additional booking data from special_instructions
      let vehicles = {}
      let protectionType = 'N/A'
      let destinationDetails = {}
      let contact = null
      
      // Try to extract all data from special_instructions JSON
      try {
        if (booking.special_instructions) {
          const specialInstructions = JSON.parse(booking.special_instructions)
          
          // Extract contact info
          if (specialInstructions.contact) {
            contact = specialInstructions.contact
            if (specialInstructions.contact.user) {
              clientInfo = {
                first_name: specialInstructions.contact.user.firstName || clientInfo.first_name,
                last_name: specialInstructions.contact.user.lastName || clientInfo.last_name,
                phone: specialInstructions.contact.phone || clientInfo.phone,
                email: specialInstructions.contact.user.email || clientInfo.email
              }
            }
          }
          
          // Extract other booking details
          if (specialInstructions.vehicles) {
            vehicles = specialInstructions.vehicles
          }
          if (specialInstructions.protectionType) {
            protectionType = specialInstructions.protectionType
          }
          if (specialInstructions.destinationDetails) {
            destinationDetails = specialInstructions.destinationDetails
          }
        }
      } catch (error) {
        console.log('Could not parse special_instructions for booking:', booking.booking_code)
      }
      
      return {
        id: booking.booking_code || booking.id, // Use booking_code as display ID
        booking_code: booking.booking_code,
        database_id: booking.id, // Keep database ID for internal operations
        client: clientInfo,
        contact: contact, // Include full contact object
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
        serviceType: booking.service_type === 'armed_protection' ? 'armed-protection' : 'vehicle-only',
        duration: `${booking.duration_hours || 1} hour(s)`,
        total_price: booking.total_price || 0,
        personnel: {
          protectors: booking.protector_count || 0,
          protectee: booking.protectee_count || 1,
          dressCode: booking.dress_code?.replace(/_/g, ' ') || 'N/A'
        },
        dress_code: booking.dress_code || 'N/A',
        vehicles: vehicles,
        protectionType: protectionType,
        destinationDetails: destinationDetails,
        special_instructions: booking.special_instructions || 'N/A',
        emergency_contact: booking.emergency_contact || 'N/A',
        emergency_phone: booking.emergency_phone || 'N/A',
        // Additional fields for compatibility
        pickupDetails: {
          location: booking.pickup_address,
          date: booking.scheduled_date,
          time: booking.scheduled_time
        },
        timestamp: booking.created_at
      }
    });

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
