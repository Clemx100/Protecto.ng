import { NextRequest, NextResponse } from "next/server"
import { getRequestUserContext } from "@/lib/auth/requestUser"
import {
  getNotificationPreferences,
  SecurityNotificationPreferences,
  upsertNotificationPreferences,
} from "@/lib/services/security-notifications"

export const runtime = "nodejs"

type PreferencesPayload = Partial<SecurityNotificationPreferences>

function sanitizeChannelSettings(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined
  }

  const result: Record<string, boolean> = {}
  for (const [key, settingValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof settingValue === "boolean") {
      result[key] = settingValue
    }
  }

  return result
}

function sanitizePreferencesPayload(payload: PreferencesPayload): Partial<SecurityNotificationPreferences> {
  const sanitized: Partial<SecurityNotificationPreferences> = {}

  const pushSettings = sanitizeChannelSettings(payload.pushSettings)
  if (pushSettings) sanitized.pushSettings = pushSettings

  const emailSettings = sanitizeChannelSettings(payload.emailSettings)
  if (emailSettings) sanitized.emailSettings = emailSettings

  const smsSettings = sanitizeChannelSettings(payload.smsSettings)
  if (smsSettings) sanitized.smsSettings = smsSettings

  if (typeof payload.cityWelcomeEnabled === "boolean") {
    sanitized.cityWelcomeEnabled = payload.cityWelcomeEnabled
  }
  if (typeof payload.nearbySafetyEnabled === "boolean") {
    sanitized.nearbySafetyEnabled = payload.nearbySafetyEnabled
  }
  if (typeof payload.dailySecurityTipsEnabled === "boolean") {
    sanitized.dailySecurityTipsEnabled = payload.dailySecurityTipsEnabled
  }
  if (typeof payload.bulletproofEducationEnabled === "boolean") {
    sanitized.bulletproofEducationEnabled = payload.bulletproofEducationEnabled
  }

  return sanitized
}

export async function GET(request: NextRequest) {
  try {
    const requestUser = await getRequestUserContext(request)
    if (!requestUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const preferences = await getNotificationPreferences(requestUser.id)
    return NextResponse.json({
      success: true,
      preferences,
    })
  } catch (error: any) {
    console.error("Notification preferences GET route error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch notification preferences",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const requestUser = await getRequestUserContext(request)
    if (!requestUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = (await request.json().catch(() => ({}))) as PreferencesPayload
    const sanitizedPayload = sanitizePreferencesPayload(payload)

    const updated = await upsertNotificationPreferences(requestUser.id, sanitizedPayload)
    return NextResponse.json({
      success: true,
      preferences: updated,
      message: "Notification preferences saved successfully.",
    })
  } catch (error: any) {
    console.error("Notification preferences PUT route error:", error)
    return NextResponse.json(
      {
        error: "Failed to save notification preferences",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
