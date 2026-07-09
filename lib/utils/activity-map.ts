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
])

export function getQuickServiceFromBooking(booking: {
  special_instructions?: unknown
}): QuickServiceSpecial | null {
  if (!booking.special_instructions) return null

  if (typeof booking.special_instructions === 'object') {
    const parsed = booking.special_instructions as QuickServiceSpecial
    if (parsed?.quick_service_type) return parsed
  }

  if (typeof booking.special_instructions === 'string') {
    return parseQuickServiceFromBooking({ special_instructions: booking.special_instructions })
  }

  return null
}

export function getActivityMapMode(booking: {
  special_instructions?: unknown
}): ActivityMapMode {
  const quick = getQuickServiceFromBooking(booking)
  if (!quick) return 'trip'
  if (quick.quick_service_type === 'itinerary_planning') return 'review'
  if (quick.quick_service_type === 'private_home_security') return 'site'
  return 'trip'
}

export function shouldGeocodeDestination(booking: {
  destination?: string | null
  special_instructions?: unknown
}): boolean {
  if (getActivityMapMode(booking) !== 'trip') return false

  const destination = booking.destination?.trim()
  if (!destination) return false
  if (NON_ADDRESS_DESTINATIONS.has(destination.toLowerCase())) return false

  const quick = getQuickServiceFromBooking(booking)
  if (quick?.protectee_names?.length) {
    const normalizedDestination = destination.toLowerCase()
    if (quick.protectee_names.some((name) => name.toLowerCase() === normalizedDestination)) return false
    if (quick.protectee_names.join(', ').toLowerCase() === normalizedDestination) return false
  }

  return true
}

export function resolveSiteMapAddress(booking: {
  pickupLocation?: string | null
  special_instructions?: unknown
}): string | null {
  const quick = getQuickServiceFromBooking(booking)
  if (quick?.quick_service_type === 'private_home_security') {
    const address = quick.address?.trim() || booking.pickupLocation?.trim()
    if (!address || NON_ADDRESS_DESTINATIONS.has(address.toLowerCase())) return null
    return address
  }

  const pickup = booking.pickupLocation?.trim()
  if (!pickup || NON_ADDRESS_DESTINATIONS.has(pickup.toLowerCase())) return null
  return pickup
}

export function isQuickServiceBooking(booking: { special_instructions?: unknown }): boolean {
  return Boolean(getQuickServiceFromBooking(booking))
}
