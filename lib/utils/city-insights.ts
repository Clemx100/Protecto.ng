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

/** Map neighborhoods / LGAs to the metro city used for promo cards. */
const CITY_PARENT_ALIASES: Record<string, string> = {
  ikeja: 'lagos',
  lekki: 'lagos',
  ikoyi: 'lagos',
  vi: 'lagos',
  'victoria-island': 'lagos',
  yaba: 'lagos',
  surulere: 'lagos',
  ajah: 'lagos',
  magodo: 'lagos',
  maryland: 'lagos',
  gbagada: 'lagos',
  'banana-island': 'lagos',
  'lekki-phase-1': 'lagos',
  'lekki-phase-2': 'lagos',
  'lagos-island': 'lagos',
  'lagos-mainland': 'lagos',
  'lagos-state': 'lagos',
  'port-harcourt': 'port-harcourt',
  ph: 'port-harcourt',
  'abuja-fct': 'abuja',
  'federal-capital-territory': 'abuja',
  garki: 'abuja',
  wuse: 'abuja',
  maitama: 'abuja',
  asokoro: 'abuja',
}

export function resolvePromoCitySlug(city: string): string {
  const slug = normalizeCitySlug(city)
  return CITY_PARENT_ALIASES[slug] || slug
}

export function filterInsightsForCity(insights: CityInsight[], city: string): CityInsight[] {
  if (!insights.length) return []

  const slug = resolvePromoCitySlug(city)
  const rawSlug = normalizeCitySlug(city)

  const matchRow = (row: CityInsight, target: string) => {
    const rowNameSlug = normalizeCitySlug(row.city_name)
    const rowSlug = normalizeCitySlug(row.city_slug || row.city_name)
    return (
      rowSlug === target ||
      rowNameSlug === target ||
      resolvePromoCitySlug(row.city_name) === target ||
      resolvePromoCitySlug(row.city_slug || '') === target
    )
  }

  const exact = insights.filter((row) => matchRow(row, slug) || matchRow(row, rawSlug))
  if (exact.length) return exact

  const partial = insights.filter((row) => {
    const rowSlug = normalizeCitySlug(row.city_name)
    const rowParent = resolvePromoCitySlug(row.city_name)
    return (
      rowSlug.includes(slug) ||
      slug.includes(rowSlug) ||
      rowParent === slug ||
      rowSlug.includes(rawSlug) ||
      rawSlug.includes(rowSlug)
    )
  })
  if (partial.length) return partial

  const defaults = insights.filter((row) => row.is_default)
  // Prefer a full metro pool over a single default so rotation can work.
  if (defaults.length > 1) return defaults
  if (defaults.length === 1) {
    const defaultParent = resolvePromoCitySlug(defaults[0].city_name)
    const metroPool = insights.filter((row) => resolvePromoCitySlug(row.city_name) === defaultParent)
    if (metroPool.length > 1) return metroPool
    return defaults
  }

  return insights
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

function cleanMetricsLabel(metricsLabel: string): string {
  return metricsLabel
    .replace(/avg\s+response(?:\s+\d[\d–\-]*\s*min)?/gi, '')
    .replace(/\s*[•|]\s*/g, ' • ')
    .replace(/(?:\s*•\s*)+/g, ' • ')
    .replace(/^\s*•\s*|\s*•\s*$/g, '')
    .trim()
}

export function buildCityMetricsLabel(insight: Pick<CityInsight, 'response_time_label' | 'metrics_label'>): string {
  const response = insight.response_time_label?.trim()
  const metrics = cleanMetricsLabel(insight.metrics_label || '')

  if (insight.metrics_label.includes('{response}')) {
    return insight.metrics_label.replace('{response}', response || '')
  }

  if (response && metrics) {
    return `Avg response ${response} • ${metrics}`
  }
  if (response) return `Avg response ${response}`
  return metrics || 'Avg mission price'
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
