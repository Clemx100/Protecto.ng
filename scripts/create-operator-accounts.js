#!/usr/bin/env node

/**
 * Create Operator Accounts Script for Protector.Ng
 * This script creates operator users in Supabase with proper authentication and profiles
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is not set in .env.local')
  console.log('Please add your service role key to .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Operator accounts to create
const operators = [
  {
    email: 'operator@protector.ng',
    password: 'OperatorPass123!', // Change this!
    firstName: 'John',
    lastName: 'Operator',
    phone: '+234-800-000-0000',
    agentCode: 'OP001',
    licenseNumber: 'LIC-2024-001',
    qualifications: ['Executive Protection', 'Close Protection', 'Security Management'],
    experienceYears: 5,
    isArmed: true,
    weaponLicense: 'WL-2024-001'
  },
  {
    email: 'operator2@protector.ng',
    password: 'OperatorPass456!', // Change this!
    firstName: 'Sarah',
    lastName: 'Manager',
    phone: '+234-800-000-0001',
    agentCode: 'OP002',
    licenseNumber: 'LIC-2024-002',
    qualifications: ['Security Management', 'Risk Assessment', 'Team Leadership'],
    experienceYears: 8,
    isArmed: true,
    weaponLicense: 'WL-2024-002'
  }
]

async function createOperatorAccount(operatorData) {
  try {
    console.log(`\n📝 Creating operator account: ${operatorData.email}`)

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: operatorData.email,
      password: operatorData.password,
      email_confirm: true,
      user_metadata: {
        first_name: operatorData.firstName,
        last_name: operatorData.lastName
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists, fetching existing user...')
        
        // Try to get existing user by email
        const { data: users, error: listError } = await supabase.auth.admin.listUsers()
        if (listError) throw listError
        
        const existingUser = users.users.find(u => u.email === operatorData.email)
        if (!existingUser) {
          throw new Error('User exists but could not be found')
        }
        
        authData.user = existingUser
        console.log('✅ Found existing user:', existingUser.id)
      } else {
        throw authError
      }
    } else {
      console.log('✅ Auth user created:', authData.user.id)
    }

    const userId = authData.user.id

    // Step 2: Create/update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: operatorData.email,
        first_name: operatorData.firstName,
        last_name: operatorData.lastName,
        role: 'agent',
        phone: operatorData.phone,
        is_verified: true,
        is_active: true
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('❌ Profile creation error:', profileError)
      throw profileError
    }
    console.log('✅ Profile created/updated')

    // Step 3: Create/update agent profile
    const { error: agentError } = await supabase
      .from('agents')
      .upsert({
        id: userId,
        agent_code: operatorData.agentCode,
        license_number: operatorData.licenseNumber,
        qualifications: operatorData.qualifications,
        experience_years: operatorData.experienceYears,
        rating: 4.8,
        total_jobs: 0,
        is_armed: operatorData.isArmed,
        weapon_license: operatorData.weaponLicense,
        background_check_status: 'completed',
        availability_status: 'available'
      }, {
        onConflict: 'id'
      })

    if (agentError) {
      console.error('❌ Agent profile creation error:', agentError)
      throw agentError
    }
    console.log('✅ Agent profile created/updated')

    console.log(`\n✅ SUCCESS: Operator account created!`)
    console.log(`   Email: ${operatorData.email}`)
    console.log(`   Password: ${operatorData.password}`)
    console.log(`   User ID: ${userId}`)
    console.log(`   Agent Code: ${operatorData.agentCode}`)

    return { success: true, userId }

  } catch (error) {
    console.error(`\n❌ ERROR creating operator ${operatorData.email}:`, error.message)
    return { success: false, error: error.message }
  }
}

async function createAdminAccount() {
  try {
    console.log(`\n📝 Creating admin account: admin@protector.ng`)

    const adminData = {
      email: 'admin@protector.ng',
      password: 'AdminPass123!', // Change this!
      firstName: 'Admin',
      lastName: 'User',
      phone: '+234-800-000-0002'
    }

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminData.email,
      password: adminData.password,
      email_confirm: true,
      user_metadata: {
        first_name: adminData.firstName,
        last_name: adminData.lastName
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  Admin already exists, fetching existing user...')
        
        const { data: users, error: listError } = await supabase.auth.admin.listUsers()
        if (listError) throw listError
        
        const existingUser = users.users.find(u => u.email === adminData.email)
        if (!existingUser) throw new Error('User exists but could not be found')
        
        authData.user = existingUser
        console.log('✅ Found existing admin:', existingUser.id)
      } else {
        throw authError
      }
    } else {
      console.log('✅ Admin auth user created:', authData.user.id)
    }

    const userId = authData.user.id

    // Step 2: Create/update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: adminData.email,
        first_name: adminData.firstName,
        last_name: adminData.lastName,
        role: 'admin',
        phone: adminData.phone,
        is_verified: true,
        is_active: true
      }, {
        onConflict: 'id'
      })

    if (profileError) throw profileError
    console.log('✅ Admin profile created/updated')

    console.log(`\n✅ SUCCESS: Admin account created!`)
    console.log(`   Email: ${adminData.email}`)
    console.log(`   Password: ${adminData.password}`)
    console.log(`   User ID: ${userId}`)

    return { success: true, userId }

  } catch (error) {
    console.error(`\n❌ ERROR creating admin:`, error.message)
    return { success: false, error: error.message }
  }
}

async function verifyAccounts() {
  try {
    console.log('\n\n📊 Verifying created accounts...\n')

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        phone,
        is_verified,
        is_active,
        agents (
          agent_code,
          availability_status,
          rating,
          experience_years
        )
      `)
      .in('role', ['agent', 'admin'])
      .order('created_at', { ascending: false })

    if (error) throw error

    if (profiles && profiles.length > 0) {
      console.log('✅ Accounts in database:\n')
      profiles.forEach(profile => {
        console.log(`   📧 ${profile.email}`)
        console.log(`      Role: ${profile.role}`)
        console.log(`      Name: ${profile.first_name} ${profile.last_name}`)
        console.log(`      Active: ${profile.is_active ? '✅' : '❌'}`)
        if (profile.agents && profile.agents.length > 0) {
          console.log(`      Agent Code: ${profile.agents[0].agent_code}`)
          console.log(`      Status: ${profile.agents[0].availability_status}`)
        }
        console.log('')
      })
    } else {
      console.log('⚠️  No operator/admin accounts found')
    }

  } catch (error) {
    console.error('❌ Error verifying accounts:', error.message)
  }
}

async function main() {
  console.log('🚀 Protector.Ng - Operator Account Creation Script')
  console.log('=' .repeat(60))
  console.log(`📍 Supabase URL: ${supabaseUrl}`)
  console.log('=' .repeat(60))

  const results = []

  // Create operator accounts
  for (const operator of operators) {
    const result = await createOperatorAccount(operator)
    results.push(result)
  }

  // Create admin account
  const adminResult = await createAdminAccount()
  results.push(adminResult)

  // Verify all accounts
  await verifyAccounts()

  // Summary
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)
  console.log('='.repeat(60))

  if (failed > 0) {
    console.log('\n⚠️  Some accounts failed to create. Check the errors above.')
    process.exit(1)
  } else {
    console.log('\n✅ All accounts created successfully!')
    console.log('\n📝 IMPORTANT: Change the default passwords immediately!')
    console.log('   You can now log in to the operator dashboard with these credentials.')
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})


