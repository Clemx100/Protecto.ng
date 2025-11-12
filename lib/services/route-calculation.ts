// Route calculation service using OpenRouteService API (free tier available)
// Alternative: Can use Google Directions API, Mapbox Directions API, etc.

export interface RoutePoint {
  lat: number
  lng: number
}

export interface RouteSegment {
  distance: number // in meters
  duration: number // in seconds
  geometry: [number, number][] // [lng, lat] coordinates
}

export interface RouteResult {
  distance: number // total distance in meters
  duration: number // total duration in seconds
  geometry: [number, number][] // full route geometry
  segments: RouteSegment[]
}

export class RouteCalculationService {
  private static readonly OPENROUTESERVICE_BASE_URL = 'https://api.openrouteservice.org/v2'
  // Note: For production, you should use an API key from https://openrouteservice.org/
  // For now, we'll use a free approach or fallback to straight-line calculation
  
  /**
   * Calculate route between two points
   * Uses OpenRouteService API (free tier available) or falls back to straight-line calculation
   * @param start - Starting point
   * @param end - Ending point
   * @param waypoints - Optional waypoints
   * @returns Route result with distance, duration, and geometry
   */
  static async calculateRoute(
    start: RoutePoint,
    end: RoutePoint,
    waypoints?: RoutePoint[]
  ): Promise<RouteResult | null> {
    try {
      // Try to use OpenRouteService API if available
      // Note: For production, you should get a free API key from https://openrouteservice.org/
      const apiKey = process.env.NEXT_PUBLIC_OPENROUTESERVICE_API_KEY
      
      if (apiKey) {
        try {
          // Build coordinates array: [lng, lat] format for OpenRouteService
          const coordinates: number[][] = [[start.lng, start.lat]]
          
          // Add waypoints if provided
          if (waypoints && waypoints.length > 0) {
            waypoints.forEach(wp => coordinates.push([wp.lng, wp.lat]))
          }
          
          // Add destination
          coordinates.push([end.lng, end.lat])
          
          const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}`
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              coordinates,
              format: 'geojson'
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.features && data.features.length > 0) {
              const route = data.features[0]
              const geometry = route.geometry.coordinates as [number, number][]
              const properties = route.properties
              
              return {
                distance: properties.segments[0].distance,
                duration: properties.segments[0].duration,
                geometry,
                segments: properties.segments.map((seg: any) => ({
                  distance: seg.distance,
                  duration: seg.duration,
                  geometry: geometry.slice(seg.way_points[0], seg.way_points[1] + 1)
                }))
              }
            }
          }
        } catch (apiError) {
          console.warn('OpenRouteService API error, falling back to straight-line calculation:', apiError)
        }
      }
      
      // Fallback: Calculate straight-line distance and estimated time
      const distance = this.calculateDistance(start, end)
      const estimatedDuration = this.estimateDuration(distance)
      
      // Generate simple route geometry (straight line with waypoints)
      const geometry: [number, number][] = [[start.lng, start.lat]]
      
      // Add waypoints if provided
      if (waypoints && waypoints.length > 0) {
        waypoints.forEach(waypoint => {
          geometry.push([waypoint.lng, waypoint.lat])
        })
      }
      
      geometry.push([end.lng, end.lat])
      
      return {
        distance,
        duration: estimatedDuration,
        geometry,
        segments: [{
          distance,
          duration: estimatedDuration,
          geometry
        }]
      }
    } catch (error) {
      console.error('Route calculation error:', error)
      return null
    }
  }
  
  /**
   * Calculate route with current location as waypoint
   */
  static async calculateRouteWithCurrentLocation(
    pickup: RoutePoint,
    current: RoutePoint,
    destination: RoutePoint
  ): Promise<RouteResult | null> {
    return this.calculateRoute(pickup, destination, [current])
  }
  
  /**
   * Calculate distance between two points using Haversine formula
   * @returns Distance in meters
   */
  static calculateDistance(point1: RoutePoint, point2: RoutePoint): number {
    const R = 6371000 // Earth's radius in meters
    const dLat = (point2.lat - point1.lat) * Math.PI / 180
    const dLng = (point2.lng - point1.lng) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }
  
  /**
   * Estimate duration based on distance
   * Assumes average speed of 30 km/h in city, 60 km/h on highway
   * @param distance - Distance in meters
   * @returns Estimated duration in seconds
   */
  static estimateDuration(distance: number): number {
    // Average speed: 30 km/h = 8.33 m/s for city driving
    const averageSpeed = 8.33 // meters per second
    return Math.round(distance / averageSpeed)
  }
  
  /**
   * Calculate ETA based on current speed and remaining distance
   * @param remainingDistance - Remaining distance in meters
   * @param currentSpeed - Current speed in km/h
   * @returns ETA in seconds
   */
  static calculateETA(remainingDistance: number, currentSpeed: number): number {
    if (currentSpeed <= 0) {
      // If not moving, use average speed estimate
      return this.estimateDuration(remainingDistance)
    }
    
    // Convert km/h to m/s
    const speedMs = currentSpeed / 3.6
    return Math.round(remainingDistance / speedMs)
  }
  
  /**
   * Format duration to human-readable string
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`
    } else if (seconds < 3600) {
      const minutes = Math.round(seconds / 60)
      return `${minutes} min${minutes !== 1 ? 's' : ''}`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.round((seconds % 3600) / 60)
      if (minutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`
      }
      return `${hours}h ${minutes}m`
    }
  }
  
  /**
   * Format distance to human-readable string
   */
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`
    } else {
      const km = (meters / 1000).toFixed(1)
      return `${km}km`
    }
  }
}

