import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Demo booking creation API called')
    
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for demo API to bypass RLS
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )
    
    const bookingData = await request.json()
    console.log('Demo booking creation request:', JSON.stringify(bookingData, null, 2))

    // Use an existing service ID for demo purposes
    const serviceId = 'd5bcc8bd-a566-4094-8ac9-d25b7b356834' // Armed Protection Service
    const serviceType = bookingData.serviceType === 'armed-protection' ? 'armed_protection' : 'unarmed_protection'
    
    console.log('Using existing service ID:', serviceId, 'for service type:', serviceType)

    // Parse duration to get hours
    const durationText = bookingData.pickupDetails?.duration || '1 day'
    const durationHours = durationText.includes('day') ? 24 : 
                         durationText.includes('hour') ? parseInt(durationText) : 4

    // Parse coordinates properly
    const pickupCoords = bookingData.pickupDetails?.coordinates
    const destinationCoords = bookingData.destinationDetails?.coordinates
    
    // Default to Lagos coordinates if none provided
    const defaultLat = 6.5244
    const defaultLng = 3.3792

    // Use an existing client ID for demo purposes
    const demoClientId = '4d2535f4-e7c7-4e06-b78a-469f68cc96be' // test@protector.ng
    
    console.log('Using existing demo client ID:', demoClientId)

    // Create booking directly in the database
    console.log('Creating demo booking with coordinates:', pickupCoords, destinationCoords)
    
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        booking_code: bookingData.id,
        client_id: demoClientId,
        service_id: serviceId,
        service_type: serviceType,
        protector_count: bookingData.personnel?.protectors || 1,
        protectee_count: bookingData.personnel?.protectee || 1,
        dress_code: bookingData.personnel?.dressCode?.toLowerCase().replace(/\s+/g, '_') || 'tactical_casual',
        duration_hours: durationHours,
        pickup_address: bookingData.pickupDetails?.location || '',
        pickup_coordinates: `(${pickupCoords?.lat || defaultLat},${pickupCoords?.lng || defaultLng})`,
        destination_address: bookingData.destinationDetails?.primary || '',
        destination_coordinates: destinationCoords ? `(${destinationCoords.lat},${destinationCoords.lng})` : null,
        scheduled_date: bookingData.pickupDetails?.date || new Date().toISOString().split('T')[0],
        scheduled_time: bookingData.pickupDetails?.time || '12:00:00',
        base_price: bookingData.serviceType === 'armed-protection' ? 100000 : 50000,
        total_price: bookingData.serviceType === 'armed-protection' ? 100000 : 50000,
        special_instructions: JSON.stringify({
          vehicles: bookingData.vehicles,
          protectionType: bookingData.protectionType,
          destinationDetails: bookingData.destinationDetails,
          contact: bookingData.contact
        }),
        emergency_contact: bookingData.contact?.user?.firstName || 'Demo',
        emergency_phone: bookingData.contact?.phone || '08012345678',
        status: 'pending'
      }])
      .select()
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      console.error('Booking data that failed:', JSON.stringify({
        booking_code: bookingData.id,
        client_id: demoClientId,
        service_id: serviceId,
        service_type: serviceType,
        protector_count: bookingData.personnel?.protectors || 1,
        protectee_count: bookingData.personnel?.protectee || 1,
        dress_code: bookingData.personnel?.dressCode?.toLowerCase().replace(/\s+/g, '_') || 'tactical_casual',
        duration_hours: durationHours,
        pickup_address: bookingData.pickupDetails?.location || '',
        pickup_coordinates: `(${pickupCoords?.lat || defaultLat},${pickupCoords?.lng || defaultLng})`,
        destination_address: bookingData.destinationDetails?.primary || '',
        destination_coordinates: destinationCoords ? `(${destinationCoords.lat},${destinationCoords.lng})` : null,
        scheduled_date: bookingData.pickupDetails?.date || new Date().toISOString().split('T')[0],
        scheduled_time: bookingData.pickupDetails?.time || '12:00:00',
        base_price: bookingData.serviceType === 'armed-protection' ? 100000 : 50000,
        total_price: bookingData.serviceType === 'armed-protection' ? 100000 : 50000,
        special_instructions: JSON.stringify({
          vehicles: bookingData.vehicles,
          protectionType: bookingData.protectionType,
          destinationDetails: bookingData.destinationDetails,
          contact: bookingData.contact
        }),
        emergency_contact: bookingData.contact?.user?.firstName || 'Demo',
        emergency_phone: bookingData.contact?.phone || '08012345678',
        status: 'pending'
      }, null, 2))
      return NextResponse.json({ error: `Failed to create booking: ${bookingError.message}` }, { status: 500 })
    }

    console.log('Demo booking created successfully:', booking.booking_code)

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Demo booking created successfully'
    })

  } catch (error) {
    console.error('Demo booking creation API error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get all demo bookings
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

    if (bookingsError) {
      console.error('Error fetching demo bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: bookings || [],
      count: bookings?.length || 0
    })

  } catch (error) {
    console.error('Demo bookings fetch API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
