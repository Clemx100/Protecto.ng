/**
 * Verify and Fix Operator Role
 * This script checks the current status and fixes any issues
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kifcevffaputepvpjpip.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio';
const OPERATOR_EMAIL = 'iwewezinemstephen@gmail.com';

async function verifyAndFix() {
  console.log('🔍 Verifying operator account...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Step 1: Get user
    console.log('Step 1: Finding user account...');
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const user = users.users.find(u => u.email === OPERATOR_EMAIL);
    
    if (!user) {
      throw new Error(`User ${OPERATOR_EMAIL} not found in auth.users`);
    }

    console.log(`✅ User found in auth:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}\n`);

    // Step 2: Check profile
    console.log('Step 2: Checking profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`Failed to check profile: ${profileError.message}`);
    }

    if (profile) {
      console.log(`✅ Profile exists:`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Role: ${profile.role}`);
      console.log(`   First Name: ${profile.first_name}`);
      console.log(`   Last Name: ${profile.last_name}\n`);

      if (profile.role === 'operator' || profile.role === 'admin' || profile.role === 'agent') {
        console.log('🎉 Profile already has correct role!');
        console.log('\n✅ Everything is set up correctly!');
        console.log('\n🤔 If you still get "Access denied", try:');
        console.log('   1. Clear browser cookies');
        console.log('   2. Log out completely');
        console.log('   3. Close all browser tabs');
        console.log('   4. Go to http://localhost:3000/operator');
        console.log('   5. Login again with:');
        console.log(`      Email: ${OPERATOR_EMAIL}`);
        console.log('      Password: Operator123!');
        return;
      }
    } else {
      console.log('⚠️  No profile found\n');
    }

    // Step 3: Fix profile
    console.log('Step 3: Creating/Updating profile with operator role...');
    
    if (profile) {
      // Delete existing profile first
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (deleteError) {
        console.log(`⚠️  Could not delete old profile: ${deleteError.message}`);
      } else {
        console.log('   Deleted old profile');
      }
    }

    // Insert new profile with operator role using raw SQL
    const { data: insertData, error: insertError } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO profiles (id, email, role, first_name, last_name, created_at, updated_at)
        VALUES ('${user.id}', '${OPERATOR_EMAIL}', 'operator', 'Iwewezinemstephen', 'Stephen', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET role = 'operator', updated_at = NOW();
      `
    });

    if (insertError) {
      // Fallback: Try direct insert
      const { error: directInsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: OPERATOR_EMAIL,
          role: 'operator',
          first_name: 'Iwewezinemstephen',
          last_name: 'Stephen',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (directInsertError) {
        throw new Error(`Failed to create profile: ${directInsertError.message}`);
      }
    }

    console.log('✅ Profile created/updated\n');

    // Step 4: Verify
    console.log('Step 4: Verifying changes...');
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (verifyError) {
      throw new Error(`Failed to verify: ${verifyError.message}`);
    }

    console.log(`✅ Verified:`);
    console.log(`   ID: ${verifyProfile.id}`);
    console.log(`   Email: ${verifyProfile.email}`);
    console.log(`   Role: ${verifyProfile.role}`);
    console.log(`   Name: ${verifyProfile.first_name} ${verifyProfile.last_name}\n`);

    if (verifyProfile.role === 'operator') {
      console.log('🎉 SUCCESS! Operator account is ready!\n');
      console.log('📋 Next Steps:');
      console.log('   1. Log out if you\'re currently logged in');
      console.log('   2. Clear browser cache/cookies');
      console.log('   3. Go to http://localhost:3000/operator');
      console.log('   4. Login with:');
      console.log(`      Email: ${OPERATOR_EMAIL}`);
      console.log('      Password: Operator123!');
      console.log('\n✅ You should now have access to the operator dashboard!');
    } else {
      console.log(`⚠️  Role is still '${verifyProfile.role}' instead of 'operator'`);
      console.log('\n💡 You may need to run the SQL script directly in Supabase:');
      console.log('   https://supabase.com/dashboard/project/kifcevffaputepvpjpip/sql/new');
      console.log('\n   SQL:');
      console.log(`   UPDATE profiles SET role = 'operator' WHERE email = '${OPERATOR_EMAIL}';`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Manual Fix - Run this in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/kifcevffaputepvpjpip/sql/new\n');
    console.log('   SQL:');
    console.log('   -- First, check if profile exists');
    console.log(`   SELECT id, email, role FROM profiles WHERE email = '${OPERATOR_EMAIL}';\n`);
    console.log('   -- If it exists, update the role');
    console.log(`   UPDATE profiles SET role = 'operator', updated_at = NOW() WHERE email = '${OPERATOR_EMAIL}';\n`);
    console.log('   -- If it doesn\'t exist, get the user ID from auth and insert');
    console.log(`   SELECT id FROM auth.users WHERE email = '${OPERATOR_EMAIL}';`);
    console.log('   -- Then use that ID to insert:');
    console.log(`   INSERT INTO profiles (id, email, role) VALUES ('[USER_ID_HERE]', '${OPERATOR_EMAIL}', 'operator');`);
  }
}

verifyAndFix();

