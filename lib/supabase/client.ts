import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // In development mode, use mock values if environment variables are not set
  if (process.env.NODE_ENV === 'development' && (!supabaseUrl || !supabaseAnonKey)) {
    console.log('Development mode: Using mock Supabase client')
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
  
  // Validate URL format for production
  if (!supabaseUrl || !supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    console.error('Invalid Supabase URL format. Expected: https://your-project-id.supabase.co')
    console.error('Current URL:', supabaseUrl)
    throw new Error('Invalid Supabase URL configuration')
  }
  
  if (!supabaseAnonKey || !supabaseAnonKey.startsWith('eyJ')) {
    console.error('Invalid Supabase anon key format. Expected: eyJ...')
    console.error('Current key:', supabaseAnonKey ? 'Set but invalid format' : 'Not set')
    throw new Error('Invalid Supabase anon key configuration')
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}
