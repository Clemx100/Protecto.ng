// Test script to check if the local application is working
const https = require('https')

async function testLocalApp() {
  console.log('🏠 Testing local application...')
  
  try {
    // Test if the main app loads locally
    console.log('\n📱 Testing local main application...')
    const response = await fetch('http://localhost:3001/')
    
    if (response.ok) {
      console.log('✅ Local main application is accessible')
      const html = await response.text()
      
      // Check if our authentication changes are present
      if (html.includes('Please log in to create a booking')) {
        console.log('✅ Authentication changes are present locally')
      } else {
        console.log('❌ Authentication changes are NOT present locally')
      }
      
      // Check if our debugging is present
      if (html.includes('storeBookingInSupabase called with payload')) {
        console.log('✅ Debugging changes are present locally')
      } else {
        console.log('❌ Debugging changes are NOT present locally')
      }
      
    } else {
      console.log('❌ Local main application is not accessible:', response.status)
    }
    
    // Test if the operator dashboard loads locally
    console.log('\n🖥️  Testing local operator dashboard...')
    const operatorResponse = await fetch('http://localhost:3001/operator')
    
    if (operatorResponse.ok) {
      console.log('✅ Local operator dashboard is accessible')
    } else {
      console.log('❌ Local operator dashboard is not accessible:', operatorResponse.status)
    }
    
    // Test if the API endpoints are working locally
    console.log('\n🔌 Testing local API endpoints...')
    
    // Test operator bookings API
    const apiResponse = await fetch('http://localhost:3001/api/operator/bookings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.json()
      console.log('✅ Local operator bookings API is working')
      console.log(`📊 API returned ${apiData.count || 0} bookings`)
    } else {
      console.log('❌ Local operator bookings API is not working:', apiResponse.status)
      const errorText = await apiResponse.text()
      console.log('Error details:', errorText.substring(0, 200) + '...')
    }
    
    // Test the main booking API
    console.log('\n📋 Testing main booking API...')
    const bookingApiResponse = await fetch('http://localhost:3001/api/bookings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (bookingApiResponse.ok) {
      console.log('✅ Local booking API is working')
    } else {
      console.log('❌ Local booking API is not working:', bookingApiResponse.status)
    }
    
  } catch (error) {
    console.error('❌ Error testing local application:', error.message)
  }
}

testLocalApp()
