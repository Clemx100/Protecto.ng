// Debug registration issue in real-time
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://kifcevffaputepvpjpip.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ0NzYsImV4cCI6MjA3NTM3MDQ3Nn0.YuVbfSbrDUy2nPigODzCcaOWTEXaJlPrVGE1L0C3y6g'

async function debugRegistration() {
  console.log('🔍 Debugging registration issue...')
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  // Test with a real email format
  const testEmail = `testuser${Date.now()}@gmail.com`
  console.log(`\n📧 Testing with email: ${testEmail}`)
  
  try {
    console.log('\n🚀 Attempting signup...')
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User'
        }
      }
    })
    
    if (error) {
      console.log('\n❌ SIGNUP ERROR:')
      console.log('Error code:', error.status)
      console.log('Error message:', error.message)
      console.log('Full error:', JSON.stringify(error, null, 2))
      
      // Check for specific error types
      if (error.message.includes('Failed to fetch')) {
        console.log('\n🚨 NETWORK ISSUE DETECTED:')
        console.log('This suggests:')
        console.log('1. CORS policy blocking the request')
        console.log('2. Supabase project is paused/restricted')
        console.log('3. Firewall blocking the request')
        console.log('4. Supabase service is down')
        
        // Test if it's a CORS issue
        console.log('\n🔍 Testing direct API call...')
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`
            }
          })
          console.log('Direct API response status:', response.status)
          if (response.status === 200) {
            console.log('✅ Direct API works - this is likely a CORS issue')
          }
        } catch (apiError) {
          console.log('❌ Direct API also fails:', apiError.message)
        }
      }
    } else {
      console.log('\n✅ SIGNUP SUCCESS!')
      console.log('User created:', data.user?.email)
      console.log('Email confirmed:', data.user?.email_confirmed_at)
    }
    
  } catch (networkError) {
    console.log('\n🚨 NETWORK EXCEPTION:')
    console.log('Error:', networkError.message)
    console.log('This is a network-level failure')
    
    // Check if it's a DNS issue
    console.log('\n🔍 Checking DNS resolution...')
    try {
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)
      
      const { stdout } = await execAsync(`nslookup ${supabaseUrl.replace('https://', '')}`)
      console.log('DNS resolution successful')
    } catch (dnsError) {
      console.log('❌ DNS resolution failed:', dnsError.message)
    }
  }
}

debugRegistration()



