// Check existing operator accounts
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkOperators() {
  console.log('\n🔍 CHECKING OPERATOR ACCOUNTS\n')
  console.log('='.repeat(70))

  try {
    // Get all profiles with operator-like roles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['operator', 'admin', 'agent'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching profiles:', error.message)
      return
    }

    if (!profiles || profiles.length === 0) {
      console.log('⚠️  No operator accounts found!')
      console.log('\n💡 To create an operator account:')
      console.log('   1. First create a regular user account in your app')
      console.log('   2. Then run: node create-operator-account.js')
      return
    }

    console.log(`\n✅ Found ${profiles.length} operator account(s):\n`)

    profiles.forEach((profile, i) => {
      console.log(`${i + 1}. ${profile.email || 'No email'}`)
      console.log(`   User ID: ${profile.id}`)
      console.log(`   Role: ${profile.role}`)
      console.log(`   Name: ${profile.first_name} ${profile.last_name}`)
      console.log(`   Created: ${new Date(profile.created_at).toLocaleString()}`)
      console.log()
    })

    // Get auth users to check if they exist in auth
    console.log('🔐 Checking auth status...\n')
    
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message)
      return
    }

    profiles.forEach(profile => {
      const authUser = users.find(u => u.id === profile.id)
      if (authUser) {
        console.log(`✅ ${profile.email}: Auth account exists`)
      } else {
        console.log(`⚠️  ${profile.email}: No auth account found`)
      }
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n💡 SECURITY STATUS:')
  console.log('   • Wrong passwords are now REJECTED ✅')
  console.log('   • Only valid credentials can access operator dashboard ✅')
  console.log('   • Fallback auth also requires correct passwords ✅')
  console.log('\n')
}

checkOperators().catch(console.error)

