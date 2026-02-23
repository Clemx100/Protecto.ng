"use client"

import { useEffect, useState } from "react"
import { CircleF, DirectionsRenderer, GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api"
import { RouteCalculationService, RoutePoint } from "@/lib/services/route-calculation"
import LoadingLogo from "@/components/loading-logo"

interface BookingDisplay {
  id: string
  booking_code?: string
  pickupLocation: string
  destination?: string
  currentLocation?: { lat: number; lng: number }
  status?: string
}

interface GoogleMapInternalProps {
  booking: BookingDisplay
  bookingLocationsMap: Map<string, { lat: number; lng: number }>
  locationHistory?: { lat: number; lng: number; timestamp: number }[]
  currentSpeed?: number
}

const mapContainerStyle = { height: "100%", width: "100%" }
const GOOGLE_MAP_LIBRARIES: ("places")[] = ["places"]

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeLatLng = (value?: { lat?: unknown; lng?: unknown } | null): RoutePoint | null => {
  if (!value) return null

  const lat = toFiniteNumber(value.lat)
  const lng = toFiniteNumber(value.lng)
  if (lat === null || lng === null) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  return { lat, lng }
}

const normalizeBookingStatus = (status?: string): string =>
  (status || "").toLowerCase().trim().replace(/[\s-]+/g, "_")

export default function GoogleMapInternal({
  booking,
  bookingLocationsMap,
  locationHistory = [],
  currentSpeed,
}: GoogleMapInternalProps) {
  const [pickupCoords, setPickupCoords] = useState<RoutePoint | null>(null)
  const [destinationCoords, setDestinationCoords] = useState<RoutePoint | null>(null)
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null)
  const [routeDistance, setRouteDistance] = useState(0)
  const [eta, setEta] = useState("Calculating...")
  const [isLoading, setIsLoading] = useState(true)
  const [directionsResult, setDirectionsResult] = useState<any | null>(null)
  const [isNavigationActive, setIsNavigationActive] = useState(false)
  const [mapInstance, setMapInstance] = useState<any | null>(null)
  const [isSuvPulseExpanded, setIsSuvPulseExpanded] = useState(false)

  const bookingId = booking.id || booking.booking_code || ""
  const rawCurrentLocation = bookingLocationsMap.get(bookingId || "") || booking.currentLocation
  const currentLocation = normalizeLatLng(rawCurrentLocation)
  const vehiclePosition = currentLocation || pickupCoords
  const normalizedStatus = normalizeBookingStatus(booking.status)
  const shouldAutoStartNavigation = normalizedStatus === "in_service"

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  const { isLoaded, loadError } = useJsApiLoader({
    id: "protector-google-map",
    googleMapsApiKey,
    libraries: GOOGLE_MAP_LIBRARIES,
  })

  useEffect(() => {
    setIsNavigationActive(shouldAutoStartNavigation)
  }, [bookingId, shouldAutoStartNavigation])

  useEffect(() => {
    if (shouldAutoStartNavigation) {
      setIsNavigationActive(true)
    }
  }, [shouldAutoStartNavigation])

  useEffect(() => {
    const loadMapData = async () => {
      setIsLoading(true)
      setPickupCoords(null)
      setDestinationCoords(null)
      setRouteGeometry(null)
      setDirectionsResult(null)
      setRouteDistance(0)
      setEta("Calculating...")

      try {
        const { GeocodingService } = await import("@/lib/services/geocoding")
        const geocodeAddress = async (rawAddress?: string): Promise<RoutePoint | null> => {
          const address = rawAddress?.trim()
          if (!address || address === "TBD") return null

          const queryVariants: string[] = [address]
          const normalizedAddress = address.toLowerCase()
          if (!normalizedAddress.includes("nigeria")) {
            queryVariants.push(`${address}, Nigeria`)
          }

          if (isLoaded && typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
            const googleMaps = (window as any).google.maps
            const geocoder = new googleMaps.Geocoder()

            for (const query of queryVariants) {
              try {
                const googlePoint = await new Promise<RoutePoint | null>((resolve) => {
                  geocoder.geocode(
                    {
                      address: query,
                      componentRestrictions: { country: "NG" },
                    },
                    (results: any[] | null, status: string) => {
                      if (status !== "OK" || !results?.[0]?.geometry?.location) {
                        resolve(null)
                        return
                      }

                      const location = results[0].geometry.location
                      resolve(normalizeLatLng({ lat: location.lat(), lng: location.lng() }))
                    },
                  )
                })

                if (googlePoint) {
                  return googlePoint
                }
              } catch (error) {
                console.warn("Google geocode failed for query:", query, error)
              }
            }
          }

          for (const query of queryVariants) {
            const fallbackPoint = normalizeLatLng(await GeocodingService.geocode(query))
            if (fallbackPoint) {
              return fallbackPoint
            }
          }

          return null
        }

        if (booking.pickupLocation && booking.pickupLocation !== "TBD") {
          const normalizedPickup = await geocodeAddress(booking.pickupLocation)
          if (normalizedPickup) {
            setPickupCoords(normalizedPickup)
          }
        }

        if (booking.destination && booking.destination !== "TBD") {
          const normalizedDestination = await geocodeAddress(booking.destination)
          if (normalizedDestination) {
            setDestinationCoords(normalizedDestination)
          }
        }
      } catch (error) {
        console.error("Error loading Google map data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMapData()
  }, [booking.pickupLocation, booking.destination, isLoaded])

  useEffect(() => {
    let isCancelled = false

    const calculateRoute = async () => {
      const origin = currentLocation || pickupCoords
      if (!origin || !destinationCoords) {
        setDirectionsResult(null)
        setRouteGeometry(null)
        setRouteDistance(0)
        setEta("Calculating...")
        return
      }

      if (isLoaded && typeof window !== "undefined" && (window as any).google?.maps?.DirectionsService) {
        try {
          const googleMaps = (window as any).google.maps
          const directions = await new Promise<any>((resolve, reject) => {
            const service = new googleMaps.DirectionsService()
            service.route(
              {
                origin,
                destination: destinationCoords,
                travelMode: googleMaps.TravelMode.DRIVING,
                provideRouteAlternatives: true,
                drivingOptions: {
                  departureTime: new Date(),
                  trafficModel: googleMaps.TrafficModel.BEST_GUESS,
                },
              },
              (result: any, status: string) => {
                if (status === "OK" && result) {
                  resolve(result)
                  return
                }
                reject(new Error(status || "Directions unavailable"))
              },
            )
          })

          if (isCancelled) return

          const leg = directions?.routes?.[0]?.legs?.[0]
          if (leg) {
            setDirectionsResult(directions)
            setRouteGeometry(null)
            setRouteDistance(leg.distance?.value || 0)
            setEta(leg.duration_in_traffic?.text || leg.duration?.text || "Calculating...")
            return
          }
        } catch (error) {
          console.warn("Google Directions failed, using fallback routing", error)
        }
      }

      setDirectionsResult(null)

      if (currentLocation && pickupCoords) {
        const route = await RouteCalculationService.calculateRouteWithCurrentLocation(
          pickupCoords,
          currentLocation,
          destinationCoords,
        )

        if (route) {
          setRouteGeometry(route.geometry)
          setRouteDistance(route.distance)
          if (currentSpeed && currentSpeed > 0) {
            const remainingDistance = RouteCalculationService.calculateDistance(currentLocation, destinationCoords)
            const etaSeconds = RouteCalculationService.calculateETA(remainingDistance, currentSpeed)
            setEta(RouteCalculationService.formatDuration(etaSeconds))
          } else {
            setEta(RouteCalculationService.formatDuration(route.duration))
          }
        }
      } else {
        const route = await RouteCalculationService.calculateRoute(pickupCoords, destinationCoords)
        if (route) {
          setRouteGeometry(route.geometry)
          setRouteDistance(route.distance)
          setEta(RouteCalculationService.formatDuration(route.duration))
        }
      }
    }

    void calculateRoute()

    return () => {
      isCancelled = true
    }
  }, [pickupCoords, destinationCoords, currentLocation, currentSpeed, isLoaded])

  useEffect(() => {
    if (!mapInstance || !isNavigationActive || !vehiclePosition) return

    mapInstance.panTo(vehiclePosition)
    const zoom = typeof mapInstance.getZoom === "function" ? mapInstance.getZoom() : undefined
    if (typeof zoom === "number" && zoom < 15 && typeof mapInstance.setZoom === "function") {
      mapInstance.setZoom(15)
    }
  }, [mapInstance, isNavigationActive, vehiclePosition])

  useEffect(() => {
    if (!vehiclePosition) return

    const pulseInterval = setInterval(() => {
      setIsSuvPulseExpanded((prev) => !prev)
    }, 900)

    return () => {
      clearInterval(pulseInterval)
    }
  }, [Boolean(vehiclePosition)])

  const logoMarkerIcon =
    isLoaded && typeof window !== "undefined" && (window as any).google?.maps
      ? {
          url: "/protector-ng-shield-logo.png",
          scaledSize: new (window as any).google.maps.Size(
            isSuvPulseExpanded ? 39 : 34,
            isSuvPulseExpanded ? 49 : 43,
          ),
          anchor: new (window as any).google.maps.Point(
            isSuvPulseExpanded ? 20 : 17,
            isSuvPulseExpanded ? 25 : 22,
          ),
        }
      : undefined

  const suvPulseRadiusMeters = isSuvPulseExpanded ? 42 : 24

  const mapCenter =
    (isNavigationActive && vehiclePosition) ||
    vehiclePosition ||
    pickupCoords ||
    destinationCoords ||
    { lat: 6.5244, lng: 3.3792 }

  const validRoutePath = (routeGeometry || [])
    .map(([lng, lat]) => normalizeLatLng({ lat, lng }))
    .filter((point): point is RoutePoint => point !== null)
    .map((point) => ({ lat: point.lat, lng: point.lng }))

  const validLocationHistoryPath = locationHistory
    .map((point) => normalizeLatLng(point))
    .filter((point): point is RoutePoint => point !== null)
    .map((point) => ({ lat: point.lat, lng: point.lng }))

  const shouldShowPickupPin = Boolean(
    pickupCoords &&
      currentLocation &&
      RouteCalculationService.calculateDistance(pickupCoords, currentLocation) > 60,
  )

  if (loadError) {
    return (
      <div className="relative h-64 bg-gray-800 rounded-lg m-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-green-900/20 flex items-center justify-center">
          <div className="text-center space-y-2 px-4">
            <p className="text-white text-sm font-medium">Map failed to load</p>
            <p className="text-gray-300 text-xs">Please check your Google Maps API key configuration.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="relative h-64 bg-gray-800 rounded-lg m-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-green-900/20 flex items-center justify-center">
          <LoadingLogo fullscreen={false} label="Loading map..." />
        </div>
      </div>
    )
  }

  if (!pickupCoords && !currentLocation && !destinationCoords) {
    return (
      <div className="relative h-64 bg-gray-800 rounded-lg m-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-green-900/20 flex items-center justify-center">
          <div className="text-center space-y-2 px-4">
            <p className="text-white text-sm font-medium">Location unavailable</p>
            <p className="text-gray-300 text-xs">We could not resolve this booking location yet.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-64 bg-gray-800 rounded-lg m-4 overflow-hidden">
      <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded space-y-1">
        {routeDistance > 0 && <div>Distance: {RouteCalculationService.formatDistance(routeDistance)}</div>}
        <div>ETA: {eta}</div>
      </div>

      <div className="absolute top-2 right-2 z-10">
        <button
          type="button"
          onClick={() => setIsNavigationActive((prev) => !prev)}
          className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
            isNavigationActive
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isNavigationActive ? "Navigation On" : "Start Navigation"}
        </button>
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={isNavigationActive ? 15 : 13}
        onLoad={(map) => setMapInstance(map)}
        onUnmount={() => setMapInstance(null)}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          mapTypeId: "satellite",
        }}
      >
        {vehiclePosition && (
          <CircleF
            center={vehiclePosition}
            radius={suvPulseRadiusMeters}
            options={{
              fillColor: "#3B82F6",
              fillOpacity: 0.18,
              strokeColor: "#60A5FA",
              strokeOpacity: 0.7,
              strokeWeight: 2,
              clickable: false,
            }}
          />
        )}
        {shouldShowPickupPin && pickupCoords && <MarkerF position={pickupCoords} label="P" />}
        {vehiclePosition && (
          <MarkerF
            position={vehiclePosition}
            icon={logoMarkerIcon}
            zIndex={1500}
            title="Protector.ng logo"
          />
        )}
        {destinationCoords && <MarkerF position={destinationCoords} label="D" />}

        {directionsResult ? (
          <DirectionsRenderer
            directions={directionsResult}
            options={{
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: {
                strokeColor: "#3B82F6",
                strokeOpacity: 0.85,
                strokeWeight: 5,
              },
            }}
          />
        ) : validRoutePath.length > 1 && (
          <PolylineF
            path={validRoutePath}
            options={{ strokeColor: "#3B82F6", strokeOpacity: 0.8, strokeWeight: 4 }}
          />
        )}

        {validLocationHistoryPath.length > 1 && (
          <PolylineF
            path={validLocationHistoryPath}
            options={{ strokeColor: "#10B981", strokeOpacity: 0.6, strokeWeight: 2 }}
          />
        )}
      </GoogleMap>
    </div>
  )
}
