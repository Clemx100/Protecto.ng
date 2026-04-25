import { NextRequest, NextResponse } from "next/server"
import { getRequestUserContext } from "@/lib/auth/requestUser"
import {
  createDailySecurityTipNotification,
  NotificationCreationResult,
  sendPushNotificationToUser,
} from "@/lib/services/security-notifications"

export const runtime = "nodejs"

type DailyTipPayload = {
  source?: string | null
  force?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const requestUser = await getRequestUserContext(request)
    if (!requestUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = (await request.json().catch(() => ({}))) as DailyTipPayload

    const result: NotificationCreationResult = await createDailySecurityTipNotification({
      userId: requestUser.id,
      source: typeof payload.source === "string" ? payload.source.trim() : "client",
      force: Boolean(payload.force),
    })

    let pushDispatch: any = null
    if (result.sent && result.notification) {
      pushDispatch = await sendPushNotificationToUser(requestUser.id, {
        title: result.notification.title,
        body: result.notification.message,
        url: "/app?tab=account",
        tag: "daily-security-tip",
        data: {
          type: result.notification.type,
          source: "daily-tip-api",
        },
      })
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      reason: result.reason || null,
      notification: result.notification || null,
      pushDispatch,
    })
  } catch (error: any) {
    console.error("Daily security tip route error:", error)
    return NextResponse.json(
      {
        error: "Failed to process daily security tip",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
