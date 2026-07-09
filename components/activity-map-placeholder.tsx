"use client"

import { CalendarRange, Home, MapPin } from "lucide-react"
import { getMapShellClass, type MapShellVariant } from "@/lib/utils/map-shell"
import type { ActivityMapMode } from "@/lib/utils/activity-map"

type ActivityMapPlaceholderProps = {
  mode: Extract<ActivityMapMode, "site" | "review">
  title?: string
  subtitle?: string
  variant?: MapShellVariant
}

export default function ActivityMapPlaceholder({
  mode,
  title,
  subtitle,
  variant = "embedded",
}: ActivityMapPlaceholderProps) {
  const isReview = mode === "review"
  const Icon = isReview ? CalendarRange : Home
  const accent = isReview ? "text-blue-300 bg-blue-500/15" : "text-emerald-300 bg-emerald-500/15"

  return (
    <div className={getMapShellClass(variant)}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a2030] via-[#141820] to-[#101218]" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-[18%] top-[22%] h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
        <div className="absolute right-[12%] bottom-[18%] h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="max-w-xs text-center">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${accent}`}>
            <Icon className="h-7 w-7" />
          </div>
          <p className="text-base font-semibold text-white">
            {title || (isReview ? "Itinerary under review" : "Service location")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            {subtitle ||
              (isReview
                ? "Your operator is reviewing the itinerary. Route details will appear after confirmation."
                : "Awaiting operator confirmation. Live route tracking starts once your request is accepted.")}
          </p>
          {!isReview ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
              <MapPin className="h-3.5 w-3.5" />
              Single-site security request
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
