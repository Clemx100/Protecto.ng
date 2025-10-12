import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Redirect /client to /app permanently (308 - Permanent Redirect)
  if (request.nextUrl.pathname === '/client' || request.nextUrl.pathname.startsWith('/client/')) {
    const url = request.nextUrl.clone()
    url.pathname = url.pathname.replace('/client', '/app')
    return NextResponse.redirect(url, { status: 308 })
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
