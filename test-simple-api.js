// Test the simple API
const API_BASE = 'http://192.168.1.142:3000/api';

async function testSimpleAPI() {
  console.log('🧪 Testing simple API...');
  
  try {
    // Test GET
    console.log('📤 Testing GET /api/simple-test...');
    const getResponse = await fetch(`${API_BASE}/simple-test`);
    const getResult = await getResponse.json();
    console.log('📥 GET Response:', getResult);
    
    // Test POST
    console.log('📤 Testing POST /api/simple-test...');
    const postResponse = await fetch(`${API_BASE}/simple-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    const postResult = await postResponse.json();
    console.log('📥 POST Response:', postResult);
    
    if (getResponse.ok && postResponse.ok) {
      console.log('✅ Simple API is working!');
      return true;
    } else {
      console.error('❌ Simple API test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}

// Run the test
testSimpleAPI();







