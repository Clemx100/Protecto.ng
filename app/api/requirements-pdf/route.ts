import { readFile } from "fs/promises"
import path from "path"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const REQUIREMENTS_PDF_PATH = path.join(process.cwd(), "public", "documents", "vehicle-requirements.pdf")
const REQUIREMENTS_PDF_FILENAME = "vehicle-requirements.pdf"

export async function GET() {
  try {
    const pdfBuffer = await readFile(REQUIREMENTS_PDF_PATH)

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${REQUIREMENTS_PDF_FILENAME}"`,
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    })
  } catch (error) {
    console.error("Failed to load requirements PDF:", error)

    return NextResponse.json(
      { error: "Requirements PDF is currently unavailable." },
      { status: 404 }
    )
  }
}
