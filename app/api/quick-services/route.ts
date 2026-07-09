import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/config/database'
import { buildQuickServiceBookingPayload, buildQuickServiceChatSummary, buildQuickServiceMessageMetadata } from '@/lib/services/quick-service-bookings'
import type { QuickServiceRequest } from '@/lib/types/quick-services'

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

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const userSupabase = await createServerSupabaseClient()
    const {
      data: { user },
      error,
    } = await userSupabase.auth.getUser()
    if (error || !user) return null
    return user.id
  } catch {
    return null
  }
}

async function insertBookingWithFallback(
  supabase: ReturnType<typeof createServiceRoleClient>,
  payload: Record<string, unknown>,
) {
  let attempt: Record<string, unknown> = { ...payload }

  for (let retry = 0; retry < 20; retry += 1) {
    const { data, error } = await supabase.from('bookings').insert([attempt]).select().single()
    if (!error) return { data, error: null }

    const missingColumn = error.message.match(/'([^']+)' column/)?.[1]
    if (missingColumn && missingColumn in attempt) {
      delete attempt[missingColumn]
      continue
    }

    if (error.code === 'PGRST204') {
      for (const column of OPTIONAL_BOOKING_COLUMNS) {
        if (column in attempt) delete attempt[column]
      }
      continue
    }

    return { data: null, error }
  }

  return { data: null, error: { message: 'Failed to create quick service request' } }
}

function parseBody(body: Record<string, unknown>): QuickServiceRequest | null {
  const type = String(body.type || '')
  if (type === 'itinerary_planning') {
    const description = String(body.description || '').trim()
    if (!description) return null
    return {
      type,
      description,
      itineraryFileUrl: body.itineraryFileUrl ? String(body.itineraryFileUrl) : null,
      itineraryFileName: body.itineraryFileName ? String(body.itineraryFileName) : null,
    }
  }

  if (type === 'private_home_security') {
    const address = String(body.address || '').trim()
    const protectorCount = Math.max(1, Number(body.protectorCount || 1))
    const protecteeCount = Math.max(1, Number(body.protecteeCount || 1))
    const protecteeNames = Array.isArray(body.protecteeNames)
      ? body.protecteeNames.map((name) => String(name).trim()).filter(Boolean)
      : []
    const securityType = body.securityType === 'unarmed' ? 'unarmed' : 'armed'
    if (!address) return null
    return {
      type,
      securityType,
      address,
      protectorCount,
      protecteeCount,
      protecteeNames,
    }
  }

  return null
}

async function createQuickServiceSystemMessage(
  supabase: ReturnType<typeof createServiceRoleClient>,
  booking: { id: string; booking_code: string; client_id: string },
  parsed: QuickServiceRequest,
) {
  const summary = buildQuickServiceChatSummary(parsed, booking.booking_code)
  const metadata = buildQuickServiceMessageMetadata(parsed, booking.booking_code)
  const messageData: Record<string, unknown> = {
    booking_id: booking.id,
    sender_id: booking.client_id,
    sender_type: 'system',
    recipient_id: booking.client_id,
    content: summary,
    message_type: 'system',
    metadata,
  }

  const { error } = await supabase.from('messages').insert(messageData)
  if (error) {
    console.warn('Quick service booking saved but system message failed:', error.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientId = await getAuthenticatedUserId()
    if (!clientId) {
      return NextResponse.json({ error: 'Please log in to send a quick service request.' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = parseBody(body)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid quick service request.' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const payload = buildQuickServiceBookingPayload(parsed, clientId)
    const { data, error } = await insertBookingWithFallback(supabase, payload)

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to send request' }, { status: 500 })
    }

    await createQuickServiceSystemMessage(
      supabase,
      {
        id: data.id,
        booking_code: data.booking_code,
        client_id: data.client_id,
      },
      parsed,
    )

    return NextResponse.json({
      success: true,
      data,
      booking_code: data.booking_code,
      message: 'Request sent to operator',
    })
  } catch (error) {
    console.error('Quick service POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
