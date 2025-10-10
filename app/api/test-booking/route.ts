import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test booking API called')
    
    // Use service role for demo API to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifcevffaputepvpjpip.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
    )
    
    const bookingData = await request.json()
    console.log('📝 Test booking data:', JSON.stringify(bookingData, null, 2))

    // Create a simple test booking
    const testBooking = {
      booking_code: `TEST_${Date.now()}`,
      client_id: uuidv4(),
      service_id: uuidv4(),
      service_type: 'armed_protection',
      protector_count: 1,
      protectee_count: 1,
      dress_code: 'tactical_casual',
      duration_hours: 4,
      pickup_address: bookingData.pickupDetails?.location || 'Test Location',
      pickup_coordinates: '(6.5244,3.3792)',
      destination_address: bookingData.destinationDetails?.primary || 'Test Destination',
      destination_coordinates: '(6.4281,3.4216)',
      scheduled_date: bookingData.pickupDetails?.date || '2025-02-22',
      scheduled_time: bookingData.pickupDetails?.time || '12:00:00',
      base_price: 100000,
      total_price: 100000,
      special_instructions: JSON.stringify({
        vehicles: bookingData.vehicles,
        protectionType: bookingData.protectionType,
        contact: bookingData.contact
      }),
      emergency_contact: bookingData.contact?.user?.firstName || 'Test',
      emergency_phone: bookingData.contact?.phone || '08012345678',
      status: 'pending'
    }

    console.log('💾 Creating test booking:', testBooking.booking_code)

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([testBooking])
      .select()
      .single()

    if (bookingError) {
      console.error('❌ Booking creation error:', bookingError)
      return NextResponse.json({ 
        error: 'Failed to create test booking', 
        details: bookingError.message 
      }, { status: 500 })
    }

    console.log('✅ Test booking created successfully:', booking.booking_code)

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Test booking created successfully'
    })

  } catch (error) {
    console.error('❌ Test booking API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}








