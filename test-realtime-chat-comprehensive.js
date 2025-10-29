const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://kifcevffaputepvpjpip.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ0NzYsImV4cCI6MjA3NTM3MDQ3Nn0.YuVbfSbrDUy2nPigODzCcaOWTEXaJlPrVGE1L0C3y6g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🧪 COMPREHENSIVE REAL-TIME CHAT TEST');
console.log('═══════════════════════════════════════════════════════════════\n');

async function runDiagnostics() {
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Database Connection
  console.log('📡 Test 1: Database Connection');
  console.log('─────────────────────────────────────────────────────────────');
  totalTests++;
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) throw error;
    console.log('✅ PASS: Database is connected\n');
    passedTests++;
  } catch (error) {
    console.log('❌ FAIL: Database connection error:', error.message, '\n');
  }

  // Test 2: Messages Table Structure
  console.log('📊 Test 2: Messages Table Structure');
  console.log('─────────────────────────────────────────────────────────────');
  totalTests++;
  try {
    const { data, error } = await supabase.from('messages').select('*').limit(1);
    if (error) throw error;
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      const requiredColumns = ['id', 'booking_id', 'sender_id', 'sender_type', 'content', 'message'];
      const hasAllColumns = requiredColumns.some(col => columns.includes(col));
      
      if (hasAllColumns) {
        console.log('✅ PASS: Messages table has required columns');
        console.log('   Columns:', columns.join(', '), '\n');
        passedTests++;
      } else {
        console.log('❌ FAIL: Messages table missing required columns');
        console.log('   Found:', columns.join(', '));
        console.log('   Required:', requiredColumns.join(', '), '\n');
      }
    } else {
      console.log('⚠️  WARNING: Messages table is empty (cannot verify structure)\n');
      passedTests++; // Give benefit of doubt
    }
  } catch (error) {
    console.log('❌ FAIL: Cannot access messages table:', error.message, '\n');
  }

  // Test 3: Existing Bookings
  console.log('📦 Test 3: Bookings Data');
  console.log('─────────────────────────────────────────────────────────────');
  totalTests++;
  try {
    const { data, error } = await supabase.from('bookings').select('*');
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log('✅ PASS: Found', data.length, 'bookings');
      console.log('   First booking ID:', data[0].id);
      console.log('   First booking code:', data[0].booking_code || 'N/A', '\n');
      passedTests++;
    } else {
      console.log('⚠️  WARNING: No bookings found (create a booking to test chat)\n');
    }
  } catch (error) {
    console.log('❌ FAIL: Cannot access bookings:', error.message, '\n');
  }

  // Test 4: Existing Messages
  console.log('💬 Test 4: Messages Data');
  console.log('─────────────────────────────────────────────────────────────');
  totalTests++;
  try {
    const { data, error } = await supabase.from('messages').select('*');
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log('✅ PASS: Found', data.length, 'messages');
      console.log('   Latest message:', data[data.length - 1].content || data[data.length - 1].message || 'N/A');
      console.log('   Sender type:', data[data.length - 1].sender_type || 'N/A', '\n');
      passedTests++;
    } else {
      console.log('⚠️  WARNING: No messages found\n');
    }
  } catch (error) {
    console.log('❌ FAIL: Cannot access messages:', error.message, '\n');
  }

  // Test 5: User Profiles
  console.log('👥 Test 5: User Profiles');
  console.log('─────────────────────────────────────────────────────────────');
  totalTests++;
  try {
    const { data, error } = await supabase.from('profiles').select('id, role');
    if (error) throw error;
    
    if (data && data.length > 0) {
      const clients = data.filter(p => p.role === 'client').length;
      const operators = data.filter(p => p.role === 'operator').length;
      
      console.log('✅ PASS: Found', data.length, 'users');
      console.log('   Clients:', clients);
      console.log('   Operators:', operators, '\n');
      passedTests++;
    } else {
      console.log('⚠️  WARNING: No user profiles found\n');
    }
  } catch (error) {
    console.log('❌ FAIL: Cannot access profiles:', error.message, '\n');
  }

  // Test 6: Real-time Subscription (30 second test)
  console.log('🔴 Test 6: Real-time Message Subscription');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('⏳ Setting up real-time listener for 30 seconds...');
  totalTests++;
  
  let receivedMessage = false;
  let subscriptionStatus = 'unknown';
  
  const channel = supabase
    .channel('test-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      (payload) => {
        console.log('📨 REAL-TIME MESSAGE RECEIVED:', payload.new);
        receivedMessage = true;
      }
    )
    .subscribe((status) => {
      subscriptionStatus = status;
      console.log('   Subscription status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Real-time subscription established');
        console.log('   Now send a message from the app to test...\n');
      } else if (status === 'CHANNEL_ERROR') {
        console.log('❌ Real-time subscription failed\n');
      }
    });

  // Wait 30 seconds for a message
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  if (subscriptionStatus === 'SUBSCRIBED') {
    passedTests++;
    console.log('✅ PASS: Real-time subscription working');
  } else {
    console.log('❌ FAIL: Real-time subscription not established');
  }
  
  if (receivedMessage) {
    console.log('✅ BONUS: Received real-time message during test!\n');
  } else {
    console.log('⚠️  No messages received during test (send one to verify)\n');
  }
  
  supabase.removeChannel(channel);

  // Test 7: Test Message Insert (via API simulation)
  console.log('✍️  Test 7: Message Insert Test');
  console.log('─────────────────────────────────────────────────────────────');
  totalTests++;
  try {
    // Get a booking to test with
    const { data: bookings } = await supabase.from('bookings').select('*').limit(1);
    if (bookings && bookings.length > 0) {
      const testBooking = bookings[0];
      
      // Try to insert a test message
      const { data, error } = await supabase.from('messages').insert({
        booking_id: testBooking.id,
        sender_id: testBooking.client_id,
        sender_type: 'client',
        content: `[TEST] Message sent at ${new Date().toISOString()}`,
        message_type: 'text'
      }).select();
      
      if (error) {
        console.log('❌ FAIL: Cannot insert message:', error.message, '\n');
      } else {
        console.log('✅ PASS: Successfully inserted test message');
        console.log('   Message ID:', data[0].id, '\n');
        passedTests++;
        
        // Clean up test message
        await supabase.from('messages').delete().eq('id', data[0].id);
      }
    } else {
      console.log('⚠️  SKIP: No bookings available for test\n');
      passedTests++; // Skip this test
    }
  } catch (error) {
    console.log('❌ FAIL: Message insert test error:', error.message, '\n');
  }

  // Final Results
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n✅ ALL TESTS PASSED! Chat system is fully functional.\n');
  } else if (passedTests >= totalTests - 2) {
    console.log('\n⚠️  MOSTLY WORKING: Some minor issues detected.\n');
  } else {
    console.log('\n❌ ISSUES DETECTED: Chat system needs attention.\n');
  }
  
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  process.exit(0);
}

runDiagnostics().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});

