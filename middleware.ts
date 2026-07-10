import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Redirect /client to /app permanently (308 - Permanent Redirect)
  if (request.nextUrl.pathname === '/client' || request.nextUrl.pathname.startsWith('/client/')) {
    const url = request.nextUrl.clone()
    url.pathname = url.pathname.replace('/client', '/app')
    return NextResponse.redirect(url, { status: 308 })
  }

  // Supabase password reset / magic links sometimes land on the site root
  // with query params (hash tokens are handled client-side on the homepage).
  if (
    request.nextUrl.pathname === '/' &&
    (request.nextUrl.searchParams.has('code') ||
      request.nextUrl.searchParams.has('access_token') ||
      request.nextUrl.searchParams.has('token_hash') ||
      request.nextUrl.searchParams.get('type') === 'recovery')
  ) {
    const url = request.nextUrl.clone()
    const type = request.nextUrl.searchParams.get('type')
    const isRecovery =
      type === 'recovery' ||
      request.nextUrl.searchParams.has('token_hash') ||
      request.nextUrl.searchParams.has('access_token')

    // Recovery → reset password page; other auth codes → callback.
    url.pathname = isRecovery ? '/auth/reset-password' : '/auth/callback'

    const searchParams = new URLSearchParams(request.nextUrl.search)
    if (!isRecovery && !searchParams.has('next')) {
      searchParams.set('next', '/app')
    }
    if (isRecovery && !searchParams.has('type')) {
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
     * - service-worker.js, manifest.json (PWA - must not redirect)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|service-worker\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|obj|mtl|glb|gltf)$).*)",
  ],
}
