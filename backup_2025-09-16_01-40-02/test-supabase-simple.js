// Simple Supabase connection test
const { createClient } = require('@supabase/supabase-js')

// You need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project-id.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key-here'

console.log('🔍 Testing Supabase Connection...')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'Not set')

if (supabaseUrl === 'https://your-project-id.supabase.co' || supabaseKey === 'your-anon-key-here') {
  console.log('⚠️  Using placeholder values. Please update with your actual Supabase credentials.')
  console.log('')
  console.log('To update:')
  console.log('1. Create .env.local file in your project root')
  console.log('2. Add: NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co')
  console.log('3. Add: NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here')
  console.log('4. Get these values from your Supabase project dashboard')
  process.exit(0)
}

if (!supabaseUrl.includes('.supabase.co')) {
  console.error('❌ Invalid Supabase URL format!')
  console.error('Expected: https://your-project-id.supabase.co')
  process.exit(1)
}

if (!supabaseKey.startsWith('eyJ')) {
  console.error('❌ Invalid Supabase key format!')
  console.error('Expected: eyJ...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('🔄 Testing connection...')
    
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      console.error('This might be normal if the database schema is not set up yet.')
      console.error('')
      console.error('Next steps:')
      console.error('1. Run the database setup script in your Supabase SQL Editor')
      console.error('2. The script is located at: scripts/supabase_setup_complete.sql')
    } else {
      console.log('✅ Connection successful!')
    }
    
    // Test auth
    const { data: authData, error: authError } = await supabase.auth.getSession()
    if (authError) {
      console.log('ℹ️  Auth test:', authError.message)
    } else {
      console.log('✅ Auth service working!')
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err.message)
  }
}

testConnection()
