import {
  parseQuickServiceFromBooking,
  type QuickServiceSpecial,
} from '@/lib/services/quick-service-bookings'

export type ActivityMapMode = 'trip' | 'site' | 'review'

const NON_ADDRESS_DESTINATIONS = new Set([
  'not specified',
  'tbd',
  'pending operator review',
  'home security assignment',
  'itinerary planning request',
  'quick service',
])

type ActivityBookingLike = {
  id?: string | null
  booking_code?: string | null
  pickupLocation?: string | null
  pickup_address?: string | null
  destination?: string | null
  destination_address?: string | null
  protectorName?: string | null
  type?: string | null
  service_type?: string | null
  special_instructions?: unknown
}

function pickupOf(booking: ActivityBookingLike): string {
  return (booking.pickupLocation || booking.pickup_address || '').trim()
}

function destinationOf(booking: ActivityBookingLike): string {
  return (booking.destination || booking.destination_address || '').trim()
}

function looksLikeQuickServiceCode(booking: ActivityBookingLike): boolean {
  const code = `${booking.booking_code || booking.id || ''}`.toUpperCase()
  return code.startsWith('QS')
}

function looksLikeItineraryPickup(pickup: string): boolean {
  const lower = pickup.toLowerCase()
  return (
    lower === 'itinerary planning request' ||
    lower.includes('itinerary planning') ||
    lower === 'quick service'
  )
}

function looksLikeHomeSecurityLabel(label: string): boolean {
  const lower = label.toLowerCase()
  return lower.includes('private home security') || lower.includes('home security')
}

function looksLikeItineraryLabel(label: string): boolean {
  const lower = label.toLowerCase()
  return lower.includes('plan your itinerary') || lower === "let's plan your itinerary"
}

function looksLikePersonNameDestination(destination: string): boolean {
  if (!destination) return false
  const lower = destination.toLowerCase()
  if (NON_ADDRESS_DESTINATIONS.has(lower)) return false
  if (lower.includes(',') && /\d/.test(destination)) return false
  if (lower.includes('street') || lower.includes('road') || lower.includes('avenue')) return false
  if (lower.includes('lagos') || lower.includes('abuja') || lower.includes('nigeria')) return false
  // Short name-like values: "john", "john, mary"
  const parts = destination.split(',').map((part) => part.trim()).filter(Boolean)
  return parts.length > 0 && parts.every((part) => part.split(/\s+/).length <= 3 && !/\d{3,}/.test(part))
}

function typeHint(booking: ActivityBookingLike): string {
  return `${booking.type || booking.service_type || ''}`.toLowerCase()
}

export function getQuickServiceFromBooking(booking: ActivityBookingLike): QuickServiceSpecial | null {
  const fromSpecial = parseQuickServiceFromBooking({
    special_instructions: booking.special_instructions as string | object | null | undefined,
    pickup_address: pickupOf(booking) || null,
  })
  if (fromSpecial) return fromSpecial

  const pickup = pickupOf(booking)
  const destination = destinationOf(booking)
  const label = `${booking.protectorName || ''}`
  const hint = typeHint(booking)

  if (
    hint === 'itinerary_planning' ||
    looksLikeItineraryPickup(pickup) ||
    looksLikeItineraryLabel(label)
  ) {
    return {
      quick_service_type: 'itinerary_planning',
      quick_service_label: "Let's Plan Your Itinerary",
      description: destination || 'Pending operator review',
      mode: 'protector_only',
    }
  }

  if (
    hint === 'home_security' ||
    hint === 'private_home_security' ||
    looksLikeHomeSecurityLabel(label)
  ) {
    return {
      quick_service_type: 'private_home_security',
      quick_service_label: 'Private Home Security',
      address: pickup,
      protectee_names:
        looksLikePersonNameDestination(destination)
          ? destination.split(',').map((name) => name.trim()).filter(Boolean)
          : [],
      mode: 'protector_only',
    }
  }

  // QS booking codes: only two Quick Service types exist.
  if (looksLikeQuickServiceCode(booking)) {
    if (looksLikeItineraryPickup(pickup)) {
      return {
        quick_service_type: 'itinerary_planning',
        quick_service_label: "Let's Plan Your Itinerary",
        description: destination || 'Pending operator review',
        mode: 'protector_only',
      }
    }

    return {
      quick_service_type: 'private_home_security',
      quick_service_label: 'Private Home Security',
      address: pickup,
      protectee_names:
        looksLikePersonNameDestination(destination)
          ? destination.split(',').map((name) => name.trim()).filter(Boolean)
          : [],
      mode: 'protector_only',
    }
  }

  return null
}

export function getActivityMapMode(booking: ActivityBookingLike): ActivityMapMode {
  const quick = getQuickServiceFromBooking(booking)
  let mode: ActivityMapMode = !quick
    ? 'trip'
    : quick.quick_service_type === 'itinerary_planning'
      ? 'review'
      : quick.quick_service_type === 'private_home_security'
        ? 'site'
        : 'trip'

  // Normal bookings that stored a name (e.g. "hy", "john") as destination cannot
  // form a valid A→B route — show a single pin at pickup instead of geocoding the name.
  if (mode === 'trip') {
    const destination = destinationOf(booking)
    const pickup = pickupOf(booking)
    if (
      looksLikePersonNameDestination(destination) &&
      pickup &&
      !NON_ADDRESS_DESTINATIONS.has(pickup.toLowerCase()) &&
      !looksLikePersonNameDestination(pickup)
    ) {
      mode = 'site'
    }
  }

  return mode
}

export function shouldGeocodeDestination(booking: ActivityBookingLike): boolean {
  if (getActivityMapMode(booking) !== 'trip') return false

  const destination = destinationOf(booking)
  if (!destination) return false
  if (NON_ADDRESS_DESTINATIONS.has(destination.toLowerCase())) return false

  // Never geocode name-like destinations (protectee names, typos like "hy").
  if (looksLikePersonNameDestination(destination)) return false

  const quick = getQuickServiceFromBooking(booking)
  if (quick?.protectee_names?.length) {
    const normalizedDestination = destination.toLowerCase()
    if (quick.protectee_names.some((name) => name.toLowerCase() === normalizedDestination)) return false
    if (quick.protectee_names.join(', ').toLowerCase() === normalizedDestination) return false
  }

  return true
}

export function resolveSiteMapAddress(booking: ActivityBookingLike): string | null {
  const quick = getQuickServiceFromBooking(booking)
  if (quick?.quick_service_type === 'private_home_security') {
    const address = quick.address?.trim() || pickupOf(booking)
    if (!address || NON_ADDRESS_DESTINATIONS.has(address.toLowerCase())) return null
    return address
  }

  const pickup = pickupOf(booking)
  if (!pickup || NON_ADDRESS_DESTINATIONS.has(pickup.toLowerCase())) return null
  return pickup
}

export function isQuickServiceBooking(booking: ActivityBookingLike): boolean {
  return Boolean(getQuickServiceFromBooking(booking))
}
