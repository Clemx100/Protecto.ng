// Quick diagnostic test for registration issue
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://kifcevffaputepvpjpip.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ0NzYsImV4cCI6MjA3NTM3MDQ3Nn0.YuVbfSbrDUy2nPigODzCcaOWTEXaJlPrVGE1L0C3y6g'

async function testConnection() {
  console.log('🔍 Testing Supabase connection...')
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Test 1: Can we connect to Supabase?
    console.log('\n✅ Supabase client created successfully')
    console.log('📡 Supabase URL:', supabaseUrl)
    
    // Test 2: Check if we can query the database
    console.log('\n🔍 Testing database connection...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (profilesError) {
      console.log('❌ Database connection error:', profilesError.message)
    } else {
      console.log('✅ Database connection successful')
    }
    
    // Test 3: Check auth configuration
    console.log('\n🔍 Testing auth configuration...')
    const { data: authData, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.log('⚠️  Auth check warning:', authError.message)
    } else {
      console.log('✅ Auth system accessible')
      console.log('Current session:', authData.session ? 'Active' : 'None')
    }
    
    // Test 4: Try a test registration (with unique email)
    console.log('\n🔍 Testing registration capability...')
    const testEmail = `test-${Date.now()}@protector-test.ng`
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User'
        }
      }
    })
    
    if (signUpError) {
      console.log('❌ Registration test failed:', signUpError.message)
      
      // Check specific error types
      if (signUpError.message.includes('Failed to fetch')) {
        console.log('\n🚨 NETWORK ERROR DETECTED!')
        console.log('Possible causes:')
        console.log('  1. Internet connection issue')
        console.log('  2. Firewall blocking Supabase')
        console.log('  3. Supabase project is paused/deleted')
        console.log('  4. CORS configuration issue')
      } else if (signUpError.message.includes('Signup is disabled')) {
        console.log('\n🚨 SIGNUP DISABLED!')
        console.log('Action needed: Enable email signups in Supabase Dashboard')
        console.log('  Go to: Authentication > Providers > Email')
      } else if (signUpError.message.includes('Email rate limit')) {
        console.log('\n⚠️  Rate limit hit - this is actually a good sign (auth works)')
      }
    } else {
      console.log('✅ Registration test successful!')
      console.log('User created:', signUpData.user?.email)
      console.log('Email confirmation required:', !signUpData.user?.email_confirmed_at)
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('DIAGNOSIS COMPLETE')
    console.log('='.repeat(60))
    
  } catch (error) {
    console.log('\n❌ CRITICAL ERROR:', error.message)
    console.log('\nFull error:', error)
  }
}

testConnection()






















