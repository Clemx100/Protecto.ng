import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Hardcoded values to avoid environment variable issues
  const supabaseUrl = 'https://kifcevffaputepvpjpip.supabase.co'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ0NzYsImV4cCI6MjA3NTM3MDQ3Nn0.YuVbfSbrDUy2nPigODzCcaOWTEXaJlPrVGE1L0C3y6g'
  
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
