// Test checking existing services
const API_BASE = 'http://192.168.1.142:3000/api';

async function testCheckServices() {
  console.log('🔍 Checking existing services...');
  
  try {
    const response = await fetch(`${API_BASE}/check-services`);
    const result = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Services check successful!');
      console.log(`Found ${result.count} services:`);
      result.services?.forEach((service, index) => {
        console.log(`  ${index + 1}. ${service.name} (${service.type}) - ID: ${service.id}`);
      });
      return result.services;
    } else {
      console.error('❌ Services check failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

// Run the test
testCheckServices();







