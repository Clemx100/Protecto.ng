export type QuickServiceType = 'itinerary_planning' | 'private_home_security'

export type HomeSecurityType = 'armed' | 'unarmed'

export type ItineraryPlanRequest = {
  type: 'itinerary_planning'
  description: string
  itineraryFileUrl?: string | null
  itineraryFileName?: string | null
}

export type PrivateHomeSecurityRequest = {
  type: 'private_home_security'
  securityType: HomeSecurityType
  address: string
  protectorCount: number
  protecteeCount: number
  protecteeNames: string[]
}

export type QuickServiceRequest = ItineraryPlanRequest | PrivateHomeSecurityRequest

export const QUICK_SERVICE_LABELS: Record<QuickServiceType, string> = {
  itinerary_planning: "Let's Plan Your Itinerary",
  private_home_security: 'Request Private Home Security',
}
