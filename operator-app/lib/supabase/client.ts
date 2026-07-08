import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const hasValidUrl =
    !!supabaseUrl && supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co')
  const hasValidAnonKey = !!supabaseAnonKey && supabaseAnonKey.startsWith('eyJ')

  // Avoid crashing build/runtime when env vars are missing in isolated deployments.
  if (!hasValidUrl || !hasValidAnonKey) {
    console.warn('Supabase client env vars missing/invalid; using mock browser client fallback.')
    return createBrowserClient(
      'https://mock-project.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2stcHJvamVjdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE5NTYzNTUyMDB9.mock_anon_key_for_development',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}
