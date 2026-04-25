import { NextRequest, NextResponse } from "next/server"
import { getRequestUserContext } from "@/lib/auth/requestUser"
import {
  createCityEntryNotification,
  NotificationCreationResult,
  sendPushNotificationToUser,
} from "@/lib/services/security-notifications"

export const runtime = "nodejs"

type CityEntryPayload = {
  city?: string
  latitude?: number | string | null
  longitude?: number | string | null
  address?: string | null
  source?: string | null
  force?: boolean
}

function toNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const requestUser = await getRequestUserContext(request)
    if (!requestUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = (await request.json().catch(() => ({}))) as CityEntryPayload

    const result: NotificationCreationResult = await createCityEntryNotification({
      userId: requestUser.id,
      city: typeof payload.city === "string" ? payload.city.trim() : null,
      latitude: toNumberOrNull(payload.latitude),
      longitude: toNumberOrNull(payload.longitude),
      address: typeof payload.address === "string" ? payload.address.trim() : null,
      source: typeof payload.source === "string" ? payload.source.trim() : "client",
      force: Boolean(payload.force),
    })

    let pushDispatch: any = null
    if (result.sent && result.notification) {
      const cityTagValue = String(result.notification.data?.city || "city")
      pushDispatch = await sendPushNotificationToUser(requestUser.id, {
        title: result.notification.title,
        body: result.notification.message,
        url: "/app?tab=booking",
        tag: `city-entry-${cityTagValue.toLowerCase().replace(/\s+/g, "-")}`,
        data: {
          type: result.notification.type,
          city: result.notification.data?.city || null,
          source: "city-entry-api",
        },
      })
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      reason: result.reason || null,
      notification: result.notification || null,
      nearbyPlaces: result.nearbyPlaces || [],
      pushDispatch,
    })
  } catch (error: any) {
    console.error("City-entry notification route error:", error)
    return NextResponse.json(
      {
        error: "Failed to process city-entry notification",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
