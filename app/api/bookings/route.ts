import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('📥 Client bookings GET API called')
    
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )

    // For now, skip authentication check to allow client to load bookings
    // TODO: Implement proper client authentication later
    console.log('⚠️ Skipping authentication for client bookings compatibility')
    
    // Get client ID from request headers or use a default for testing
    const clientId = request.headers.get('x-client-id') || '9882762d-93e4-484c-b055-a14737f76cba'
    console.log('🔐 Using client ID:', clientId)

    // Get user's bookings
    console.log('🔍 Querying bookings for client_id:', clientId)
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!bookings_client_id_fkey(first_name, last_name, phone, email),
        service:services(name, description)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    console.log('📊 Bookings query result:', { count: bookings?.length, error: bookingsError })

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings', details: bookingsError.message }, { status: 500 })
    }

    console.log('✅ Bookings fetched successfully:', bookings?.length || 0)
    
    return NextResponse.json({ 
      success: true, 
      data: bookings || [],
      count: bookings?.length || 0
    })

  } catch (error) {
    console.error('❌ Error in bookings GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📱 Real booking creation API called')
    
    // Import Supabase clients
    const { createClient } = await import('@supabase/supabase-js')
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
    
    // Use service role for database operations (bypass RLS)
    const supabase = createClient(
      'https://mjdbhusnplveeaveeovd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
    )

    const bookingData = await request.json()
    console.log('📝 Real booking data:', JSON.stringify(bookingData, null, 2))

    // Check for authenticated user using Next.js server client
    let clientId = null
    
    try {
      console.log('🔐 Checking for authenticated user via session cookies')
      const cookieStore = await cookies()
      
      // Create proper server-side Supabase client
      const userSupabase = createServerClient(
        'https://mjdbhusnplveeaveeovd.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDU5NTMsImV4cCI6MjA3MzUyMTk1M30.C1eS4c3MJxh4GTnBMUmvnbmfVwLVHPmxGhX5wg0Mev0',
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

    // If no authenticated user, try to find/create based on contact info
    if (!clientId) {
      console.log('👤 No authenticated user, using contact information')
      
      const clientEmail = bookingData.contact?.user?.email || bookingData.contact?.email
      const clientPhone = bookingData.contact?.phone
      const clientFirstName = bookingData.contact?.user?.firstName || bookingData.contact?.firstName || 'Guest'
      const clientLastName = bookingData.contact?.user?.lastName || bookingData.contact?.lastName || 'User'
      
      console.log('Client info:', { clientEmail, clientPhone, clientFirstName, clientLastName })

      // Try to find existing client profile by email or phone
      if (clientEmail) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', clientEmail)
          .single()
        
        if (existingProfile) {
          clientId = existingProfile.id
          console.log('✅ Found existing client profile:', clientId)
        }
      }

      // If no existing profile found and we have contact info, create a new guest profile
      if (!clientId && (clientEmail || clientPhone)) {
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert([{
            email: clientEmail || `guest_${Date.now()}@protector.ng`,
            phone: clientPhone,
            first_name: clientFirstName,
            last_name: clientLastName,
            role: 'client',
            profile_completed: false
          }])
          .select()
          .single()
        
        if (newProfile) {
          clientId = newProfile.id
          console.log('✅ Created new guest profile:', clientId)
        } else {
          console.error('❌ Failed to create profile:', profileError)
          return NextResponse.json({ 
            error: 'Failed to create user profile. Please ensure you are logged in or provide valid contact information.' 
          }, { status: 400 })
        }
      }
      
      // If still no clientId, require authentication or contact info
      if (!clientId) {
        console.error('❌ No client ID found and no contact info provided')
        return NextResponse.json({ 
          error: 'Authentication required or contact information must be provided' 
        }, { status: 401 })
      }
    }

    // Use an existing service ID for mobile app bookings
    const serviceId = 'd5bcc8bd-a566-4094-8ac9-d25b7b356834' // Armed Protection Service
    const serviceType = bookingData.serviceType === 'armed-protection' ? 'armed_protection' : 'unarmed_protection'
    console.log('Using service ID for mobile booking:', serviceId)

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
    console.log('Creating booking with coordinates:', pickupCoordsString, destinationCoordsString)
    
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        booking_code: bookingData.id,
        client_id: clientId,
        service_id: serviceId,
        service_type: serviceType,
        protector_count: bookingData.personnel?.protectors || 1,
        protectee_count: bookingData.personnel?.protectee || 1,
        dress_code: bookingData.personnel?.dressCode?.toLowerCase().replace(/\s+/g, '_') || 'tactical_casual',
        duration_hours: durationHours,
        pickup_address: bookingData.pickupDetails?.location || '',
        pickup_coordinates: `(${pickupCoords?.lat || defaultLat},${pickupCoords?.lng || defaultLng})`, // Simple format: (lat,lng)
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
      }])
      .select()
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // Create chat room and send initial message
    try {
      console.log('Creating chat room for booking:', booking.id)
      
      // Import chat room service
      const { chatRoomService } = await import('@/lib/services/chatRoomService')
      
      // Create chat room
      const chatRoom = await chatRoomService.createChatRoom(
        booking.id,
        booking.booking_code,
        clientId
      )
      
      console.log('✅ Chat room created:', chatRoom.id)
      
      // Create initial system message
      const initialMessage = `🛡️ **New Protection Request Received** - #${booking.booking_code}

**Service Details:**
• Service Type: ${bookingData.serviceType === 'armed-protection' ? 'Armed Protection Service' : 'Vehicle Only Service'}
• Protection Level: ${bookingData.protectionType || 'N/A'}

**Location & Timing:**
• Pickup Location: ${bookingData.pickupDetails?.location || 'N/A'}
• Date & Time: ${bookingData.pickupDetails?.date || 'N/A'} at ${bookingData.pickupDetails?.time || 'N/A'}
• Duration: ${bookingData.pickupDetails?.duration || 'N/A'}

**Destination:**
• Primary Destination: ${bookingData.destinationDetails?.primary || 'N/A'}
${bookingData.destinationDetails?.additional?.length > 0 ? `• Additional Stops: ${bookingData.destinationDetails.additional.join(', ')}` : ''}

**Personnel Requirements:**
• Protectors: ${bookingData.personnel?.protectors || 0}
• Protectees: ${bookingData.personnel?.protectee || 0}
• Dress Code: ${bookingData.personnel?.dressCode || 'N/A'}

**Vehicle Requirements:**
${Object.entries(bookingData.vehicles || {}).map(([vehicle, count]) => `• ${vehicle}: ${count} unit(s)`).join('\n') || '• No specific vehicles requested'}

**Contact Information:**
• Phone: ${bookingData.contact?.phone || 'N/A'}
• Client: ${bookingData.contact?.user?.firstName || 'N/A'} ${bookingData.contact?.user?.lastName || 'N/A'}

**Status:** ${bookingData.status}
**Submitted:** ${new Date(bookingData.timestamp).toLocaleString()}

---
*This is an automated message. Please review the request details and respond accordingly.*`

      // Send initial system message
      await chatRoomService.sendMessage(
        chatRoom.id,
        booking.id,
        clientId,
        'system',
        initialMessage,
        'system'
      )
      
      console.log('✅ Initial system message sent')
      
    } catch (chatError) {
      console.error('Error creating chat room or sending initial message:', chatError)
      // Don't fail the booking creation if chat room creation fails
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



