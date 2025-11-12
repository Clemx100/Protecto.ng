"use client"

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'
import { RouteCalculationService, RoutePoint } from '@/lib/services/route-calculation'

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

interface BookingDisplay {
  id: string
  booking_code?: string
  pickupLocation: string
  destination?: string
  currentLocation?: { lat: number; lng: number }
}

interface LeafletMapInternalProps {
  booking: BookingDisplay
  bookingLocationsMap: Map<string, { lat: number; lng: number }>
  locationHistory?: { lat: number; lng: number; timestamp: number }[]
  currentSpeed?: number // in km/h
}

export default function LeafletMapInternal({ 
  booking, 
  bookingLocationsMap, 
  locationHistory = [],
  currentSpeed 
}: LeafletMapInternalProps) {
  const [pickupCoords, setPickupCoords] = useState<RoutePoint | null>(null)
  const [destinationCoords, setDestinationCoords] = useState<RoutePoint | null>(null)
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null)
  const [routeDistance, setRouteDistance] = useState<number>(0)
  const [eta, setEta] = useState<string>('Calculating...')
  const [isLoading, setIsLoading] = useState(true)
  
  const bookingId = booking.id || booking.booking_code
  const currentLocation = bookingLocationsMap.get(bookingId || '') || booking.currentLocation
  
  // Geocode addresses and calculate route
  useEffect(() => {
    const loadMapData = async () => {
      setIsLoading(true)
      try {
        const { GeocodingService } = await import('@/lib/services/geocoding')
        
        // Geocode pickup
        if (booking.pickupLocation && booking.pickupLocation !== 'TBD') {
          const pickup = await GeocodingService.geocode(booking.pickupLocation)
          if (pickup) {
            setPickupCoords({ lat: pickup.lat, lng: pickup.lng })
          }
        }
        
        // Geocode destination
        if (booking.destination && booking.destination !== 'TBD') {
          const dest = await GeocodingService.geocode(booking.destination)
          if (dest) {
            setDestinationCoords({ lat: dest.lat, lng: dest.lng })
          }
        }
      } catch (error) {
        console.error('Error loading map data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadMapData()
  }, [booking.pickupLocation, booking.destination])
  
  // Calculate route when we have all coordinates
  useEffect(() => {
    const calculateRoute = async () => {
      if (!pickupCoords || !destinationCoords) return
      
      if (currentLocation) {
        // Calculate route with current location as waypoint
        const route = await RouteCalculationService.calculateRouteWithCurrentLocation(
          pickupCoords,
          currentLocation,
          destinationCoords
        )
        
        if (route) {
          setRouteGeometry(route.geometry)
          setRouteDistance(route.distance)
          
          // Calculate ETA
          if (currentSpeed && currentSpeed > 0) {
            const remainingDistance = RouteCalculationService.calculateDistance(
              currentLocation,
              destinationCoords
            )
            const etaSeconds = RouteCalculationService.calculateETA(remainingDistance, currentSpeed)
            setEta(RouteCalculationService.formatDuration(etaSeconds))
          } else {
            const etaSeconds = route.duration
            setEta(RouteCalculationService.formatDuration(etaSeconds))
          }
        }
      } else {
        // Calculate direct route from pickup to destination
        const route = await RouteCalculationService.calculateRoute(pickupCoords, destinationCoords)
        if (route) {
          setRouteGeometry(route.geometry)
          setRouteDistance(route.distance)
          setEta(RouteCalculationService.formatDuration(route.duration))
        }
      }
    }
    
    calculateRoute()
  }, [pickupCoords, destinationCoords, currentLocation, currentSpeed])
  
  // Determine map center and bounds
  const getMapCenter = (): [number, number] => {
    if (currentLocation) {
      return [currentLocation.lat, currentLocation.lng]
    } else if (pickupCoords) {
      return [pickupCoords.lat, pickupCoords.lng]
    }
    return [6.5244, 3.3792] // Default: Lagos
  }
  
  if (isLoading || (!pickupCoords && !currentLocation)) {
    return (
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
  
  return (
    <div className="relative h-64 bg-gray-800 rounded-lg m-4 overflow-hidden">
      {/* Map Info Overlay */}
      <div className="absolute top-2 left-2 z-[1000] bg-black/70 text-white text-xs px-2 py-1 rounded space-y-1">
        {routeDistance > 0 && (
          <div>Distance: {RouteCalculationService.formatDistance(routeDistance)}</div>
        )}
        <div>ETA: {eta}</div>
      </div>
      
      {/* Leaflet Map */}
      <MapContainer
        center={getMapCenter()}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Pickup Marker */}
        {pickupCoords && (
          <Marker position={[pickupCoords.lat, pickupCoords.lng]}>
            <Popup>
              <div className="text-sm">
                <strong>Pickup</strong>
                <br />
                {booking.pickupLocation}
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker 
            position={[currentLocation.lat, currentLocation.lng]}
            icon={L.icon({
              iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0iIzM5ODJGNSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPg==',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Popup>
              <div className="text-sm">
                <strong>Live Tracking</strong>
                <br />
                Current Location
                {currentSpeed && currentSpeed > 0 && (
                  <>
                    <br />
                    Speed: {currentSpeed.toFixed(0)} km/h
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Destination Marker */}
        {destinationCoords && (
          <Marker position={[destinationCoords.lat, destinationCoords.lng]}>
            <Popup>
              <div className="text-sm">
                <strong>Destination</strong>
                <br />
                {booking.destination}
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Route Polyline */}
        {routeGeometry && routeGeometry.length > 1 && (
          <Polyline
            positions={routeGeometry.map(([lng, lat]) => [lat, lng])}
            color="#3B82F6"
            weight={4}
            opacity={0.7}
          />
        )}
        
        {/* Location History Path */}
        {locationHistory.length > 1 && (
          <Polyline
            positions={locationHistory.map(loc => [loc.lat, loc.lng])}
            color="#10B981"
            weight={2}
            opacity={0.5}
            dashArray="5, 5"
          />
        )}
      </MapContainer>
    </div>
  )
}

