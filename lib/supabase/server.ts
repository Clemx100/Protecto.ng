import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  // Use centralized database configuration
  const { DATABASE_CONFIG } = await import('@/lib/config/database')
  const supabaseUrl = DATABASE_CONFIG.SUPABASE_URL
  const supabaseAnonKey = DATABASE_CONFIG.SUPABASE_ANON_KEY

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
