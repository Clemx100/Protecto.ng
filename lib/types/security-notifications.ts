export type SupportedSecurityCity = "Lagos" | "Abuja" | "Port Harcourt"

export interface SecurityCoordinates {
  latitude: number
  longitude: number
  accuracyMeters?: number
  headingDegrees?: number
  speedMetersPerSecond?: number
}

export interface NativeCityEntryEventPayload {
  eventId: string
  city?: string
  address?: string
  source: "native-geofence" | "native-gps" | "foreground-geolocation" | "manual"
  platform: "android" | "ios" | "web"
  geofenceTransition: "enter" | "dwell"
  occurredAt: string
  coordinates?: SecurityCoordinates
  deviceId?: string
  appVersion?: string
  force?: boolean
}

export interface DailyTipRequestPayload {
  source?: string
  force?: boolean
}

export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface PushSubscriptionPayload {
  endpoint: string
  expirationTime?: number | null
  keys: PushSubscriptionKeys
}

export interface PushSubscriptionRequestPayload {
  action: "subscribe" | "unsubscribe" | "send-test"
  platform?: "android" | "ios" | "web"
  deviceId?: string
  userAgent?: string
  endpoint?: string
  subscription?: PushSubscriptionPayload
}
