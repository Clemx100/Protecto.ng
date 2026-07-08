import { Paperclip } from "lucide-react"
import { formatAudioDuration } from "@/lib/utils/chat-media"

export type ChatAttachmentMetadata = {
  attachmentType?: "image" | "file" | "audio"
  fileName?: string
  mimeType?: string
  url?: string
  durationSeconds?: number
}

export type ChatAttachmentMessage = {
  message?: string
  message_type?: string
  metadata?: ChatAttachmentMetadata | null
}

export function isChatAttachmentMessage(message: ChatAttachmentMessage): boolean {
  const type = message.metadata?.attachmentType || message.message_type
  return (
    Boolean(message.metadata?.url) ||
    type === "image" ||
    type === "audio" ||
    type === "file"
  )
}

export function getAttachmentPreviewLabel(message: ChatAttachmentMessage): string {
  const attachment = message.metadata
  const type = attachment?.attachmentType || message.message_type

  if (type === "image") return "Photo"
  if (type === "audio") {
    return attachment?.durationSeconds
      ? `Voice message (${formatAudioDuration(attachment.durationSeconds)})`
      : "Voice message"
  }
  if (type === "file") return attachment?.fileName || message.message || "File"
  return message.message || "Attachment"
}

export function ChatAttachmentContent({
  message,
  textClassName = "whitespace-pre-wrap text-[15px] leading-snug text-gray-100",
  captionClassName = "mt-1 text-xs text-gray-400",
  linkClassName = "flex items-center gap-2 text-[15px] text-blue-300 underline-offset-2 hover:underline",
}: {
  message: ChatAttachmentMessage
  textClassName?: string
  captionClassName?: string
  linkClassName?: string
}) {
  const attachment = message.metadata
  const url = attachment?.url
  const type = attachment?.attachmentType || message.message_type

  if (!url) {
    return <p className={textClassName}>{message.message}</p>
  }

  if (type === "image") {
    return (
      <div>
        <div className="overflow-hidden rounded-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={attachment?.fileName || "Shared photo"}
            className="max-h-72 max-w-full object-cover"
          />
        </div>
        {message.message && message.message !== "Photo" ? (
          <p className={captionClassName}>{message.message}</p>
        ) : null}
      </div>
    )
  }

  if (type === "audio") {
    return (
      <div className="min-w-[220px]">
        <audio controls preload="metadata" className="w-full max-w-xs">
          <source src={url} type={attachment?.mimeType || "audio/webm"} />
        </audio>
        {attachment?.durationSeconds ? (
          <p className={captionClassName}>{formatAudioDuration(attachment.durationSeconds)}</p>
        ) : null}
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment?.fileName}
      className={linkClassName}
    >
      <Paperclip className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{attachment?.fileName || message.message || "Download file"}</span>
    </a>
  )
}
