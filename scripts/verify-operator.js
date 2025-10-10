#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verify() {
  console.log('🔍 Verifying operator account...\n')
  
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      agents (*)
    `)
    .eq('email', 'iwewezinemstephen@gmail.com')
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('✅ OPERATOR ACCOUNT VERIFIED!\n')
  console.log('Profile:', JSON.stringify(data, null, 2))
}

verify()





