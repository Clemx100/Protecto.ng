#!/usr/bin/env node

/**
 * Test Operator Authentication
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://kifcevffaputepvpjpip.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
)

async function testOperatorAuth() {
  console.log('\n🔐 TESTING OPERATOR AUTHENTICATION\n')
  console.log('=' .repeat(60))
  
  // Check if operator user exists
  console.log('\n📋 Checking operator user...')
  const { data: operator, error: operatorError } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'operator')
    .single()
  
  if (operatorError) {
    console.error('❌ Operator not found:', operatorError.message)
    return
  }
  
  console.log('✅ Operator found:', operator.email)
  console.log('   ID:', operator.id)
  console.log('   Role:', operator.role)
  
  // Check auth sessions for this user
  console.log('\n🔍 Checking auth sessions...')
  const { data: sessions, error: sessionsError } = await supabase
    .from('auth.users')
    .select('*')
    .eq('id', operator.id)
    .single()
  
  if (sessionsError) {
    console.log('⚠️  Could not check sessions (expected for service role)')
  } else {
    console.log('✅ Session found for operator')
  }
  
  // Test the operator bookings API directly
  console.log('\n🧪 Testing operator bookings API...')
  
  try {
    // First, let's try to get a session token for the operator
    console.log('   Attempting to sign in as operator...')
    
    // This won't work with service role, but let's see what happens
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: operator.email
    })
    
    if (authError) {
      console.log('⚠️  Cannot generate magic link (expected with service role)')
    } else {
      console.log('✅ Magic link generated')
    }
    
  } catch (error) {
    console.log('⚠️  Authentication test failed (expected with service role):', error.message)
  }
  
  // Check if there are any active bookings
  console.log('\n📊 Checking active bookings...')
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, booking_code, status, client_id')
    .limit(5)
  
  if (bookingsError) {
    console.error('❌ Failed to fetch bookings:', bookingsError.message)
  } else {
    console.log(`✅ Found ${bookings.length} bookings`)
    bookings.forEach((booking, index) => {
      console.log(`   ${index + 1}. ${booking.booking_code} - ${booking.status}`)
    })
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('\n🎯 DIAGNOSIS:\n')
  console.log('   The issue is likely one of these:')
  console.log('   1. 🔐 Session token expired or invalid')
  console.log('   2. 🔄 Browser session not synced with API calls')
  console.log('   3. 📡 Network request headers not being sent properly')
  console.log('   4. ⏰ Session timeout causing re-authentication issues')
  
  console.log('\n🔧 SOLUTIONS TO TRY:\n')
  console.log('   1. 🔄 Refresh the operator dashboard page')
  console.log('   2. 🚪 Log out and log back in as operator')
  console.log('   3. 🧹 Clear browser cache and cookies')
  console.log('   4. 📱 Try in a different browser or incognito mode')
  console.log('   5. 🔧 Check browser console for authentication errors')
  
  console.log('\n📋 QUICK FIX:\n')
  console.log('   1. Go to: http://localhost:3001/operator')
  console.log('   2. Log out if currently logged in')
  console.log('   3. Log back in with: iwewezinemstephen@gmail.com')
  console.log('   4. Try sending messages again')
  console.log('   5. Messages should now persist in operator chat')
  
  console.log('\n=' + '='.repeat(59) + '\n')
}

// Run the test
testOperatorAuth().catch(console.error)

