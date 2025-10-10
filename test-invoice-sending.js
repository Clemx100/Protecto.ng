#!/usr/bin/env node

/**
 * Test Invoice Sending Functionality
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://kifcevffaputepvpjpip.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
)

async function testInvoiceSending() {
  console.log('\n🧪 TESTING INVOICE SENDING\n')
  console.log('=' .repeat(60))
  
  // Get a test booking
  console.log('\n📋 Getting test booking...')
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, booking_code, client_id')
    .eq('status', 'accepted')
    .limit(1)
    .single()
  
  if (bookingsError) {
    console.error('❌ Failed to fetch booking:', bookingsError.message)
    return
  }
  
  console.log('✅ Found test booking:', bookings.booking_code)
  console.log('   Database ID:', bookings.id)
  console.log('   Client ID:', bookings.client_id)
  
  // Create test invoice data
  const invoiceData = {
    basePrice: 100000,
    hourlyRate: 25000,
    duration: 24,
    vehicleFee: 15000,
    personnelFee: 30000,
    currency: 'NGN',
    totalAmount: 100000 + (25000 * 24) + 15000 + 30000
  }
  
  console.log('\n💰 Test invoice data:', invoiceData)
  
  // Create invoice message content (matching the operator dashboard format)
  const invoiceContent = `📄 **Invoice for Your Protection Service**

**Service Details:**
• Base Price: ₦${invoiceData.basePrice.toLocaleString()}
• Hourly Rate (${invoiceData.duration}h): ₦${(invoiceData.hourlyRate * invoiceData.duration).toLocaleString()}
• Vehicle Fee: ₦${invoiceData.vehicleFee.toLocaleString()}
• Personnel Fee: ₦${invoiceData.personnelFee.toLocaleString()}

**Total Amount: ₦${invoiceData.totalAmount.toLocaleString()}**

Please review and approve the payment to proceed with your service.`
  
  console.log('\n📤 Sending invoice message...')
  console.log('   Content length:', invoiceContent.length)
  
  // Send invoice message
  const { data: invoiceMsg, error: invoiceMsgError } = await supabase
    .from('messages')
    .insert({
      booking_id: bookings.id,
      sender_id: bookings.client_id, // Using client_id as sender for operator messages
      recipient_id: bookings.client_id,
      content: invoiceContent,
      message: invoiceContent,
      sender_type: 'operator',
      message_type: 'invoice',
      metadata: invoiceData,
      invoice_data: invoiceData,
      has_invoice: true
    })
    .select()
    .single()
  
  if (invoiceMsgError) {
    console.error('❌ Failed to send invoice:', invoiceMsgError.message)
    console.error('   Error details:', invoiceMsgError)
  } else {
    console.log('✅ Invoice sent successfully!')
    console.log('   Message ID:', invoiceMsg.id)
    console.log('   Has invoice flag:', invoiceMsg.has_invoice)
    console.log('   Message type:', invoiceMsg.message_type)
    console.log('   Sender type:', invoiceMsg.sender_type)
    
    // Verify the invoice data
    console.log('\n🔍 Verifying invoice data...')
    console.log('   Metadata:', JSON.stringify(invoiceMsg.metadata, null, 2))
    console.log('   Invoice data:', JSON.stringify(invoiceMsg.invoice_data, null, 2))
    
    // Fetch all messages for this booking
    console.log('\n📥 Fetching all messages for booking...')
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookings.id)
      .order('created_at', { ascending: true })
    
    if (messagesError) {
      console.error('❌ Failed to fetch messages:', messagesError.message)
    } else {
      console.log(`✅ Found ${messages.length} messages for booking ${bookings.booking_code}`)
      console.log('\n📝 Message History:')
      console.log('   ' + '-'.repeat(76))
      messages.forEach((msg, index) => {
        const content = msg.content || msg.message
        const timestamp = new Date(msg.created_at).toLocaleString()
        const senderIcon = msg.sender_type === 'operator' ? '👮' : 
                           msg.sender_type === 'client' ? '👤' : '🤖'
        const messageType = msg.message_type === 'invoice' ? '💰 INVOICE' : 
                           msg.message_type === 'system' ? '🔔 SYSTEM' : '💬 TEXT'
        console.log(`   ${index + 1}. ${senderIcon} [${msg.sender_type}] ${timestamp} ${messageType}`)
        console.log(`      ${content.substring(0, 70)}${content.length > 70 ? '...' : ''}`)
        if (msg.message_type === 'invoice' && msg.invoice_data) {
          console.log(`      💰 Total: ₦${msg.invoice_data.totalAmount?.toLocaleString() || 'N/A'}`)
        }
      })
      console.log('   ' + '-'.repeat(76))
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 TEST SUMMARY\n')
  console.log('   ✅ Invoice sending: ' + (invoiceMsg ? 'PASS ✓' : 'FAIL ✗'))
  console.log('   ✅ Invoice data storage: ' + (invoiceMsg?.has_invoice ? 'PASS ✓' : 'FAIL ✗'))
  
  console.log('\n🎯 NEXT STEPS:\n')
  console.log('   1. Open operator dashboard: http://localhost:3001/operator')
  console.log('   2. Select booking: ' + bookings.booking_code)
  console.log('   3. Click "Send Invoice" button')
  console.log('   4. Fill in the invoice form')
  console.log('   5. Click "Send Invoice" in the modal')
  console.log('   6. Check that the invoice appears in the chat\n')
  
  console.log('=' + '='.repeat(59) + '\n')
}

// Run the test
testInvoiceSending().catch(console.error)
