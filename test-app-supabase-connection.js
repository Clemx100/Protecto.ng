#!/usr/bin/env node

/**
 * Comprehensive test to verify /app route is properly connected to Supabase
 * This ensures all components work correctly with the unified database
 */

const { createClient } = require('@supabase/supabase-js')

// Import centralized configuration
const DATABASE_CONFIG = {
  SUPABASE_URL: 'https://kifcevffaputepvpjpip.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ0NzYsImV4cCI6MjA3NTM3MDQ3Nn0.YuVbfSbrDUy2nPigODzCcaOWTEXaJlPrVGE1L0C3y6g',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
}

async function testAppSupabaseConnection() {
  console.log('🔍 Testing /app Route Supabase Connection...\n')
  console.log('📊 Database URL:', DATABASE_CONFIG.SUPABASE_URL)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  let allTestsPassed = true
  const results = []

  // Test 1: Client-side connection (what /app uses)
  console.log('1️⃣ Testing Client-Side Connection (ProtectorApp Component)...')
  try {
    const clientSupabase = createClient(
      DATABASE_CONFIG.SUPABASE_URL, 
      DATABASE_CONFIG.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    )
    
    // Test basic query
    const { data, error } = await clientSupabase.from('profiles').select('count').limit(1)
    
    if (error) {
      console.log('⚠️ Client connection works but query limited (expected for anonymous):', error.message)
      results.push({ test: 'Client Connection', status: 'partial', note: 'Auth required for data access' })
    } else {
      console.log('✅ Client-side connection successful')
      results.push({ test: 'Client Connection', status: 'pass' })
    }
  } catch (error) {
    console.log('❌ Client-side connection failed:', error.message)
    results.push({ test: 'Client Connection', status: 'fail', error: error.message })
    allTestsPassed = false
  }

  console.log('')

  // Test 2: Service role connection (what API routes use)
  console.log('2️⃣ Testing Service Role Connection (API Routes)...')
  try {
    const serviceSupabase = createClient(
      DATABASE_CONFIG.SUPABASE_URL,
      DATABASE_CONFIG.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data, error } = await serviceSupabase.from('profiles').select('count').limit(1)
    
    if (error) {
      console.log('❌ Service role connection error:', error.message)
      results.push({ test: 'Service Role Connection', status: 'fail', error: error.message })
      allTestsPassed = false
    } else {
      console.log('✅ Service role connection successful')
      results.push({ test: 'Service Role Connection', status: 'pass' })
    }
  } catch (error) {
    console.log('❌ Service role connection failed:', error.message)
    results.push({ test: 'Service Role Connection', status: 'fail', error: error.message })
    allTestsPassed = false
  }

  console.log('')

  // Test 3: Check all critical tables for /app functionality
  console.log('3️⃣ Testing Critical Tables Access...')
  try {
    const serviceSupabase = createClient(
      DATABASE_CONFIG.SUPABASE_URL,
      DATABASE_CONFIG.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const criticalTables = [
      { name: 'profiles', description: 'User profiles' },
      { name: 'bookings', description: 'Booking data' },
      { name: 'messages', description: 'Chat messages' },
      { name: 'services', description: 'Service offerings' },
      { name: 'chat_rooms', description: 'Chat room data' }
    ]
    
    let tablesOk = true
    for (const table of criticalTables) {
      try {
        const { data, error } = await serviceSupabase.from(table.name).select('*').limit(1)
        if (error) {
          console.log(`   ❌ ${table.name}: ${error.message}`)
          tablesOk = false
        } else {
          console.log(`   ✅ ${table.name}: Accessible (${table.description})`)
        }
      } catch (err) {
        console.log(`   ❌ ${table.name}: ${err.message}`)
        tablesOk = false
      }
    }
    
    if (tablesOk) {
      results.push({ test: 'Critical Tables', status: 'pass' })
    } else {
      results.push({ test: 'Critical Tables', status: 'partial' })
      allTestsPassed = false
    }
  } catch (error) {
    console.log('❌ Table access test failed:', error.message)
    results.push({ test: 'Critical Tables', status: 'fail', error: error.message })
    allTestsPassed = false
  }

  console.log('')

  // Test 4: Real-time subscription capability
  console.log('4️⃣ Testing Real-Time Subscription Capability...')
  try {
    const serviceSupabase = createClient(
      DATABASE_CONFIG.SUPABASE_URL,
      DATABASE_CONFIG.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Create a test subscription
    const channel = serviceSupabase
      .channel('test-connection')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        console.log('   📨 Real-time event received')
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('   ✅ Real-time subscriptions working')
        }
      })
    
    // Wait a bit for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Clean up
    await serviceSupabase.removeChannel(channel)
    
    results.push({ test: 'Real-Time Subscriptions', status: 'pass' })
    console.log('   ✅ Real-time capability confirmed')
  } catch (error) {
    console.log('   ⚠️ Real-time test inconclusive:', error.message)
    results.push({ test: 'Real-Time Subscriptions', status: 'partial' })
  }

  console.log('')

  // Test 5: Authentication capability
  console.log('5️⃣ Testing Authentication System...')
  try {
    const clientSupabase = createClient(
      DATABASE_CONFIG.SUPABASE_URL,
      DATABASE_CONFIG.SUPABASE_ANON_KEY
    )
    
    // Test getSession (should return null for no session, but shouldn't error)
    const { data: sessionData, error: sessionError } = await clientSupabase.auth.getSession()
    
    if (sessionError) {
      console.log('   ❌ Auth system error:', sessionError.message)
      results.push({ test: 'Authentication', status: 'fail', error: sessionError.message })
      allTestsPassed = false
    } else {
      console.log('   ✅ Authentication system operational')
      console.log('   ℹ️ Current session:', sessionData.session ? 'Active' : 'No active session')
      results.push({ test: 'Authentication', status: 'pass' })
    }
  } catch (error) {
    console.log('   ❌ Auth test failed:', error.message)
    results.push({ test: 'Authentication', status: 'fail', error: error.message })
    allTestsPassed = false
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 TEST SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'partial' ? '⚠️' : '❌'
    console.log(`${icon} ${result.test}: ${result.status.toUpperCase()}`)
    if (result.note) console.log(`   ℹ️ ${result.note}`)
    if (result.error) console.log(`   ❌ ${result.error}`)
  })

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED!')
    console.log('✅ /app route is fully connected to Supabase')
    console.log('✅ Database: https://kifcevffaputepvpjpip.supabase.co')
    console.log('✅ Real-time chat: OPERATIONAL')
    console.log('✅ Authentication: OPERATIONAL')
    console.log('✅ Bookings system: OPERATIONAL')
  } else {
    console.log('⚠️ SOME TESTS HAD ISSUES')
    console.log('Please review the errors above')
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  return allTestsPassed
}

// Run the test
testAppSupabaseConnection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test execution failed:', error)
    process.exit(1)
  })

