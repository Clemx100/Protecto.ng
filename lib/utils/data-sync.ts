/**
 * Data Synchronization Utility
 * 
 * Ensures data consistency between database, localStorage cache, and UI state
 * Prevents stale data from being displayed and validates cache against database
 */

import { createClient } from '@/lib/supabase/client'

const CACHE_PREFIX = 'protector_ng_'
const CACHE_TIMESTAMP_SUFFIX = '_timestamp'
const MAX_CACHE_AGE = 2 * 60 * 1000 // 2 minutes

export interface CacheEntry<T> {
  data: T
  timestamp: number
  userId: string
}

/**
 * Get data from cache with validation
 */
export function getFromCache<T>(key: string, userId: string): T | null {
  try {
    if (typeof window === 'undefined') return null

    const cacheKey = `${CACHE_PREFIX}${key}_${userId}`
    const cached = localStorage.getItem(cacheKey)
    const timestampKey = `${cacheKey}${CACHE_TIMESTAMP_SUFFIX}`
    const timestamp = localStorage.getItem(timestampKey)

    if (!cached || !timestamp) {
      return null
    }

    // Check if cache is still valid
    const age = Date.now() - parseInt(timestamp)
    if (age > MAX_CACHE_AGE) {
      console.log(`⚠️ [Cache] Expired cache for ${key}, age: ${Math.round(age / 1000)}s`)
      removeFromCache(key, userId)
      return null
    }

    console.log(`✅ [Cache] Using cached ${key}, age: ${Math.round(age / 1000)}s`)
    return JSON.parse(cached) as T
  } catch (error) {
    console.warn(`⚠️ [Cache] Error reading cache for ${key}:`, error)
    return null
  }
}

/**
 * Save data to cache with timestamp
 */
export function saveToCache<T>(key: string, data: T, userId: string): void {
  try {
    if (typeof window === 'undefined') return

    const cacheKey = `${CACHE_PREFIX}${key}_${userId}`
    const timestampKey = `${cacheKey}${CACHE_TIMESTAMP_SUFFIX}`
    
    localStorage.setItem(cacheKey, JSON.stringify(data))
    localStorage.setItem(timestampKey, Date.now().toString())
    
    console.log(`💾 [Cache] Saved ${key} to cache`)
  } catch (error) {
    console.warn(`⚠️ [Cache] Error saving cache for ${key}:`, error)
  }
}

/**
 * Remove specific cache entry
 */
export function removeFromCache(key: string, userId: string): void {
  try {
    if (typeof window === 'undefined') return

    const cacheKey = `${CACHE_PREFIX}${key}_${userId}`
    const timestampKey = `${cacheKey}${CACHE_TIMESTAMP_SUFFIX}`
    
    localStorage.removeItem(cacheKey)
    localStorage.removeItem(timestampKey)
    
    console.log(`🗑️ [Cache] Removed ${key} from cache`)
  } catch (error) {
    console.warn(`⚠️ [Cache] Error removing cache for ${key}:`, error)
  }
}

/**
 * Clear all app-related cache
 */
export function clearAllCache(): void {
  try {
    if (typeof window === 'undefined') return

    const keys = Object.keys(localStorage)
    let cleared = 0
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX) || 
          key.startsWith('bookings_') || 
          key.startsWith('profile_') ||
          key.startsWith('chat_messages_')) {
        localStorage.removeItem(key)
        cleared++
      }
    })
    
    console.log(`🗑️ [Cache] Cleared ${cleared} cache entries`)
  } catch (error) {
    console.warn('⚠️ [Cache] Error clearing cache:', error)
  }
}

/**
 * Validate that cached booking IDs still exist in database
 */
export async function validateBookingsCache(
  cachedBookings: any[],
  userId: string
): Promise<any[]> {
  try {
    if (!cachedBookings || cachedBookings.length === 0) {
      return []
    }

    const supabase = createClient()
    const bookingIds = cachedBookings.map(b => b.id)

    console.log(`🔍 [Cache Validation] Validating ${bookingIds.length} cached bookings`)

    // Fetch these specific bookings from database
    const { data: dbBookings, error } = await supabase
      .from('bookings')
      .select('id, status, updated_at')
      .eq('client_id', userId)
      .in('id', bookingIds)

    if (error) {
      console.error('❌ [Cache Validation] Error validating bookings:', error)
      // On error, assume cache is invalid
      return []
    }

    // Create a map of valid booking IDs
    const validIds = new Set(dbBookings?.map(b => b.id) || [])
    
    // Filter cached bookings to only include those that exist in database
    const validBookings = cachedBookings.filter(booking => {
      const isValid = validIds.has(booking.id)
      if (!isValid) {
        console.warn(`⚠️ [Cache Validation] Booking ${booking.id} no longer exists in database`)
      }
      return isValid
    })

    console.log(`✅ [Cache Validation] ${validBookings.length}/${cachedBookings.length} bookings are valid`)
    
    return validBookings
  } catch (error) {
    console.error('❌ [Cache Validation] Unexpected error:', error)
    return []
  }
}

/**
 * Load bookings with proper cache management
 */
export async function loadBookingsWithValidation(userId: string): Promise<{
  active: any[]
  history: any[]
  error: string | null
}> {
  try {
    const supabase = createClient()

    console.log('📥 [Bookings] Loading bookings for user:', userId)

    // Always fetch fresh data from database
    const [activeResult, historyResult] = await Promise.all([
      supabase
        .from('bookings')
        .select('*')
        .eq('client_id', userId)
        .in('status', ['pending', 'accepted', 'en_route', 'arrived', 'in_service'])
        .order('created_at', { ascending: false }),
      
      supabase
        .from('bookings')
        .select('*')
        .eq('client_id', userId)
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false })
    ])

    // Check for errors
    if (activeResult.error) {
      console.error('❌ [Bookings] Error fetching active bookings:', activeResult.error)
      throw new Error(`Failed to fetch active bookings: ${activeResult.error.message}`)
    }

    if (historyResult.error) {
      console.error('❌ [Bookings] Error fetching booking history:', historyResult.error)
      throw new Error(`Failed to fetch booking history: ${historyResult.error.message}`)
    }

    const active = activeResult.data || []
    const history = historyResult.data || []

    console.log(`✅ [Bookings] Loaded ${active.length} active, ${history.length} history bookings from database`)

    // Save to cache for quick access next time
    saveToCache('bookings_active', active, userId)
    saveToCache('bookings_history', history, userId)

    return { active, history, error: null }

  } catch (error) {
    console.error('❌ [Bookings] Failed to load bookings:', error)
    
    // Try to load from cache as fallback, but validate first
    const cachedActive = getFromCache<any[]>('bookings_active', userId)
    const cachedHistory = getFromCache<any[]>('bookings_history', userId)

    if (cachedActive || cachedHistory) {
      console.warn('⚠️ [Bookings] Using cached data as fallback (network error)')
      
      // Validate cache in background (don't await)
      if (cachedActive) {
        validateBookingsCache(cachedActive, userId).then(validated => {
          if (validated.length !== cachedActive.length) {
            saveToCache('bookings_active', validated, userId)
          }
        }).catch(e => console.error('Cache validation failed:', e))
      }

      return {
        active: cachedActive || [],
        history: cachedHistory || [],
        error: 'Using cached data - network connection issue'
      }
    }

    return {
      active: [],
      history: [],
      error: error instanceof Error ? error.message : 'Failed to load bookings'
    }
  }
}

/**
 * Load user profile with validation
 */
export async function loadProfileWithValidation(userId: string): Promise<{
  profile: any | null
  error: string | null
}> {
  try {
    const supabase = createClient()

    console.log('📥 [Profile] Loading profile for user:', userId)

    // Always fetch fresh data from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ [Profile] Error fetching profile:', error)
      throw new Error(`Failed to fetch profile: ${error.message}`)
    }

    if (!profile) {
      console.warn('⚠️ [Profile] Profile not found in database')
      return { profile: null, error: 'Profile not found' }
    }

    console.log('✅ [Profile] Loaded profile from database:', profile.email)

    // Save to cache
    saveToCache('profile', profile, userId)

    return { profile, error: null }

  } catch (error) {
    console.error('❌ [Profile] Failed to load profile:', error)
    
    // Try cache as fallback
    const cachedProfile = getFromCache<any>('profile', userId)
    
    if (cachedProfile) {
      console.warn('⚠️ [Profile] Using cached profile as fallback')
      return {
        profile: cachedProfile,
        error: 'Using cached data - network connection issue'
      }
    }

    return {
      profile: null,
      error: error instanceof Error ? error.message : 'Failed to load profile'
    }
  }
}

/**
 * Clear cache when user logs out
 */
export function clearUserCache(userId: string): void {
  removeFromCache('bookings_active', userId)
  removeFromCache('bookings_history', userId)
  removeFromCache('profile', userId)
  
  // Also clear old-style cache keys
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`bookings_${userId}`)
    localStorage.removeItem(`profile_${userId}`)
    localStorage.removeItem(`profile_${userId}_timestamp`)
  }
  
  console.log('🗑️ [Cache] Cleared all user cache')
}

/**
 * Check if data needs refresh (cache is old or missing)
 */
export function needsRefresh(key: string, userId: string): boolean {
  const cached = getFromCache(key, userId)
  return cached === null
}

