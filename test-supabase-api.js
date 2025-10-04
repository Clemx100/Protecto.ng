// Test the Supabase API
const API_BASE = 'http://192.168.1.142:3000/api';

async function testSupabaseAPI() {
  console.log('🧪 Testing Supabase API...');
  
  try {
    const response = await fetch(`${API_BASE}/supabase-test`);
    const result = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Supabase API test successful!');
      return true;
    } else {
      console.error('❌ Supabase API test failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}

// Run the test
testSupabaseAPI();








