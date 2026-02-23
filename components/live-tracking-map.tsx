"use client"

import dynamic from 'next/dynamic'
import LoadingLogo from "@/components/loading-logo"

interface BookingDisplay {
  id: string
  booking_code?: string
  pickupLocation: string
  destination?: string
  currentLocation?: { lat: number; lng: number }
}

interface LiveTrackingMapProps {
  booking: BookingDisplay
  bookingLocationsMap: Map<string, { lat: number; lng: number }>
  locationHistory?: { lat: number; lng: number; timestamp: number }[]
  currentSpeed?: number // in km/h
}

// Dynamically import the entire map component to avoid SSR issues with Leaflet
const LeafletMap = dynamic(
  () => import('./leaflet-map-internal'),
  { 
    ssr: false,
    loading: () => (
      <div className="relative h-64 bg-gray-800 rounded-lg m-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-green-900/20 flex items-center justify-center">
          <LoadingLogo fullscreen={false} label="Loading map..." />
        </div>
      </div>
    )
  }
)

const GoogleMap = dynamic(
  () => import("./google-map-internal"),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-64 bg-gray-800 rounded-lg m-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-green-900/20 flex items-center justify-center">
          <LoadingLogo fullscreen={false} label="Loading map..." />
        </div>
      </div>
    ),
  },
)

export default function LiveTrackingMap(props: LiveTrackingMapProps) {
  const hasGoogleMapsApiKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  return hasGoogleMapsApiKey ? <GoogleMap {...props} /> : <LeafletMap {...props} />
}

