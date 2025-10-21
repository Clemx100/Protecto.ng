#!/usr/bin/env node

/**
 * Create Operator Account Script
 * This script creates a new operator account with a known password
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createOperatorAccount() {
  console.log('👤 Creating Operator Account...');
  
  try {
    const operatorEmail = 'admin@protector.ng';
    const operatorPassword = 'admin123';
    const operatorName = 'Protector Admin';
    
    console.log(`Creating operator: ${operatorEmail}`);
    
    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: operatorEmail,
      password: operatorPassword,
      email_confirm: true,
      user_metadata: {
        full_name: operatorName
      }
    });
    
    if (authError) {
      console.log('❌ Error creating auth user:', authError.message);
      return;
    }
    
    console.log('✅ Auth user created:', authData.user.id);
    
    // Create profile in profiles table (upsert to handle duplicates)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: operatorEmail,
        first_name: 'Protector',
        last_name: 'Admin',
        role: 'admin',
        phone: '+234-000-000-0000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (profileError) {
      console.log('❌ Error creating profile:', profileError.message);
      return;
    }
    
    console.log('✅ Profile created successfully');
    
    console.log('\n🎉 Operator account created successfully!');
    console.log('📧 Email:', operatorEmail);
    console.log('🔑 Password:', operatorPassword);
    console.log('👤 Role: operator');
    
    console.log('\n🚀 You can now login to the operator dashboard with:');
    console.log(`   Email: ${operatorEmail}`);
    console.log(`   Password: ${operatorPassword}`);
    
  } catch (error) {
    console.error('❌ Error creating operator account:', error.message);
  }
}

createOperatorAccount();
