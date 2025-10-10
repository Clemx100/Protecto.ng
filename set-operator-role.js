/**
 * Set iwewezinemstephen@gmail.com as Operator
 * Quick script to update user role in PROTECTOR.NG LIVE database
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kifcevffaputepvpjpip.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio';
const OPERATOR_EMAIL = 'iwewezinemstephen@gmail.com';

async function setOperatorRole() {
  console.log('🔧 Setting operator role for:', OPERATOR_EMAIL);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Step 1: Get user ID
    console.log('\n📋 Step 1: Finding user...');
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const user = users.users.find(u => u.email === OPERATOR_EMAIL);
    
    if (!user) {
      throw new Error(`User ${OPERATOR_EMAIL} not found`);
    }

    console.log(`✅ User found: ${user.id}`);

    // Step 2: Check current profile
    console.log('\n📋 Step 2: Checking current profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`Failed to get profile: ${profileError.message}`);
    }

    if (profile) {
      console.log(`ℹ️  Current role: ${profile.role}`);
      
      if (profile.role === 'operator' || profile.role === 'admin' || profile.role === 'agent') {
        console.log(`✅ User already has operator access!`);
        console.log('\n🎉 DONE! User can access operator dashboard at:');
        console.log('   http://localhost:3000/operator');
        console.log(`   Email: ${OPERATOR_EMAIL}`);
        console.log('   Password: Operator123!');
        return;
      }

      // Delete old profile
      console.log('\n📋 Step 3: Removing old profile...');
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (deleteError) {
        throw new Error(`Failed to delete profile: ${deleteError.message}`);
      }
      console.log('✅ Old profile removed');
    }

    // Step 3: Create new profile with operator role
    console.log('\n📋 Step 4: Creating operator profile...');
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: OPERATOR_EMAIL,
        first_name: 'Iwewezinemstephen',
        last_name: 'Stephen',
        role: 'operator',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      // Try with minimal fields if there's a constraint issue
      console.log('⚠️  Trying with minimal fields...');
      const { data: minimalProfile, error: minimalError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: OPERATOR_EMAIL,
          role: 'operator'
        })
        .select()
        .single();

      if (minimalError) {
        throw new Error(`Failed to create operator profile: ${minimalError.message}`);
      }
      
      console.log('✅ Operator profile created (minimal)');
    } else {
      console.log('✅ Operator profile created');
    }

    // Verify
    console.log('\n📋 Step 5: Verifying...');
    const { data: verifyProfile } = await supabase
      .from('profiles')
      .select('id, email, role, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (verifyProfile) {
      console.log('\n✅ VERIFICATION:');
      console.log('   User ID:', verifyProfile.id);
      console.log('   Email:', verifyProfile.email);
      console.log('   Role:', verifyProfile.role);
      console.log('   Name:', verifyProfile.first_name, verifyProfile.last_name);
    }

    console.log('\n🎉 SUCCESS! Operator account ready!');
    console.log('\n📊 Login Details:');
    console.log('   Dashboard: http://localhost:3000/operator');
    console.log('   Email: iwewezinemstephen@gmail.com');
    console.log('   Password: Operator123!');
    console.log('\n🚀 You can now login as an operator!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n⚠️  Troubleshooting:');
    console.log('   1. Check that the user account exists');
    console.log('   2. Verify Supabase credentials are correct');
    console.log('   3. Check profiles table exists and is accessible');
    console.log('\n💡 Alternative: Run the SQL script directly in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/kifcevffaputepvpjpip/sql/new');
    console.log('\n   SQL:');
    console.log('   ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;');
    console.log('   ALTER TABLE profiles ADD CONSTRAINT profiles_role_check');
    console.log('     CHECK (role IN (\'client\', \'operator\', \'admin\', \'agent\'));');
    console.log('   UPDATE profiles SET role = \'operator\' WHERE email = \'iwewezinemstephen@gmail.com\';');
  }
}

setOperatorRole();

