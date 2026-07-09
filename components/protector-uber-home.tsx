"use client"

import HomeGreetingCard from "@/components/home-greeting-card"
import CityPromoCard from "@/components/city-promo-card"
import type { PromoBookingSignal } from "@/lib/services/promo-card-recommendations"

type ProtectorUberHomeProps = {
  userLocation: string
  clientName: string
  timeLabel: string
  activeBookings?: PromoBookingSignal[]
  bookingHistory?: PromoBookingSignal[]
  onAgentClick: () => void
  onBookVehicleClick: () => void
  onContactCall: () => void
  onContactMail: () => void
  onProtectorClick?: () => void
  onVehicleClick?: () => void
  onPromoClick?: () => void
}

export default function ProtectorUberHome({
  userLocation,
  clientName,
  timeLabel,
  activeBookings,
  bookingHistory,
  onAgentClick,
  onBookVehicleClick,
  onContactCall,
  onContactMail,
  onProtectorClick,
  onVehicleClick,
  onPromoClick,
}: ProtectorUberHomeProps) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#121212] px-4 pt-4 pb-6 space-y-5">
      <HomeGreetingCard
        clientName={clientName}
        timeLabel={timeLabel}
        userLocation={userLocation}
        onAgentClick={onAgentClick}
        onBookVehicleClick={onBookVehicleClick}
        onContactCall={onContactCall}
        onContactMail={onContactMail}
      />

      <CityPromoCard
        userLocation={userLocation}
        clientName={clientName}
        activeBookings={activeBookings}
        bookingHistory={bookingHistory}
        onProtectorClick={onProtectorClick ?? onPromoClick ?? onAgentClick}
        onVehicleClick={onVehicleClick ?? onBookVehicleClick}
        onClick={onPromoClick}
      />
    </div>
  )
}
