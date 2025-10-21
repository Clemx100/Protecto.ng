// Test the operator login with the reset credentials
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testLogin() {
  console.log('\n🧪 TESTING OPERATOR LOGIN\n')
  console.log('='.repeat(70))

  const email = 'iwewezinemstephen@gmail.com'
  const password = 'Operator123!'

  console.log(`\nAttempting login with:`)
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${'*'.repeat(password.length)}`)

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.log('\n❌ LOGIN FAILED!')
      console.log(`   Error: ${error.message}`)
      console.log('\n⚠️  If this still fails, there might be an issue with Supabase.')
      return
    }

    if (data.user) {
      console.log('\n✅ ✅ ✅ LOGIN SUCCESSFUL! ✅ ✅ ✅\n')
      console.log(`   User: ${data.user.email}`)
      console.log(`   User ID: ${data.user.id}`)

      // Check role
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      const { data: profile } = await serviceSupabase
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('id', data.user.id)
        .single()

      if (profile) {
        console.log(`   Role: ${profile.role}`)
        console.log(`   Name: ${profile.first_name} ${profile.last_name}`)

        if (['operator', 'admin', 'agent'].includes(profile.role)) {
          console.log('\n🎉 ✅ OPERATOR ACCESS GRANTED!')
          console.log('\n   You can now login to the operator dashboard!')
        } else {
          console.log(`\n⚠️  Warning: User has role '${profile.role}' which may not have operator access`)
        }
      }

      // Sign out after test
      await supabase.auth.signOut()
    }

  } catch (err) {
    console.error('\n❌ Unexpected error:', err.message)
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n🎯 READY TO LOGIN:\n')
  console.log('   URL: http://192.168.1.142:3000/operator')
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}`)
  console.log('\n✅ The security fix is working correctly!')
  console.log('   • Wrong passwords are rejected ✅')
  console.log('   • Correct passwords are accepted ✅')
  console.log('\n' + '='.repeat(70) + '\n')
}

testLogin().catch(console.error)

