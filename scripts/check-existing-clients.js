const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
);

async function checkExistingClients() {
  console.log('🔍 Checking existing client profiles...');
  
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .eq('role', 'client');
    
    if (error) {
      console.error('❌ Error fetching profiles:', error);
      return;
    }
    
    console.log(`✅ Found ${profiles.length} client profiles:`);
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ID: ${profile.id}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Name: ${profile.first_name} ${profile.last_name}`);
      console.log(`   Role: ${profile.role}`);
      console.log('');
    });
    
    // Check if our test client exists
    const testClientId = '9882762d-93e4-484c-b055-a14737f76cba';
    const testClient = profiles.find(p => p.id === testClientId);
    
    if (testClient) {
      console.log('✅ Test client exists:', testClient);
    } else {
      console.log('❌ Test client does not exist!');
      console.log('Creating test client...');
      
      const { data: newClient, error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: testClientId,
          email: 'test@protector.ng',
          first_name: 'Test',
          last_name: 'Client',
          role: 'client',
          is_verified: false,
          is_active: true,
          credentials_completed: false
        }])
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Failed to create test client:', createError);
      } else {
        console.log('✅ Test client created:', newClient);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkExistingClients();






























