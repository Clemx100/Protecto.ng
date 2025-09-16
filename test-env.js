// Test environment variables loading
console.log('Environment Variables Test:')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set')

// Test if the URL is valid
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
if (url && url.startsWith('https://') && url.includes('.supabase.co')) {
  console.log('✅ URL format is valid')
} else {
  console.log('❌ URL format is invalid')
}

// Test if the key is valid
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (key && key.startsWith('eyJ')) {
  console.log('✅ Key format is valid')
} else {
  console.log('❌ Key format is invalid')
}
