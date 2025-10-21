// Reset operator password for iwewezinemstephen@gmail.com
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resetPassword() {
  console.log('\n🔐 OPERATOR PASSWORD RESET\n')
  console.log('='.repeat(70))

  const email = 'iwewezinemstephen@gmail.com'
  const newPassword = 'Operator123!'

  console.log(`\nResetting password for: ${email}`)
  console.log(`New password: ${newPassword}`)

  try {
    // First, check if the user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message)
      return
    }

    const user = users.find(u => u.email === email)
    
    if (!user) {
      console.error('❌ User not found!')
      console.log('\n💡 The user might need to be created first.')
      console.log('   Would you like me to create an operator account?')
      return
    }

    console.log(`\n✅ User found: ${user.email}`)
    console.log(`   User ID: ${user.id}`)
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`)

    // Reset the password
    console.log('\n🔄 Resetting password...')
    
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('❌ Error resetting password:', updateError.message)
      return
    }

    console.log('\n✅ ✅ ✅ PASSWORD RESET SUCCESSFUL! ✅ ✅ ✅\n')
    console.log('=' .repeat(70))
    console.log('\n📋 NEW LOGIN CREDENTIALS:\n')
    console.log(`   Email:    ${email}`)
    console.log(`   Password: ${newPassword}`)
    console.log('\n' + '='.repeat(70))
    console.log('\n🎯 NEXT STEPS:\n')
    console.log('   1. Go to: http://192.168.1.142:3000/operator')
    console.log('   2. Use the credentials above')
    console.log('   3. Click "Sign In to Dashboard"')
    console.log('\n✅ You should now be able to login!\n')
    console.log('='.repeat(70) + '\n')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

resetPassword().catch(console.error)

