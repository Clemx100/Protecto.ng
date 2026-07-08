export type SuggestionActionType =
  | 'book_protector'
  | 'book_vehicle'
  | 'book_mail'
  | 'repeat_last'
  | 'track_booking'

export type SuggestionConfidence = 'low' | 'medium' | 'high'

export interface BookingSuggestionPrefill {
  serviceType?: 'armed-protection' | 'car-only'
  pickup?: string
  destination?: string
  duration?: string
  bookingId?: string
}

export interface BookingSuggestion {
  id: string
  title: string
  reason: string
  confidence: SuggestionConfidence
  actionType: SuggestionActionType
  prefill?: BookingSuggestionPrefill
  isPrimary?: boolean
}

export interface RecommendationBookingSnapshot {
  id: string
  pickupLocation: string
  destination?: string
  status: string
  type: string
  service_type?: string
  date: string
  duration: string
  scheduled_date?: string
}

export interface RecommendationInput {
  isLoggedIn: boolean
  userLocation: string
  activeBookings: RecommendationBookingSnapshot[]
  bookingHistory: RecommendationBookingSnapshot[]
  now?: Date
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

function parseBookingDate(booking: RecommendationBookingSnapshot): Date | null {
  const raw = booking.scheduled_date || booking.date
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isWithinLast90Days(booking: RecommendationBookingSnapshot, now: Date): boolean {
  const parsed = parseBookingDate(booking)
  if (!parsed) return true
  return now.getTime() - parsed.getTime() <= NINETY_DAYS_MS
}

function inferServiceType(booking: RecommendationBookingSnapshot): 'armed-protection' | 'car-only' {
  const raw = `${booking.service_type || ''} ${booking.type || ''}`.toLowerCase()
  if (raw.includes('car') || raw.includes('vehicle') || raw.includes('armored_vehicle')) {
    return 'car-only'
  }
  return 'armed-protection'
}

function buildRepeatSuggestion(
  booking: RecommendationBookingSnapshot,
  now: Date
): BookingSuggestion {
  const serviceType = inferServiceType(booking)
  const destination = booking.destination && booking.destination !== 'TBD' ? booking.destination : undefined
  const pickup =
    booking.pickupLocation && booking.pickupLocation !== 'TBD' ? booking.pickupLocation : undefined

  return {
    id: `repeat-${booking.id}`,
    title: serviceType === 'car-only' ? 'Book vehicle again' : 'Book protector again',
    reason: pickup
      ? `Based on your last trip from ${pickup}${destination ? ` to ${destination}` : ''}`
      : 'Based on your recent booking pattern',
    confidence: 'high',
    actionType: 'repeat_last',
    isPrimary: true,
    prefill: {
      serviceType,
      pickup,
      destination,
      duration: booking.duration && booking.duration !== 'TBD' ? booking.duration : '1 day',
      bookingId: booking.id,
    },
  }
}

function buildTimeBasedSuggestion(now: Date, userLocation: string): BookingSuggestion | null {
  const hour = now.getHours()
  const day = now.getDay()
  const isWeekday = day >= 1 && day <= 5

  if (isWeekday && hour >= 5 && hour < 11) {
    return {
      id: 'time-morning-airport',
      title: 'Airport or meeting pickup',
      reason: `Morning travel in ${userLocation} — book ahead for a smooth pickup`,
      confidence: 'medium',
      actionType: 'book_protector',
      prefill: { serviceType: 'armed-protection', duration: '4 hours' },
    }
  }

  if (hour >= 17 && hour < 23) {
    return {
      id: 'time-evening-return',
      title: 'Evening city movement',
      reason: 'Plan your return trip or evening movement now',
      confidence: 'medium',
      actionType: 'book_vehicle',
      prefill: { serviceType: 'car-only', duration: '1 day' },
    }
  }

  return null
}

function buildGuestDefaults(userLocation: string): BookingSuggestion[] {
  const city = userLocation || 'Lagos'
  return [
    {
      id: 'guest-protector',
      title: 'Book a protector',
      reason: `Popular in ${city} for meetings and personal escort`,
      confidence: 'medium',
      actionType: 'book_protector',
      isPrimary: true,
      prefill: { serviceType: 'armed-protection', duration: '1 day' },
    },
    {
      id: 'guest-vehicle',
      title: 'Rent a vehicle',
      reason: `Flexible rental options in ${city}`,
      confidence: 'low',
      actionType: 'book_vehicle',
      prefill: { serviceType: 'car-only', duration: '1 day' },
    },
    {
      id: 'guest-mail',
      title: 'Book via email',
      reason: 'Send your request and our team will confirm details',
      confidence: 'low',
      actionType: 'book_mail',
    },
  ]
}

export function getBookingRecommendations(input: RecommendationInput): BookingSuggestion[] {
  const now = input.now ?? new Date()
  const suggestions: BookingSuggestion[] = []
  const city = input.userLocation || 'Lagos'

  if (input.activeBookings.length > 0) {
    const active = input.activeBookings[0]
    suggestions.push({
      id: `track-${active.id}`,
      title: 'Track current booking',
      reason: `Your ${active.type || 'booking'} is ${active.status || 'in progress'}`,
      confidence: 'high',
      actionType: 'track_booking',
      isPrimary: true,
      prefill: { bookingId: active.id },
    })
  }

  const recentHistory = input.bookingHistory.filter((booking) => isWithinLast90Days(booking, now))
  if (input.isLoggedIn && recentHistory.length > 0) {
    suggestions.push(buildRepeatSuggestion(recentHistory[0], now))
  }

  const timeSuggestion = buildTimeBasedSuggestion(now, city)
  if (timeSuggestion && suggestions.length < 3) {
    const duplicate = suggestions.some((s) => s.actionType === timeSuggestion.actionType)
    if (!duplicate) suggestions.push(timeSuggestion)
  }

  if (!input.isLoggedIn || (input.isLoggedIn && suggestions.length === 0)) {
    return buildGuestDefaults(city).slice(0, 3)
  }

  if (suggestions.length < 3) {
    suggestions.push({
      id: 'fallback-mail',
      title: 'Need help choosing?',
      reason: 'Book via email and we will recommend the best option',
      confidence: 'low',
      actionType: 'book_mail',
    })
  }

  const unique = suggestions.filter(
    (item, index, arr) => arr.findIndex((s) => s.id === item.id) === index
  )

  if (!unique.some((s) => s.isPrimary) && unique.length > 0) {
    unique[0].isPrimary = true
  }

  return unique.slice(0, 3)
}

export function logSuggestionEvent(
  event: 'impression' | 'click',
  suggestion: BookingSuggestion
): void {
  if (typeof window === 'undefined') return
  console.log(`[Suggestions] ${event}:`, {
    id: suggestion.id,
    actionType: suggestion.actionType,
    confidence: suggestion.confidence,
  })
}
