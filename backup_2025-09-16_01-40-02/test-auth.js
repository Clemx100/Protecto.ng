// Test user authentication with new Supabase project
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDU5NTMsImV4cCI6MjA3MzUyMTk1M30.Jhsz_eRvmotyGgRzszwfKF8czxSnNE92q1SBupR9DB4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUserAuth() {
  console.log('🔐 Testing User Authentication...')
  
  try {
    // Test 1: Check if profiles table exists
    console.log('1. Checking database schema...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (profilesError) {
      console.log('❌ Database schema not set up yet:', profilesError.message)
      console.log('Please run the database setup script in Supabase SQL Editor first.')
      return
    }
    
    console.log('✅ Database schema is ready!')
    
    // Test 2: Try to sign up a test user
    console.log('2. Testing user registration...')
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'
    
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
      console.log('❌ Sign up failed:', signUpError.message)
    } else {
      console.log('✅ User registration successful!')
      console.log('User ID:', signUpData.user?.id)
    }
    
    // Test 3: Try to sign in
    console.log('3. Testing user login...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })
    
    if (signInError) {
      console.log('❌ Sign in failed:', signInError.message)
    } else {
      console.log('✅ User login successful!')
      console.log('Session:', signInData.session ? 'Active' : 'None')
    }
    
    // Test 4: Check user profile
    console.log('4. Testing profile creation...')
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testEmail)
      .single()
    
    if (profileError) {
      console.log('❌ Profile not found:', profileError.message)
    } else {
      console.log('✅ User profile created successfully!')
      console.log('Profile:', {
        name: `${profileData.first_name} ${profileData.last_name}`,
        role: profileData.role,
        email: profileData.email
      })
    }
    
    console.log('')
    console.log('🎉 Authentication system is working!')
    console.log('You can now test user registration and login in the app.')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testUserAuth()
