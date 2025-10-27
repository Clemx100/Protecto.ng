// Test script to verify mock database is working
const { fallbackAuth } = require('./lib/services/fallbackAuth');

async function testMockDatabase() {
  console.log('🧪 Testing Mock Database...');
  
  try {
    // Test getting all bookings
    console.log('📋 Testing getAllBookings...');
    const bookings = await fallbackAuth.getAllBookings();
    console.log('✅ Bookings retrieved:', bookings.length);
    
    // Test getting messages for a booking
    console.log('💬 Testing getBookingMessages...');
    const messages = await fallbackAuth.getBookingMessages('booking-1');
    console.log('✅ Messages retrieved:', messages.length);
    
    // Test sending a message
    console.log('📤 Testing sendMessage...');
    const result = await fallbackAuth.sendMessage({
      sender_id: 'test-user',
      sender_type: 'client',
      message: 'Test message from mock database',
      booking_id: 'booking-1'
    });
    console.log('✅ Message sent:', result);
    
    console.log('🎉 Mock database is working correctly!');
    
  } catch (error) {
    console.error('❌ Mock database test failed:', error);
  }
}

testMockDatabase();
















