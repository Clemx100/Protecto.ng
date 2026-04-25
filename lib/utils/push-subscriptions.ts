type PushRegistrationResult =
  | { ok: true; subscription: PushSubscription }
  | { ok: false; reason: string }

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

export async function registerPushSubscription(): Promise<PushRegistrationResult> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "window_unavailable" }
  }

  if (!("serviceWorker" in navigator)) {
    return { ok: false, reason: "service_worker_unsupported" }
  }

  if (!("PushManager" in window)) {
    return { ok: false, reason: "push_manager_unsupported" }
  }

  if (!("Notification" in window) || Notification.permission !== "granted") {
    return { ok: false, reason: "notification_permission_not_granted" }
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    return { ok: false, reason: "missing_vapid_public_key" }
  }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
  }

  const payload = subscription.toJSON()
  const response = await fetch("/api/notifications/push-subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "subscribe",
      platform: "web",
      userAgent: navigator.userAgent,
      subscription: {
        endpoint: payload.endpoint,
        expirationTime: payload.expirationTime ?? null,
        keys: payload.keys,
      },
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    return { ok: false, reason: data?.error || "subscription_api_failed" }
  }

  return { ok: true, subscription }
}

export async function unregisterPushSubscription(): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "push_not_supported" }
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    return { ok: true }
  }

  const endpoint = subscription.endpoint
  await subscription.unsubscribe().catch(() => null)

  const response = await fetch("/api/notifications/push-subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "unsubscribe",
      endpoint,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    return { ok: false, reason: data?.error || "unsubscribe_api_failed" }
  }

  return { ok: true }
}

export async function sendPushTestNotification(): Promise<{ ok: boolean; reason?: string }> {
  const response = await fetch("/api/notifications/push-subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "send-test",
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    return { ok: false, reason: data?.error || "push_test_failed" }
  }

  return { ok: true }
}
