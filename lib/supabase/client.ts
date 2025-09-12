import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Use your real Supabase credentials
  const supabaseUrl = 'https://clpohayelyvvqemdssjs.supabase.co'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscG9oYXllbHl2dnFlbWRzc2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODgyMzMsImV4cCI6MjA3MjU2NDIzM30.5KopTxM2Y82Gte_7swmX7fofvaYldhWHYaG58AsWK_0'
  
  console.log('Using real Supabase client')
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}
