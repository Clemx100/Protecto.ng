"use client"

import dynamic from 'next/dynamic'

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
          <div className="text-center space-y-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto animate-pulse"></div>
            <p className="text-white text-sm">Loading map...</p>
          </div>
        </div>
      </div>
    )
  }
)

export default function LiveTrackingMap(props: LiveTrackingMapProps) {
  return <LeafletMap {...props} />
}

