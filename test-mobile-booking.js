// Test script to simulate mobile booking and check if it reaches the database
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testMobileBooking() {
  console.log('📱 Testing mobile booking simulation...')
  
  try {
    // First, let's create a test user
    console.log('👤 Creating test user...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `testmobile${Date.now()}@gmail.com`,
      password: 'testpassword123!',
      options: {
        data: {
          first_name: 'Mobile',
          last_name: 'Tester'
        }
      }
    })

    if (authError) {
      console.error('❌ Error creating test user:', authError)
      return
    }

    console.log('✅ Test user created:', authData.user?.id)

    // Create profile for the user
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        first_name: 'Mobile',
        last_name: 'Tester',
        role: 'client',
        phone: '+234-800-000-0000',
        is_verified: true,
        is_active: true
      })

    if (profileError) {
      console.error('❌ Error creating profile:', profileError)
    } else {
      console.log('✅ Profile created successfully')
    }

    // Now simulate a booking creation
    console.log('📋 Creating test booking...')
    
    // First, ensure we have a service
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id')
      .eq('type', 'armed_protection')
      .single()

    if (serviceError && serviceError.code !== 'PGRST116') {
      console.error('❌ Error checking service:', serviceError)
      return
    }

    let serviceId = service?.id
    if (!serviceId) {
      // Create service if it doesn't exist
      const { data: newService, error: createServiceError } = await supabase
        .from('services')
        .insert({
          name: 'Armed Protection Service',
          type: 'armed_protection',
          description: 'Professional armed security protection',
          base_price: 100000,
          price_per_hour: 25000,
          minimum_duration: 4,
          is_active: true
        })
        .select()
        .single()

      if (createServiceError) {
        console.error('❌ Error creating service:', createServiceError)
        return
      }
      serviceId = newService.id
      console.log('✅ Service created with ID:', serviceId)
    } else {
      console.log('✅ Using existing service ID:', serviceId)
    }

    // Create the booking
    const bookingPayload = {
      booking_code: `REQ${Date.now()}`,
      client_id: authData.user.id,
      service_id: serviceId,
      service_type: 'armed_protection',
      protector_count: 2,
      protectee_count: 1,
      dress_code: 'tactical_casual',
      duration_hours: 8,
      pickup_address: 'Lagos, Nigeria',
      pickup_coordinates: '(6.5244,3.3792)', // Lagos coordinates
      destination_address: 'Abuja, Nigeria',
      destination_coordinates: '(9.0765,7.3986)', // Abuja coordinates
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '10:00:00',
      base_price: 0,
      total_price: 0,
      special_instructions: JSON.stringify({
        vehicles: { armoredSuv: 1 },
        protectionType: 'Armed',
        destinationDetails: { primary: 'Abuja, Nigeria' },
        contact: { phone: '+234-800-000-0000' }
      }),
      emergency_contact: '+234-800-000-0000',
      emergency_phone: '+234-800-000-0000',
      status: 'pending'
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingPayload])
      .select()

    if (bookingError) {
      console.error('❌ Error creating booking:', bookingError)
      return
    }

    console.log('✅ Booking created successfully:', booking[0].id)
    console.log('📋 Booking details:', {
      id: booking[0].id,
      booking_code: booking[0].booking_code,
      status: booking[0].status,
      client_id: booking[0].client_id
    })

    // Now check if the operator dashboard can see it
    console.log('🔍 Checking if operator can see the booking...')
    
    const { data: operatorBookings, error: operatorError } = await supabase
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

    if (operatorError) {
      console.error('❌ Error fetching bookings for operator:', operatorError)
    } else {
      console.log(`✅ Operator can see ${operatorBookings.length} bookings`)
      if (operatorBookings.length > 0) {
        console.log('📋 Latest booking:', {
          id: operatorBookings[0].id,
          booking_code: operatorBookings[0].booking_code,
          status: operatorBookings[0].status,
          client: operatorBookings[0].client
        })
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testMobileBooking()
