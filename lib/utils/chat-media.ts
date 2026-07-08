const MAX_IMAGE_DIMENSION = 1280
const JPEG_QUALITY = 0.82
const MAX_DATA_URL_BYTES = 900_000

export type ChatAttachmentKind = "image" | "file" | "audio"

export type OutgoingChatAttachment = {
  type: ChatAttachmentKind
  file: File
  fileName: string
  mimeType: string
  durationSeconds?: number
}

export function formatAudioDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export async function compressImageFile(
  file: File,
  maxDimension = MAX_IMAGE_DIMENSION,
): Promise<{ blob: Blob; mimeType: string; fileName: string }> {
  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas is not supported")

  context.drawImage(image, 0, 0, width, height)
  const mimeType = file.type.startsWith("image/") ? file.type : "image/jpeg"
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Failed to compress image"))
          return
        }
        resolve(result)
      },
      mimeType === "image/png" ? "image/png" : "image/jpeg",
      JPEG_QUALITY,
    )
  })

  const extension = blob.type === "image/png" ? "png" : "jpg"
  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo"
  return { blob, mimeType: blob.type, fileName: `${baseName}.${extension}` }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Failed to load image"))
    image.src = src
  })
}

export async function prepareAttachmentForUpload(
  attachment: OutgoingChatAttachment,
): Promise<{ file: File; previewUrl?: string }> {
  if (attachment.type === "image") {
    const compressed = await compressImageFile(attachment.file)
    const file = new File([compressed.blob], compressed.fileName, { type: compressed.mimeType })
    return { file, previewUrl: URL.createObjectURL(file) }
  }

  return { file: attachment.file }
}

export function attachmentMessageLabel(attachment: OutgoingChatAttachment): string {
  if (attachment.type === "image") return "Photo"
  if (attachment.type === "audio") {
    return attachment.durationSeconds
      ? `Voice message (${formatAudioDuration(attachment.durationSeconds)})`
      : "Voice message"
  }
  return attachment.fileName || "File"
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] || ""
  return Math.ceil((base64.length * 3) / 4)
}

export async function fileToDataUrlIfSmall(file: File): Promise<string | null> {
  const dataUrl = await readFileAsDataUrl(file)
  if (estimateDataUrlBytes(dataUrl) <= MAX_DATA_URL_BYTES) {
    return dataUrl
  }
  return null
}
