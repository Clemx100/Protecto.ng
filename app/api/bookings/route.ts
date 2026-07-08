import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/config/database'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'

const DEFAULT_SERVICE_ID = 'd5bcc8bd-a566-4094-8ac9-d25b7b356834'

type MarketplaceBookingMode = 'vehicle_only' | 'protector_only' | 'combined'

const OPTIONAL_BOOKING_COLUMNS = [
  'kyc_status',
  'approval_status',
  'booking_mode',
  'vehicle_listing_id',
  'protector_listing_id',
  'with_driver',
  'rental_days',
  'hourly_rate',
  'daily_rate',
] as const

function normalizeScheduledDate(raw?: string): string {
  if (!raw) return new Date().toISOString().split('T')[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }

  return new Date().toISOString().split('T')[0]
}

function normalizeScheduledTime(raw?: string): string {
  if (!raw) return '12:00:00'

  const trimmed = raw.trim().toLowerCase()
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i)
  if (match) {
    let hour = Number.parseInt(match[1], 10)
    const minute = match[2]
    const period = match[3]?.toLowerCase()
    if (period === 'pm' && hour < 12) hour += 12
    if (period === 'am' && hour === 12) hour = 0
    return `${hour.toString().padStart(2, '0')}:${minute}:00`
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`

  return '12:00:00'
}

function normalizeDressCode(raw?: string | null): string | null {
  if (!raw) return null

  const normalized = raw.toLowerCase().trim().replace(/[\s-]+/g, '_')
  const allowed = new Set([
    'business_formal',
    'business_casual',
    'tactical_casual',
    'tactical_gear',
    'plainclothes',
  ])

  if (allowed.has(normalized)) return normalized
  if (normalized === 'operator') return 'tactical_gear'
  return 'tactical_casual'
}

function normalizeBookingPayload(input: any) {
  const bookingCode = String(input?.id || `REQ${Date.now()}`)
  const vehicleListingId = input?.vehicle_listing_id || null
  const protectorListingId = input?.protector_listing_id || null
  const requestedMode = String(input?.booking_mode || "").toLowerCase().replace(/-/g, "_")
  const isCarOnlyService = input?.serviceType === "car-only"

  let bookingMode: MarketplaceBookingMode = "protector_only"
  if (requestedMode === "vehicle_only" || isCarOnlyService) {
    bookingMode = "vehicle_only"
  } else if (requestedMode === "combined") {
    bookingMode = "combined"
  } else if (vehicleListingId && protectorListingId) {
    bookingMode = "combined"
  } else if (vehicleListingId) {
    bookingMode = "vehicle_only"
  } else if (requestedMode === "protector_only") {
    bookingMode = "protector_only"
  }

  const pickupCoordinates = input?.pickupDetails?.coordinates
  const destinationCoordinates = input?.destinationDetails?.coordinates
  const durationText = input?.pickupDetails?.duration || '1 day'
  const parsedDuration = parseInt(String(durationText), 10)
  const durationHours = Number.isNaN(parsedDuration) ? 4 : (String(durationText).includes('day') ? parsedDuration * 24 : parsedDuration)

  const core = {
    booking_code: bookingCode,
    service_id: input?.service_id || DEFAULT_SERVICE_ID,
    service_type:
      bookingMode === "vehicle_only"
        ? "armored_vehicle"
        : input?.serviceType === "armed-protection"
          ? "armed_protection"
          : "unarmed_protection",
    protector_count:
      bookingMode === "vehicle_only" ? 0 : (input?.personnel?.protectors || 1),
    protectee_count: input?.personnel?.protectee || 1,
    dress_code: normalizeDressCode(input?.personnel?.dressCode),
    duration_hours: durationHours,
    pickup_address: input?.pickupDetails?.location || '',
    pickup_coordinates: `(${pickupCoordinates?.lat || 6.5244},${pickupCoordinates?.lng || 3.3792})`,
    destination_address: input?.destinationDetails?.primary || '',
    destination_coordinates: destinationCoordinates ? `(${destinationCoordinates.lat},${destinationCoordinates.lng})` : null,
    scheduled_date: normalizeScheduledDate(input?.pickupDetails?.date),
    scheduled_time: normalizeScheduledTime(input?.pickupDetails?.time),
    base_price: Number(input?.base_price || input?.estimated_total || (bookingMode === 'vehicle_only' ? 75000 : 100000)),
    total_price: Number(input?.total_price || input?.estimated_total || (bookingMode === 'vehicle_only' ? 75000 : 100000)),
    special_instructions: JSON.stringify({
      mode: bookingMode,
      vehicles: input?.vehicles || {},
      destinationDetails: input?.destinationDetails || {},
      contact: input?.contact || {},
      selectedProtectorName: input?.selectedProtectorName || null,
      selectedProtectorPhoto: input?.selectedProtectorPhoto || null,
      dressCodeId: input?.dressCodeId || null,
      personnel: input?.personnel || {},
      with_driver: Boolean(input?.with_driver),
      protector_listing_id: protectorListingId,
    }),
    emergency_contact: input?.contact?.user?.firstName || input?.contact?.user?.user_metadata?.first_name || 'N/A',
    emergency_phone: input?.contact?.phone || 'N/A',
    status: 'pending',
  }

  return {
    ...core,
    booking_mode: bookingMode,
    vehicle_listing_id: vehicleListingId,
    protector_listing_id: protectorListingId,
    with_driver: Boolean(input?.with_driver),
    rental_days: input?.rental_days || null,
    hourly_rate: input?.hourly_rate || null,
    daily_rate: input?.daily_rate || null,
    kyc_status: 'pending',
    approval_status: 'pending',
  }
}

async function insertBookingWithFallback(
  supabase: ReturnType<typeof createServiceRoleClient>,
  payload: Record<string, unknown>,
) {
  let attempt: Record<string, unknown> = { ...payload }

  for (let retry = 0; retry < 20; retry += 1) {
    const { data, error } = await supabase
      .from('bookings')
      .insert([attempt])
      .select()
      .single()

    if (!error) {
      return { data, error: null }
    }

    console.warn(`⚠️ Booking insert attempt ${retry + 1} failed:`, error.message)

    const missingColumn = error.message.match(/'([^']+)' column/)?.[1]
    if (missingColumn && missingColumn in attempt) {
      delete attempt[missingColumn]
      continue
    }

    if (
      error.message?.includes('dress_code') ||
      error.code === '22P02' ||
      error.code === '23514'
    ) {
      if ('dress_code' in attempt) {
        delete attempt.dress_code
        continue
      }
    }

    if (error.code === 'PGRST204') {
      for (const column of OPTIONAL_BOOKING_COLUMNS) {
        if (column in attempt) delete attempt[column]
      }
      continue
    }

    return { data: null, error }
  }

  return {
    data: null,
    error: { message: 'Failed to insert booking after removing optional columns' },
  }
}

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

    const normalized = normalizeBookingPayload(bookingData)
    const bookingPayload = {
      ...normalized,
      client_id: clientId
    }
    
    const { data: booking, error: bookingError } = await insertBookingWithFallback(
      supabase,
      bookingPayload,
    )

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