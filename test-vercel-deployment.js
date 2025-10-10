// Test script to verify Vercel deployment
const https = require('https')

async function testVercelDeployment() {
  console.log('🌐 Testing Vercel deployment...')
  
  try {
    const response = await fetch('https://protector-ng.vercel.app/')
    
    if (response.ok) {
      console.log('✅ Vercel deployment is accessible')
      
      // Test API endpoints
      const apiResponse = await fetch('https://protector-ng.vercel.app/api/operator/bookings')
      if (apiResponse.ok) {
        console.log('✅ API endpoints are working')
      } else {
        console.log('❌ API endpoints not working:', apiResponse.status)
      }
    } else {
      console.log('❌ Vercel deployment not accessible:', response.status)
    }
  } catch (error) {
    console.error('❌ Error testing deployment:', error.message)
  }
}

testVercelDeployment()




































