import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bookingData = await request.json()

    // Ensure user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      // Create a basic profile for the user
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || 'User',
          last_name: user.user_metadata?.last_name || 'Client',
          role: 'client'
        }])

      if (createProfileError) {
        console.error('Error creating user profile:', createProfileError)
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
      }
    }

    // Ensure we have a service record
    let serviceId = null
    const serviceType = bookingData.serviceType === 'armed-protection' ? 'armed_protection' : 'unarmed_protection'
    
    // Check if service exists, if not create it
    const { data: existingService } = await supabase
      .from('services')
      .select('id')
      .eq('type', serviceType)
      .single()

    if (existingService) {
      serviceId = existingService.id
    } else {
      // Create service if it doesn't exist
      const { data: newService, error: serviceError } = await supabase
        .from('services')
        .insert([{
          name: bookingData.serviceType === 'armed-protection' ? 'Armed Protection Service' : 'Vehicle Only Service',
          type: serviceType,
          description: bookingData.serviceType === 'armed-protection' ? 'Professional armed security protection' : 'Vehicle transportation service',
          base_price: bookingData.serviceType === 'armed-protection' ? 100000 : 50000,
          price_per_hour: bookingData.serviceType === 'armed-protection' ? 25000 : 15000,
          minimum_duration: 4,
          is_active: true
        }])
        .select()
        .single()

      if (serviceError) {
        console.error('Error creating service:', serviceError)
        return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
      }
      serviceId = newService.id
    }

    // Parse duration to get hours
    const durationText = bookingData.pickupDetails?.duration || '1 day'
    const durationHours = durationText.includes('day') ? 24 : 
                         durationText.includes('hour') ? parseInt(durationText) : 4

    // Parse coordinates properly
    const pickupCoords = bookingData.pickupDetails?.coordinates
    const destinationCoords = bookingData.destinationDetails?.coordinates
    
    const pickupCoordinates = pickupCoords ? 
      `POINT(${pickupCoords.lng} ${pickupCoords.lat})` : 
      `POINT(0 0)` // Default coordinates if none provided
    
    const destinationCoordinates = destinationCoords ? 
      `POINT(${destinationCoords.lng} ${destinationCoords.lat})` : 
      null

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        booking_code: bookingData.id,
        client_id: user.id,
        service_id: serviceId,
        service_type: serviceType,
        protector_count: bookingData.personnel?.protectors || 1,
        protectee_count: bookingData.personnel?.protectee || 1,
        dress_code: bookingData.personnel?.dressCode?.toLowerCase().replace(/\s+/g, '_') || 'tactical_casual',
        duration_hours: durationHours,
        pickup_address: bookingData.pickupDetails?.location || '',
        pickup_coordinates: pickupCoordinates,
        destination_address: bookingData.destinationDetails?.primary || '',
        destination_coordinates: destinationCoordinates,
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
        emergency_contact: bookingData.contact?.user?.firstName || 'N/A',
        emergency_phone: bookingData.contact?.phone || 'N/A',
        status: 'pending'
      }])
      .select()
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Booking created successfully'
    })

  } catch (error) {
    console.error('Booking creation API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services(*)
      `)
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: bookings || [],
      count: bookings?.length || 0
    })

  } catch (error) {
    console.error('Bookings fetch API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

