"use client"

import { useEffect, useState } from "react"
import { CircleF, DirectionsRenderer, GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api"
import { RouteCalculationService, RoutePoint } from "@/lib/services/route-calculation"
import LoadingLogo from "@/components/loading-logo"
import { getMapShellClass, type MapShellVariant } from "@/lib/utils/map-shell"
import {
  getActivityMapMode,
  resolveSiteMapAddress,
  shouldGeocodeDestination,
} from "@/lib/utils/activity-map"
import ActivityMapPlaceholder from "@/components/activity-map-placeholder"

interface BookingDisplay {
  id: string
  booking_code?: string
  pickupLocation: string
  destination?: string
  currentLocation?: { lat: number; lng: number }
  status?: string
  special_instructions?: unknown
}

interface GoogleMapInternalProps {
  booking: BookingDisplay
  bookingLocationsMap: Map<string, { lat: number; lng: number }>
  locationHistory?: { lat: number; lng: number; timestamp: number }[]
  currentSpeed?: number
  variant?: MapShellVariant
}

const PROTECTOR_MAP_LOGO = "/images/PRADO/slideshow/logo.PNG"
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
  variant = "embedded",
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
  const mapMode = getActivityMapMode(booking)
  const isSiteMode = mapMode === "site"
  const isReviewMode = mapMode === "review"
  const rawCurrentLocation = bookingLocationsMap.get(bookingId || "") || booking.currentLocation
  const currentLocation = normalizeLatLng(rawCurrentLocation)
  const vehiclePosition = isSiteMode ? currentLocation : currentLocation || pickupCoords
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

      if (isReviewMode) {
        setIsLoading(false)
        return
      }

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

        const siteAddress = isSiteMode ? resolveSiteMapAddress(booking) : null
        const pickupAddress = siteAddress || booking.pickupLocation

        if (pickupAddress && pickupAddress !== "TBD") {
          const normalizedPickup = await geocodeAddress(pickupAddress)
          if (normalizedPickup) {
            setPickupCoords(normalizedPickup)
          }
        }

        if (!isSiteMode && shouldGeocodeDestination(booking)) {
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
  }, [booking.pickupLocation, booking.destination, booking.special_instructions, isLoaded, isReviewMode, isSiteMode])

  useEffect(() => {
    if (mapMode !== "trip") {
      setDirectionsResult(null)
      setRouteGeometry(null)
      setRouteDistance(0)
      setEta(isSiteMode ? "Awaiting confirmation" : "Under review")
      return
    }

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
  }, [pickupCoords, destinationCoords, currentLocation, currentSpeed, isLoaded, mapMode, isSiteMode])

  useEffect(() => {
    if (!mapInstance || !isNavigationActive || !vehiclePosition || isSiteMode) return

    mapInstance.panTo(vehiclePosition)
    const zoom = typeof mapInstance.getZoom === "function" ? mapInstance.getZoom() : undefined
    if (typeof zoom === "number" && zoom < 15 && typeof mapInstance.setZoom === "function") {
      mapInstance.setZoom(15)
    }
  }, [mapInstance, isNavigationActive, vehiclePosition, isSiteMode])

  useEffect(() => {
    if (!vehiclePosition || isSiteMode) return

    const pulseInterval = setInterval(() => {
      setIsSuvPulseExpanded((prev) => !prev)
    }, 900)

    return () => {
      clearInterval(pulseInterval)
    }
  }, [Boolean(vehiclePosition), isSiteMode])

  const logoMarkerIcon =
    isLoaded && typeof window !== "undefined" && (window as any).google?.maps
      ? {
          url: PROTECTOR_MAP_LOGO,
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

  const siteLogoMarkerIcon =
    isLoaded && typeof window !== "undefined" && (window as any).google?.maps
      ? {
          url: PROTECTOR_MAP_LOGO,
          scaledSize: new (window as any).google.maps.Size(40, 40),
          anchor: new (window as any).google.maps.Point(20, 20),
        }
      : undefined

  const suvPulseRadiusMeters = isSuvPulseExpanded ? 42 : 24

  const mapCenter = isSiteMode
    ? pickupCoords || { lat: 6.5244, lng: 3.3792 }
    : (isNavigationActive && vehiclePosition) ||
      vehiclePosition ||
      pickupCoords ||
      destinationCoords ||
      { lat: 6.5244, lng: 3.3792 }

  const mapShellClass = getMapShellClass(variant)

  if (isReviewMode) {
    return <ActivityMapPlaceholder mode="review" variant={variant} />
  }

  const validRoutePath = (routeGeometry || [])
    .map(([lng, lat]) => normalizeLatLng({ lat, lng }))
    .filter((point): point is RoutePoint => point !== null)
    .map((point) => ({ lat: point.lat, lng: point.lng }))

  const validLocationHistoryPath = locationHistory
    .map((point) => normalizeLatLng(point))
    .filter((point): point is RoutePoint => point !== null)
    .map((point) => ({ lat: point.lat, lng: point.lng }))

  const shouldShowPickupPin = Boolean(
    !isSiteMode &&
      pickupCoords &&
      currentLocation &&
      RouteCalculationService.calculateDistance(pickupCoords, currentLocation) > 60,
  )

  if (loadError) {
    return (
      <div className={mapShellClass}>
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
      <div className={mapShellClass}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-green-900/20 flex items-center justify-center">
          <LoadingLogo fullscreen={false} label="Loading map..." />
        </div>
      </div>
    )
  }

  if (isSiteMode && !pickupCoords) {
    return <ActivityMapPlaceholder mode="site" variant={variant} />
  }

  if (!pickupCoords && !currentLocation && !destinationCoords) {
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

  return (
    <div className={mapShellClass}>
      <div className="absolute top-2 left-2 z-10 rounded bg-black/70 px-2 py-1 text-xs text-white">
        {isSiteMode ? (
          <div>Awaiting operator confirmation</div>
        ) : (
          <div className="space-y-1">
            {routeDistance > 0 && <div>Distance: {RouteCalculationService.formatDistance(routeDistance)}</div>}
            <div>ETA: {eta}</div>
          </div>
        )}
      </div>

      {!isSiteMode ? (
        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            onClick={() => setIsNavigationActive((prev) => !prev)}
            className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
              isNavigationActive
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isNavigationActive ? "Navigation On" : "Start Navigation"}
          </button>
        </div>
      ) : null}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={isSiteMode ? 15 : isNavigationActive ? 15 : 13}
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
        {isSiteMode && pickupCoords ? (
          <>
            <CircleF
              center={pickupCoords}
              radius={120}
              options={{
                fillColor: "#10B981",
                fillOpacity: 0.12,
                strokeColor: "#34D399",
                strokeOpacity: 0.65,
                strokeWeight: 2,
                clickable: false,
              }}
            />
            <MarkerF
              position={pickupCoords}
              icon={siteLogoMarkerIcon}
              zIndex={1500}
              title="Protector.ng — Service location"
            />
          </>
        ) : null}
        {!isSiteMode && vehiclePosition && (
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
        {!isSiteMode && vehiclePosition && (
          <MarkerF
            position={vehiclePosition}
            icon={logoMarkerIcon}
            zIndex={1500}
            title="Protector.ng logo"
          />
        )}
        {!isSiteMode && destinationCoords && <MarkerF position={destinationCoords} label="D" />}

        {!isSiteMode && directionsResult ? (
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
        ) : !isSiteMode && validRoutePath.length > 1 ? (
          <PolylineF
            path={validRoutePath}
            options={{ strokeColor: "#3B82F6", strokeOpacity: 0.8, strokeWeight: 4 }}
          />
        ) : null}

        {!isSiteMode && validLocationHistoryPath.length > 1 && (
          <PolylineF
            path={validLocationHistoryPath}
            options={{ strokeColor: "#10B981", strokeOpacity: 0.6, strokeWeight: 2 }}
          />
        )}
      </GoogleMap>
    </div>
  )
}
