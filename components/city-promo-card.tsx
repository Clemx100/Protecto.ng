"use client"

import { useEffect, useState } from "react"
import {
  buildCityMetricsLabel,
  DEFAULT_CITY_INSIGHT,
  formatCityPriceRange,
  type CityInsight,
} from "@/lib/utils/city-insights"

type CityPromoCardProps = {
  userLocation: string
  onClick?: () => void
}

function getLocalFallback(city: string): CityInsight {
  return {
    ...DEFAULT_CITY_INSIGHT,
    city_name: city.trim() || DEFAULT_CITY_INSIGHT.city_name,
  }
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

export default function CityPromoCard({ userLocation, onClick }: CityPromoCardProps) {
  const [insight, setInsight] = useState<CityInsight>(() => getLocalFallback(userLocation))

  useEffect(() => {
    const city = userLocation || "Lagos"
    setInsight((prev) => ({ ...prev, city_name: city }))

    let cancelled = false

    const loadInsight = async () => {
      try {
        const response = await fetch(`/api/city-insights?city=${encodeURIComponent(city)}`, {
          cache: "no-store",
        })
        const result = await response.json()
        const nextInsight: CityInsight = result.data || getLocalFallback(city)
        if (cancelled) return

        await preloadImage(nextInsight.image_url)
        if (!cancelled) setInsight(nextInsight)
      } catch {
        if (!cancelled) setInsight(getLocalFallback(city))
      }
    }

    void loadInsight()
    return () => {
      cancelled = true
    }
  }, [userLocation])

  const cityLabel = insight.city_name || userLocation || "Lagos"

  const handleClick = () => {
    if (insight.cta_url) {
      window.open(insight.cta_url, "_blank", "noopener,noreferrer")
      return
    }
    onClick?.()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full overflow-hidden rounded-2xl bg-[#1c1c1c] text-left transition-opacity active:opacity-90"
    >
      <div className="relative h-40 w-full bg-gray-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={insight.image_url}
          alt=""
          className="h-full w-full object-cover transition-opacity duration-300"
        />
      </div>
      <div className="space-y-1 p-4">
        <h2 className="text-lg font-bold text-white">Protector in {cityLabel}</h2>
        <p className="text-sm text-gray-400">{buildCityMetricsLabel(insight)}</p>
        <p className="text-xl font-bold text-white">{formatCityPriceRange(insight)}</p>
        <p className="pt-1 text-sm font-medium text-white">{insight.cta_label}</p>
      </div>
    </button>
  )
}
