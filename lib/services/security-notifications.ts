import { createServiceRoleClient } from "@/lib/config/database"

type ChannelSettings = Record<string, boolean>

export interface SecurityNotificationPreferences {
  pushSettings: ChannelSettings
  emailSettings: ChannelSettings
  smsSettings: ChannelSettings
  cityWelcomeEnabled: boolean
  nearbySafetyEnabled: boolean
  dailySecurityTipsEnabled: boolean
  bulletproofEducationEnabled: boolean
}

export interface NearbySafetyPlace {
  name: string
  address: string
  latitude: number
  longitude: number
}

export interface CityEntryNotificationInput {
  userId: string
  city?: string | null
  latitude?: number | null
  longitude?: number | null
  source?: string | null
  address?: string | null
  force?: boolean
}

export interface DailyTipNotificationInput {
  userId: string
  source?: string | null
  force?: boolean
}

export interface NotificationCreationResult {
  sent: boolean
  reason?: string
  notification?: {
    id: string
    title: string
    message: string
    type: string
    created_at: string
    data?: any
  }
  nearbyPlaces?: NearbySafetyPlace[]
}

export interface PushSubscriptionInput {
  endpoint: string
  p256dh: string
  auth: string
  platform?: string
  deviceId?: string | null
  userAgent?: string | null
  expirationTime?: number | null
}

export interface PushDispatchPayload {
  title: string
  body: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

export interface PushDispatchResult {
  attempted: number
  sent: number
  failed: number
  skippedReason?: string
}

const supabase = createServiceRoleClient()
let isWebPushConfigured = false

const DEFAULT_PUSH_SETTINGS: ChannelSettings = {
  bookingUpdates: true,
  securityAlerts: true,
  promotionalOffers: false,
  emergencyNotifications: true,
}

const DEFAULT_EMAIL_SETTINGS: ChannelSettings = {
  bookingConfirmations: true,
  securityAlerts: true,
  promotionalOffers: false,
  weeklyDigest: true,
}

const DEFAULT_SMS_SETTINGS: ChannelSettings = {
  emergencyAlerts: true,
  bookingReminders: true,
  promotionalOffers: false,
}

export const DEFAULT_NOTIFICATION_PREFERENCES: SecurityNotificationPreferences = {
  pushSettings: DEFAULT_PUSH_SETTINGS,
  emailSettings: DEFAULT_EMAIL_SETTINGS,
  smsSettings: DEFAULT_SMS_SETTINGS,
  cityWelcomeEnabled: true,
  nearbySafetyEnabled: true,
  dailySecurityTipsEnabled: true,
  bulletproofEducationEnabled: true,
}

const SUPPORTED_CITY_COORDINATES = [
  { name: "Lagos", aliases: ["lagos"], lat: 6.5244, lng: 3.3792 },
  { name: "Abuja", aliases: ["abuja", "fct"], lat: 9.0765, lng: 7.3986 },
  {
    name: "Port Harcourt",
    aliases: ["port harcourt", "port-harcourt", "ph", "rivers"],
    lat: 4.8156,
    lng: 7.0498,
  },
]

const DAILY_SECURITY_TIPS = [
  "Always confirm your route and share trip details with a trusted contact before departure.",
  "Avoid predictable routines when moving between airports, hotels, and meeting points.",
  "Use secure pickup points with lighting, active surveillance, and controlled access.",
  "Keep emergency contacts and support channels reachable on your primary and backup devices.",
  "Do not publicly share real-time travel updates until you are safely at your destination.",
  "During high-risk movement, request professional escort support instead of solo transit.",
]

const BULLETPROOF_TIPS = [
  "Bulletproof vehicles reduce vulnerability during ambush, traffic hold-ups, and forced stops.",
  "Armored transport adds critical survivability during high-threat movement and VIP escort missions.",
  "If threat intelligence changes, switch to armored vehicles and adjust routes before departure.",
]

function toCleanLower(value: string) {
  return value.trim().toLowerCase()
}

function mergeChannelSettings(defaults: ChannelSettings, incoming: unknown): ChannelSettings {
  if (!incoming || typeof incoming !== "object") {
    return { ...defaults }
  }

  const result: ChannelSettings = { ...defaults }
  for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
    if (typeof value === "boolean") {
      result[key] = value
    }
  }

  return result
}

function mapPreferenceRowToModel(row: any): SecurityNotificationPreferences {
  if (!row) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }

  return {
    pushSettings: mergeChannelSettings(DEFAULT_PUSH_SETTINGS, row.push_settings),
    emailSettings: mergeChannelSettings(DEFAULT_EMAIL_SETTINGS, row.email_settings),
    smsSettings: mergeChannelSettings(DEFAULT_SMS_SETTINGS, row.sms_settings),
    cityWelcomeEnabled: row.city_welcome_enabled !== false,
    nearbySafetyEnabled: row.nearby_safety_enabled !== false,
    dailySecurityTipsEnabled: row.daily_security_tips_enabled !== false,
    bulletproofEducationEnabled: row.bulletproof_education_enabled !== false,
  }
}

function toPreferenceRow(
  userId: string,
  preferences: SecurityNotificationPreferences,
): Record<string, unknown> {
  return {
    user_id: userId,
    push_settings: preferences.pushSettings,
    email_settings: preferences.emailSettings,
    sms_settings: preferences.smsSettings,
    city_welcome_enabled: preferences.cityWelcomeEnabled,
    nearby_safety_enabled: preferences.nearbySafetyEnabled,
    daily_security_tips_enabled: preferences.dailySecurityTipsEnabled,
    bulletproof_education_enabled: preferences.bulletproofEducationEnabled,
    updated_at: new Date().toISOString(),
  }
}

export function normalizeCityName(input?: string | null): string | null {
  if (!input) return null
  const normalized = toCleanLower(input)
  if (!normalized) return null

  for (const city of SUPPORTED_CITY_COORDINATES) {
    if (city.aliases.some((alias) => normalized.includes(alias))) {
      return city.name
    }
  }

  return null
}

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

export function detectNearestSupportedCity(
  latitude?: number | null,
  longitude?: number | null,
  maxDistanceKm = 120,
): string | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  let bestCity: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const city of SUPPORTED_CITY_COORDINATES) {
    const distance = haversineDistanceKm(latitude as number, longitude as number, city.lat, city.lng)
    if (distance < bestDistance) {
      bestDistance = distance
      bestCity = city.name
    }
  }

  if (bestDistance > maxDistanceKm) {
    return null
  }

  return bestCity
}

export async function getNotificationPreferences(
  userId: string,
): Promise<SecurityNotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  // Table can be absent before migration is applied.
  if (error) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }

  if (!data) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }

  return mapPreferenceRowToModel(data)
}

export async function upsertNotificationPreferences(
  userId: string,
  partial: Partial<SecurityNotificationPreferences>,
): Promise<SecurityNotificationPreferences> {
  const current = await getNotificationPreferences(userId)

  const next: SecurityNotificationPreferences = {
    pushSettings: partial.pushSettings
      ? mergeChannelSettings(current.pushSettings, partial.pushSettings)
      : current.pushSettings,
    emailSettings: partial.emailSettings
      ? mergeChannelSettings(current.emailSettings, partial.emailSettings)
      : current.emailSettings,
    smsSettings: partial.smsSettings
      ? mergeChannelSettings(current.smsSettings, partial.smsSettings)
      : current.smsSettings,
    cityWelcomeEnabled:
      typeof partial.cityWelcomeEnabled === "boolean"
        ? partial.cityWelcomeEnabled
        : current.cityWelcomeEnabled,
    nearbySafetyEnabled:
      typeof partial.nearbySafetyEnabled === "boolean"
        ? partial.nearbySafetyEnabled
        : current.nearbySafetyEnabled,
    dailySecurityTipsEnabled:
      typeof partial.dailySecurityTipsEnabled === "boolean"
        ? partial.dailySecurityTipsEnabled
        : current.dailySecurityTipsEnabled,
    bulletproofEducationEnabled:
      typeof partial.bulletproofEducationEnabled === "boolean"
        ? partial.bulletproofEducationEnabled
        : current.bulletproofEducationEnabled,
  }

  const { error } = await supabase.from("notification_preferences").upsert(
    toPreferenceRow(userId, next),
    { onConflict: "user_id" },
  )

  if (error) {
    const isSchemaMissing =
      error.code === "42P01" || /notification_preferences|relation .*does not exist/i.test(error.message || "")
    if (isSchemaMissing) {
      throw new Error("Notification preferences storage is not configured. Run scripts/add_security_notifications_schema.sql.")
    }
    throw new Error(error.message || "Failed to save notification preferences")
  }

  return next
}

function getWebPushClient(): any | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:support@protector.ng"

  if (!publicKey || !privateKey) {
    return null
  }

  // Keep lazy require to avoid crashing when dependency isn't present.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const webPush = require("web-push")
  if (!isWebPushConfigured) {
    webPush.setVapidDetails(subject, publicKey, privateKey)
    isWebPushConfigured = true
  }

  return webPush
}

export async function upsertPushSubscription(userId: string, input: PushSubscriptionInput) {
  if (!input.endpoint || !input.p256dh || !input.auth) {
    throw new Error("Push subscription endpoint and keys are required")
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      platform: input.platform || "web",
      device_id: input.deviceId || null,
      user_agent: input.userAgent || null,
      is_active: true,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  )

  if (error) {
    const isSchemaMissing =
      error.code === "42P01" || /push_subscriptions|relation .*does not exist/i.test(error.message || "")
    if (isSchemaMissing) {
      throw new Error("Push subscription storage is not configured. Run scripts/add_security_notifications_schema.sql.")
    }
    throw new Error(error.message || "Failed to save push subscription")
  }
}

export async function removePushSubscription(userId: string, endpoint: string) {
  const { error } = await supabase
    .from("push_subscriptions")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)

  if (error) {
    const isSchemaMissing =
      error.code === "42P01" || /push_subscriptions|relation .*does not exist/i.test(error.message || "")
    if (isSchemaMissing) {
      throw new Error("Push subscription storage is not configured. Run scripts/add_security_notifications_schema.sql.")
    }
    throw new Error(error.message || "Failed to remove push subscription")
  }
}

async function deactivatePushSubscription(endpoint: string) {
  await supabase
    .from("push_subscriptions")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("endpoint", endpoint)
}

async function touchPushSubscription(endpoint: string) {
  await supabase
    .from("push_subscriptions")
    .update({
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("endpoint", endpoint)
}

export async function sendPushNotificationToUser(
  userId: string,
  payload: PushDispatchPayload,
): Promise<PushDispatchResult> {
  const webPush = getWebPushClient()
  if (!webPush) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      skippedReason: "vapid_not_configured",
    }
  }

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("is_active", true)

  // Table can be absent before migration is applied.
  if (error) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      skippedReason: "subscriptions_unavailable",
    }
  }

  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      skippedReason: "no_active_subscriptions",
    }
  }

  let sent = 0
  let failed = 0
  const attempted = subscriptions.length

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/app?tab=account",
    tag: payload.tag || "protector-security-alert",
    data: payload.data || {},
  })

  for (const subscription of subscriptions) {
    try {
      const target = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      }

      await webPush.sendNotification(target, body, {
        TTL: 120,
      })
      sent += 1
      await touchPushSubscription(subscription.endpoint)
    } catch (error: any) {
      failed += 1
      const statusCode = Number(error?.statusCode || 0)
      if (statusCode === 404 || statusCode === 410) {
        await deactivatePushSubscription(subscription.endpoint)
      }
    }
  }

  return {
    attempted,
    sent,
    failed,
  }
}

async function fetchNearbySafetyPlaces(
  latitude?: number | null,
  longitude?: number | null,
): Promise<NearbySafetyPlace[]> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return []
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return []
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json")
    url.searchParams.set("location", `${latitude},${longitude}`)
    url.searchParams.set("radius", "12000")
    url.searchParams.set("type", "police")
    url.searchParams.set("key", apiKey)

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    if (!response.ok) {
      return []
    }

    const payload = await response.json()
    if (!Array.isArray(payload?.results)) {
      return []
    }

    return payload.results.slice(0, 3).map((result: any) => ({
      name: result?.name || "Police location",
      address: result?.vicinity || result?.formatted_address || "Address unavailable",
      latitude: Number(result?.geometry?.location?.lat || 0),
      longitude: Number(result?.geometry?.location?.lng || 0),
    }))
  } catch {
    return []
  }
}

function resolveCityFromSignal({
  city,
  latitude,
  longitude,
  address,
}: {
  city?: string | null
  latitude?: number | null
  longitude?: number | null
  address?: string | null
}) {
  const cityFromBody = normalizeCityName(city)
  if (cityFromBody) return cityFromBody

  const cityFromAddress = normalizeCityName(address)
  if (cityFromAddress) return cityFromAddress

  const cityFromCoordinates = detectNearestSupportedCity(latitude, longitude)
  return cityFromCoordinates
}

async function insertNotificationRow(payload: {
  userId: string
  title: string
  message: string
  type: string
  securityEvent?: string
  source?: string | null
  dedupeKey?: string
  deliveryChannel?: string
  data?: Record<string, unknown>
}) {
  const primaryInsertPayload = {
    user_id: payload.userId,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    security_event: payload.securityEvent || null,
    source: payload.source || null,
    dedupe_key: payload.dedupeKey || null,
    delivery_channel: payload.deliveryChannel || "in_app",
    sent_at: new Date().toISOString(),
    data: payload.data || {},
    is_read: false,
  }

  let { data, error } = await supabase
    .from("notifications")
    .insert(primaryInsertPayload)
    .select("id, title, message, type, created_at, data")
    .single()

  if (error) {
    const fallbackAllowed =
      /security_event|dedupe_key|delivery_channel|sent_at|source|column/i.test(error.message || "") ||
      error.code === "PGRST204"

    if (fallbackAllowed) {
      const fallbackResult = await supabase
        .from("notifications")
        .insert({
          user_id: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          data: payload.data || {},
          is_read: false,
        })
        .select("id, title, message, type, created_at, data")
        .single()

      data = fallbackResult.data
      error = fallbackResult.error
    }
  }

  if (error) {
    throw new Error(error.message || "Failed to insert notification")
  }

  return data
}

async function hasRecentCityWelcome(
  userId: string,
  city: string,
  lookbackHours = 6,
): Promise<boolean> {
  const sinceIso = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("notifications")
    .select("id, data")
    .eq("user_id", userId)
    .eq("type", "city_welcome")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error || !data) {
    return false
  }

  return data.some((notification: any) => {
    const seenCity =
      normalizeCityName(notification?.data?.city) ||
      normalizeCityName(notification?.data?.cityNormalized) ||
      null
    return seenCity === city
  })
}

export async function createCityEntryNotification(
  input: CityEntryNotificationInput,
): Promise<NotificationCreationResult> {
  const city = resolveCityFromSignal(input)
  if (!city) {
    return { sent: false, reason: "city_unresolved" }
  }

  const preferences = await getNotificationPreferences(input.userId)
  if (!preferences.cityWelcomeEnabled) {
    return { sent: false, reason: "city_welcome_disabled" }
  }

  const canSendSecurityPush = preferences.pushSettings.securityAlerts !== false
  if (!canSendSecurityPush) {
    return { sent: false, reason: "security_alerts_disabled" }
  }

  if (!input.force) {
    const alreadySent = await hasRecentCityWelcome(input.userId, city)
    if (alreadySent) {
      return { sent: false, reason: "duplicate_city_welcome" }
    }
  }

  const nearbyPlaces = preferences.nearbySafetyEnabled
    ? await fetchNearbySafetyPlaces(input.latitude, input.longitude)
    : []
  const nearest = nearbyPlaces[0]

  const title = `Welcome to ${city}`
  const messageParts = [`Security tip: remain alert and confirm safe pickup/drop-off points.`]
  if (nearest) {
    messageParts.push(`Nearest police station: ${nearest.name} (${nearest.address}).`)
  }
  messageParts.push(`Need higher protection? Armored vehicles reduce exposure in high-risk movement.`)

  const notification = await insertNotificationRow({
    userId: input.userId,
    title,
    message: messageParts.join(" "),
    type: "city_welcome",
    securityEvent: "city_entry",
    source: input.source || "unknown",
    dedupeKey: `city-entry-${input.userId}-${city.toLowerCase()}-${getDateKey()}`,
    deliveryChannel: "in_app",
    data: {
      category: "security",
      security_event: "city_entry",
      city,
      cityNormalized: city,
      source: input.source || "unknown",
      address: input.address || null,
      coordinates:
        Number.isFinite(input.latitude) && Number.isFinite(input.longitude)
          ? { lat: input.latitude, lng: input.longitude }
          : null,
      nearbySafety: nearbyPlaces,
      generatedAt: new Date().toISOString(),
    },
  })

  return {
    sent: true,
    notification,
    nearbyPlaces,
  }
}

function getTodayUtcStartIso() {
  const now = new Date()
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return startUtc.toISOString()
}

function getDateKey() {
  return new Date().toISOString().split("T")[0]
}

function pickDeterministicTip(source: string[], dateKey: string) {
  const hashSeed = dateKey
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return source[hashSeed % source.length]
}

async function hasTipForToday(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "daily_security_tip")
    .gte("created_at", getTodayUtcStartIso())
    .limit(1)

  if (error) {
    return false
  }

  return Array.isArray(data) && data.length > 0
}

export async function createDailySecurityTipNotification(
  input: DailyTipNotificationInput,
): Promise<NotificationCreationResult> {
  const preferences = await getNotificationPreferences(input.userId)

  if (!preferences.dailySecurityTipsEnabled) {
    return { sent: false, reason: "daily_tips_disabled" }
  }

  if (preferences.pushSettings.securityAlerts === false) {
    return { sent: false, reason: "security_alerts_disabled" }
  }

  if (!input.force) {
    const alreadySent = await hasTipForToday(input.userId)
    if (alreadySent) {
      return { sent: false, reason: "tip_already_sent_today" }
    }
  }

  const dateKey = getDateKey()
  const coreTip = pickDeterministicTip(DAILY_SECURITY_TIPS, dateKey)
  const armorTip = preferences.bulletproofEducationEnabled
    ? pickDeterministicTip(BULLETPROOF_TIPS, dateKey)
    : null

  const title = "Daily Security Tip"
  const message = armorTip ? `${coreTip} ${armorTip}` : coreTip

  const notification = await insertNotificationRow({
    userId: input.userId,
    title,
    message,
    type: "daily_security_tip",
    securityEvent: "daily_tip",
    source: input.source || "unknown",
    dedupeKey: `daily-tip-${input.userId}-${dateKey}`,
    deliveryChannel: "in_app",
    data: {
      category: "security",
      security_event: "daily_tip",
      source: input.source || "unknown",
      dateKey,
      includesBulletproofTip: Boolean(armorTip),
      generatedAt: new Date().toISOString(),
    },
  })

  return {
    sent: true,
    notification,
  }
}
