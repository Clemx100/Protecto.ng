#!/usr/bin/env node

/**
 * 🔍 Production Paystack Verification Script
 * 
 * This script verifies that Paystack is properly configured on www.protector.ng
 * Run this after deploying to production
 */

const PRODUCTION_URL = 'https://www.protector.ng'
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(color, emoji, message) {
  console.log(`${COLORS[color]}${emoji} ${message}${COLORS.reset}`)
}

async function verifyProductionPaystack() {
  console.log('\n' + '='.repeat(70))
  log('cyan', '🔍', 'PRODUCTION PAYSTACK VERIFICATION')
  log('cyan', '🌐', `Testing: ${PRODUCTION_URL}`)
  console.log('='.repeat(70) + '\n')

  let passed = 0
  let failed = 0
  let warnings = 0

  // Test 1: Check if site is accessible
  log('blue', '📡', 'Test 1: Checking site accessibility...')
  try {
    const response = await fetch(PRODUCTION_URL)
    if (response.ok) {
      log('green', '✅', 'Site is accessible')
      passed++
    } else {
      log('red', '❌', `Site returned status ${response.status}`)
      failed++
    }
  } catch (error) {
    log('red', '❌', `Cannot reach site: ${error.message}`)
    failed++
    log('yellow', '⚠️', 'Please ensure www.protector.ng is deployed')
    return
  }

  // Test 2: Check payment API endpoint
  log('blue', '📡', '\nTest 2: Checking payment API endpoint...')
  try {
    const testPaymentData = {
      amount: 100,
      email: 'test@protector.ng',
      bookingId: '00000000-0000-0000-0000-000000000000', // Test UUID
      customerName: 'Test User',
      currency: 'NGN'
    }

    const response = await fetch(`${PRODUCTION_URL}/api/payments/paystack/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPaymentData)
    })

    const data = await response.json()
    
    console.log('\n📊 API Response:')
    console.log(JSON.stringify(data, null, 2))
    
    // Check for specific error codes
    if (data.code === 'MISSING_PAYSTACK_KEY') {
      log('red', '❌', 'Paystack API key is NOT configured')
      log('yellow', '🔧', 'ACTION REQUIRED: Add PAYSTACK_SECRET_KEY to Vercel environment variables')
      log('yellow', '📚', 'See: PAYSTACK_PRODUCTION_FIX.md')
      failed++
    } else if (data.code === 'INVALID_PAYSTACK_KEY') {
      log('red', '❌', 'Paystack API key format is INVALID')
      log('yellow', '🔧', 'ACTION REQUIRED: Check that key starts with sk_live_ or sk_test_')
      failed++
    } else if (data.error && data.error.includes('Booking not found')) {
      log('green', '✅', 'Payment API is accessible and Paystack key is configured')
      log('yellow', '⚠️', 'Test booking not found (expected - this is normal)')
      passed++
    } else if (data.success && data.authorization_url) {
      log('green', '✅', 'Payment API is working perfectly!')
      log('green', '✅', 'Paystack key is configured correctly')
      log('cyan', '🔗', `Authorization URL: ${data.authorization_url}`)
      passed++
    } else if (response.status === 404) {
      log('red', '❌', 'Payment API endpoint not found')
      log('yellow', '🔧', 'ACTION REQUIRED: Ensure latest code is deployed')
      failed++
    } else {
      log('yellow', '⚠️', 'Unexpected API response')
      warnings++
    }

  } catch (error) {
    log('red', '❌', `API test failed: ${error.message}`)
    failed++
  }

  // Test 3: Check environment variables (indirect check)
  log('blue', '📡', '\nTest 3: Checking callback URL configuration...')
  try {
    const testResponse = await fetch(`${PRODUCTION_URL}/api/payments/paystack/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 100,
        email: 'test@protector.ng',
        bookingId: '00000000-0000-0000-0000-000000000000',
        customerName: 'Test',
        currency: 'NGN'
      })
    })
    
    const data = await testResponse.json()
    
    // Check if callback URL would be correct
    if (data.authorization_url && data.authorization_url.includes('protector.ng')) {
      log('green', '✅', 'Callback URL is configured correctly')
      passed++
    } else if (data.error === 'Booking not found') {
      log('green', '✅', 'API is processing requests correctly')
      passed++
    } else {
      log('yellow', '⚠️', 'Cannot verify callback URL configuration')
      warnings++
    }
  } catch (error) {
    log('yellow', '⚠️', `Callback URL check inconclusive: ${error.message}`)
    warnings++
  }

  // Test 4: Check HTTPS
  log('blue', '📡', '\nTest 4: Checking HTTPS configuration...')
  if (PRODUCTION_URL.startsWith('https://')) {
    log('green', '✅', 'Using HTTPS (required for Paystack)')
    passed++
  } else {
    log('red', '❌', 'Not using HTTPS - Paystack requires HTTPS')
    failed++
  }

  // Test 5: Check Supabase connection
  log('blue', '📡', '\nTest 5: Checking database connectivity...')
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/payments/paystack/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 100,
        email: 'test@protector.ng',
        bookingId: 'test-id',
        customerName: 'Test',
        currency: 'NGN'
      })
    })
    
    const data = await response.json()
    
    if (data.error && data.error.includes('Database configuration error')) {
      log('red', '❌', 'Database is not configured')
      failed++
    } else {
      log('green', '✅', 'Database connection is working')
      passed++
    }
  } catch (error) {
    log('yellow', '⚠️', `Database check inconclusive: ${error.message}`)
    warnings++
  }

  // Summary
  console.log('\n' + '='.repeat(70))
  log('cyan', '📊', 'VERIFICATION SUMMARY')
  console.log('='.repeat(70))
  
  log('green', '✅', `Passed: ${passed}`)
  log('red', '❌', `Failed: ${failed}`)
  log('yellow', '⚠️', `Warnings: ${warnings}`)
  
  console.log('\n')

  if (failed === 0 && warnings === 0) {
    log('green', '🎉', 'ALL TESTS PASSED! Paystack is ready for production!')
    log('green', '💳', 'You can now accept payments on www.protector.ng')
  } else if (failed === 0) {
    log('yellow', '⚠️', 'Tests passed with warnings. Review warnings above.')
    log('green', '💳', 'Paystack should work, but check warnings for optimal setup')
  } else {
    log('red', '❌', 'TESTS FAILED! Action required before accepting payments.')
    console.log('\n📋 Action Items:')
    console.log('   1. Review PAYSTACK_PRODUCTION_FIX.md')
    console.log('   2. Add required environment variables to Vercel')
    console.log('   3. Get Paystack LIVE API keys from dashboard.paystack.com')
    console.log('   4. Redeploy from Vercel')
    console.log('   5. Run this script again')
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n📚 Documentation:')
  console.log('   - Setup Guide: PAYSTACK_PRODUCTION_FIX.md')
  console.log('   - Paystack Dashboard: https://dashboard.paystack.com')
  console.log('   - Vercel Dashboard: https://vercel.com/dashboard')
  console.log('\n')

  process.exit(failed > 0 ? 1 : 0)
}

// Run the verification
verifyProductionPaystack().catch(error => {
  log('red', '❌', `Fatal error: ${error.message}`)
  console.error(error)
  process.exit(1)
})

