import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Redirect /client to /app permanently (308 - Permanent Redirect)
  if (request.nextUrl.pathname === '/client' || request.nextUrl.pathname.startsWith('/client/')) {
    const url = request.nextUrl.clone()
    url.pathname = url.pathname.replace('/client', '/app')
    return NextResponse.redirect(url, { status: 308 })
  }

  // Supabase password reset and magic links occasionally land on the site root.
  // When we detect these auth params on "/", reroute them to the auth callback handler.
  if (
    request.nextUrl.pathname === '/' &&
    (request.nextUrl.searchParams.has('code') ||
      request.nextUrl.searchParams.has('access_token') ||
      request.nextUrl.searchParams.has('token_hash'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'

    // Carry over all original auth parameters to the callback route.
    const searchParams = new URLSearchParams(request.nextUrl.search)

    if (!searchParams.has('next')) {
      searchParams.set('next', '/app')
    }
    if (!searchParams.has('type')) {
      searchParams.set('type', 'recovery')
    }

    url.search = searchParams.toString()

    return NextResponse.redirect(url)
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
