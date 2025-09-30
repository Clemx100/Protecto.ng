import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Hardcoded values to avoid environment variable issues
  const supabaseUrl = 'https://mjdbhusnplveeaveeovd.supabase.co'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDU5NTMsImV4cCI6MjA3MzUyMTk1M30.Jhsz_eRvmotyGgRzszwfKF8czxSnNE92q1SBupR9DB4'
  
  // Debug logging
  console.log('Supabase Client Debug:')
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('Using hardcoded Supabase URL:', supabaseUrl)
  console.log('Using hardcoded Supabase Key: Set')
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}
