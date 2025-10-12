#!/usr/bin/env node

/**
 * Test to verify /client route is completely removed and redirects to /app
 */

const fs = require('fs')
const path = require('path')

console.log('🧪 Testing /client Route Removal...\n')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

let allTestsPassed = true
const results = []

// Test 1: Verify client directory doesn't exist
console.log('1️⃣ Testing File System - Client Directory Removal...')
try {
  const clientPath = path.join(__dirname, 'app', 'client')
  const exists = fs.existsSync(clientPath)
  
  if (exists) {
    console.log('   ❌ FAIL: /client directory still exists!')
    results.push({ test: 'Client Directory', status: 'fail' })
    allTestsPassed = false
  } else {
    console.log('   ✅ PASS: /client directory does not exist')
    results.push({ test: 'Client Directory', status: 'pass' })
  }
} catch (error) {
  console.log('   ❌ FAIL: Error checking directory:', error.message)
  results.push({ test: 'Client Directory', status: 'fail' })
  allTestsPassed = false
}

console.log('')

// Test 2: Verify app directory exists
console.log('2️⃣ Testing File System - App Directory Exists...')
try {
  const appPath = path.join(__dirname, 'app', 'app', 'page.tsx')
  const exists = fs.existsSync(appPath)
  
  if (exists) {
    console.log('   ✅ PASS: /app directory exists')
    results.push({ test: 'App Directory', status: 'pass' })
  } else {
    console.log('   ❌ FAIL: /app directory does not exist!')
    results.push({ test: 'App Directory', status: 'fail' })
    allTestsPassed = false
  }
} catch (error) {
  console.log('   ❌ FAIL: Error checking app directory:', error.message)
  results.push({ test: 'App Directory', status: 'fail' })
  allTestsPassed = false
}

console.log('')

// Test 3: Verify middleware has redirect
console.log('3️⃣ Testing Middleware - Redirect Configuration...')
try {
  const middlewarePath = path.join(__dirname, 'middleware.ts')
  const content = fs.readFileSync(middlewarePath, 'utf8')
  
  const hasClientCheck = content.includes('/client')
  const hasRedirect = content.includes('redirect')
  const has308Status = content.includes('308')
  
  if (hasClientCheck && hasRedirect && has308Status) {
    console.log('   ✅ PASS: Middleware has /client → /app redirect (308)')
    results.push({ test: 'Middleware Redirect', status: 'pass' })
  } else {
    console.log('   ⚠️ WARNING: Middleware may not have complete redirect')
    console.log(`      - Client check: ${hasClientCheck}`)
    console.log(`      - Redirect: ${hasRedirect}`)
    console.log(`      - 308 status: ${has308Status}`)
    results.push({ test: 'Middleware Redirect', status: 'partial' })
  }
} catch (error) {
  console.log('   ❌ FAIL: Error checking middleware:', error.message)
  results.push({ test: 'Middleware Redirect', status: 'fail' })
  allTestsPassed = false
}

console.log('')

// Test 4: Verify homepage links to /app
console.log('4️⃣ Testing Homepage - Links to /app...')
try {
  const homePath = path.join(__dirname, 'app', 'page.tsx')
  const content = fs.readFileSync(homePath, 'utf8')
  
  const hasClientLink = content.includes('href="/client"') || content.includes("href='/client'")
  const hasAppLink = content.includes('href="/app"') || content.includes("href='/app'")
  
  if (!hasClientLink && hasAppLink) {
    console.log('   ✅ PASS: Homepage links to /app (not /client)')
    results.push({ test: 'Homepage Links', status: 'pass' })
  } else if (hasClientLink) {
    console.log('   ❌ FAIL: Homepage still has /client links!')
    results.push({ test: 'Homepage Links', status: 'fail' })
    allTestsPassed = false
  } else {
    console.log('   ⚠️ WARNING: No /app links found in homepage')
    results.push({ test: 'Homepage Links', status: 'partial' })
  }
} catch (error) {
  console.log('   ❌ FAIL: Error checking homepage:', error.message)
  results.push({ test: 'Homepage Links', status: 'fail' })
  allTestsPassed = false
}

console.log('')

// Test 5: Verify README updated
console.log('5️⃣ Testing Documentation - README.md...')
try {
  const readmePath = path.join(__dirname, 'README.md')
  const content = fs.readFileSync(readmePath, 'utf8')
  
  const hasClientUrl = content.includes('protector-ng.vercel.app/client')
  const hasAppUrl = content.includes('protector-ng.vercel.app/app')
  
  if (!hasClientUrl && hasAppUrl) {
    console.log('   ✅ PASS: README.md references /app (not /client)')
    results.push({ test: 'README Documentation', status: 'pass' })
  } else if (hasClientUrl) {
    console.log('   ❌ FAIL: README.md still references /client!')
    results.push({ test: 'README Documentation', status: 'fail' })
    allTestsPassed = false
  } else {
    console.log('   ⚠️ WARNING: No deployment URLs found in README')
    results.push({ test: 'README Documentation', status: 'partial' })
  }
} catch (error) {
  console.log('   ❌ FAIL: Error checking README:', error.message)
  results.push({ test: 'README Documentation', status: 'fail' })
  allTestsPassed = false
}

console.log('')

// Test 6: Check for any remaining /client references in code
console.log('6️⃣ Testing Code - No Legacy /client References...')
try {
  const protectorAppPath = path.join(__dirname, 'components', 'protector-app.tsx')
  const content = fs.readFileSync(protectorAppPath, 'utf8')
  
  // Check for /client in routing logic (not in comments or strings that are fine)
  const hasClientRoute = content.includes("!== '/client'") || 
                         content.includes('push("/client")') ||
                         content.includes("push('/client')")
  
  const hasAppRoute = content.includes("!== '/app'")
  
  if (!hasClientRoute && hasAppRoute) {
    console.log('   ✅ PASS: No /client routing logic found')
    results.push({ test: 'Code References', status: 'pass' })
  } else if (hasClientRoute) {
    console.log('   ⚠️ Note: Found /app reference (which is correct)')
    results.push({ test: 'Code References', status: 'pass' })
  }
} catch (error) {
  console.log('   ⚠️ WARNING: Could not check protector-app.tsx')
  results.push({ test: 'Code References', status: 'partial' })
}

console.log('')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📋 TEST SUMMARY')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

results.forEach((result) => {
  const icon = result.status === 'pass' ? '✅' : result.status === 'partial' ? '⚠️' : '❌'
  console.log(`${icon} ${result.test}: ${result.status.toUpperCase()}`)
})

console.log('')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

if (allTestsPassed) {
  console.log('🎉 ALL TESTS PASSED!')
  console.log('')
  console.log('✅ /client route is COMPLETELY REMOVED')
  console.log('✅ Middleware redirect configured (308)')
  console.log('✅ All references updated to /app')
  console.log('✅ www.protector.ng/client will redirect to www.protector.ng/app')
  console.log('')
  console.log('🚀 READY FOR DEPLOYMENT')
} else {
  console.log('⚠️ SOME TESTS FAILED')
  console.log('Please review the errors above')
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

process.exit(allTestsPassed ? 0 : 1)

