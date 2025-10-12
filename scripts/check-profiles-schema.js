const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
);

async function checkProfilesSchema() {
  console.log('🔍 Checking profiles table schema...');
  
  try {
    // Get table schema information
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error querying profiles table:', error);
      return;
    }
    
    console.log('✅ Profiles table exists and is accessible');
    
    // Try to get column information by attempting to insert a test record
    const testProfile = {
      email: 'test_schema_check@protector.ng',
      phone: '+2348012345678',
      first_name: 'Test',
      last_name: 'User',
      role: 'client',
      is_verified: false,
      is_active: true,
      credentials_completed: false
    };
    
    console.log('🧪 Testing profile creation with:', testProfile);
    
    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert([testProfile])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Profile creation failed:', createError);
      console.error('❌ Error details:', {
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
        code: createError.code
      });
    } else {
      console.log('✅ Profile creation successful:', createdProfile);
      
      // Clean up test profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', createdProfile.id);
      
      console.log('🧹 Test profile cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkProfilesSchema();









