import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('📥 Client bookings GET API called')
    
    // Import Supabase clients
    const { createClient } = await import('@supabase/supabase-js')
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://kifcevffaputepvpjpip.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
    )

    // For development/testing, use a known user ID
    const clientId = '9882762d-93e4-484c-b055-a14737f76cba'
    console.log('🔐 Using test user ID:', clientId)

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
    
    // Import Supabase clients
    const { createClient } = await import('@supabase/supabase-js')
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://kifcevffaputepvpjpip.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
    )

    const bookingData = await request.json()
    console.log('📝 Received booking data:', {
      id: bookingData.id,
      serviceType: bookingData.serviceType,
      pickupLocation: bookingData.pickupDetails?.location,
      hasContact: !!bookingData.contact,
      hasUser: !!bookingData.contact?.user
    })

    // Check for authenticated user using Next.js server client
    let clientId = null
    
    try {
      console.log('🔐 Checking for authenticated user via session cookies')
      const cookieStore = await cookies()
      
      // Create proper server-side Supabase client
      const userSupabase = createServerClient(
        'https://kifcevffaputepvpjpip.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ0NzYsImV4cCI6MjA3NTM3MDQ3Nn0.YuVbfSbrDUy2nPigODzCcaOWTEXaJlPrVGE1L0C3y6g',
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            },
          },
        }
      )
      
      const { data: { user }, error: authError } = await userSupabase.auth.getUser()
      
      if (user && !authError) {
        clientId = user.id
        console.log('✅ Using authenticated user ID from session:', clientId)
      } else {
        console.log('⚠️ No authenticated user found in session:', authError?.message)
      }
    } catch (authCheckError) {
      console.log('⚠️ Error checking authentication from session:', authCheckError)
    }

    // If no authenticated user, use the test client for now
    if (!clientId) {
      console.log('👤 No authenticated user, using test client')
      clientId = '9882762d-93e4-484c-b055-a14737f76cba' // Test client ID
      console.log('✅ Using test client ID:', clientId)
    }

    // Use an existing service ID for mobile app bookings
    const serviceId = 'd5bcc8bd-a566-4094-8ac9-d25b7b356834' // Armed Protection Service
    const serviceType = bookingData.serviceType === 'armed-protection' ? 'armed_protection' : 'unarmed_protection'
    console.log('🎯 Using service:', { serviceId, serviceType })

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
    
    // Use raw SQL to handle PostGIS coordinates properly
    const pickupCoordsString = pickupCoords ? `${pickupCoords.lng},${pickupCoords.lat}` : `${defaultLng},${defaultLat}`
    const destinationCoordsString = destinationCoords ? `${destinationCoords.lng},${destinationCoords.lat}` : null

    // Create booking directly in the database
    console.log('💾 Creating booking in database...')
    console.log('📊 Booking details:', {
      booking_code: bookingData.id,
      client_id: clientId,
      service_type: serviceType,
      pickup_address: bookingData.pickupDetails?.location || '',
      status: 'pending'
    })
    
    const bookingPayload = {
      booking_code: bookingData.id,
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
      details: error.message 
    }, { status: 500 })
  }
}