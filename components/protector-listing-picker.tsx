"use client"

import { Shield, UserCheck } from "lucide-react"
import LoadingLogo from "@/components/loading-logo"

export type ProtectorListing = {
  id: string
  display_name: string
  bio?: string | null
  qualifications?: string[] | null
  years_experience?: number | null
  hourly_rate?: number | null
  daily_rate?: number | null
  currency?: string | null
  photos?: string[] | null
}

type ProtectorListingPickerProps = {
  listings: ProtectorListing[]
  isLoading: boolean
  selectedListingId: string | null
  assignAutomatically: boolean
  onSelectListing: (listing: ProtectorListing) => void
  onAssignAutomatically: () => void
}

function formatRate(listing: ProtectorListing) {
  const currency = listing.currency || "NGN"
  const symbol = currency === "NGN" ? "₦" : `${currency} `
  if (listing.daily_rate) {
    return `${symbol}${Number(listing.daily_rate).toLocaleString()}/day`
  }
  if (listing.hourly_rate) {
    return `${symbol}${Number(listing.hourly_rate).toLocaleString()}/hr`
  }
  return "Rate on request"
}

export default function ProtectorListingPicker({
  listings,
  isLoading,
  selectedListingId,
  assignAutomatically,
  onSelectListing,
  onAssignAutomatically,
}: ProtectorListingPickerProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg bg-gray-900 p-6">
        <LoadingLogo fullscreen={false} label="Loading protectors..." />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
        <div className="flex gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
          <div className="space-y-1 text-sm text-gray-200">
            <p className="font-semibold text-white">What is a Protector?</p>
            <p className="leading-relaxed text-gray-300">
              A Protector is veteran and former law enforcement private security personnel you can
              book for personal protection when you need it — discreet, professional, and mission-ready.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onAssignAutomatically}
        className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
          assignAutomatically
            ? "border-blue-500 bg-blue-500/10"
            : "border-gray-600 bg-gray-800 hover:border-gray-500"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-700">
            <UserCheck className="h-6 w-6 text-blue-300" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Assign best available Protector</h3>
            <p className="text-sm text-gray-400">
              Our team matches you with a verified veteran or ex-law enforcement operator.
            </p>
          </div>
        </div>
      </button>

      {listings.length > 0 && (
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Or choose a specific Protector
        </p>
      )}

      {listings.map((listing) => {
        const isSelected = selectedListingId === listing.id && !assignAutomatically
        const photo = listing.photos?.[0]

        return (
          <button
            key={listing.id}
            type="button"
            onClick={() => onSelectListing(listing)}
            className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
              isSelected
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-600 bg-gray-800 hover:border-gray-500"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-700">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Shield className="h-7 w-7 text-blue-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{listing.display_name}</h3>
                  <span className="shrink-0 text-xs font-medium text-blue-300">
                    {formatRate(listing)}
                  </span>
                </div>
                {listing.years_experience ? (
                  <p className="mt-1 text-xs text-gray-400">
                    {listing.years_experience}+ years experience
                  </p>
                ) : null}
                {listing.qualifications && listing.qualifications.length > 0 ? (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                    {listing.qualifications.slice(0, 3).join(" • ")}
                  </p>
                ) : null}
                {listing.bio ? (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-300">{listing.bio}</p>
                ) : null}
              </div>
            </div>
          </button>
        )
      })}

      {listings.length === 0 && (
        <p className="text-center text-sm text-gray-400">
          No public Protector profiles yet — we will assign the best available operator for your mission.
        </p>
      )}
    </div>
  )
}
