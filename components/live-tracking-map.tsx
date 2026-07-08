"use client"

import dynamic from 'next/dynamic'
import LoadingLogo from "@/components/loading-logo"
import { getMapShellClass, type MapShellVariant } from "@/lib/utils/map-shell"

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
  variant?: MapShellVariant
}

function MapLoadingShell({ variant = "embedded" }: { variant?: MapShellVariant }) {
  return (
    <div className={getMapShellClass(variant)}>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900/20 to-green-900/20">
        <LoadingLogo fullscreen={false} label="Loading map..." />
      </div>
    </div>
  )
}

// Dynamically import the entire map component to avoid SSR issues with Leaflet
const LeafletMap = dynamic(
  () => import('./leaflet-map-internal'),
  { 
    ssr: false,
    loading: () => <MapLoadingShell />,
  }
)

const GoogleMap = dynamic(
  () => import("./google-map-internal"),
  {
    ssr: false,
    loading: () => <MapLoadingShell />,
  },
)

export default function LiveTrackingMap(props: LiveTrackingMapProps) {
  const hasGoogleMapsApiKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  return hasGoogleMapsApiKey ? <GoogleMap {...props} /> : <LeafletMap {...props} />
}

