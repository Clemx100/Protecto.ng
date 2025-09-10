import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('Supabase Client - URL:', supabaseUrl)
  console.log('Supabase Client - Key exists:', !!supabaseAnonKey)
  
  // Validate URL format
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
