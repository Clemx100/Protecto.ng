import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'
  const type = searchParams.get('type') // Check if this is from signup

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      // Check if this is a new signup (email just confirmed for first time)
      // We'll log them out and redirect to login page for fresh login
      const user = data.session.user
      
      // If this is email confirmation from signup, sign them out and send to login
      if (type === 'signup' || !user.last_sign_in_at || 
          (user.email_confirmed_at && new Date(user.email_confirmed_at).getTime() > Date.now() - 60000)) {
        // Email was just confirmed (within last minute) - treat as new signup
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/app?verified=true&email=${encodeURIComponent(user.email || '')}`)
      }
      
      // Regular login/session - redirect to app
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If there's an error or no code, redirect to home with error
  return NextResponse.redirect(`${origin}/?error=auth_callback_error`)
}
