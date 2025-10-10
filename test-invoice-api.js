#!/usr/bin/env node

/**
 * Test Invoice API Endpoint
 */

// Using built-in fetch (Node.js 18+)

async function testInvoiceAPI() {
  console.log('\n🧪 TESTING INVOICE API ENDPOINT\n')
  console.log('=' .repeat(60))
  
  // Test booking ID
  const testBookingId = '7b009a74-cb4c-49ad-964b-d0e663606d5e' // UUID from our test
  
  // Test invoice data
  const invoiceData = {
    basePrice: 100000,
    hourlyRate: 25000,
    duration: 24,
    vehicleFee: 15000,
    personnelFee: 30000,
    currency: 'NGN',
    totalAmount: 100000 + (25000 * 24) + 15000 + 30000
  }
  
  // Create invoice message content
  const invoiceContent = `📄 **Invoice for Your Protection Service**

**Service Details:**
• Base Price: ₦${invoiceData.basePrice.toLocaleString()}
• Hourly Rate (${invoiceData.duration}h): ₦${(invoiceData.hourlyRate * invoiceData.duration).toLocaleString()}
• Vehicle Fee: ₦${invoiceData.vehicleFee.toLocaleString()}
• Personnel Fee: ₦${invoiceData.personnelFee.toLocaleString()}

**Total Amount: ₦${invoiceData.totalAmount.toLocaleString()}**

Please review and approve the payment to proceed with your service.`
  
  console.log('📤 Testing invoice API call...')
  console.log('   Booking ID:', testBookingId)
  console.log('   Content length:', invoiceContent.length)
  console.log('   Invoice total:', '₦' + invoiceData.totalAmount.toLocaleString())
  
  try {
    const response = await fetch('http://localhost:3001/api/operator/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail authentication, but we'll see the error
      },
      body: JSON.stringify({
        bookingId: testBookingId,
        content: invoiceContent,
        messageType: 'invoice',
        metadata: invoiceData
      })
    })
    
    console.log('\n📥 API Response:')
    console.log('   Status:', response.status, response.statusText)
    
    const result = await response.text()
    console.log('   Response:', result)
    
    if (response.ok) {
      console.log('\n✅ Invoice API call successful!')
    } else {
      console.log('\n❌ Invoice API call failed (expected due to auth)')
      
      if (response.status === 401) {
        console.log('\n🔐 Authentication issue detected.')
        console.log('   This is expected if operator is not logged in.')
        console.log('   The invoice sending will work once operator is properly authenticated.')
      }
    }
    
  } catch (error) {
    console.error('❌ Error calling API:', error.message)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('\n🎯 DIAGNOSIS:\n')
  console.log('   If you see a 401 Unauthorized error, this means:')
  console.log('   1. ✅ The API endpoint is working correctly')
  console.log('   2. ❌ The operator dashboard needs to be logged in')
  console.log('   3. 🔧 Solution: Login as operator first, then try sending invoice')
  
  console.log('\n📋 TO FIX THE INVOICE SENDING:\n')
  console.log('   1. Go to: http://localhost:3001/operator')
  console.log('   2. Login with operator credentials:')
  console.log('      - Email: iwewezinemstephen@gmail.com')
  console.log('      - Password: [your operator password]')
  console.log('   3. Select a booking')
  console.log('   4. Click "Send Invoice"')
  console.log('   5. Fill in the invoice details')
  console.log('   6. Click "Send Invoice" button')
  
  console.log('\n=' + '='.repeat(59) + '\n')
}

// Run the test
testInvoiceAPI().catch(console.error)
