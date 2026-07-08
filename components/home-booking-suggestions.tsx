"use client"

import { Sparkles, ChevronRight } from "lucide-react"
import type { BookingSuggestion } from "@/lib/services/booking-recommendations"

interface HomeBookingSuggestionsProps {
  suggestions: BookingSuggestion[]
  onSelect: (suggestion: BookingSuggestion) => void
}

const confidenceLabel: Record<BookingSuggestion['confidence'], string> = {
  high: 'Best match',
  medium: 'Good fit',
  low: 'Suggested',
}

export default function HomeBookingSuggestions({
  suggestions,
  onSelect,
}: HomeBookingSuggestionsProps) {
  if (!suggestions.length) return null

  const primary = suggestions.find((s) => s.isPrimary) ?? suggestions[0]
  const secondary = suggestions.filter((s) => s.id !== primary.id)

  return (
    <div className="mb-6 text-left">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-blue-300" />
        <h2 className="text-sm font-semibold text-white">Suggested for you</h2>
      </div>

      <button
        type="button"
        onClick={() => onSelect(primary)}
        className="w-full rounded-2xl border border-blue-400/40 bg-blue-500/15 p-4 text-left transition-colors hover:bg-blue-500/25 mb-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-200 mb-1">
              {confidenceLabel[primary.confidence]}
            </p>
            <p className="text-base font-semibold text-white">{primary.title}</p>
            <p className="text-xs text-blue-100/90 mt-1 leading-relaxed">{primary.reason}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-blue-200 flex-shrink-0 mt-1" />
        </div>
      </button>

      {secondary.length > 0 && (
        <div className="space-y-2">
          {secondary.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => onSelect(suggestion)}
              className="w-full rounded-xl border border-white/15 bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{suggestion.title}</p>
                  <p className="text-xs text-gray-300 mt-0.5">{suggestion.reason}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
