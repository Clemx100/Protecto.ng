// Test checking existing users
const API_BASE = 'http://192.168.1.142:3000/api';

async function testCheckUsers() {
  console.log('🔍 Checking existing users...');
  
  try {
    const response = await fetch(`${API_BASE}/check-users`);
    const result = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Users check successful!');
      console.log(`Found ${result.count} users:`);
      result.profiles?.forEach((profile, index) => {
        console.log(`  ${index + 1}. ${profile.email} (${profile.role}) - ID: ${profile.id}`);
      });
      return result.profiles;
    } else {
      console.error('❌ Users check failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

// Run the test
testCheckUsers();








