export type PromoCardCategory = 'protector' | 'vehicle' | 'bulletproof_vehicle'

export const PROMO_CARD_CATEGORY_LABELS: Record<PromoCardCategory, string> = {
  protector: 'Protectors',
  vehicle: 'Vehicles',
  bulletproof_vehicle: 'Bulletproof Vehicles',
}

export function normalizeCardCategory(value: unknown): PromoCardCategory {
  const raw = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')

  if (raw === 'vehicle' || raw === 'vehicles') return 'vehicle'
  if (
    raw === 'bulletproof_vehicle' ||
    raw === 'bulletproof_vehicles' ||
    raw === 'bulletproof' ||
    raw === 'armored_vehicle' ||
    raw === 'armored'
  ) {
    return 'bulletproof_vehicle'
  }
  return 'protector'
}

export function getCardCategoryLabel(category: PromoCardCategory): string {
  return PROMO_CARD_CATEGORY_LABELS[category]
}

export type CityInsight = {
  id: string
  city_name: string
  city_slug: string
  card_category: PromoCardCategory
  headline: string
  description: string
  image_url: string
  response_time_label: string
  metrics_label: string
  price_min: number
  price_max: number
  currency: string
  cta_label: string
  cta_url?: string | null
  is_active: boolean
  is_default: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export function normalizeCitySlug(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function filterInsightsForCity(insights: CityInsight[], city: string): CityInsight[] {
  if (!insights.length) return []

  const slug = normalizeCitySlug(city)
  const exact = insights.filter(
    (row) =>
      row.city_slug === slug ||
      normalizeCitySlug(row.city_name) === slug ||
      row.city_name.toLowerCase() === city.trim().toLowerCase(),
  )
  if (exact.length) return exact

  const partial = insights.filter((row) => {
    const rowSlug = normalizeCitySlug(row.city_name)
    return rowSlug.includes(slug) || slug.includes(rowSlug)
  })
  if (partial.length) return partial

  const defaults = insights.filter((row) => row.is_default)
  return defaults.length ? defaults : insights
}

export function findMatchingCityInsight(insights: CityInsight[], city: string): CityInsight | null {
  const matches = filterInsightsForCity(insights, city)
  return matches[0] || null
}

export function formatCityPriceRange(insight: Pick<CityInsight, 'price_min' | 'price_max' | 'currency'>): string {
  const symbol = insight.currency === 'NGN' ? '₦' : `${insight.currency} `
  const min = Number(insight.price_min).toLocaleString()
  const max = Number(insight.price_max).toLocaleString()
  return `${symbol}${min}–${symbol}${max}`
}

export function buildCityMetricsLabel(insight: Pick<CityInsight, 'response_time_label' | 'metrics_label'>): string {
  if (insight.metrics_label.includes('{response}')) {
    return insight.metrics_label.replace('{response}', insight.response_time_label)
  }
  return `Avg response ${insight.response_time_label} • ${insight.metrics_label}`
}

export const DEFAULT_CITY_INSIGHT: CityInsight = {
  id: 'default',
  city_name: 'Lagos',
  city_slug: 'lagos',
  card_category: 'protector',
  headline: 'Protector in Lagos',
  description: 'Avg mission price',
  image_url: '/images/PRADO/slideshow/lexus-lx570-gallery-1.webp',
  response_time_label: '15–45 min',
  metrics_label: 'Avg mission price',
  price_min: 250000,
  price_max: 700000,
  currency: 'NGN',
  cta_label: 'Get city insights →',
  cta_url: null,
  is_active: true,
  is_default: true,
  sort_order: 0,
}
