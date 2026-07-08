"use client"

import { useState } from "react"
import { Car, Clock, MapPin, Mail, Phone, Shield, X } from "lucide-react"

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

type HomeGreetingCardProps = {
  clientName: string
  timeLabel: string
  userLocation: string
  onAgentClick: () => void
  onBookVehicleClick: () => void
  onContactCall: () => void
  onContactMail: () => void
}

export default function HomeGreetingCard({
  clientName,
  timeLabel,
  userLocation,
  onAgentClick,
  onBookVehicleClick,
  onContactCall,
  onContactMail,
}: HomeGreetingCardProps) {
  const greeting = getTimeGreeting()
  const displayName = clientName.trim() || "there"
  const [showContactModal, setShowContactModal] = useState(false)

  const handleCall = () => {
    setShowContactModal(false)
    onContactCall()
  }

  const handleMail = () => {
    setShowContactModal(false)
    onContactMail()
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1e2433] via-[#171b26] to-[#12151d] p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-indigo-500/10 blur-2xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_55%)]" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-blue-300/90">{greeting}</p>
          <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-white">{displayName}</h1>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-400/80" />
            <span className="truncate">{userLocation}</span>
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center backdrop-blur-sm">
          <Clock className="mx-auto h-4 w-4 text-blue-300" />
          <p className="mt-1 text-sm font-semibold tabular-nums text-white">{timeLabel || "--:--"}</p>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onAgentClick}
          className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 transition-colors active:bg-white/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/25 to-indigo-500/10 ring-1 ring-blue-400/25">
            <Shield className="h-5 w-5 text-blue-200" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-semibold text-white leading-tight text-center">Book a Protector</span>
        </button>

        <button
          type="button"
          onClick={onBookVehicleClick}
          className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 transition-colors active:bg-white/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/25 to-indigo-500/10 ring-1 ring-blue-400/25">
            <Car className="h-5 w-5 text-blue-200" strokeWidth={1.5} />
          </div>
          <span className="text-[11px] font-semibold text-white leading-tight text-center">Book Vehicle</span>
        </button>

        <button
          type="button"
          onClick={() => setShowContactModal(true)}
          className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 transition-colors active:bg-white/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/25 to-indigo-500/10 ring-1 ring-blue-400/25">
            <Phone className="h-5 w-5 text-blue-200" strokeWidth={1.5} />
          </div>
          <span className="text-[11px] font-semibold text-white leading-tight text-center">Contact Us</span>
        </button>
      </div>
      </div>

      {showContactModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1e2433] via-[#171b26] to-[#12151d] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="text-lg font-semibold text-white">Contact Us</h3>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <button
                type="button"
                onClick={handleCall}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 active:bg-green-800"
              >
                <Phone className="h-4 w-4" />
                Call Instead
              </button>

              <button
                type="button"
                onClick={handleMail}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
              >
                <Mail className="h-4 w-4" />
                Send a Mail
              </button>

              <p className="text-center text-xs text-blue-200/90">
                Add your referral code in the email to get 30% discount.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
