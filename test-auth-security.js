// Test Authentication Security
// This script verifies that wrong passwords are rejected

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testAuthSecurity() {
  console.log('\n🔒 AUTHENTICATION SECURITY TEST\n')
  console.log('='.repeat(70))

  // Test cases
  const testCases = [
    {
      name: 'Valid operator credentials',
      email: 'iwewezinemstephen@gmail.com',
      password: 'correctPassword123',
      shouldSucceed: true,
      description: 'Should allow login with correct password'
    },
    {
      name: 'Invalid password',
      email: 'iwewezinemstephen@gmail.com',
      password: 'wrongPassword456',
      shouldSucceed: false,
      description: 'Should REJECT login with wrong password'
    },
    {
      name: 'Empty password',
      email: 'iwewezinemstephen@gmail.com',
      password: '',
      shouldSucceed: false,
      description: 'Should REJECT login with empty password'
    },
    {
      name: 'Different wrong password',
      email: 'iwewezinemstephen@gmail.com',
      password: 'anotherWrongPass',
      shouldSucceed: false,
      description: 'Should REJECT login with different wrong password'
    }
  ]

  const results = []

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`)
    console.log(`   ${testCase.description}`)
    console.log(`   Email: ${testCase.email}`)
    console.log(`   Password: ${'*'.repeat(testCase.password.length)}`)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testCase.email,
        password: testCase.password
      })

      if (error) {
        // Login failed
        if (!testCase.shouldSucceed) {
          console.log(`   ✅ PASS: Login correctly rejected`)
          console.log(`   Error message: "${error.message}"`)
          results.push({ test: testCase.name, passed: true })
        } else {
          console.log(`   ❌ FAIL: Login should have succeeded but was rejected`)
          console.log(`   Error: ${error.message}`)
          results.push({ test: testCase.name, passed: false })
        }
      } else {
        // Login succeeded
        if (testCase.shouldSucceed) {
          console.log(`   ✅ PASS: Login successful`)
          console.log(`   User: ${data.user.email}`)
          
          // Check role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single()
          
          console.log(`   Role: ${profile?.role || 'unknown'}`)
          
          // Sign out
          await supabase.auth.signOut()
          results.push({ test: testCase.name, passed: true })
        } else {
          console.log(`   ❌ FAIL: Login should have been rejected but succeeded!`)
          console.log(`   🚨 SECURITY VULNERABILITY: Wrong password was accepted!`)
          console.log(`   User: ${data.user.email}`)
          
          // Sign out
          await supabase.auth.signOut()
          results.push({ test: testCase.name, passed: false })
        }
      }
    } catch (err) {
      console.log(`   ⚠️  Unexpected error: ${err.message}`)
      results.push({ test: testCase.name, passed: false })
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('\n📊 TEST RESULTS SUMMARY:\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.test}: ${result.passed ? '✅ PASS' : '❌ FAIL'}`)
  })

  console.log(`\nTotal Tests: ${results.length}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)

  if (failed === 0) {
    console.log('\n🎉 ✅ ALL TESTS PASSED! Authentication is secure!\n')
  } else {
    console.log('\n⚠️  ❌ SOME TESTS FAILED! There may be security issues!\n')
  }

  console.log('='.repeat(70) + '\n')

  // Additional info
  console.log('💡 IMPORTANT NOTES:')
  console.log('   • If you don\'t have an operator account yet, all tests may fail')
  console.log('   • To create an operator account, run: node create-operator-account.js')
  console.log('   • Only accounts with "operator", "admin", or "agent" roles can access the operator dashboard')
  console.log('\n')
}

testAuthSecurity().catch(console.error)

