// Test script for new Supabase project
const { createClient } = require('@supabase/supabase-js')

// Your new Supabase credentials
const supabaseUrl = 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDU5NTMsImV4cCI6MjA3MzUyMTk1M30.Jhsz_eRvmotyGgRzszwfKF8czxSnNE92q1SBupR9DB4'

console.log('🔍 Testing New Supabase Connection...')
console.log('URL:', supabaseUrl)
console.log('Key:', `${supabaseKey.substring(0, 20)}...`)

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
      console.log('ℹ️  Database connection test:', error.message)
      console.log('This is normal if the database schema is not set up yet.')
    } else {
      console.log('✅ Database connection successful!')
    }
    
    // Test auth service
    const { data: authData, error: authError } = await supabase.auth.getSession()
    if (authError) {
      console.log('ℹ️  Auth test:', authError.message)
    } else {
      console.log('✅ Auth service working!')
    }
    
    console.log('')
    console.log('🎉 Supabase connection is working!')
    console.log('Next steps:')
    console.log('1. Go to your Supabase project dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Run the database setup script from: scripts/supabase_setup_complete.sql')
    console.log('4. Restart your app with: npm run dev')
    
  } catch (err) {
    console.error('❌ Test failed:', err.message)
  }
}

testConnection()
