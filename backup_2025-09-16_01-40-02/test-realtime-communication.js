// Test script for real-time communication between apps
const https = require('https');

console.log('🧪 Testing Real-Time Communication Between Apps\n');

// Test data for creating a booking
const testBooking = {
  clientData: {
    id: 'test-client-' + Date.now(),
    first_name: 'Test',
    last_name: 'User',
    phone: '+234 1234567890',
    email: 'test@example.com'
  },
  serviceDetails: {
    type: 'armed_protection',
    pickup_address: '123 Test Street, Lagos',
    destination_address: '456 Test Avenue, Lagos',
    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    duration: '4 hours',
    personnel: {
      protectors: 2,
      protectees: 1
    },
    vehicle_type: 'Mercedes S-Class',
    dress_code: 'business-formal',
    special_requirements: 'Test booking for real-time communication'
  },
  priority: 'normal',
  source: 'test-script'
};

async function testMainAppAPI() {
  return new Promise((resolve) => {
    console.log('📤 Testing Main App API...');
    
    const postData = JSON.stringify({
      requestData: testBooking
    });
    
    const options = {
      hostname: 'protector-ng.vercel.app',
      port: 443,
      path: '/api/send-to-operator',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response: ${JSON.stringify(response, null, 2)}`);
          
          resolve({
            success: res.statusCode === 200,
            response: response,
            statusCode: res.statusCode
          });
        } catch (error) {
          console.log(`   Error parsing response: ${error.message}`);
          resolve({
            success: false,
            error: error.message,
            statusCode: res.statusCode
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`   Error: ${error.message}`);
      resolve({
        success: false,
        error: error.message
      });
    });
    
    req.write(postData);
    req.end();
  });
}

async function testOperatorAPI() {
  return new Promise((resolve) => {
    console.log('\n📥 Testing Operator Dashboard API...');
    
    const options = {
      hostname: 'protector-ng-lxtd.vercel.app',
      port: 443,
      path: '/api/realtime/requests',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Bookings found: ${response.bookings ? response.bookings.length : 0}`);
          
          if (response.bookings && response.bookings.length > 0) {
            console.log(`   Latest booking: ${response.bookings[0].id}`);
          }
          
          resolve({
            success: res.statusCode === 200,
            response: response,
            statusCode: res.statusCode
          });
        } catch (error) {
          console.log(`   Error parsing response: ${error.message}`);
          resolve({
            success: false,
            error: error.message,
            statusCode: res.statusCode
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`   Error: ${error.message}`);
      resolve({
        success: false,
        error: error.message
      });
    });
    
    req.end();
  });
}

async function testAppAccessibility() {
  return new Promise((resolve) => {
    console.log('\n🌐 Testing App Accessibility...');
    
    const apps = [
      { name: 'Main App', url: 'https://protector-ng.vercel.app' },
      { name: 'Operator Dashboard', url: 'https://protector-ng-lxtd.vercel.app' }
    ];
    
    let completed = 0;
    const results = [];
    
    apps.forEach(app => {
      const req = https.get(app.url, (res) => {
        results.push({
          name: app.name,
          url: app.url,
          status: res.statusCode,
          working: res.statusCode === 200
        });
        
        console.log(`   ${app.name}: ${res.statusCode} ${res.statusCode === 200 ? '✅' : '❌'}`);
        
        completed++;
        if (completed === apps.length) {
          resolve(results);
        }
      });
      
      req.on('error', (error) => {
        results.push({
          name: app.name,
          url: app.url,
          status: 'ERROR',
          working: false,
          error: error.message
        });
        
        console.log(`   ${app.name}: ERROR - ${error.message}`);
        
        completed++;
        if (completed === apps.length) {
          resolve(results);
        }
      });
      
      req.setTimeout(10000, () => {
        results.push({
          name: app.name,
          url: app.url,
          status: 'TIMEOUT',
          working: false,
          error: 'Timeout'
        });
        
        console.log(`   ${app.name}: TIMEOUT`);
        
        completed++;
        if (completed === apps.length) {
          resolve(results);
        }
      });
    });
  });
}

async function runTests() {
  console.log('🚀 Starting Real-Time Communication Tests...\n');
  
  // Test 1: App Accessibility
  const accessibilityResults = await testAppAccessibility();
  
  // Test 2: Main App API
  const mainAppResult = await testMainAppAPI();
  
  // Test 3: Operator API
  const operatorResult = await testOperatorAPI();
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const allAppsWorking = accessibilityResults.every(app => app.working);
  const mainAppWorking = mainAppResult.success;
  const operatorWorking = operatorResult.success;
  
  console.log(`App Accessibility: ${allAppsWorking ? '✅' : '❌'}`);
  console.log(`Main App API: ${mainAppWorking ? '✅' : '❌'}`);
  console.log(`Operator API: ${operatorWorking ? '✅' : '❌'}`);
  
  if (allAppsWorking && mainAppWorking && operatorWorking) {
    console.log('\n🎉 All tests passed! Real-time communication is working.');
    console.log('\n📝 Next steps:');
    console.log('1. Set up production Supabase database');
    console.log('2. Configure environment variables in Vercel');
    console.log('3. Test with real data');
    console.log('4. Monitor performance');
  } else {
    console.log('\n⚠️  Some tests failed. Please check:');
    if (!allAppsWorking) {
      console.log('• App accessibility issues');
    }
    if (!mainAppWorking) {
      console.log('• Main app API issues');
    }
    if (!operatorWorking) {
      console.log('• Operator API issues');
    }
  }
}

runTests().catch(console.error);
