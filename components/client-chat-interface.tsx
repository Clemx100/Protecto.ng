"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react"
import { isVehicleBooking, resolveBookingAvatarImage, resolveBookingDisplayName } from "@/lib/utils/booking-display"
import {
  type OutgoingChatAttachment,
  attachmentMessageLabel,
  formatAudioDuration,
} from "@/lib/utils/chat-media"
import {
  ArrowLeft,
  Camera,
  MessageSquare,
  Mic,
  Paperclip,
  Phone,
  Search,
  Shield,
  Smile,
  Square,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ChatAttachmentContent,
  getAttachmentPreviewLabel,
  isChatAttachmentMessage,
} from "@/components/chat-attachment-content"
import LoadingLogo from "@/components/loading-logo"

export interface ChatBooking {
  id: string
  booking_code?: string
  type: string
  protectorName?: string
  vehicleType?: string
  status: string
  pickupLocation: string
  destination?: string
  service_type?: string
  booking_mode?: string
  protector_count?: number
  startTime?: string
  protectorImage?: string
  date?: string
  dressCode?: string
  special_instructions?: unknown
}

interface ChatMessage {
  id: string
  sender_type: string
  message: string
  created_at: string
  status?: string
  is_system_message?: boolean
  message_type?: string
  metadata?: {
    attachmentType?: "image" | "file" | "audio"
    fileName?: string
    mimeType?: string
    url?: string
    durationSeconds?: number
  }
  has_invoice?: boolean
  invoice_data?: {
    currency?: string
    basePrice?: number
    hourlyRate?: number
    duration?: number
    vehicleFee?: number
    personnelFee?: number
    totalAmount?: number
  }
}

interface ClientChatInterfaceProps {
  activeBookings: ChatBooking[]
  selectedBooking: ChatBooking | null
  chatMessages: ChatMessage[]
  isLoadingChatMessages: boolean
  isCreatingBookingChat: boolean
  newChatMessage: string
  onNewChatMessageChange: (value: string) => void
  onSendMessage: () => void
  onSendAttachment?: (attachment: OutgoingChatAttachment) => Promise<void>
  onSelectBooking: (booking: ChatBooking) => void
  onBackToList: () => void
  onBookProtector: () => void
  onApprovePayment: (invoiceData: ChatMessage["invoice_data"]) => void
  onCallOperator?: () => void
  isSendingMessage: boolean
  messagesEndRef: RefObject<HTMLDivElement | null>
  showThread: boolean
  userInitials?: string
  userAvatarUrl?: string
  onAccountClick?: () => void
}

const OPERATOR_PHONE = "+2347120005328"

const CHAT_EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🙂", "😉",
  "😢", "😭", "😡", "😱", "🤔", "🙏", "👍", "👎", "👋", "🤝",
  "❤️", "💚", "💙", "🔥", "✅", "❌", "⭐", "🎉", "🛡️", "🚗",
  "📍", "📞", "📷", "🎤", "📎", "⏰", "💰", "🇳🇬", "🙌", "💯",
]

function EmojiPickerPanel({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="absolute bottom-full right-0 z-20 mb-2 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-gradient-to-br from-[#1e2433] via-[#171b26] to-[#12151d] p-3 shadow-xl"
      role="dialog"
      aria-label="Emoji picker"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-blue-300/90">Emoji</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-blue-300 hover:underline"
        >
          Close
        </button>
      </div>
      <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto">
        {CHAT_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md text-xl hover:bg-white/10"
            onClick={() => onSelect(emoji)}
            aria-label={`Insert ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

const CHAT_THEME = {
  bg: "#12151d",
  surface: "#1e2433",
  surfaceMid: "#171b26",
  surfaceMuted: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.1)",
  incomingBubble: "#1e2433",
  outgoingBubble: "rgba(59,130,246,0.24)",
  accent: "#93c5fd",
  accentStrong: "#3b82f6",
  accentRing: "rgba(96,165,250,0.35)",
  textPrimary: "#ffffff",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  link: "#7dd3fc",
} as const

const CHAT_GREEN = CHAT_THEME.accentStrong
const CHAT_BG = CHAT_THEME.bg
const INCOMING_BUBBLE = CHAT_THEME.incomingBubble
const OUTGOING_BUBBLE = CHAT_THEME.outgoingBubble

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ""

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "now"
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function getBookingTitle(booking: ChatBooking): string {
  return resolveBookingDisplayName({
    service_type: booking.service_type,
    serviceType: booking.type,
    type: booking.type,
    booking_mode: booking.booking_mode,
    pickupLocation: booking.pickupLocation,
    destination: booking.destination,
    special_instructions: booking.special_instructions,
    protector_count: booking.protector_count,
    dress_code: booking.dressCode,
  })
}

function getBookingAvatar(booking: ChatBooking): string {
  const avatarInput = {
    service_type: booking.service_type,
    serviceType: booking.type,
    type: booking.type,
    booking_mode: booking.booking_mode,
    dress_code: booking.dressCode,
    special_instructions: booking.special_instructions,
    protector_count: booking.protector_count,
  }

  if (isVehicleBooking(avatarInput)) {
    return resolveBookingAvatarImage(avatarInput)
  }

  return booking.protectorImage || resolveBookingAvatarImage(avatarInput)
}

function getBookingSubtitle(booking: ChatBooking): string {
  if (booking.destination) {
    return `${booking.pickupLocation} => ${booking.destination}`
  }
  return booking.pickupLocation
}

function getLastMessagePreview(bookingId: string): { text: string; time: string } | null {
  if (typeof window === "undefined") return null
  try {
    const cached = localStorage.getItem(`chat_messages_${bookingId}`)
    if (!cached) return null
    const messages: ChatMessage[] = JSON.parse(cached)
    if (!messages.length) return null
    const last = messages[messages.length - 1]
    const text = last.is_system_message
      ? "Protection request details"
      : isChatAttachmentMessage(last)
        ? getAttachmentPreviewLabel(last)
        : last.message?.slice(0, 80) || "New message"
    return { text, time: last.created_at }
  } catch {
    return null
  }
}

function getStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/-/g, " ")
}

function Avatar({
  label,
  image,
  size = "md",
  online = false,
  onClick,
}: {
  label: string
  image?: string
  size?: "sm" | "md" | "lg"
  online?: boolean
  onClick?: () => void
}) {
  const sizeClass = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-11 w-11" : "h-12 w-12"
  const initials = label
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const avatarContent = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={label} className={`${sizeClass} rounded-full object-cover`} />
  ) : (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white ring-1 ring-white/10`}
    >
      {initials || "OP"}
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="relative flex-shrink-0 rounded-full transition-opacity hover:opacity-90"
        aria-label="Open account"
      >
        {avatarContent}
        {online && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#12151d] bg-blue-400" />
        )}
      </button>
    )
  }

  return (
    <div className="relative flex-shrink-0">
      {avatarContent}
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#12151d] bg-blue-400" />
      )}
    </div>
  )
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex justify-center py-2">
      <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400">
        {new Date(date).toLocaleDateString([], { month: "short", day: "numeric" })}
      </span>
    </div>
  )
}

function MessageBubble({
  msg,
  index,
  messages,
  onApprovePayment,
  isSendingMessage,
}: {
  msg: ChatMessage
  index: number
  messages: ChatMessage[]
  onApprovePayment: (data: ChatMessage["invoice_data"]) => void
  isSendingMessage: boolean
}) {
  const isClient = msg.sender_type === "client"
  const isSystem = msg.sender_type === "system" || msg.is_system_message
  const prevMessage = index > 0 ? messages[index - 1] : null
  const showDate =
    !prevMessage ||
    new Date(prevMessage.created_at).toDateString() !== new Date(msg.created_at).toDateString()

  if (isSystem) {
    return (
      <>
        {showDate && <DateSeparator date={msg.created_at} />}
        <div className="mx-auto my-3 max-w-[90%] rounded-2xl border border-white/10 bg-gradient-to-br from-[#1e2433] via-[#171b26] to-[#12151d] p-3 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Shield className="h-4 w-4 text-blue-300" />
            <span className="text-sm font-medium text-white">Protection Request</span>
          </div>
          <p className="whitespace-pre-line text-left text-sm leading-relaxed text-gray-200">
            {msg.message}
          </p>
          <p className="mt-2 text-xs text-gray-400">{formatMessageTime(msg.created_at)}</p>
        </div>
      </>
    )
  }

  return (
    <>
      {showDate && <DateSeparator date={msg.created_at} />}
      <div className={`flex ${isClient ? "justify-end" : "justify-start"} px-1`}>
        <div
          className={`relative max-w-[82%] rounded-2xl border px-3 py-2 shadow-sm ${
            isClient
              ? "border-blue-400/20 bg-gradient-to-br from-blue-500/30 to-indigo-500/15"
              : "border-white/10 bg-[#1e2433]"
          }`}
          style={{
            borderTopRightRadius: isClient ? 4 : undefined,
            borderTopLeftRadius: !isClient ? 4 : undefined,
          }}
        >
          <ChatAttachmentContent message={msg} />

          {msg.has_invoice && msg.invoice_data && (
            <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-xs font-semibold text-gray-400">Invoice Details</p>
              <div className="space-y-1 text-xs text-gray-200">
                <div className="flex justify-between gap-4">
                  <span>Base Price</span>
                  <span>
                    {msg.invoice_data.currency === "USD" ? "$" : "₦"}
                    {msg.invoice_data.basePrice?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Hourly ({msg.invoice_data.duration}h)</span>
                  <span>
                    {msg.invoice_data.currency === "USD" ? "$" : "₦"}
                    {((msg.invoice_data.hourlyRate || 0) * (msg.invoice_data.duration || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-t border-white/10 pt-2 font-semibold">
                  <span>Total</span>
                  <span>
                    {msg.invoice_data.currency === "USD" ? "$" : "₦"}
                    {msg.invoice_data.totalAmount?.toLocaleString()}
                  </span>
                </div>
              </div>
              <Button
                onClick={() => onApprovePayment(msg.invoice_data)}
                size="sm"
                className="mt-3 w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-xs text-white hover:opacity-90"
                disabled={isSendingMessage}
              >
                {isSendingMessage ? "Processing..." : "Approve & Pay"}
              </Button>
            </div>
          )}

          <div className="mt-1 flex items-center justify-end gap-1">
            <span className="text-[11px] text-gray-400">{formatMessageTime(msg.created_at)}</span>
            {isClient && (
              <span className="text-[11px]">
                {msg.status === "sending" && <span className="text-gray-400">⏳</span>}
                {msg.status === "sent" && <span className="text-blue-300">✓</span>}
                {(msg.status === "delivered" || msg.status === "read") && (
                  <span className="text-blue-300">✓✓</span>
                )}
                {msg.status === "failed" && <span className="text-red-400">✗</span>}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function ChatListView({
  activeBookings,
  onSelectBooking,
  onBookProtector,
  userInitials,
  userAvatarUrl,
  onAccountClick,
}: {
  activeBookings: ChatBooking[]
  onSelectBooking: (booking: ChatBooking) => void
  onBookProtector: () => void
  userInitials?: string
  userAvatarUrl?: string
  onAccountClick?: () => void
}) {
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return activeBookings

    return activeBookings.filter((booking) => {
      const title = getBookingTitle(booking).toLowerCase()
      const subtitle = getBookingSubtitle(booking).toLowerCase()
      const preview = getLastMessagePreview(booking.id)?.text.toLowerCase() || ""
      return title.includes(query) || subtitle.includes(query) || preview.includes(query)
    })
  }, [activeBookings, searchQuery])

  const totalUnread = useMemo(() => {
    return activeBookings.reduce((sum, booking) => {
      const preview = getLastMessagePreview(booking.id)
      if (!preview) return sum
      return sum + 1
    }, 0)
  }, [activeBookings])

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#12151d] via-[#171b26] to-[#12151d]">
      <div className="px-4 pb-3 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[22px] font-semibold text-white">Chats</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setShowSearch((prev) => {
                  const next = !prev
                  if (!next) setSearchQuery("")
                  return next
                })
              }}
              className={`transition-colors ${showSearch ? "text-white" : "text-blue-300/80 hover:text-white"}`}
              aria-label="Search chats"
            >
              <Search className="h-5 w-5" />
            </button>
            <Avatar
              label={userInitials || "You"}
              image={userAvatarUrl}
              size="sm"
              onClick={onAccountClick}
            />
          </div>
        </div>

        {showSearch && (
          <div className="mb-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-blue-400/40 focus:outline-none"
            />
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <span className="text-sm font-medium text-blue-300">Active</span>
          {totalUnread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-1.5 text-[11px] font-semibold text-white">
              {totalUnread}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeBookings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <MessageSquare className="h-8 w-8 text-blue-300/80" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">No active bookings</h3>
            <p className="mb-6 text-sm text-gray-400">
              Book a protector to start chatting with your assigned operator.
            </p>
            <Button
              onClick={onBookProtector}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 text-white hover:opacity-90"
            >
              Book a Protector
            </Button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-sm text-gray-400">No chats match your search.</p>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const preview = getLastMessagePreview(booking.id)
            const title = getBookingTitle(booking)
            const subtitle = preview?.text || getBookingSubtitle(booking)
            const time = preview ? formatRelativeTime(preview.time) : booking.startTime || ""

            return (
              <button
                key={booking.id}
                type="button"
                onClick={() => onSelectBooking(booking)}
                className="flex w-full items-center gap-3 border-b border-white/10 px-4 py-3 text-left transition-colors hover:bg-white/5"
              >
                <Avatar label={title} image={getBookingAvatar(booking)} online />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-white">{title}</p>
                    <span className="flex-shrink-0 text-xs text-gray-400">{time}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-gray-400">{subtitle}</p>
                    <span className="flex-shrink-0 rounded-full border border-blue-400/20 bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium capitalize text-blue-300">
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function ChatThreadView({
  booking,
  chatMessages,
  isLoadingChatMessages,
  isCreatingBookingChat,
  newChatMessage,
  onNewChatMessageChange,
  onSendMessage,
  onSendAttachment,
  onBackToList,
  onApprovePayment,
  onCallOperator,
  isSendingMessage,
  messagesEndRef,
}: {
  booking: ChatBooking
  chatMessages: ChatMessage[]
  isLoadingChatMessages: boolean
  isCreatingBookingChat: boolean
  newChatMessage: string
  onNewChatMessageChange: (value: string) => void
  onSendMessage: () => void
  onSendAttachment?: (attachment: OutgoingChatAttachment) => Promise<void>
  onBackToList: () => void
  onApprovePayment: (data: ChatMessage["invoice_data"]) => void
  onCallOperator?: () => void
  isSendingMessage: boolean
  messagesEndRef: RefObject<HTMLDivElement | null>
}) {
  const title = getBookingTitle(booking)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  const recordingSecondsRef = useRef(0)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const insertEmoji = useCallback(
    (emoji: string) => {
      onNewChatMessageChange(`${newChatMessage}${emoji}`)
      messageInputRef.current?.focus()
    },
    [newChatMessage, onNewChatMessageChange],
  )

  useEffect(() => {
    if (!showEmojiPicker) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (emojiPickerRef.current?.contains(target)) return
      setShowEmojiPicker(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [showEmojiPicker])

  const handleCall = useCallback(() => {
    if (onCallOperator) {
      onCallOperator()
      return
    }
    if (typeof window !== "undefined") {
      window.location.href = `tel:${OPERATOR_PHONE}`
    }
  }, [onCallOperator])

  const stopRecordingStream = useCallback(() => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
    recordingStreamRef.current = null
  }, [])

  const cancelRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    recordingChunksRef.current = []
    recordingSecondsRef.current = 0
    setRecordingSeconds(0)
    setIsRecording(false)
    stopRecordingStream()
  }, [stopRecordingStream])

  useEffect(() => {
    return () => {
      cancelRecording()
    }
  }, [cancelRecording])

  const sendAttachment = useCallback(
    async (attachment: OutgoingChatAttachment) => {
      if (!onSendAttachment || isUploadingAttachment || isSendingMessage) return
      setIsUploadingAttachment(true)
      try {
        await onSendAttachment(attachment)
      } finally {
        setIsUploadingAttachment(false)
      }
    },
    [isSendingMessage, isUploadingAttachment, onSendAttachment],
  )

  const handleSelectedFiles = useCallback(
    async (files: FileList | null, type: "image" | "file") => {
      if (!files?.length || !onSendAttachment) return
      for (const file of Array.from(files)) {
        await sendAttachment({
          type: file.type.startsWith("image/") ? "image" : type,
          file,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
        })
      }
    },
    [onSendAttachment, sendAttachment],
  )

  const startRecording = useCallback(async () => {
    if (!onSendAttachment || isRecording || isUploadingAttachment) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordingStreamRef.current = stream
      recordingChunksRef.current = []

      const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || ""
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        })
        recordingChunksRef.current = []
        stopRecordingStream()

        if (blob.size === 0) return

        const extension = blob.type.includes("mp4") ? "m4a" : "webm"
        const durationSeconds = recordingSecondsRef.current
        const file = new File([blob], `voice-note-${Date.now()}.${extension}`, { type: blob.type })
        await sendAttachment({
          type: "audio",
          file,
          fileName: file.name,
          mimeType: file.type,
          durationSeconds,
        })
      }

      recorder.start()
      recordingSecondsRef.current = 0
      setRecordingSeconds(0)
      setIsRecording(true)
      recordingTimerRef.current = window.setInterval(() => {
        recordingSecondsRef.current += 1
        setRecordingSeconds(recordingSecondsRef.current)
      }, 1000)
    } catch (error) {
      stopRecordingStream()
      const message = error instanceof Error ? error.message : "Microphone access denied"
      alert(`Unable to record voice note: ${message}`)
    }
  }, [isRecording, isUploadingAttachment, onSendAttachment, sendAttachment, stopRecordingStream])

  const finishRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setIsRecording(false)
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
  }, [])

  const composerDisabled = isSendingMessage || isUploadingAttachment

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#12151d] via-[#171b26] to-[#12151d]">
      <div className="flex items-center gap-3 border-b border-white/10 bg-[#1e2433] px-3 py-3">
        <button
          type="button"
          onClick={onBackToList}
          className="rounded-full p-1 text-blue-300/80 hover:bg-white/10 hover:text-white"
          aria-label="Back to chats"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar label={title} image={getBookingAvatar(booking)} size="lg" online />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">{title}</p>
          <p className="truncate text-xs capitalize text-gray-400">
            {getStatusLabel(booking.status)} • #{booking.booking_code || booking.id.slice(0, 8)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCall}
          className="rounded-full p-2 text-blue-300/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Call operator"
        >
          <Phone className="h-5 w-5" />
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleSelectedFiles(event.target.files, "image")
          event.target.value = ""
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.txt,audio/*,video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleSelectedFiles(event.target.files, "file")
          event.target.value = ""
        }}
      />

      <div
        className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.05) 0%, transparent 50%)",
        }}
      >
        {isLoadingChatMessages && chatMessages.length === 0 && (
          <div className="py-8">
            <LoadingLogo
              fullscreen={false}
              label={isCreatingBookingChat ? "Opening your new booking chat..." : "Loading chat..."}
            />
          </div>
        )}

        {!isLoadingChatMessages && chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="mb-3 h-10 w-10 text-blue-300/70" />
            <p className="text-sm text-gray-400">No messages yet. Say hello to your operator.</p>
          </div>
        )}

        {chatMessages.map((msg, index) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            index={index}
            messages={chatMessages}
            onApprovePayment={onApprovePayment}
            isSendingMessage={isSendingMessage}
          />
        ))}

        {isLoadingChatMessages && chatMessages.length > 0 && (
          <p className="py-2 text-center text-xs text-gray-400">Refreshing...</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/10 bg-[#1e2433] px-3 py-3">
        {isRecording ? (
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3">
            <button
              type="button"
              onClick={cancelRecording}
              className="text-gray-400 hover:text-red-400"
              aria-label="Cancel recording"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm text-white">
                Recording {formatAudioDuration(recordingSeconds)}
              </span>
            </div>
            <button
              type="button"
              onClick={finishRecording}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
              aria-label="Send voice note"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button
              type="button"
              className="pb-2 text-blue-300/80 hover:text-white disabled:opacity-50"
              aria-label="Take photo"
              disabled={composerDisabled || !onSendAttachment}
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-6 w-6" />
            </button>
            <div className="relative flex min-h-[42px] flex-1 items-center rounded-full border border-white/10 bg-white/5 px-4 py-2">
              <input
                ref={messageInputRef}
                type="text"
                value={newChatMessage}
                onChange={(e) => onNewChatMessageChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !composerDisabled && onSendMessage()}
                onFocus={() => setShowEmojiPicker(false)}
                placeholder={isUploadingAttachment ? "Sending attachment..." : "Message"}
                disabled={composerDisabled}
                className="flex-1 bg-transparent text-[15px] text-white placeholder-gray-500 focus:outline-none disabled:opacity-60"
              />
              <div ref={emojiPickerRef} className="relative flex items-center gap-3 pl-2 text-blue-300/80">
                <button
                  type="button"
                  className="hover:text-white disabled:opacity-50"
                  aria-label="Upload file or photo"
                  disabled={composerDisabled || !onSendAttachment}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className={`hover:text-white disabled:opacity-50 ${showEmojiPicker ? "text-white" : ""}`}
                  aria-label="Open emoji picker"
                  aria-expanded={showEmojiPicker}
                  disabled={composerDisabled}
                  onClick={() => setShowEmojiPicker((open) => !open)}
                >
                  <Smile className="h-5 w-5" />
                </button>
                {showEmojiPicker ? (
                  <EmojiPickerPanel
                    onSelect={(emoji) => {
                      insertEmoji(emoji)
                      setShowEmojiPicker(false)
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                ) : null}
              </div>
            </div>
            {newChatMessage.trim() ? (
              <button
                type="button"
                onClick={onSendMessage}
                disabled={composerDisabled}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white disabled:opacity-50"
                aria-label="Send message"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-blue-300/80 hover:text-white disabled:opacity-50"
                aria-label="Record voice note"
                disabled={composerDisabled || !onSendAttachment}
                onClick={() => {
                  void startRecording()
                }}
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ClientChatInterface({
  activeBookings,
  selectedBooking,
  chatMessages,
  isLoadingChatMessages,
  isCreatingBookingChat,
  newChatMessage,
  onNewChatMessageChange,
  onSendMessage,
  onSendAttachment,
  onSelectBooking,
  onBackToList,
  onBookProtector,
  onApprovePayment,
  onCallOperator,
  isSendingMessage,
  messagesEndRef,
  showThread,
  userInitials,
  userAvatarUrl,
  onAccountClick,
}: ClientChatInterfaceProps) {
  if (showThread && selectedBooking) {
    return (
      <ChatThreadView
        booking={selectedBooking}
        chatMessages={chatMessages}
        isLoadingChatMessages={isLoadingChatMessages}
        isCreatingBookingChat={isCreatingBookingChat}
        newChatMessage={newChatMessage}
        onNewChatMessageChange={onNewChatMessageChange}
        onSendMessage={onSendMessage}
        onSendAttachment={onSendAttachment}
        onBackToList={onBackToList}
        onApprovePayment={onApprovePayment}
        onCallOperator={onCallOperator}
        isSendingMessage={isSendingMessage}
        messagesEndRef={messagesEndRef}
      />
    )
  }

  return (
    <div className="relative h-full">
      <ChatListView
        activeBookings={activeBookings}
        onSelectBooking={onSelectBooking}
        onBookProtector={onBookProtector}
        userInitials={userInitials}
        userAvatarUrl={userAvatarUrl}
        onAccountClick={onAccountClick}
      />
    </div>
  )
}
