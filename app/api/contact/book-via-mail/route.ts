import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const OPERATOR_EMAIL = "operator@protector.ng"

type BookViaMailPayload = {
  fullName?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
  bookingId?: string | null
  bookingCode?: string | null
  source?: string | null
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function cleanField(value: unknown, maxLength = 300) {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, maxLength)
}

function cleanMessage(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, 5000)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function getClientIp(request: NextRequest) {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0]?.trim() || "unknown"
  return request.headers.get("x-real-ip") || "unknown"
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const port = Number(process.env.SMTP_PORT || 587)

  if (!host || !user || !pass) {
    return null
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BookViaMailPayload

    const fullName = cleanField(body.fullName, 120)
    const email = cleanField(body.email, 160).toLowerCase()
    const phone = cleanField(body.phone, 50)
    const subject = cleanField(body.subject, 200)
    const message = cleanMessage(body.message)
    const bookingId = cleanField(body.bookingId, 80)
    const bookingCode = cleanField(body.bookingCode, 80)
    const source = cleanField(body.source, 80)

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required." },
        { status: 400 }
      )
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Please provide at least an email address or phone number." },
        { status: 400 }
      )
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      )
    }

    const smtp = getSmtpConfig()
    if (!smtp) {
      return NextResponse.json(
        {
          error:
            "Mail service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS."
        },
        { status: 503 }
      )
    }

    const nodemailer = require("nodemailer")
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.auth
    })

    const submittedAt = new Date().toISOString()
    const clientIp = getClientIp(request)
    const messageText = [
      "New in-app booking request",
      "",
      `Name: ${fullName || "N/A"}`,
      `Email: ${email || "N/A"}`,
      `Phone: ${phone || "N/A"}`,
      `Booking ID: ${bookingId || "N/A"}`,
      `Booking Code: ${bookingCode || "N/A"}`,
      `Source: ${source || "N/A"}`,
      `Submitted At: ${submittedAt}`,
      `Client IP: ${clientIp}`,
      "",
      "Message:",
      message
    ].join("\n")

    const messageHtml = `
      <h2>New in-app booking request</h2>
      <p><strong>Name:</strong> ${escapeHtml(fullName || "N/A")}</p>
      <p><strong>Email:</strong> ${escapeHtml(email || "N/A")}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone || "N/A")}</p>
      <p><strong>Booking ID:</strong> ${escapeHtml(bookingId || "N/A")}</p>
      <p><strong>Booking Code:</strong> ${escapeHtml(bookingCode || "N/A")}</p>
      <p><strong>Source:</strong> ${escapeHtml(source || "N/A")}</p>
      <p><strong>Submitted At:</strong> ${escapeHtml(submittedAt)}</p>
      <p><strong>Client IP:</strong> ${escapeHtml(clientIp)}</p>
      <hr />
      <p><strong>Message</strong></p>
      <pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(message)}</pre>
    `

    const fromAddress = OPERATOR_EMAIL
    const toAddress = OPERATOR_EMAIL
    const replyToAddress = email || undefined

    await transporter.sendMail({
      // Send from the connected operator mailbox to avoid sender identity rejection.
      from: fromAddress,
      to: toAddress,
      replyTo: replyToAddress,
      subject,
      text: messageText,
      html: messageHtml
    })

    return NextResponse.json({
      success: true,
      message: `Email sent to ${OPERATOR_EMAIL}`
    })
  } catch (error: any) {
    console.error("Book via mail error:", error)
    return NextResponse.json(
      {
        error: error?.message || "Failed to send booking email."
      },
      { status: 500 }
    )
  }
}
