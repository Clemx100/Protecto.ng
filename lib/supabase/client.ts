import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Debug logging
  console.log('Supabase Client Debug:')
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('SUPABASE_URL:', supabaseUrl)
  console.log('SUPABASE_KEY:', supabaseAnonKey ? 'Set' : 'Not set')
  
  // Use environment variables if available, otherwise fallback to hardcoded values for development
  const finalUrl = supabaseUrl || 'https://mjdbhusnplveeaveeovd.supabase.co'
  const finalKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDU5NTMsImV4cCI6MjA3MzUyMTk1M30.Jhsz_eRvmotyGgRzszwfKF8czxSnNE92q1SBupR9DB4'
  
  console.log('Using Supabase URL:', finalUrl)
  console.log('Using Supabase Key:', finalKey ? 'Set' : 'Not set')
  
  // Basic URL validation - simplified to avoid deployment issues
  if (!finalUrl) {
    console.error('Supabase URL is required')
    throw new Error('Invalid Supabase URL configuration')
  }
  
  // Basic anon key validation - simplified to avoid deployment issues
  if (!finalKey) {
    console.error('Supabase anon key is required')
    throw new Error('Invalid Supabase anon key configuration')
  }
  
  return createBrowserClient(finalUrl, finalKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}
