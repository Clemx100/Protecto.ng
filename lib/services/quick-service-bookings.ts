import type { QuickServiceRequest } from '@/lib/types/quick-services'

const DEFAULT_SERVICE_ID = 'd5bcc8bd-a566-4094-8ac9-d25b7b356834'

export type QuickServiceSpecial = {
  quick_service_type: QuickServiceRequest['type']
  quick_service_label: string
  description?: string
  itinerary_file_url?: string | null
  itinerary_file_name?: string | null
  security_type?: 'armed' | 'unarmed'
  address?: string
  protector_count?: number
  protectee_count?: number
  protectee_names?: string[]
  mode?: string
}

function buildSpecialInstructions(request: QuickServiceRequest): QuickServiceSpecial {
  if (request.type === 'itinerary_planning') {
    return {
      quick_service_type: request.type,
      quick_service_label: "Let's Plan Your Itinerary",
      description: request.description.trim(),
      itinerary_file_url: request.itineraryFileUrl || null,
      itinerary_file_name: request.itineraryFileName || null,
      mode: 'protector_only',
    }
  }

  return {
    quick_service_type: request.type,
    quick_service_label: 'Private Home Security',
    security_type: request.securityType,
    address: request.address.trim(),
    protector_count: request.protectorCount,
    protectee_count: request.protecteeCount,
    protectee_names: request.protecteeNames.filter(Boolean),
    mode: 'protector_only',
  }
}

export function buildQuickServiceChatSummary(
  request: QuickServiceRequest,
  bookingCode: string,
): string {
  if (request.type === 'itinerary_planning') {
    return `Itinerary request sent · Ref ${bookingCode}`
  }

  return `Home security request sent · Ref ${bookingCode}`
}

export type QuickServiceMessageMetadata = {
  quick_service_type: QuickServiceRequest['type']
  quick_service_label: string
  booking_code: string
  description?: string
  itinerary_file_name?: string | null
  itinerary_file_url?: string | null
  security_type?: 'armed' | 'unarmed'
  address?: string
  protector_count?: number
  protectee_count?: number
  protectee_names?: string[]
}

export function buildQuickServiceMessageMetadata(
  request: QuickServiceRequest,
  bookingCode: string,
): QuickServiceMessageMetadata {
  if (request.type === 'itinerary_planning') {
    return {
      quick_service_type: request.type,
      quick_service_label: "Let's Plan Your Itinerary",
      booking_code: bookingCode,
      description: request.description.trim(),
      itinerary_file_name: request.itineraryFileName,
      itinerary_file_url: request.itineraryFileUrl,
    }
  }

  return {
    quick_service_type: request.type,
    quick_service_label: 'Private Home Security',
    booking_code: bookingCode,
    security_type: request.securityType,
    address: request.address.trim(),
    protector_count: request.protectorCount,
    protectee_count: request.protecteeCount,
    protectee_names: request.protecteeNames.filter(Boolean),
  }
}

export function buildQuickServiceMessageMetadataFromSpecial(
  special: QuickServiceSpecial,
  bookingCode: string,
): QuickServiceMessageMetadata {
  if (special.quick_service_type === 'itinerary_planning') {
    return buildQuickServiceMessageMetadata(
      {
        type: 'itinerary_planning',
        description: special.description || 'Pending operator review',
        itineraryFileUrl: special.itinerary_file_url,
        itineraryFileName: special.itinerary_file_name,
      },
      bookingCode,
    )
  }

  return buildQuickServiceMessageMetadata(
    {
      type: 'private_home_security',
      securityType: special.security_type === 'unarmed' ? 'unarmed' : 'armed',
      address: special.address || '',
      protectorCount: special.protector_count || 1,
      protecteeCount: special.protectee_count || 1,
      protecteeNames: special.protectee_names || [],
    },
    bookingCode,
  )
}

export function buildQuickServiceChatSummaryFromSpecial(
  special: QuickServiceSpecial,
  bookingCode: string,
): string {
  if (special.quick_service_type === 'itinerary_planning') {
    return buildQuickServiceChatSummary(
      {
        type: 'itinerary_planning',
        description: special.description || 'Pending operator review',
        itineraryFileUrl: special.itinerary_file_url,
        itineraryFileName: special.itinerary_file_name,
      },
      bookingCode,
    )
  }

  return buildQuickServiceChatSummary(
    {
      type: 'private_home_security',
      securityType: special.security_type === 'unarmed' ? 'unarmed' : 'armed',
      address: special.address || '',
      protectorCount: special.protector_count || 1,
      protecteeCount: special.protectee_count || 1,
      protecteeNames: special.protectee_names || [],
    },
    bookingCode,
  )
}

export function buildQuickServiceBookingPayload(request: QuickServiceRequest, clientId: string) {
  const bookingCode = `QS${Date.now()}`
  const special = buildSpecialInstructions(request)

  if (request.type === 'itinerary_planning') {
    return {
      booking_code: bookingCode,
      client_id: clientId,
      service_id: DEFAULT_SERVICE_ID,
      service_type: 'armed_protection',
      booking_mode: 'protector_only',
      protector_count: 0,
      protectee_count: 1,
      dress_code: 'tactical_casual',
      duration_hours: 4,
      pickup_address: 'Itinerary planning request',
      pickup_coordinates: '(6.5244,3.3792)',
      destination_address: request.description.trim().slice(0, 240) || 'Pending operator review',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '12:00:00',
      base_price: 0,
      total_price: 0,
      special_instructions: JSON.stringify(special),
      emergency_contact: 'N/A',
      emergency_phone: 'N/A',
      status: 'pending',
      kyc_status: 'pending',
      approval_status: 'pending',
    }
  }

  const armed = request.securityType === 'armed'

  return {
    booking_code: bookingCode,
    client_id: clientId,
    service_id: DEFAULT_SERVICE_ID,
    service_type: armed ? 'armed_protection' : 'unarmed_protection',
    booking_mode: 'protector_only',
    protector_count: request.protectorCount,
    protectee_count: request.protecteeCount,
    dress_code: 'tactical_casual',
    duration_hours: 8,
    pickup_address: request.address.trim(),
    pickup_coordinates: '(6.5244,3.3792)',
    destination_address: request.protecteeNames.filter(Boolean).join(', ') || 'Home security assignment',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '12:00:00',
    base_price: 0,
    total_price: 0,
    special_instructions: JSON.stringify(special),
    emergency_contact: 'N/A',
    emergency_phone: 'N/A',
    status: 'pending',
    kyc_status: 'pending',
    approval_status: 'pending',
  }
}

export function parseQuickServiceFromBooking(booking: {
  special_instructions?: string | null
  pickup_address?: string | null
}) {
  if (!booking.special_instructions) return null
  try {
    const parsed = JSON.parse(booking.special_instructions)
    if (!parsed?.quick_service_type) return null
    return parsed as QuickServiceSpecial
  } catch {
    return null
  }
}
