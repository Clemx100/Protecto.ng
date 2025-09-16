// Test user registration with the real Supabase connection
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDU5NTMsImV4cCI6MjA3MzUyMTk1M30.Jhsz_eRvmotyGgRzszwfKF8czxSnNE92q1SBupR9DB4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRegistration() {
  console.log('🔐 Testing User Registration...')
  
  try {
    // Test with a valid email format
    const testEmail = `testuser${Date.now()}@gmail.com`
    const testPassword = 'TestPassword123!'
    
    console.log('Testing with email:', testEmail)
    
    // Test registration
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          role: 'client'
        }
      }
    })
    
    if (signUpError) {
      console.log('❌ Registration failed:', signUpError.message)
      console.log('Error details:', signUpError)
    } else {
      console.log('✅ Registration successful!')
      console.log('User ID:', signUpData.user?.id)
      console.log('Email confirmed:', signUpData.user?.email_confirmed_at ? 'Yes' : 'No')
    }
    
    // Test login
    console.log('Testing login...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })
    
    if (signInError) {
      console.log('❌ Login failed:', signInError.message)
    } else {
      console.log('✅ Login successful!')
      console.log('Session active:', signInData.session ? 'Yes' : 'No')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testRegistration()
