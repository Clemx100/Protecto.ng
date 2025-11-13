import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'
  const type = searchParams.get('type')
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')
  const tokenHash = searchParams.get('token_hash')

  const supabase = await createClient()

  const handleNewSignup = async (userEmail: string | null) => {
    await supabase.auth.signOut()
    return NextResponse.redirect(
      `${origin}/app?verified=true&email=${encodeURIComponent(userEmail || '')}`,
    )
  }

  const redirectToReset = () => NextResponse.redirect(`${origin}/auth/reset-password`)

  const redirectToApp = (path: string) => NextResponse.redirect(`${origin}${path}`)

  const handleRecoveryRedirect = () => {
    // Always send password recovery flows to the reset password page.
    return redirectToReset()
  }

  // 1. Password recovery links arrive with access/refresh tokens.
  if (type === 'recovery' && accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (!error) {
      return handleRecoveryRedirect()
    }

    console.error('Failed to persist Supabase recovery session via setSession', error)
  }

  // 2. PKCE code exchange (covers OAuth/email confirmation)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      const user = data.session.user

      if (type === 'recovery') {
        return handleRecoveryRedirect()
      }

      // If this is email confirmation from signup, sign them out and send to login for fresh session
      if (
        type === 'signup' ||
        !user.last_sign_in_at ||
        (user.email_confirmed_at &&
          new Date(user.email_confirmed_at).getTime() > Date.now() - 60000)
      ) {
        return handleNewSignup(user.email ?? null)
      }

      return redirectToApp(next)
    }

    console.error('Supabase code exchange failed', { error })
  }

  // 3. Recovery links (older format) may include token_hash for OTP verification.
  if (type === 'recovery' && tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    })

    if (!error) {
      return handleRecoveryRedirect()
    }

    console.error('Supabase recovery verifyOtp failed', error)
  }

  // If there's an error or no usable parameters, redirect to home with error
  return NextResponse.redirect(`${origin}/?error=auth_callback_error`)
}
