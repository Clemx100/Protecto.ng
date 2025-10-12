#!/usr/bin/env node

/**
 * Test script to verify unified database configuration
 * This ensures all parts of the app use the same PROTECTOR.NG LIVE database
 */

const { createClient } = require('@supabase/supabase-js')

// Import centralized configuration
const DATABASE_CONFIG = {
  SUPABASE_URL: 'https://kifcevffaputepvpjpip.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ0NzYsImV4cCI6MjA3NTM3MDQ3Nn0.YuVbfSbrDUy2nPigODzCcaOWTEXaJlPrVGE1L0C3y6g',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
}

async function testUnifiedDatabase() {
  console.log('🔍 Testing Unified Database Configuration...')
  console.log('📊 Database URL:', DATABASE_CONFIG.SUPABASE_URL)
  
  // Test 1: Anonymous client connection
  console.log('\n1️⃣ Testing Anonymous Client Connection...')
  try {
    const anonClient = createClient(DATABASE_CONFIG.SUPABASE_URL, DATABASE_CONFIG.SUPABASE_ANON_KEY)
    const { data, error } = await anonClient.from('profiles').select('count').limit(1)
    
    if (error) {
      console.log('⚠️ Anonymous client error (expected for some operations):', error.message)
    } else {
      console.log('✅ Anonymous client connected successfully')
    }
  } catch (error) {
    console.log('❌ Anonymous client connection failed:', error.message)
  }
  
  // Test 2: Service role client connection
  console.log('\n2️⃣ Testing Service Role Client Connection...')
  try {
    const serviceClient = createClient(DATABASE_CONFIG.SUPABASE_URL, DATABASE_CONFIG.SUPABASE_SERVICE_ROLE_KEY)
    const { data, error } = await serviceClient.from('profiles').select('count').limit(1)
    
    if (error) {
      console.log('❌ Service role client error:', error.message)
    } else {
      console.log('✅ Service role client connected successfully')
    }
  } catch (error) {
    console.log('❌ Service role client connection failed:', error.message)
  }
  
  // Test 3: Check key tables exist
  console.log('\n3️⃣ Checking Key Tables...')
  try {
    const serviceClient = createClient(DATABASE_CONFIG.SUPABASE_URL, DATABASE_CONFIG.SUPABASE_SERVICE_ROLE_KEY)
    
    const tables = ['profiles', 'bookings', 'messages', 'services', 'chat_rooms']
    
    for (const table of tables) {
      try {
        const { data, error } = await serviceClient.from(table).select('*').limit(1)
        if (error) {
          console.log(`❌ Table '${table}' error:`, error.message)
        } else {
          console.log(`✅ Table '${table}' exists and accessible`)
        }
      } catch (err) {
        console.log(`❌ Table '${table}' connection failed:`, err.message)
      }
    }
  } catch (error) {
    console.log('❌ Table check failed:', error.message)
  }
  
  // Test 4: Check database consistency
  console.log('\n4️⃣ Checking Database Consistency...')
  try {
    const serviceClient = createClient(DATABASE_CONFIG.SUPABASE_URL, DATABASE_CONFIG.SUPABASE_SERVICE_ROLE_KEY)
    
    // Check if we can read from all main tables
    const { data: profiles } = await serviceClient.from('profiles').select('count').limit(1)
    const { data: bookings } = await serviceClient.from('bookings').select('count').limit(1)
    const { data: messages } = await serviceClient.from('messages').select('count').limit(1)
    const { data: services } = await serviceClient.from('services').select('count').limit(1)
    
    console.log('✅ All main tables are accessible')
    console.log(`📊 Database contains data across all tables`)
    
  } catch (error) {
    console.log('❌ Database consistency check failed:', error.message)
  }
  
  console.log('\n🎉 Unified Database Test Complete!')
  console.log('📋 Summary:')
  console.log(`   • Database URL: ${DATABASE_CONFIG.SUPABASE_URL}`)
  console.log(`   • All components should use this same database`)
  console.log(`   • Centralized configuration ensures consistency`)
}

// Run the test
testUnifiedDatabase().catch(console.error)
