import { toast } from "sonner"

interface RealtimeNotificationOptions {
  title: string
  description?: string
  tag?: string
}

const DEFAULT_NOTIFICATION_ICON = "/images/PRADO/slideshow/logo.PNG"

const hasBrowserNotificationSupport = (): boolean =>
  typeof window !== "undefined" && "Notification" in window

const showServiceWorkerNotification = async ({
  title,
  description,
  tag,
}: RealtimeNotificationOptions): Promise<boolean> => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    if (!registration || typeof registration.showNotification !== "function") {
      return false
    }

    await registration.showNotification(title, {
      body: description,
      tag,
      icon: DEFAULT_NOTIFICATION_ICON,
      badge: DEFAULT_NOTIFICATION_ICON,
      data: { url: "/operator", source: "foreground-notification" },
    })
    return true
  } catch (error) {
    console.warn("Service worker notification failed:", error)
    return false
  }
}

export const requestNotificationPermissionIfNeeded = async (): Promise<NotificationPermission | "unsupported"> => {
  if (!hasBrowserNotificationSupport()) return "unsupported"

  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission()
    } catch (error) {
      console.warn("Notification permission request failed:", error)
      return Notification.permission
    }
  }

  return Notification.permission
}

const sendBrowserNotification = async ({ title, description, tag }: RealtimeNotificationOptions) => {
  if (!hasBrowserNotificationSupport()) return
  if (Notification.permission !== "granted") return

  const shownByServiceWorker = await showServiceWorkerNotification({ title, description, tag })
  if (shownByServiceWorker) {
    return
  }

  try {
    new Notification(title, {
      body: description,
      tag,
      icon: DEFAULT_NOTIFICATION_ICON,
      badge: DEFAULT_NOTIFICATION_ICON,
    })
  } catch (error) {
    console.warn("Failed to display browser notification:", error)
  }
}

export const notifyRealtimeEvent = (options: RealtimeNotificationOptions) => {
  toast(options.title, {
    description: options.description,
    duration: 6000,
  })

  void sendBrowserNotification(options)
}
