#!/usr/bin/env node

/**
 * Make a specific user an operator/agent
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// The email you want to make an operator
const OPERATOR_EMAIL = 'iwewezinemstephen@gmail.com'
const OPERATOR_PASSWORD = 'Operator123!' // Only used if creating new user
const AGENT_CODE = 'OP001'

async function makeOperator() {
  console.log('🚀 Making user an operator...')
  console.log('=' .repeat(70))
  console.log(`📧 Email: ${OPERATOR_EMAIL}`)
  console.log('=' .repeat(70))

  try {
    // Step 1: Check if user exists
    console.log('\n🔍 Step 1: Checking if user exists...')
    
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    let user = users.users.find(u => u.email === OPERATOR_EMAIL)
    let userId = null

    if (user) {
      userId = user.id
      console.log('✅ User found!')
      console.log(`   User ID: ${userId}`)
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`)
    } else {
      // Create new user
      console.log('⚠️  User not found. Creating new account...')
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: OPERATOR_EMAIL,
        password: OPERATOR_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: 'Stephen',
          last_name: 'Iwewezi'
        }
      })

      if (createError) throw createError

      userId = newUser.user.id
      console.log('✅ New user created!')
      console.log(`   User ID: ${userId}`)
      console.log(`   Password: ${OPERATOR_PASSWORD}`)
    }

    // Step 2: Create/Update Profile as Operator
    console.log('\n👤 Step 2: Setting up operator profile...')
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: OPERATOR_EMAIL,
        first_name: 'Stephen',
        last_name: 'Iwewezi',
        role: 'agent', // 'agent' is the operator role
        phone: '+234-XXX-XXX-XXXX',
        is_verified: true,
        is_active: true
      }, {
        onConflict: 'id'
      })

    if (profileError) throw profileError
    console.log('✅ Profile updated to operator role')

    // Step 3: Create/Update Agent Profile
    console.log('\n🛡️  Step 3: Setting up agent details...')
    
    const { error: agentError } = await supabase
      .from('agents')
      .upsert({
        id: userId,
        agent_code: AGENT_CODE,
        license_number: 'LIC-2024-001',
        qualifications: ['Executive Protection', 'Close Protection', 'Security Management'],
        experience_years: 5,
        rating: 5.0,
        total_jobs: 0,
        is_armed: true,
        weapon_license: 'WL-2024-001',
        background_check_status: 'completed',
        availability_status: 'available'
      }, {
        onConflict: 'id'
      })

    if (agentError) throw agentError
    console.log('✅ Agent profile created')

    // Step 4: Verify
    console.log('\n✅ Step 4: Verifying account...')
    
    const { data: profile, error: verifyError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        is_verified,
        is_active,
        agents (
          agent_code,
          availability_status,
          rating,
          experience_years
        )
      `)
      .eq('id', userId)
      .single()

    if (verifyError) throw verifyError

    console.log('\n' + '=' .repeat(70))
    console.log('🎉 SUCCESS! Operator account is ready!')
    console.log('=' .repeat(70))
    console.log('\n📋 ACCOUNT DETAILS:\n')
    console.log(`   Email: ${profile.email}`)
    console.log(`   Name: ${profile.first_name} ${profile.last_name}`)
    console.log(`   Role: ${profile.role.toUpperCase()}`)
    console.log(`   Agent Code: ${profile.agents[0]?.agent_code}`)
    console.log(`   Status: ${profile.agents[0]?.availability_status}`)
    console.log(`   Rating: ⭐ ${profile.agents[0]?.rating}/5.0`)
    console.log(`   Verified: ${profile.is_verified ? '✅' : '❌'}`)
    console.log(`   Active: ${profile.is_active ? '✅' : '❌'}`)
    
    if (!user) {
      console.log(`\n   🔑 Password: ${OPERATOR_PASSWORD}`)
      console.log(`   ⚠️  Please change this password after first login!`)
    }

    console.log('\n' + '=' .repeat(70))
    console.log('\n✅ You can now log in to the operator dashboard!')
    console.log('   Visit: https://protector-ng-lxtd.vercel.app')
    console.log('   Or locally: http://localhost:3000/operator')
    console.log('\n' + '=' .repeat(70))

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  }
}

makeOperator()









