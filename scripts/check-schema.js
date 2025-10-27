#!/usr/bin/env node

/**
 * Check the actual database schema
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjdbhusnplveeaveeovd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
  console.log('🔍 Checking Database Schema...\n')
  
  // Check bookings table structure
  console.log('📋 Bookings Table:')
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .limit(1)
  
  if (bookings && bookings[0]) {
    console.log('Columns:', Object.keys(bookings[0]).join(', '))
    console.log('\nSample booking:', JSON.stringify(bookings[0], null, 2))
  } else if (bookingsError) {
    console.log('Error:', bookingsError.message)
  }
  
  // Check profiles table
  console.log('\n\n👤 Profiles Table:')
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
  
  if (profiles && profiles[0]) {
    console.log('Columns:', Object.keys(profiles[0]).join(', '))
  } else if (profilesError) {
    console.log('Error:', profilesError.message)
  }
  
  // Check agents table
  console.log('\n\n🛡️  Agents Table:')
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('*')
    .limit(1)
  
  if (agents && agents[0]) {
    console.log('Columns:', Object.keys(agents[0]).join(', '))
  } else if (agentsError) {
    console.log('Error:', agentsError.message)
  }
}

checkSchema()




























