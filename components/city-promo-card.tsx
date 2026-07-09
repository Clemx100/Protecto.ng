"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DEFAULT_CITY_INSIGHT,
  formatCityPriceRange,
  normalizeCardCategory,
  type CityInsight,
} from "@/lib/utils/city-insights"
import {
  getPromoCardAtIndex,
  PROMO_CARD_ROTATE_MS,
  rankPromoCards,
  type PromoBookingSignal,
  type ScoredPromoCard,
} from "@/lib/services/promo-card-recommendations"

type CityPromoCardProps = {
  userLocation: string
  clientName?: string
  activeBookings?: PromoBookingSignal[]
  bookingHistory?: PromoBookingSignal[]
  onProtectorClick?: () => void
  onVehicleClick?: () => void
  onBulletproofVehicleClick?: () => void
  onClick?: () => void
}

function normalizeInsight(row: Partial<CityInsight> & Record<string, unknown>): CityInsight {
  const cityName = String(row.city_name || DEFAULT_CITY_INSIGHT.city_name)
  return {
    ...DEFAULT_CITY_INSIGHT,
    ...row,
    city_name: cityName,
    city_slug: String(row.city_slug || DEFAULT_CITY_INSIGHT.city_slug),
    card_category: normalizeCardCategory(row.card_category),
    headline: String(row.headline || ""),
    description: String(row.description || ""),
    image_url: String(row.image_url || DEFAULT_CITY_INSIGHT.image_url),
    response_time_label: String(row.response_time_label || DEFAULT_CITY_INSIGHT.response_time_label),
    metrics_label: String(row.metrics_label || DEFAULT_CITY_INSIGHT.metrics_label),
    price_min: Number(row.price_min ?? DEFAULT_CITY_INSIGHT.price_min),
    price_max: Number(row.price_max ?? DEFAULT_CITY_INSIGHT.price_max),
    currency: String(row.currency || DEFAULT_CITY_INSIGHT.currency),
    cta_label: String(row.cta_label || DEFAULT_CITY_INSIGHT.cta_label),
    cta_url: row.cta_url ? String(row.cta_url) : null,
    is_active: row.is_active !== false,
    is_default: Boolean(row.is_default),
    sort_order: Number(row.sort_order ?? 0),
    id: String(row.id || DEFAULT_CITY_INSIGHT.id),
  }
}

function getLocalFallback(city: string): CityInsight {
  return normalizeInsight({
    ...DEFAULT_CITY_INSIGHT,
    city_name: city.trim() || DEFAULT_CITY_INSIGHT.city_name,
  })
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (!url || typeof window === "undefined") {
      resolve()
      return
    }
    const img = new window.Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

export default function CityPromoCard({
  userLocation,
  clientName,
  activeBookings = [],
  bookingHistory = [],
  onProtectorClick,
  onVehicleClick,
  onBulletproofVehicleClick,
  onClick,
}: CityPromoCardProps) {
  const [insights, setInsights] = useState<CityInsight[]>([getLocalFallback(userLocation)])
  const [cardIndex, setCardIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const rotateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const promoContext = useMemo(
    () => ({
      userLocation: userLocation || "Lagos",
      clientName,
      activeBookings,
      bookingHistory,
    }),
    [userLocation, clientName, activeBookings, bookingHistory],
  )

  const scoredCards = useMemo(
    () => rankPromoCards(insights, promoContext),
    [insights, promoContext],
  )

  const current: ScoredPromoCard = useMemo(() => {
    const entry = getPromoCardAtIndex(scoredCards, cardIndex)
    if (entry) return entry
    const fallback = getLocalFallback(userLocation)
    const category = normalizeCardCategory(fallback.card_category)
    return {
      card: fallback,
      score: 0,
      headline:
        category === "bulletproof_vehicle"
          ? `Book a Bulletproof Vehicle in ${fallback.city_name}`
          : category === "vehicle"
            ? `Book a Vehicle in ${fallback.city_name}`
            : `Book a Protector in ${fallback.city_name}`,
      subline: fallback.description || fallback.metrics_label,
    }
  }, [scoredCards, cardIndex, userLocation])

  const advanceCard = useCallback(async () => {
    if (scoredCards.length <= 1) return

    const nextIndex = (cardIndex + 1) % scoredCards.length
    const next = getPromoCardAtIndex(scoredCards, nextIndex)
    if (!next) return

    await preloadImage(next.card.image_url)
    setVisible(false)
    window.setTimeout(() => {
      setCardIndex(nextIndex)
      setVisible(true)
    }, 220)
  }, [cardIndex, scoredCards])

  useEffect(() => {
    const city = userLocation || "Lagos"
    let cancelled = false

    const loadInsights = async () => {
      try {
        const response = await fetch("/api/city-insights", { cache: "no-store" })
        const result = await response.json()
        const rows: CityInsight[] = Array.isArray(result.data)
          ? result.data.map((row: CityInsight) => normalizeInsight(row))
          : result.data
            ? [normalizeInsight(result.data)]
            : []
        if (!cancelled && rows.length) {
          setInsights(rows)
          setCardIndex(0)
        }
      } catch {
        if (!cancelled) setInsights([getLocalFallback(city)])
      }
    }

    void loadInsights()
    return () => {
      cancelled = true
    }
  }, [userLocation])

  useEffect(() => {
    setCardIndex(0)
  }, [scoredCards.length, userLocation])

  useEffect(() => {
    if (rotateTimerRef.current) clearInterval(rotateTimerRef.current)
    if (scoredCards.length <= 1) return

    rotateTimerRef.current = setInterval(() => {
      void advanceCard()
    }, PROMO_CARD_ROTATE_MS)

    return () => {
      if (rotateTimerRef.current) clearInterval(rotateTimerRef.current)
    }
  }, [advanceCard, scoredCards.length])

  const { card: insight, headline, subline } = current

  const handleClick = () => {
    if (insight.cta_url) {
      window.open(insight.cta_url, "_blank", "noopener,noreferrer")
      return
    }
    const category = normalizeCardCategory(insight.card_category)
    if (category === "bulletproof_vehicle") {
      onBulletproofVehicleClick?.() ?? onVehicleClick?.() ?? onClick?.()
      return
    }
    if (category === "vehicle") {
      onVehicleClick?.() ?? onClick?.()
      return
    }
    onProtectorClick?.() ?? onClick?.()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full overflow-hidden rounded-2xl bg-[#1c1c1c] text-left transition-opacity active:opacity-90"
      aria-live="polite"
    >
      <div className="relative h-40 w-full bg-gray-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={insight.image_url}
          alt=""
          className={`h-full w-full object-cover transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        />
        {scoredCards.length > 1 ? (
          <div className="absolute bottom-2 right-2 flex gap-1">
            {scoredCards.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 w-1.5 rounded-full ${index === cardIndex % scoredCards.length ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className={`space-y-1 p-4 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
        <h2 className="text-lg font-bold text-white">{headline}</h2>
        <p className="text-sm text-gray-400 line-clamp-3">{subline}</p>
        {insight.response_time_label ? (
          <p className="text-xs text-gray-500">Avg response {insight.response_time_label}</p>
        ) : null}
        <div className="pt-1">
          <p className="text-sm font-semibold text-white">
            {insight.metrics_label?.replace(/avg\s+response(?:\s+\d[\d–\-]*\s*min)?/gi, "").replace(/^\s*•\s*|\s*•\s*$/g, "").trim() ||
              "Avg mission price"}
          </p>
          <p className="text-xl font-bold text-white">{formatCityPriceRange(insight)}</p>
        </div>
        <p className="pt-1 text-sm font-medium text-white">{insight.cta_label}</p>
      </div>
    </button>
  )
}
