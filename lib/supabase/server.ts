import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  // Use real Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDU5NTMsImV4cCI6MjA3MzUyMTk1M30.Jhsz_eRvmotyGgRzszwfKF8czxSnNE92q1SBupR9DB4'

  console.log('Server-side Supabase client created with URL:', supabaseUrl)

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const allCookies = cookieStore.getAll()
        console.log('Server-side cookies:', allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })))
        return allCookies
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  })
}
