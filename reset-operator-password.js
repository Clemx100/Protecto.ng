#!/usr/bin/env node

/**
 * Reset Operator Password Script
 * This script resets the password for the existing operator account
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetOperatorPassword() {
  console.log('🔑 Resetting Operator Password...');
  
  try {
    const operatorEmail = 'iwewezinemstephen@gmail.com';
    const newPassword = 'operator123';
    
    console.log(`Resetting password for: ${operatorEmail}`);
    
    // First, get the user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log('❌ Error listing users:', listError.message);
      return;
    }
    
    const user = users.users.find(u => u.email === operatorEmail);
    
    if (!user) {
      console.log('❌ User not found:', operatorEmail);
      return;
    }
    
    console.log('✅ Found user:', user.id);
    
    // Update the user's password
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword
      }
    );
    
    if (updateError) {
      console.log('❌ Error updating password:', updateError.message);
      return;
    }
    
    console.log('✅ Password updated successfully!');
    
    console.log('\n🎉 Operator account ready!');
    console.log('📧 Email:', operatorEmail);
    console.log('🔑 Password:', newPassword);
    console.log('👤 Role: operator');
    
    console.log('\n🚀 You can now login to the operator dashboard with:');
    console.log(`   Email: ${operatorEmail}`);
    console.log(`   Password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  }
}

resetOperatorPassword();













