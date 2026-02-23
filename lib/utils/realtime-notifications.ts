import { toast } from "sonner"

interface RealtimeNotificationOptions {
  title: string
  description?: string
  tag?: string
}

const DEFAULT_NOTIFICATION_ICON = "/icons/icon-192x192.svg"

const hasBrowserNotificationSupport = (): boolean =>
  typeof window !== "undefined" && "Notification" in window

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

const sendBrowserNotification = ({ title, description, tag }: RealtimeNotificationOptions) => {
  if (!hasBrowserNotificationSupport()) return
  if (Notification.permission !== "granted") return

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

  sendBrowserNotification(options)
}

