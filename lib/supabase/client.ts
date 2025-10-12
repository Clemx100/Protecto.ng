import { createBrowserClient } from "@supabase/ssr"
import { DATABASE_CONFIG } from "@/lib/config/database"

export function createClient() {
  // Use centralized database configuration
  const supabaseUrl = DATABASE_CONFIG.SUPABASE_URL
  const supabaseAnonKey = DATABASE_CONFIG.SUPABASE_ANON_KEY
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}
