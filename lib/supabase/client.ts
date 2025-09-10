import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Provide fallback values if environment variables are not set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  
  console.log('Supabase Client - URL:', supabaseUrl)
  console.log('Supabase Client - Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables are not set. Authentication features will not work.')
    console.warn('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.warn('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}
