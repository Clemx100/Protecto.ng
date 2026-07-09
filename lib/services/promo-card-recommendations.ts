import { isVehicleBooking } from '@/lib/utils/booking-display'
import {
  filterInsightsForCity,
  type CityInsight,
} from '@/lib/utils/city-insights'

export const PROMO_CARD_ROTATE_MS = 70_000

export type PromoCardCategory = 'protector' | 'vehicle'

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

function preferredCategory(ctx: PromoUserContext): PromoCardCategory | null {
  const upcoming = getUpcomingBookings(ctx)
  if (upcoming.length > 0) {
    const next = upcoming[0]
    return isVehicleBooking(next) ? 'vehicle' : 'protector'
  }

  const history = ctx.bookingHistory || []
  const recentVehicle = history.slice(0, 3).filter((b) => isVehicleBooking(b)).length
  const recentProtector = history.slice(0, 3).filter((b) => !isVehicleBooking(b)).length
  if (recentVehicle > recentProtector) return 'vehicle'
  if (recentProtector > recentVehicle) return 'protector'
  return null
}

function filterCardsForLocation(insights: CityInsight[], city: string): CityInsight[] {
  return filterInsightsForCity(insights, city)
}

function buildHeadline(card: CityInsight, ctx: PromoUserContext): string {
  const adminHeadline = card.headline?.trim()
  const upcoming = getUpcomingBookings(ctx)
  const now = ctx.now || new Date()
  const category = (card.card_category || 'protector') as PromoCardCategory
  const nextRelevant = upcoming.find((b) =>
    category === 'vehicle' ? isVehicleBooking(b) : !isVehicleBooking(b),
  )

  if (category === 'vehicle') {
    if (nextRelevant) return 'Book a Vehicle for your upcoming trip'
    if (hasBookingToday(ctx) || (isOutingHours(now) && isWeekend(now))) {
      return 'Going out today? Book secure transport'
    }
    return adminHeadline || `Book a Vehicle in ${card.city_name}`
  }

  if (nextRelevant) {
    const dest = nextRelevant.destination?.trim()
    if (dest) return `Book a Protector for your trip to ${dest}`
    return 'Book a Protector for your upcoming event'
  }
  if (hasBookingToday(ctx) || (isOutingHours(now) && isWeekend(now))) {
    return 'Going out today? Book a Protector'
  }
  if (isOutingHours(now)) {
    return 'Book a Protector for your outing'
  }
  return adminHeadline || `Protector in ${card.city_name}`
}

function buildSubline(card: CityInsight): string {
  if (card.description?.trim()) return card.description.trim()
  return card.metrics_label
}

function scoreCard(card: CityInsight, ctx: PromoUserContext, cityCards: CityInsight[]): number {
  let score = 0
  const now = ctx.now || new Date()
  const category = (card.card_category || 'protector') as PromoCardCategory
  const preferred = preferredCategory(ctx)

  if (cityCards.some((row) => row.id === card.id)) score += 60
  if (card.is_default) score += 10
  score += Math.max(0, 20 - Number(card.sort_order || 0))

  if (preferred === category) score += 35
  if (hasBookingToday(ctx)) score += category === preferred ? 15 : 5
  if (isOutingHours(now)) score += category === 'protector' ? 8 : 5
  if (isWeekend(now)) score += category === 'protector' ? 6 : 4

  const upcoming = getUpcomingBookings(ctx)
  if (upcoming.some((b) => (category === 'vehicle' ? isVehicleBooking(b) : !isVehicleBooking(b)))) {
    score += 25
  }

  return score
}

export function rankPromoCards(insights: CityInsight[], ctx: PromoUserContext): ScoredPromoCard[] {
  const active = insights.filter((row) => row.is_active !== false)
  if (!active.length) return []

  const city = ctx.userLocation?.trim() || 'Lagos'
  const cityCards = filterCardsForLocation(active, city)
  const pool = cityCards.length >= 2 ? cityCards : active

  const scored = pool.map((card) => ({
    card,
    score: scoreCard(card, ctx, cityCards),
    headline: buildHeadline(card, ctx),
    subline: buildSubline(card),
  }))

  scored.sort((a, b) => b.score - a.score)
  return scored
}

export function getPromoCardAtIndex(scored: ScoredPromoCard[], index: number): ScoredPromoCard | null {
  if (!scored.length) return null
  return scored[index % scored.length]
}
