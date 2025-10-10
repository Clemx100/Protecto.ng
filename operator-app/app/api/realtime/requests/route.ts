import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { 
      clientData, 
      serviceDetails, 
      priority = 'normal',
      source = 'protector.ng' 
    } = await request.json()

    // Create new booking request in database
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        client_id: clientData.id,
        service_type: serviceDetails.type,
        pickup_address: serviceDetails.pickup_address,
        destination_address: serviceDetails.destination_address,
        scheduled_date: serviceDetails.scheduled_date,
        duration: serviceDetails.duration,
        status: 'pending',
        priority: priority,
        source: source,
        client_data: clientData,
        service_details: serviceDetails
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      bookingId: booking.id,
      message: 'Request created and broadcasted to operators' 
    })
  } catch (error) {
    console.error('Error creating request:', error)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!bookings_client_id_fkey(*)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ bookings: bookings || [] })
  } catch (error) {
    console.error('Error fetching requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}
