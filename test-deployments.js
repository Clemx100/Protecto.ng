// Test script to verify both deployments are working
const https = require('https');

const deployments = [
  {
    name: 'Main App',
    url: 'https://protector-ng.vercel.app',
    expectedTitle: 'Protector.Ng'
  },
  {
    name: 'Operator Dashboard', 
    url: 'https://protector-ng-lxtd.vercel.app',
    expectedTitle: 'Protector.Ng Operator Dashboard'
  }
];

async function testDeployment(deployment) {
  return new Promise((resolve) => {
    const req = https.get(deployment.url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const isWorking = res.statusCode === 200;
        const hasTitle = data.includes(deployment.expectedTitle);
        
        console.log(`\n✅ ${deployment.name}:`);
        console.log(`   URL: ${deployment.url}`);
        console.log(`   Status: ${res.statusCode} ${isWorking ? '✅' : '❌'}`);
        console.log(`   Title Found: ${hasTitle ? '✅' : '❌'}`);
        console.log(`   Response Size: ${data.length} bytes`);
        
        resolve({
          name: deployment.name,
          url: deployment.url,
          working: isWorking,
          hasTitle: hasTitle,
          statusCode: res.statusCode
        });
      });
    });
    
    req.on('error', (error) => {
      console.log(`\n❌ ${deployment.name}:`);
      console.log(`   URL: ${deployment.url}`);
      console.log(`   Error: ${error.message}`);
      
      resolve({
        name: deployment.name,
        url: deployment.url,
        working: false,
        error: error.message
      });
    });
    
    req.setTimeout(10000, () => {
      console.log(`\n⏰ ${deployment.name}: Timeout`);
      resolve({
        name: deployment.name,
        url: deployment.url,
        working: false,
        error: 'Timeout'
      });
    });
  });
}

async function runTests() {
  console.log('🚀 Testing Protector.Ng Deployments...\n');
  
  const results = [];
  for (const deployment of deployments) {
    const result = await testDeployment(deployment);
    results.push(result);
  }
  
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const workingCount = results.filter(r => r.working).length;
  const totalCount = results.length;
  
  results.forEach(result => {
    const status = result.working ? '✅ WORKING' : '❌ FAILED';
    console.log(`${result.name}: ${status}`);
  });
  
  console.log(`\nOverall: ${workingCount}/${totalCount} deployments working`);
  
  if (workingCount === totalCount) {
    console.log('\n🎉 All deployments are working correctly!');
  } else {
    console.log('\n⚠️  Some deployments need attention.');
  }
}

runTests().catch(console.error);
