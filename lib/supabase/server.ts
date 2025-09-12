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
  const supabaseUrl = 'https://clpohayelyvvqemdssjs.supabase.co'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscG9oYXllbHl2dnFlbWRzc2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODgyMzMsImV4cCI6MjA3MjU2NDIzM30.5KopTxM2Y82Gte_7swmX7fofvaYldhWHYaG58AsWK_0'

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
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
  })
}
