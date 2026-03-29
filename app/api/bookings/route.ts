import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/config/database'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const userSupabase = await createServerSupabaseClient()
    const {
      data: { user },
      error
    } = await userSupabase.auth.getUser()
    if (error || !user) return null
    return user.id
  } catch {
    return null
  }
}

export async function GET(_request: NextRequest) {
  try {
    console.log('📥 Client bookings GET API called')

    const clientId = await getAuthenticatedUserId()
    if (!clientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Get user's bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('client_id', clientId)
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
    console.error('Bookings GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 BOOKING CREATION API CALLED')
    console.log('=' .repeat(50))

    const bookingData = await request.json()
    if (!bookingData?.id) {
      return NextResponse.json({ error: 'booking id is required' }, { status: 400 })
    }

    console.log('📝 Received booking data:', {
      id: bookingData.id,
      serviceType: bookingData.serviceType,
      pickupLocation: bookingData.pickupDetails?.location,
      hasContact: !!bookingData.contact,
      hasUser: !!bookingData.contact?.user
    })

    const clientId = await getAuthenticatedUserId()
    if (!clientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Use an existing service ID for mobile app bookings
    const serviceId = 'd5bcc8bd-a566-4094-8ac9-d25b7b356834' // Armed Protection Service
    const serviceType = bookingData.serviceType === 'armed-protection' ? 'armed_protection' : 'unarmed_protection'
    console.log('🎯 Using service:', { serviceId, serviceType })

    // Parse duration to get hours
    const durationText = bookingData.pickupDetails?.duration || '1 day'
    const parsedDurationHours = parseInt(durationText, 10)
    const durationHours = durationText.includes('day')
      ? 24
      : durationText.includes('hour') && !Number.isNaN(parsedDurationHours)
        ? parsedDurationHours
        : 4

    // Parse coordinates properly
    const pickupCoords = bookingData.pickupDetails?.coordinates
    const destinationCoords = bookingData.destinationDetails?.coordinates
    
    // Default to Lagos coordinates if none provided
    const defaultLat = 6.5244
    const defaultLng = 3.3792
    const bookingCode = String(bookingData.id)

    // Create booking directly in the database
    console.log('💾 Creating booking in database...')
    console.log('📊 Booking details:', {
      booking_code: bookingCode,
      client_id: clientId,
      service_type: serviceType,
      pickup_address: bookingData.pickupDetails?.location || '',
      status: 'pending'
    })
    
    const bookingPayload = {
      booking_code: bookingCode,
      client_id: clientId,
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
      emergency_contact: bookingData.contact?.user?.firstName || 'N/A',
      emergency_phone: bookingData.contact?.phone || 'N/A',
      status: 'pending'
    }
    
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingPayload])
      .select()
      .single()

    if (bookingError) {
      console.error('❌ Error creating booking:', bookingError)
      console.error('❌ Error details:', {
        message: bookingError.message,
        details: bookingError.details,
        hint: bookingError.hint,
        code: bookingError.code
      })
      return NextResponse.json({ 
        error: 'Failed to create booking',
        details: bookingError.message 
      }, { status: 500 })
    }

    console.log('✅ Booking created successfully!')
    console.log('📋 Booking details:', {
      id: booking.id,
      booking_code: booking.booking_code,
      client_id: booking.client_id,
      status: booking.status,
      created_at: booking.created_at
    })

    // The chat room will be created automatically by the database trigger
    // when a booking is inserted, so we don't need to create it manually here
    console.log('✅ Booking created - chat room will be created automatically by trigger')

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Booking created successfully'
    })

  } catch (error) {
    console.error('❌ Fatal booking creation API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}