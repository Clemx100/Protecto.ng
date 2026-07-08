import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/config/database"

const BUCKET = "chat-attachments"
const PRIVILEGED_ROLES = new Set(["operator", "admin", "agent"])

async function getRequestUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "")
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.auth.getUser(token)
    if (!error && data.user) return data.user.id
  }

  try {
    const sessionSupabase = await createServerSupabaseClient()
    const {
      data: { user },
      error,
    } = await sessionSupabase.auth.getUser()
    if (!error && user) return user.id
  } catch {
    return null
  }

  return null
}

function getStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const bookingId = String(formData.get("bookingId") || "")
    const attachmentType = String(formData.get("attachmentType") || "file")
    const durationSeconds = Number(formData.get("durationSeconds") || 0)

    if (!(file instanceof File) || !bookingId) {
      return NextResponse.json({ error: "bookingId and file are required" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)

    const { data: booking } = isUUID
      ? await supabase.from("bookings").select("id, client_id, assigned_agent_id").eq("id", bookingId).single()
      : await supabase.from("bookings").select("id, client_id, assigned_agent_id").eq("booking_code", bookingId).single()

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single()
    const isPrivileged = profile?.role ? PRIVILEGED_ROLES.has(profile.role) : false
    const isParticipant =
      userId === booking.client_id ||
      (booking.assigned_agent_id != null && userId === booking.assigned_agent_id)

    if (!isPrivileged && !isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const ext = file.name.split(".").pop() || "bin"
    const path = `${booking.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const storage = getStorageClient()
    const buffer = await file.arrayBuffer()

    let publicUrl: string | null = null
    const { data: uploadData, error: uploadError } = await storage.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })

    if (!uploadError && uploadData?.path) {
      const { data: urlData } = storage.storage.from(BUCKET).getPublicUrl(uploadData.path)
      publicUrl = urlData.publicUrl
    } else {
      console.warn("Chat attachment storage upload failed, using inline fallback:", uploadError?.message)
    }

    let inlineDataUrl: string | null = null
    if (!publicUrl && buffer.byteLength <= 900_000) {
      const base64 = Buffer.from(buffer).toString("base64")
      inlineDataUrl = `data:${file.type || "application/octet-stream"};base64,${base64}`
    }

    if (!publicUrl && !inlineDataUrl) {
      return NextResponse.json(
        { error: "File is too large to send. Try a smaller photo or shorter voice note." },
        { status: 413 },
      )
    }

    const label =
      attachmentType === "image"
        ? "Photo"
        : attachmentType === "audio"
          ? durationSeconds > 0
            ? `Voice message (${Math.floor(durationSeconds / 60)}:${String(Math.round(durationSeconds % 60)).padStart(2, "0")})`
            : "Voice message"
          : file.name || "File"

    const metadata = {
      attachmentType,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      url: publicUrl || inlineDataUrl,
      durationSeconds: durationSeconds > 0 ? durationSeconds : undefined,
    }

    const messageType =
      attachmentType === "image" ? "image" : attachmentType === "audio" ? "audio" : "file"

    const { data: newMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        booking_id: booking.id,
        sender_id: userId,
        sender_type: "client",
        recipient_id: booking.assigned_agent_id || booking.client_id,
        content: label,
        message_type: messageType,
        metadata,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to save attachment message", details: insertError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newMessage.id,
        booking_id: newMessage.booking_id,
        sender_id: newMessage.sender_id,
        sender_type: "client",
        message: newMessage.content,
        message_type: newMessage.message_type,
        metadata: newMessage.metadata,
        created_at: newMessage.created_at,
        updated_at: newMessage.updated_at || newMessage.created_at,
        status: "sent",
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: "Failed to upload attachment", details: message }, { status: 500 })
  }
}
