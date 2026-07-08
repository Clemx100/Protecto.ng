const PENDING_PREFIX = "protector_ng_pending_bookings_"

export type PendingBookingRecord = {
  id: string
  booking_code: string
  type: string
  status: string
  pickupLocation: string
  destination?: string
  date?: string
  startTime?: string
  duration?: string
  cost: string
  protectorName?: string
  vehicleType?: string
  service_type?: string
  booking_mode?: string
  protector_count?: number
  protectorImage?: string
  dressCode?: string
  special_instructions?: unknown
  isPendingSync?: boolean
  savedAt: string
}

function storageKey(userId: string) {
  return `${PENDING_PREFIX}${userId}`
}

export function getPendingBookings(userId: string): PendingBookingRecord[] {
  if (typeof window === "undefined" || !userId) return []

  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function savePendingBooking(userId: string, booking: PendingBookingRecord) {
  if (typeof window === "undefined" || !userId) return

  const existing = getPendingBookings(userId).filter(
    (item) => item.id !== booking.id && item.booking_code !== booking.booking_code,
  )
  localStorage.setItem(storageKey(userId), JSON.stringify([booking, ...existing]))
}

export function removePendingBooking(userId: string, bookingKey: string) {
  if (typeof window === "undefined" || !userId || !bookingKey) return

  const next = getPendingBookings(userId).filter(
    (item) => item.id !== bookingKey && item.booking_code !== bookingKey,
  )
  localStorage.setItem(storageKey(userId), JSON.stringify(next))
}

export function isPendingBookingId(id: string | undefined | null): boolean {
  if (!id) return false
  return String(id).startsWith("REQ")
}

export function mergePendingWithActive<T extends { id: string; booking_code?: string }>(
  userId: string,
  serverActive: T[],
  inMemoryActive: T[] = [],
): T[] {
  const pending = getPendingBookings(userId) as unknown as T[]
  const serverIds = new Set(serverActive.map((booking) => booking.id))
  const serverCodes = new Set(
    serverActive.map((booking) => booking.booking_code).filter(Boolean) as string[],
  )

  const unsyncedPending = pending.filter(
    (booking) =>
      !serverIds.has(booking.id) &&
      !(booking.booking_code && serverCodes.has(booking.booking_code)),
  )

  const unsyncedMemory = inMemoryActive.filter(
    (booking) =>
      isPendingBookingId(booking.id) &&
      !serverIds.has(booking.id) &&
      !(booking.booking_code && serverCodes.has(booking.booking_code)),
  )

  const merged = [...unsyncedPending, ...unsyncedMemory, ...serverActive]
  const seen = new Set<string>()

  return merged.filter((booking) => {
    const key = booking.booking_code || booking.id
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
