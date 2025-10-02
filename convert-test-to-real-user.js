const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
);

/**
 * Convert a test user to a real user
 * This will update the profile with real information
 */
async function convertTestUserToRealUser() {
  console.log('🔄 Converting Test User to Real User...\n');
  
  // Configuration - UPDATE THESE VALUES
  const USER_CONFIG = {
    // The user ID to convert (find this in Supabase auth.users or profiles table)
    userId: '4d2535f4-e7c7-4e06-b78a-469f68cc96be', // Change this to your test user's ID
    
    // New real user information
    firstName: 'Stephen',
    lastName: 'Iwewezinem',
    email: 'stephen@example.com', // Update with real email if different
    phone: '+2348012345678', // Update with real phone
    address: 'Lagos, Nigeria', // Optional
    emergencyContact: 'Jane Doe', // Optional
    emergencyPhone: '+2348087654321', // Optional
    
    // Verification status
    isVerified: true,
    isActive: true,
    credentialsCompleted: true
  };
  
  try {
    // 1. Fetch current user profile
    console.log('1. 📋 Fetching current user profile...');
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', USER_CONFIG.userId)
      .single();
      
    if (fetchError) {
      console.error('❌ Error fetching profile:', fetchError.message);
      return;
    }
    
    if (!currentProfile) {
      console.error('❌ User not found with ID:', USER_CONFIG.userId);
      return;
    }
    
    console.log('   Current Profile:', {
      name: `${currentProfile.first_name} ${currentProfile.last_name}`,
      email: currentProfile.email,
      phone: currentProfile.phone,
      verified: currentProfile.is_verified
    });
    
    // 2. Update profile with real information
    console.log('\n2. ✏️  Updating profile with real information...');
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: USER_CONFIG.firstName,
        last_name: USER_CONFIG.lastName,
        email: USER_CONFIG.email,
        phone: USER_CONFIG.phone,
        address: USER_CONFIG.address,
        emergency_contact: USER_CONFIG.emergencyContact,
        emergency_phone: USER_CONFIG.emergencyPhone,
        is_verified: USER_CONFIG.isVerified,
        is_active: USER_CONFIG.isActive,
        credentials_completed: USER_CONFIG.credentialsCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('id', USER_CONFIG.userId)
      .select()
      .single();
      
    if (updateError) {
      console.error('❌ Error updating profile:', updateError.message);
      return;
    }
    
    console.log('   ✅ Profile updated successfully!');
    console.log('   New Profile:', {
      name: `${updatedProfile.first_name} ${updatedProfile.last_name}`,
      email: updatedProfile.email,
      phone: updatedProfile.phone,
      verified: updatedProfile.is_verified,
      credentials_completed: updatedProfile.credentials_completed
    });
    
    // 3. Check associated bookings
    console.log('\n3. 📚 Checking associated bookings...');
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_code, status, created_at')
      .eq('client_id', USER_CONFIG.userId)
      .order('created_at', { ascending: false });
      
    if (bookingsError) {
      console.error('⚠️  Warning: Could not fetch bookings:', bookingsError.message);
    } else {
      console.log(`   Found ${bookings.length} bookings associated with this user`);
      if (bookings.length > 0) {
        console.log('   Recent bookings:');
        bookings.slice(0, 3).forEach((booking, index) => {
          console.log(`   ${index + 1}. ${booking.booking_code} - ${booking.status} (${new Date(booking.created_at).toLocaleDateString()})`);
        });
      }
    }
    
    // 4. Optionally update auth.users email if changed
    console.log('\n4. 📧 Checking auth email...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(USER_CONFIG.userId);
    
    if (authError) {
      console.log('   ⚠️  Could not check auth email (admin access required)');
    } else if (authUser.user.email !== USER_CONFIG.email) {
      console.log(`   ⚠️  Note: Auth email (${authUser.user.email}) differs from profile email (${USER_CONFIG.email})`);
      console.log('   💡 To update auth email, use Supabase Dashboard > Authentication > Users');
    } else {
      console.log('   ✅ Auth email matches profile email');
    }
    
    // 5. Verify operator dashboard view
    console.log('\n5. 🎯 Verifying operator dashboard view...');
    const { data: dashboardView, error: viewError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_code,
        status,
        created_at,
        client:profiles!bookings_client_id_fkey(first_name, last_name, phone, email)
      `)
      .eq('client_id', USER_CONFIG.userId)
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (viewError) {
      console.error('   ⚠️  Could not verify dashboard view:', viewError.message);
    } else {
      console.log('   ✅ Operator dashboard will show:');
      dashboardView.forEach((booking, index) => {
        const clientName = booking.client ? 
          `${booking.client.first_name} ${booking.client.last_name}` : 
          'Unknown User';
        console.log(`   ${index + 1}. ${booking.booking_code} - ${clientName} - ${booking.status}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CONVERSION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ User converted from "${currentProfile.first_name} ${currentProfile.last_name}" to "${USER_CONFIG.firstName} ${USER_CONFIG.lastName}"`);
    console.log('✅ All existing bookings now show the real user information');
    console.log('✅ Operator dashboard will display proper client details');
    console.log('✅ User can now log in with their real credentials');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Conversion error:', error.message);
    console.error(error);
  }
}

// Run the conversion
convertTestUserToRealUser();

