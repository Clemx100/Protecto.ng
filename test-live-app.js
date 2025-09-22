// Test script to check if the live application is working
const https = require('https')

async function testLiveApp() {
  console.log('🌐 Testing live application...')
  
  try {
    // Test if the main app loads
    console.log('\n📱 Testing main application...')
    const response = await fetch('https://protector-ng.vercel.app/')
    
    if (response.ok) {
      console.log('✅ Main application is accessible')
      const html = await response.text()
      
      // Check if our authentication changes are present
      if (html.includes('Please log in to create a booking')) {
        console.log('✅ Authentication changes are deployed')
      } else {
        console.log('❌ Authentication changes are NOT deployed')
      }
      
      // Check if our debugging is present
      if (html.includes('storeBookingInSupabase called with payload')) {
        console.log('✅ Debugging changes are deployed')
      } else {
        console.log('❌ Debugging changes are NOT deployed')
      }
      
    } else {
      console.log('❌ Main application is not accessible:', response.status)
    }
    
    // Test if the operator dashboard loads
    console.log('\n🖥️  Testing operator dashboard...')
    const operatorResponse = await fetch('https://protector-ng.vercel.app/operator')
    
    if (operatorResponse.ok) {
      console.log('✅ Operator dashboard is accessible')
    } else {
      console.log('❌ Operator dashboard is not accessible:', operatorResponse.status)
    }
    
    // Test if the API endpoints are working
    console.log('\n🔌 Testing API endpoints...')
    
    // Test operator bookings API
    const apiResponse = await fetch('https://protector-ng.vercel.app/api/operator/bookings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.json()
      console.log('✅ Operator bookings API is working')
      console.log(`📊 API returned ${apiData.count || 0} bookings`)
    } else {
      console.log('❌ Operator bookings API is not working:', apiResponse.status)
      const errorText = await apiResponse.text()
      console.log('Error details:', errorText)
    }
    
  } catch (error) {
    console.error('❌ Error testing live application:', error.message)
  }
}

testLiveApp()
