/**
 * PROTECTOR.NG LIVE - Setup Script
 * 
 * This script:
 * 1. Creates the .env.local file with PROTECTOR.NG LIVE credentials
 * 2. Creates the operator account: iwewezinemstephen@gmail.com
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// PROTECTOR.NG LIVE credentials
const SUPABASE_URL = 'https://kifcevffaputepvpjpip.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ0NzYsImV4cCI6MjA3NTM3MDQ3Nn0.YuVbfSbrDUy2nPigODzCcaOWTEXaJlPrVGE1L0C3y6g';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio';

// Operator details
const OPERATOR_EMAIL = 'iwewezinemstephen@gmail.com';
const OPERATOR_PASSWORD = 'Operator123!';

async function setup() {
  console.log('🚀 PROTECTOR.NG LIVE - Setup Starting...\n');

  // Step 1: Create .env.local file
  console.log('📝 Step 1: Creating .env.local file...');
  const envContent = `# PROTECTOR.NG LIVE - Supabase Configuration
# Project: kifcevffaputepvpjpip
# Dashboard: https://supabase.com/dashboard/project/kifcevffaputepvpjpip

NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# Stripe Configuration (Add your keys when ready)
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# STRIPE_SECRET_KEY=
`;

  try {
    fs.writeFileSync('.env.local', envContent);
    console.log('✅ .env.local file created successfully!\n');
  } catch (error) {
    console.error('❌ Failed to create .env.local:', error.message);
    console.log('⚠️  Please create .env.local manually with the following content:');
    console.log('---');
    console.log(envContent);
    console.log('---\n');
  }

  // Step 2: Create operator account
  console.log('👨‍💼 Step 2: Creating operator account...');
  console.log(`   Email: ${OPERATOR_EMAIL}`);
  console.log(`   Password: ${OPERATOR_PASSWORD}`);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const existingUser = existingUsers.users.find(u => u.email === OPERATOR_EMAIL);

    let userId;

    if (existingUser) {
      console.log(`ℹ️  User ${OPERATOR_EMAIL} already exists (ID: ${existingUser.id})`);
      userId = existingUser.id;
    } else {
      // Create user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: OPERATOR_EMAIL,
        password: OPERATOR_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: 'Iwewezinemstephen',
          last_name: 'Stephen'
        }
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      console.log(`✅ User created successfully! (ID: ${newUser.user.id})`);
      userId = newUser.user.id;
    }

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      console.log(`ℹ️  Profile already exists with role: ${existingProfile.role}`);
      
      // Update role to operator if not already
      if (existingProfile.role !== 'operator' && existingProfile.role !== 'admin' && existingProfile.role !== 'agent') {
        // Delete and recreate profile to avoid constraint issues
        console.log(`   Updating role from '${existingProfile.role}' to 'operator'...`);
        
        const { error: deleteError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (deleteError) {
          throw new Error(`Failed to delete old profile: ${deleteError.message}`);
        }

        const { error: createProfileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            email: OPERATOR_EMAIL,
            first_name: 'Iwewezinemstephen',
            last_name: 'Stephen',
            role: 'operator',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (createProfileError) {
          throw new Error(`Failed to create operator profile: ${createProfileError.message}`);
        }

        console.log(`✅ Profile role updated to 'operator'`);
      } else {
        console.log(`✅ Profile already has operator access (role: ${existingProfile.role})`);
      }
    } else {
      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: OPERATOR_EMAIL,
          first_name: 'Iwewezinemstephen',
          last_name: 'Stephen',
          role: 'operator',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      console.log(`✅ Profile created with 'operator' role`);
    }

    console.log('\n🎉 Setup Complete!\n');
    console.log('📊 Summary:');
    console.log('  ✅ .env.local file created');
    console.log(`  ✅ Operator account ready: ${OPERATOR_EMAIL}`);
    console.log(`  ✅ Password: ${OPERATOR_PASSWORD}`);
    console.log(`  ✅ User ID: ${userId}`);
    console.log('\n🚀 Next Steps:');
    console.log('  1. Restart your development server: npm run mobile');
    console.log('  2. Wait for server to start (no old Supabase URL errors)');
    console.log('  3. Go to http://localhost:3000/operator');
    console.log(`  4. Login with ${OPERATOR_EMAIL} / ${OPERATOR_PASSWORD}`);
    console.log('\n✅ Your app is now using PROTECTOR.NG LIVE database!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n⚠️  Please check:');
    console.log('  1. Your internet connection');
    console.log('  2. The Supabase credentials are correct');
    console.log('  3. The profiles table exists in your database');
  }
}

setup();

