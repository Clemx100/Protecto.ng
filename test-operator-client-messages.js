#!/usr/bin/env node

/**
 * Test Operator-Client Messaging System
 * This script tests the complete message flow between operator and client
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://kifcevffaputepvpjpip.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
)

async function testOperatorClientMessages() {
  console.log('\n🧪 TESTING OPERATOR-CLIENT MESSAGING SYSTEM\n')
  console.log('=' .repeat(80))
  
  // Test 1: Get a test booking
  console.log('\n📋 Test 1: Fetching test booking...')
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'accepted')
    .limit(1)
    .single()
  
  if (bookingsError) {
    console.error('❌ Failed to fetch booking:', bookingsError.message)
    console.log('\n⚠️  No accepted bookings found. Please create a booking first.')
    return
  }
  
  console.log('✅ Found test booking:', bookings.booking_code)
  console.log('   Client ID:', bookings.client_id)
  console.log('   Status:', bookings.status)
  
  // Test 2: Send operator message
  console.log('\n💬 Test 2: Sending operator message...')
  const operatorMessage = `🧪 Test operator message at ${new Date().toLocaleTimeString()}`
  
  const { data: opMsg, error: opMsgError } = await supabase
    .from('messages')
    .insert({
      booking_id: bookings.id,
      sender_id: bookings.client_id,
      recipient_id: bookings.client_id,
      content: operatorMessage,
      message: operatorMessage,
      sender_type: 'operator',
      message_type: 'text'
    })
    .select()
    .single()
  
  if (opMsgError) {
    console.error('❌ Failed to send operator message:', opMsgError.message)
  } else {
    console.log('✅ Operator message sent:', opMsg.id)
    console.log('   Content:', opMsg.content || opMsg.message)
    console.log('   Sender type:', opMsg.sender_type)
  }
  
  // Test 3: Send client message
  console.log('\n💬 Test 3: Sending client message...')
  const clientMessage = `🧪 Test client message at ${new Date().toLocaleTimeString()}`
  
  const { data: clientMsg, error: clientMsgError } = await supabase
    .from('messages')
    .insert({
      booking_id: bookings.id,
      sender_id: bookings.client_id,
      recipient_id: bookings.client_id,
      content: clientMessage,
      message: clientMessage,
      sender_type: 'client',
      message_type: 'text'
    })
    .select()
    .single()
  
  if (clientMsgError) {
    console.error('❌ Failed to send client message:', clientMsgError.message)
  } else {
    console.log('✅ Client message sent:', clientMsg.id)
    console.log('   Content:', clientMsg.content || clientMsg.message)
    console.log('   Sender type:', clientMsg.sender_type)
  }
  
  // Test 4: Fetch all messages for the booking
  console.log('\n📥 Test 4: Fetching all messages for booking...')
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
      console.log(`   ${index + 1}. ${senderIcon} [${msg.sender_type}] ${timestamp}`)
      console.log(`      ${content.substring(0, 70)}${content.length > 70 ? '...' : ''}`)
      if (msg.message_type === 'invoice') {
        console.log(`      💰 INVOICE MESSAGE`)
      }
    })
    console.log('   ' + '-'.repeat(76))
  }
  
  // Test 5: Update booking status
  console.log('\n🔄 Test 5: Testing status update...')
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'en_route',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookings.id)
    .select()
    .single()
  
  if (updateError) {
    console.error('❌ Failed to update booking status:', updateError.message)
  } else {
    console.log('✅ Booking status updated to:', updatedBooking.status)
    
    // Create a system message for the status change
    const statusMessage = '🚗 Your security team is now en route to your location.'
    const { data: sysMsg, error: sysMsgError } = await supabase
      .from('messages')
      .insert({
        booking_id: bookings.id,
        sender_id: bookings.client_id,
        recipient_id: bookings.client_id,
        content: statusMessage,
        message: statusMessage,
        sender_type: 'system',
        message_type: 'system',
        is_system_message: true
      })
      .select()
      .single()
    
    if (sysMsgError) {
      console.error('❌ Failed to create system message:', sysMsgError.message)
    } else {
      console.log('✅ System message created:', sysMsg.id)
    }
    
    // Revert status back to accepted
    await supabase
      .from('bookings')
      .update({ status: 'accepted' })
      .eq('id', bookings.id)
    console.log('✅ Reverted booking status back to accepted')
  }
  
  // Test 6: Send invoice message
  console.log('\n💰 Test 6: Testing invoice message...')
  const invoiceData = {
    basePrice: 100000,
    hourlyRate: 25000,
    duration: 24,
    vehicleFee: 20000,
    personnelFee: 30000,
    totalAmount: 100000 + (25000 * 24) + 20000 + 30000,
    currency: 'NGN'
  }
  
  const invoiceMessage = `📄 **Invoice for Your Protection Service**

**Service Details:**
• Base Price: ₦${invoiceData.basePrice.toLocaleString()}
• Hourly Rate (${invoiceData.duration}h): ₦${(invoiceData.hourlyRate * invoiceData.duration).toLocaleString()}
• Vehicle Fee: ₦${invoiceData.vehicleFee.toLocaleString()}
• Personnel Fee: ₦${invoiceData.personnelFee.toLocaleString()}

**Total Amount: ₦${invoiceData.totalAmount.toLocaleString()}**

Please review and approve the payment to proceed with your service.`
  
  const { data: invMsg, error: invMsgError } = await supabase
    .from('messages')
    .insert({
      booking_id: bookings.id,
      sender_id: bookings.client_id,
      recipient_id: bookings.client_id,
      content: invoiceMessage,
      message: invoiceMessage,
      sender_type: 'operator',
      message_type: 'invoice',
      metadata: invoiceData,
      invoice_data: invoiceData,
      has_invoice: true
    })
    .select()
    .single()
  
  if (invMsgError) {
    console.error('❌ Failed to send invoice:', invMsgError.message)
  } else {
    console.log('✅ Invoice message sent:', invMsg.id)
    console.log('   Total Amount: ₦' + invoiceData.totalAmount.toLocaleString())
  }
  
  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('\n📊 TEST SUMMARY\n')
  const allTestsPassed = opMsg && clientMsg && messages && updatedBooking && invMsg
  console.log('   ✅ Operator message: ' + (opMsg ? 'PASS ✓' : 'FAIL ✗'))
  console.log('   ✅ Client message: ' + (clientMsg ? 'PASS ✓' : 'FAIL ✗'))
  console.log('   ✅ Message retrieval: ' + (messages ? `PASS ✓ (${messages.length} messages)` : 'FAIL ✗'))
  console.log('   ✅ Status update: ' + (updatedBooking ? 'PASS ✓' : 'FAIL ✗'))
  console.log('   ✅ Invoice message: ' + (invMsg ? 'PASS ✓' : 'FAIL ✗'))
  console.log('\n   🎯 OVERALL: ' + (allTestsPassed ? '✅ ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'))
  
  console.log('\n🎯 NEXT STEPS:\n')
  console.log('   1. Open operator dashboard: http://localhost:3001/operator')
  console.log('   2. Select booking: ' + bookings.booking_code)
  console.log('   3. Verify you can see the test messages')
  console.log('   4. Open client app: http://localhost:3001/client')
  console.log('   5. Check the same booking and verify messages appear')
  console.log('   6. Try sending messages from both sides\n')
  
  console.log('=' + '='.repeat(79) + '\n')
}

// Run the test
testOperatorClientMessages().catch(console.error)

