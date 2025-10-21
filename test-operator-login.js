#!/usr/bin/env node

/**
 * Test Operator Login Script
 * This script tests if operator login works with the current setup
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testOperatorLogin() {
  console.log('🧪 Testing Operator Login...');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not Set');
  
  try {
    // Test with the known operator email
    const operatorEmail = 'iwewezinemstephen@gmail.com';
    const testPassword = 'operator123'; // Updated password
    
    console.log(`\n🔐 Testing login for: ${operatorEmail}`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: operatorEmail,
      password: testPassword
    });
    
    if (error) {
      console.log('❌ Login failed:', error.message);
      
      if (error.message.includes('Invalid login credentials')) {
        console.log('\n💡 The operator account exists but the password is incorrect.');
        console.log('You need to:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Go to Authentication > Users');
        console.log('3. Find the user: iwewezinemstephen@gmail.com');
        console.log('4. Reset the password or create a new one');
        console.log('5. Or create a new operator account');
      }
      return;
    }
    
    if (data.user) {
      console.log('✅ Login successful!');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);
      
      // Check user's role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.log('❌ Error fetching profile:', profileError.message);
      } else {
        console.log('Profile:', profile);
        if (profile.role === 'operator' || profile.role === 'admin' || profile.role === 'agent') {
          console.log('✅ User has operator access!');
        } else {
          console.log('❌ User does not have operator access. Role:', profile.role);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testOperatorLogin();
