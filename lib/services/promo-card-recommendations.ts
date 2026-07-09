import { isVehicleBooking, parseBookingSpecialInstructions } from '@/lib/utils/booking-display'
import {
  filterInsightsForCity,
  normalizeCardCategory,
  type CityInsight,
  type PromoCardCategory,
} from '@/lib/utils/city-insights'

export const PROMO_CARD_ROTATE_MS = 70_000

export type { PromoCardCategory }

export type PromoBookingSignal = {
  id?: string
  status: string
  service_type?: string
  booking_mode?: string
  scheduled_date?: string
  scheduled_time?: string
  date?: string
  pickupLocation?: string
  destination?: string
  type?: string
  special_instructions?: unknown
}

export type PromoUserContext = {
  userLocation: string
  clientName?: string
  activeBookings?: PromoBookingSignal[]
  bookingHistory?: PromoBookingSignal[]
  now?: Date
}

export type ScoredPromoCard = {
  card: CityInsight
  score: number
  headline: string
  subline: string
}

const BULLETPROOF_VEHICLE_IDS = new Set(['armoredsedan', 'armoredsuv', 'escalade', 'sedan'])
const AIRPORT_PATTERN = /airport|mmia|naia|muritala|nnamdi|abuja airport|mma/i

function parseBookingDate(booking: PromoBookingSignal): Date | null {
  const raw = booking.scheduled_date || booking.date
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isActiveStatus(status: string) {
  const normalized = status.toLowerCase()
  return !normalized.includes('cancel') && !normalized.includes('completed')
}

function isBulletproofVehicleBooking(booking: PromoBookingSignal): boolean {
  if (!isVehicleBooking(booking)) return false

  const parsed = parseBookingSpecialInstructions(booking.special_instructions)
  const vehicles = parsed?.vehicles
  if (vehicles && Object.values(vehicles).some((count) => Number(count) > 0)) {
    return Object.entries(vehicles).some(
      ([id, count]) => Number(count) > 0 && BULLETPROOF_VEHICLE_IDS.has(id.toLowerCase()),
    )
  }

  const service = `${booking.service_type || booking.type || ''}`.toLowerCase()
  return service.includes('armored') || service.includes('bulletproof')
}

function inferBookingCategory(booking: PromoBookingSignal): PromoCardCategory {
  if (!isVehicleBooking(booking)) return 'protector'
  return isBulletproofVehicleBooking(booking) ? 'bulletproof_vehicle' : 'vehicle'
}

function getUpcomingBookings(ctx: PromoUserContext): PromoBookingSignal[] {
  const now = ctx.now || new Date()
  const horizon = new Date(now)
  horizon.setDate(horizon.getDate() + 14)

  const pool = [...(ctx.activeBookings || []), ...(ctx.bookingHistory || [])]
  const seen = new Set<string>()

  return pool.filter((booking) => {
    const key = booking.id || `${booking.date}-${booking.pickupLocation}`
    if (seen.has(key)) return false
    seen.add(key)

    const when = parseBookingDate(booking)
    if (!when) return isActiveStatus(booking.status)
    return when >= new Date(now.toDateString()) && when <= horizon
  })
}

function hasBookingToday(ctx: PromoUserContext) {
  const today = (ctx.now || new Date()).toDateString()
  return getUpcomingBookings(ctx).some((booking) => {
    const when = parseBookingDate(booking)
    return when?.toDateString() === today
  })
}

function isWeekend(date: Date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function isOutingHours(date: Date) {
  const hour = date.getHours()
  return hour >= 8 && hour <= 22
}

function isMorningTravelWindow(date: Date) {
  const hour = date.getHours()
  return hour >= 5 && hour < 12
}

function isEveningTravelWindow(date: Date) {
  const hour = date.getHours()
  return hour >= 15 && hour < 23
}

function mentionsAirport(...values: Array<string | undefined>) {
  return values.some((value) => value && AIRPORT_PATTERN.test(value))
}

function hasAirportTrip(ctx: PromoUserContext) {
  return getUpcomingBookings(ctx).some(
    (booking) =>
      mentionsAirport(booking.pickupLocation, booking.destination) ||
      inferBookingCategory(booking) === 'vehicle',
  )
}

function preferredCategory(ctx: PromoUserContext): PromoCardCategory | null {
  const upcoming = getUpcomingBookings(ctx)
  if (upcoming.length > 0) {
    return inferBookingCategory(upcoming[0])
  }

  const history = ctx.bookingHistory || []
  const recent = history.slice(0, 5)
  const scores: Record<PromoCardCategory, number> = {
    protector: 0,
    vehicle: 0,
    bulletproof_vehicle: 0,
  }

  for (const booking of recent) {
    scores[inferBookingCategory(booking)] += 1
  }

  const ranked = (Object.entries(scores) as Array<[PromoCardCategory, number]>).sort(
    (a, b) => b[1] - a[1],
  )
  if (ranked[0][1] === 0) return null
  if (ranked[0][1] === ranked[1]?.[1]) return null
  return ranked[0][0]
}

function filterCardsForLocation(insights: CityInsight[], city: string): CityInsight[] {
  return filterInsightsForCity(insights, city)
}

function bookingMatchesCategory(booking: PromoBookingSignal, category: PromoCardCategory): boolean {
  return inferBookingCategory(booking) === category
}

function defaultCategoryHeadline(category: PromoCardCategory, cityName: string): string {
  if (category === 'bulletproof_vehicle') {
    return `Book a Bulletproof Vehicle in ${cityName}`
  }
  if (category === 'vehicle') {
    return `Book a Vehicle in ${cityName}`
  }
  return `Book a Protector in ${cityName}`
}

function adminHeadlineMatchesCategory(headline: string, category: PromoCardCategory): boolean {
  const lower = headline.toLowerCase()
  if (category === 'bulletproof_vehicle') {
    return lower.includes('bulletproof') || lower.includes('armored')
  }
  if (category === 'vehicle') {
    return (
      (lower.includes('vehicle') || lower.includes('chauffeur') || lower.includes('transport')) &&
      !lower.includes('bulletproof') &&
      !lower.includes('armored')
    )
  }
  return lower.includes('protector') || lower.includes('protection') || lower.includes('security')
}

function buildHeadline(card: CityInsight, ctx: PromoUserContext): string {
  const upcoming = getUpcomingBookings(ctx)
  const now = ctx.now || new Date()
  const category = normalizeCardCategory(card.card_category)
  const cityName = card.city_name || ctx.userLocation || 'Lagos'
  const adminHeadline = card.headline?.trim()
  const nextRelevant = upcoming.find((booking) => bookingMatchesCategory(booking, category))
  const airportTrip =
    nextRelevant &&
    mentionsAirport(nextRelevant.pickupLocation, nextRelevant.destination)

  if (category === 'bulletproof_vehicle') {
    if (nextRelevant && airportTrip) {
      return `Book a Bulletproof Vehicle for your airport trip in ${cityName}`
    }
    if (nextRelevant) return `Book a Bulletproof Vehicle for your upcoming trip`
    if (hasBookingToday(ctx)) return `Going out today? Book a Bulletproof Vehicle`
    if (isOutingHours(now) && isWeekend(now)) {
      return `Weekend movement? Travel protected in ${cityName}`
    }
    return defaultCategoryHeadline(category, cityName)
  }

  if (category === 'vehicle') {
    if (nextRelevant && airportTrip) {
      return `Need an airport pickup in ${cityName}?`
    }
    if (isMorningTravelWindow(now) || (nextRelevant && mentionsAirport(nextRelevant.destination))) {
      return `Get to the airport on time from ${cityName}`
    }
    if (nextRelevant) return `Book a Vehicle for your upcoming trip`
    if (hasBookingToday(ctx) || (isOutingHours(now) && isWeekend(now))) {
      return `Going out today? Book a chauffeur in ${cityName}`
    }
    return defaultCategoryHeadline(category, cityName)
  }

  if (nextRelevant) {
    const dest = nextRelevant.destination?.trim()
    if (dest && dest !== 'Not specified' && dest !== 'TBD') {
      return `Book a Protector for your trip to ${dest}`
    }
    return 'Book a Protector for your upcoming event'
  }
  if (hasBookingToday(ctx) || (isOutingHours(now) && isWeekend(now))) {
    return 'Going out today? Book a Protector'
  }
  if (isOutingHours(now)) {
    return `Book a Protector for your outing in ${cityName}`
  }

  if (adminHeadline && adminHeadlineMatchesCategory(adminHeadline, category)) {
    return adminHeadline
  }

  return defaultCategoryHeadline(category, cityName)
}

function buildContextualTip(card: CityInsight, ctx: PromoUserContext): string {
  const category = normalizeCardCategory(card.card_category)
  const now = ctx.now || new Date()
  const cityName = card.city_name || ctx.userLocation || 'Lagos'
  const upcoming = getUpcomingBookings(ctx)
  const nextRelevant = upcoming.find((booking) => bookingMatchesCategory(booking, category))
  const airportTrip =
    nextRelevant &&
    mentionsAirport(nextRelevant.pickupLocation, nextRelevant.destination)

  if (category === 'bulletproof_vehicle') {
    if (airportTrip) {
      return 'Armored airport transfers reduce exposure during high-traffic pickup and drop-off windows.'
    }
    if (isEveningTravelWindow(now)) {
      return 'Night movement carries higher risk — bulletproof vehicles add a critical layer of protection.'
    }
    return `B6/B7-rated vehicles and trained drivers for secure movement across ${cityName}.`
  }

  if (category === 'vehicle') {
    if (airportTrip || isMorningTravelWindow(now)) {
      return 'Need an airport pickup? Arrive relaxed with a professional chauffeur waiting for you.'
    }
    if (isEveningTravelWindow(now)) {
      return 'Flying out soon? Book a vehicle to get you to the airport on time, every time.'
    }
    if (hasAirportTrip(ctx)) {
      return 'Punctual chauffeur service for airport runs, meetings, and city-to-city travel.'
    }
    return `Executive vehicles with vetted drivers — comfortable, discreet, and on schedule in ${cityName}.`
  }

  if (airportTrip) {
    return 'Meetings or flights ahead? A protector helps you move confidently through busy terminals and traffic.'
  }
  if (hasBookingToday(ctx)) {
    return 'Stay covered for errands, events, and social plans with a protector close by.'
  }
  if (isWeekend(now)) {
    return 'Weekend outings deserve proactive security — book a protector before you step out.'
  }
  return `Licensed protectors for events, meetings, and daily movement across ${cityName}.`
}

function buildSubline(card: CityInsight, ctx: PromoUserContext): string {
  const tip = buildContextualTip(card, ctx)
  const adminDesc = card.description?.trim()
  const responseLabel = card.response_time_label?.trim()

  if (adminDesc && adminDesc.length > 12 && !adminDesc.toLowerCase().includes('avg mission')) {
    return `${tip} • ${adminDesc}`
  }

  if (responseLabel) {
    return `${tip} • Avg response ${responseLabel}`
  }

  return tip
}

function scoreCard(card: CityInsight, ctx: PromoUserContext, cityCards: CityInsight[]): number {
  let score = 0
  const now = ctx.now || new Date()
  const category = normalizeCardCategory(card.card_category)
  const preferred = preferredCategory(ctx)

  if (cityCards.some((row) => row.id === card.id)) score += 60
  if (card.is_default) score += 10
  score += Math.max(0, 20 - Number(card.sort_order || 0))

  if (preferred === category) score += 35
  if (hasBookingToday(ctx)) score += category === preferred ? 15 : 5
  if (isOutingHours(now)) {
    if (category === 'protector') score += 8
    else if (category === 'bulletproof_vehicle') score += 7
    else score += 5
  }
  if (isWeekend(now)) {
    if (category === 'protector') score += 6
    else if (category === 'bulletproof_vehicle') score += 5
    else score += 4
  }

  if (isMorningTravelWindow(now) && category === 'vehicle') score += 10
  if (isEveningTravelWindow(now) && (category === 'vehicle' || category === 'bulletproof_vehicle')) {
    score += 8
  }
  if (hasAirportTrip(ctx) && category !== 'protector') score += 6

  const upcoming = getUpcomingBookings(ctx)
  if (upcoming.some((booking) => bookingMatchesCategory(booking, category))) {
    score += 25
  }

  return score
}

export function rankPromoCards(insights: CityInsight[], ctx: PromoUserContext): ScoredPromoCard[] {
  const active = insights.filter((row) => row.is_active !== false)
  if (!active.length) return []

  const city = ctx.userLocation?.trim() || 'Lagos'
  const cityCards = filterCardsForLocation(active, city)
  const pool = cityCards.length >= 1 ? cityCards : active

  const scored = pool.map((card) => ({
    card,
    score: scoreCard(card, ctx, cityCards),
    headline: buildHeadline(card, ctx),
    subline: buildSubline(card, ctx),
  }))

  scored.sort((a, b) => b.score - a.score)
  return scored
}

export function getPromoCardAtIndex(scored: ScoredPromoCard[], index: number): ScoredPromoCard | null {
  if (!scored.length) return null
  return scored[index % scored.length]
}
