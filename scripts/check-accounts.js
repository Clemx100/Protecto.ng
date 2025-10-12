#!/usr/bin/env node

/**
 * Check existing accounts in Supabase
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkAccounts() {
  console.log('🔍 Checking existing accounts in Supabase...\n')
  console.log('=' .repeat(70))

  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) throw authError

    console.log(`\n📊 Total Auth Users: ${authUsers.users.length}\n`)

    // Get all profiles
    const { data: profiles, error: profileError } = await supabase
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
        created_at
      `)
      .order('created_at', { ascending: false })

    if (profileError) {
      console.log('⚠️  No profiles table or no profiles found')
    }

    // Get all agents
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('*')

    if (agentError) {
      console.log('⚠️  No agents table or no agents found')
    }

    console.log('👥 ALL USERS:\n')

    authUsers.users.forEach((user, index) => {
      console.log(`${index + 1}. 📧 ${user.email}`)
      console.log(`   User ID: ${user.id}`)
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`)
      console.log(`   Confirmed: ${user.email_confirmed_at ? '✅ Yes' : '❌ No'}`)
      
      // Find matching profile
      const profile = profiles?.find(p => p.id === user.id)
      if (profile) {
        console.log(`   Profile Role: ${profile.role}`)
        console.log(`   Name: ${profile.first_name} ${profile.last_name}`)
        console.log(`   Active: ${profile.is_active ? '✅' : '❌'}`)
        console.log(`   Verified: ${profile.is_verified ? '✅' : '❌'}`)
      } else {
        console.log(`   Profile: ⚠️  No profile found`)
      }

      // Find matching agent
      const agent = agents?.find(a => a.id === user.id)
      if (agent) {
        console.log(`   Agent Code: ${agent.agent_code}`)
        console.log(`   Status: ${agent.availability_status}`)
        console.log(`   Experience: ${agent.experience_years} years`)
      }
      
      console.log('')
    })

    console.log('=' .repeat(70))
    console.log('\n📈 SUMMARY:\n')
    console.log(`Total Auth Users: ${authUsers.users.length}`)
    console.log(`Total Profiles: ${profiles?.length || 0}`)
    console.log(`Total Agents: ${agents?.length || 0}`)
    
    const operators = profiles?.filter(p => p.role === 'agent') || []
    const admins = profiles?.filter(p => p.role === 'admin') || []
    const clients = profiles?.filter(p => p.role === 'client') || []
    
    console.log(`\nBy Role:`)
    console.log(`  👮 Operators/Agents: ${operators.length}`)
    console.log(`  🔧 Admins: ${admins.length}`)
    console.log(`  👤 Clients: ${clients.length}`)

    console.log('\n' + '=' .repeat(70))

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkAccounts()










