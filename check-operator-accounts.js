#!/usr/bin/env node

/**
 * Check Operator Accounts Script
 * This script checks if there are any operator accounts in the database
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkOperators() {
  console.log('🔍 Checking for operator accounts...');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  try {
    // Check profiles table for operators
    console.log('\n📊 Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role, first_name, last_name, created_at')
      .in('role', ['operator', 'admin', 'agent']);
    
    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError.message);
      return;
    }
    
    console.log('Found profiles with operator roles:');
    if (profiles && profiles.length > 0) {
      profiles.forEach(profile => {
        console.log(`  - ${profile.email} (role: ${profile.role}, name: ${profile.first_name} ${profile.last_name})`);
      });
    } else {
      console.log('  No operator accounts found in profiles table');
    }
    
    // Check if we can access auth (this might fail without service role key)
    console.log('\n🔍 Checking if we can access auth...');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.log('⚠️  Cannot access auth without service role key:', authError.message);
      } else if (user) {
        console.log('✅ Current user:', user.email);
      } else {
        console.log('ℹ️  No user currently logged in');
      }
    } catch (error) {
      console.log('⚠️  Auth access error:', error.message);
    }
    
    // Check if we need to create operator accounts
    if (!profiles || profiles.length === 0) {
      console.log('\n🚨 No operator accounts found!');
      console.log('You need to create operator accounts to access the dashboard.');
      console.log('\n📋 To create operator accounts:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Go to Authentication > Users');
      console.log('3. Create a new user with email and password');
      console.log('4. Go to Table Editor > profiles');
      console.log('5. Create a profile with role="operator" for that user');
      console.log('\nOr run: node scripts/make-operator.js');
    }
    
  } catch (error) {
    console.error('❌ Error checking operators:', error.message);
  }
}

checkOperators();















