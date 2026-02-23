// Geocoding service for converting addresses to coordinates
// Uses OpenStreetMap Nominatim API (free, no API key required)

export interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
  address?: {
    road?: string
    city?: string
    state?: string
    country?: string
    postcode?: string
  }
}

export class GeocodingService {
  private static readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'
  private static readonly CACHE_KEY_PREFIX = 'geocode_cache_'
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Search location suggestions for autocomplete-style inputs.
   * Uses a city/country context to produce more accurate local results.
   */
  static async searchSuggestions(
    query: string,
    options: { city?: string; countryCode?: string; limit?: number } = {},
  ): Promise<GeocodeResult[]> {
    const normalizedQuery = query?.trim()
    if (!normalizedQuery || normalizedQuery.length < 2) {
      return []
    }

    const cityContext = options.city?.trim()
    const countryCode = (options.countryCode || 'ng').toLowerCase()
    const limit = Math.max(1, Math.min(10, options.limit || 6))

    // Add contextual hints so results look more like ride-hailing search behavior.
    const contextualQuery = cityContext
      ? `${normalizedQuery}, ${cityContext}, Nigeria`
      : `${normalizedQuery}, Nigeria`

    try {
      const encodedQuery = encodeURIComponent(contextualQuery)
      const url = `${this.NOMINATIM_BASE_URL}/search?format=json&q=${encodedQuery}&limit=${limit}&addressdetails=1&countrycodes=${encodeURIComponent(countryCode)}`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Protector.Ng/1.0'
        }
      })

      if (!response.ok) {
        console.warn('Suggestion search API error:', response.statusText)
        return []
      }

      const data = await response.json()
      if (!Array.isArray(data) || data.length === 0) {
        return []
      }

      // Deduplicate by display name + coordinates while preserving order.
      const seen = new Set<string>()
      const suggestions: GeocodeResult[] = []

      for (const item of data) {
        const lat = parseFloat(item.lat)
        const lng = parseFloat(item.lon)
        const displayName = item.display_name || ''

        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !displayName) {
          continue
        }

        const dedupeKey = `${displayName}|${lat.toFixed(6)}|${lng.toFixed(6)}`
        if (seen.has(dedupeKey)) {
          continue
        }
        seen.add(dedupeKey)

        suggestions.push({
          lat,
          lng,
          displayName,
          address: item.address || {}
        })
      }

      return suggestions
    } catch (error) {
      console.error('Suggestion search error:', error)
      return []
    }
  }

  /**
   * Geocode an address to coordinates
   * @param address - The address to geocode
   * @returns Promise with geocoded coordinates or null if not found
   */
  static async geocode(address: string): Promise<GeocodeResult | null> {
    if (!address || address.trim() === '') {
      return null
    }

    // Check cache first
    const cached = this.getFromCache(address)
    if (cached) {
      return cached
    }

    try {
      // Use Nominatim API (OpenStreetMap)
      const encodedAddress = encodeURIComponent(address)
      const url = `${this.NOMINATIM_BASE_URL}/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Protector.Ng/1.0' // Required by Nominatim
        }
      })

      if (!response.ok) {
        console.warn('Geocoding API error:', response.statusText)
        return null
      }

      const data = await response.json()

      if (!data || data.length === 0) {
        console.warn('No geocoding results for:', address)
        return null
      }

      const result = data[0]
      const geocodeResult: GeocodeResult = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name,
        address: result.address || {}
      }

      // Cache the result
      this.saveToCache(address, geocodeResult)

      return geocodeResult
    } catch (error) {
      console.error('Geocoding error:', error)
      return null
    }
  }

  /**
   * Reverse geocode coordinates to an address
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise with address or null if not found
   */
  static async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
    try {
      const url = `${this.NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Protector.Ng/1.0'
        }
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()

      if (!data || !data.lat || !data.lon) {
        return null
      }

      return {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
        displayName: data.display_name,
        address: data.address || {}
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      return null
    }
  }

  /**
   * Batch geocode multiple addresses
   * @param addresses - Array of addresses to geocode
   * @returns Promise with array of geocoded results
   */
  static async batchGeocode(addresses: string[]): Promise<(GeocodeResult | null)[]> {
    // Rate limit: Nominatim allows 1 request per second
    const results: (GeocodeResult | null)[] = []

    for (const address of addresses) {
      const result = await this.geocode(address)
      results.push(result)
      
      // Wait 1 second between requests to respect rate limits
      if (addresses.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return results
  }

  /**
   * Get from cache
   */
  private static getFromCache(address: string): GeocodeResult | null {
    if (typeof window === 'undefined') return null

    try {
      const cacheKey = this.CACHE_KEY_PREFIX + address.toLowerCase().trim()
      const cached = localStorage.getItem(cacheKey)
      
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)
      const age = Date.now() - timestamp

      if (age > this.CACHE_DURATION) {
        localStorage.removeItem(cacheKey)
        return null
      }

      return data
    } catch (error) {
      return null
    }
  }

  /**
   * Save to cache
   */
  private static saveToCache(address: string, result: GeocodeResult): void {
    if (typeof window === 'undefined') return

    try {
      const cacheKey = this.CACHE_KEY_PREFIX + address.toLowerCase().trim()
      const cacheData = {
        data: result,
        timestamp: Date.now()
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      // Cache is full or unavailable, ignore
    }
  }

  /**
   * Clear geocoding cache
   */
  static clearCache(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Error clearing geocoding cache:', error)
    }
  }
}

