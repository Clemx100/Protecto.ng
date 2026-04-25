import { NextRequest, NextResponse } from "next/server"
import { getRequestUserContext } from "@/lib/auth/requestUser"
import {
  removePushSubscription,
  sendPushNotificationToUser,
  upsertPushSubscription,
} from "@/lib/services/security-notifications"
import type { PushSubscriptionRequestPayload } from "@/lib/types/security-notifications"

export const runtime = "nodejs"

function normalizeAction(value: unknown): PushSubscriptionRequestPayload["action"] {
  if (value === "unsubscribe") return "unsubscribe"
  if (value === "send-test") return "send-test"
  return "subscribe"
}

export async function POST(request: NextRequest) {
  try {
    const requestUser = await getRequestUserContext(request)
    if (!requestUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = (await request.json().catch(() => ({}))) as Partial<PushSubscriptionRequestPayload>
    const action = normalizeAction(payload.action)

    if (action === "subscribe") {
      const endpoint = payload.subscription?.endpoint?.trim()
      const p256dh = payload.subscription?.keys?.p256dh?.trim()
      const auth = payload.subscription?.keys?.auth?.trim()

      if (!endpoint || !p256dh || !auth) {
        return NextResponse.json(
          { error: "Push subscription endpoint and keys are required." },
          { status: 400 },
        )
      }

      await upsertPushSubscription(requestUser.id, {
        endpoint,
        p256dh,
        auth,
        platform: payload.platform || "web",
        deviceId: payload.deviceId || null,
        userAgent: payload.userAgent || request.headers.get("user-agent"),
        expirationTime:
          typeof payload.subscription?.expirationTime === "number"
            ? payload.subscription.expirationTime
            : null,
      })

      return NextResponse.json({
        success: true,
        message: "Push subscription registered.",
      })
    }

    if (action === "unsubscribe") {
      const endpoint = payload.endpoint || payload.subscription?.endpoint
      if (!endpoint) {
        return NextResponse.json(
          { error: "Subscription endpoint is required for unsubscribe." },
          { status: 400 },
        )
      }

      await removePushSubscription(requestUser.id, endpoint)
      return NextResponse.json({
        success: true,
        message: "Push subscription removed.",
      })
    }

    const dispatch = await sendPushNotificationToUser(requestUser.id, {
      title: "Protector.Ng Notification Test",
      body: "Push notifications are active. You will receive city-entry and daily security alerts.",
      url: "/app?tab=account",
      tag: "protector-push-test",
      data: {
        category: "system",
        source: "push-subscription-test",
      },
    })

    return NextResponse.json({
      success: true,
      message: "Push test dispatch complete.",
      dispatch,
    })
  } catch (error: any) {
    console.error("Push subscriptions route error:", error)
    return NextResponse.json(
      {
        error: "Failed to process push subscription request.",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
