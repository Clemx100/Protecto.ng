"use client"

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'
import { RouteCalculationService, RoutePoint } from '@/lib/services/route-calculation'
import LoadingLogo from "@/components/loading-logo"
import { getMapShellClass, type MapShellVariant } from "@/lib/utils/map-shell"
import {
  getActivityMapMode,
  resolveSiteMapAddress,
  shouldGeocodeDestination,
} from "@/lib/utils/activity-map"
import ActivityMapPlaceholder from "@/components/activity-map-placeholder"

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
  special_instructions?: unknown
}

interface LeafletMapInternalProps {
  booking: BookingDisplay
  bookingLocationsMap: Map<string, { lat: number; lng: number }>
  locationHistory?: { lat: number; lng: number; timestamp: number }[]
  currentSpeed?: number // in km/h
  variant?: MapShellVariant
}

const PROTECTOR_MAP_LOGO = "/images/PRADO/slideshow/logo.PNG"

const siteMarkerIcon =
  typeof window !== "undefined"
    ? L.icon({
        iconUrl: PROTECTOR_MAP_LOGO,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -18],
      })
    : undefined

const toFiniteNumber = (value: unknown): number | null => {
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const normalizeLatLng = (value?: { lat?: unknown; lng?: unknown } | null): RoutePoint | null => {
  if (!value) return null

  const lat = toFiniteNumber(value.lat)
  const lng = toFiniteNumber(value.lng)

  if (lat === null || lng === null) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  return { lat, lng }
}

export default function LeafletMapInternal({ 
  booking, 
  bookingLocationsMap, 
  locationHistory = [],
  currentSpeed,
  variant = "embedded",
}: LeafletMapInternalProps) {
  const [pickupCoords, setPickupCoords] = useState<RoutePoint | null>(null)
  const [destinationCoords, setDestinationCoords] = useState<RoutePoint | null>(null)
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null)
  const [routeDistance, setRouteDistance] = useState<number>(0)
  const [eta, setEta] = useState<string>('Calculating...')
  const [isLoading, setIsLoading] = useState(true)
  
  const bookingId = booking.id || booking.booking_code
  const mapMode = getActivityMapMode(booking)
  const isSiteMode = mapMode === "site"
  const isReviewMode = mapMode === "review"
  const rawCurrentLocation = bookingLocationsMap.get(bookingId || '') || booking.currentLocation
  const currentLocation = normalizeLatLng(rawCurrentLocation)
  
  // Geocode addresses and calculate route
  useEffect(() => {
    const loadMapData = async () => {
      setIsLoading(true)
      setPickupCoords(null)
      setDestinationCoords(null)
      setRouteGeometry(null)
      setRouteDistance(0)
      setEta('Calculating...')

      if (isReviewMode) {
        setIsLoading(false)
        return
      }

      try {
        const { GeocodingService } = await import('@/lib/services/geocoding')
        const siteAddress = isSiteMode ? resolveSiteMapAddress(booking) : null
        const pickupAddress = siteAddress || booking.pickupLocation

        if (pickupAddress && pickupAddress !== 'TBD') {
          const pickup = await GeocodingService.geocode(pickupAddress)
          const normalizedPickup = normalizeLatLng(pickup)
          if (normalizedPickup) {
            setPickupCoords(normalizedPickup)
          }
        }

        if (!isSiteMode && shouldGeocodeDestination(booking)) {
          const dest = await GeocodingService.geocode(booking.destination!)
          const normalizedDestination = normalizeLatLng(dest)
          if (normalizedDestination) {
            setDestinationCoords(normalizedDestination)
          }
        }
      } catch (error) {
        console.error('Error loading map data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadMapData()
  }, [booking.pickupLocation, booking.destination, booking.special_instructions, isReviewMode, isSiteMode])
  
  // Calculate route when we have all coordinates
  useEffect(() => {
    if (mapMode !== 'trip') {
      setRouteGeometry(null)
      setRouteDistance(0)
      setEta(isSiteMode ? 'Awaiting confirmation' : 'Under review')
      return
    }

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
  }, [pickupCoords, destinationCoords, currentLocation, currentSpeed, mapMode, isSiteMode])
  
  // Determine map center and bounds
  const getMapCenter = (): [number, number] => {
    if (currentLocation) {
      return [currentLocation.lat, currentLocation.lng]
    } else if (pickupCoords) {
      return [pickupCoords.lat, pickupCoords.lng]
    }
    return [6.5244, 3.3792] // Default: Lagos
  }

  const validRoutePath = (routeGeometry || [])
    .map(([lng, lat]) => {
      const point = normalizeLatLng({ lat, lng })
      return point ? ([point.lat, point.lng] as [number, number]) : null
    })
    .filter((point): point is [number, number] => point !== null)

  const validLocationHistoryPath = locationHistory
    .map((loc) => normalizeLatLng(loc))
    .filter((point): point is RoutePoint => point !== null)
    .map((point) => [point.lat, point.lng] as [number, number])

  const openGoogleNavigation = () => {
    if (typeof window === 'undefined') return

    const origin = currentLocation || pickupCoords
    const destination = destinationCoords
    if (!origin && !destination) return

    let url = "https://www.google.com/maps/dir/?api=1&travelmode=driving&dir_action=navigate"
    if (origin) {
      url += `&origin=${encodeURIComponent(`${origin.lat},${origin.lng}`)}`
    }
    if (destination) {
      url += `&destination=${encodeURIComponent(`${destination.lat},${destination.lng}`)}`
    }

    window.open(url, "_blank", "noopener,noreferrer")
  }

  const mapShellClass = getMapShellClass(variant)

  if (isReviewMode) {
    return <ActivityMapPlaceholder mode="review" variant={variant} />
  }
  
  if (isLoading) {
    return (
      <div className={mapShellClass}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-green-900/20 flex items-center justify-center">
          <LoadingLogo fullscreen={false} label="Loading map..." />
        </div>
      </div>
    )
  }

  if (!pickupCoords && !currentLocation && !isSiteMode) {
    return (
      <div className={mapShellClass}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-green-900/20 flex items-center justify-center">
          <div className="text-center space-y-2 px-4">
            <p className="text-white text-sm font-medium">Location unavailable</p>
            <p className="text-gray-300 text-xs">We could not resolve this booking location yet.</p>
          </div>
        </div>
      </div>
    )
  }

  if (isSiteMode && !pickupCoords) {
    return <ActivityMapPlaceholder mode="site" variant={variant} />
  }
  
  return (
    <div className={mapShellClass}>
      <div className="absolute top-2 left-2 z-[1000] rounded bg-black/70 px-2 py-1 text-xs text-white">
        {isSiteMode ? (
          <div>Awaiting operator confirmation</div>
        ) : (
          <div className="space-y-1">
            {routeDistance > 0 && (
              <div>Distance: {RouteCalculationService.formatDistance(routeDistance)}</div>
            )}
            <div>ETA: {eta}</div>
          </div>
        )}
      </div>

      {!isSiteMode ? (
        <button
          type="button"
          onClick={openGoogleNavigation}
          className="absolute top-2 right-2 z-[1000] rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-blue-700"
        >
          Navigate
        </button>
      ) : null}
      
      {/* Leaflet Map */}
      <MapContainer
        center={getMapCenter()}
        zoom={isSiteMode ? 15 : 13}
        style={{ height: '100%', width: '100%' }}
        className={variant === "hero" ? "" : "rounded-lg"}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Pickup Marker */}
        {pickupCoords && (
          <Marker
            position={[pickupCoords.lat, pickupCoords.lng]}
            icon={isSiteMode ? siteMarkerIcon : undefined}
          >
            <Popup>
              <div className="text-sm">
                <strong>{isSiteMode ? "Service location" : "Pickup"}</strong>
                <br />
                {isSiteMode ? resolveSiteMapAddress(booking) || booking.pickupLocation : booking.pickupLocation}
              </div>
            </Popup>
          </Marker>
        )}
        
        {!isSiteMode && currentLocation && (
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
        
        {!isSiteMode && destinationCoords && (
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
        
        {!isSiteMode && validRoutePath.length > 1 && (
          <Polyline
            positions={validRoutePath}
            color="#3B82F6"
            weight={4}
            opacity={0.7}
          />
        )}
        
        {!isSiteMode && validLocationHistoryPath.length > 1 && (
          <Polyline
            positions={validLocationHistoryPath}
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

