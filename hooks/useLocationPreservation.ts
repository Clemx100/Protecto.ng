import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Custom hook to preserve user's current location in sessionStorage
 * This ensures that when a user refreshes the page, they can be redirected back
 * to their original location after authentication
 */
export function useLocationPreservation() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Only store location for actual app pages, not API routes or static assets
    if (
      pathname &&
      !pathname.startsWith('/api') &&
      !pathname.startsWith('/_next') &&
      !pathname.startsWith('/favicon') &&
      pathname !== '/'
    ) {
      const currentLocation = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
      
      // Store the current location in sessionStorage
      sessionStorage.setItem('lastVisitedLocation', currentLocation)
      console.log('📍 Location preserved:', currentLocation)
    }
  }, [pathname, searchParams])

  /**
   * Get the last visited location from sessionStorage
   */
  const getLastVisitedLocation = (): string | null => {
    return sessionStorage.getItem('lastVisitedLocation')
  }

  /**
   * Clear the stored location
   */
  const clearStoredLocation = (): void => {
    sessionStorage.removeItem('lastVisitedLocation')
  }

  return {
    getLastVisitedLocation,
    clearStoredLocation
  }
}

