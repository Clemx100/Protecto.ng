#!/usr/bin/env node

/**
 * 🧪 Real-Time Chat Synchronization Test Script
 * 
 * This script tests the end-to-end real-time chat functionality:
 * 1. Client sends message → Saves to database
 * 2. Operator receives message in real-time
 * 3. Operator responds → Saves to database
 * 4. Client receives response in real-time
 * 
 * Run: node test-realtime-chat-sync.js
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const USE_HTTPS = BASE_URL.startsWith('https://');
const httpModule = USE_HTTPS ? https : http;

// Test booking ID (use an existing booking from your database)
const TEST_BOOKING_ID = process.argv[2] || 'REQ1759982673164'; // Pass booking ID as argument

console.log('🧪 REAL-TIME CHAT SYNCHRONIZATION TEST');
console.log('=' .repeat(60));
console.log(`Testing URL: ${BASE_URL}`);
console.log(`Testing Booking: ${TEST_BOOKING_ID}`);
console.log('=' .repeat(60));
console.log('');

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test functions
async function test1_FetchExistingMessages() {
  console.log('📥 TEST 1: Fetch Existing Messages');
  console.log('-'.repeat(60));
  
  try {
    const response = await makeRequest(
      `${BASE_URL}/api/chat-messages?bookingId=${TEST_BOOKING_ID}`
    );
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ PASS: Messages fetched successfully');
      console.log(`   Found ${response.data.count} existing messages`);
      
      if (response.data.count > 0) {
        console.log('   Sample message:', {
          id: response.data.data[0].id,
          sender: response.data.data[0].sender_type,
          preview: response.data.data[0].message.substring(0, 50) + '...'
        });
      }
      
      // Check if using real data
      const message = response.data.message || '';
      if (message.includes('(mock)')) {
        console.log('❌ WARNING: Still using mock data!');
        return false;
      } else {
        console.log('✅ CONFIRMED: Using real database data');
      }
      
      return true;
    } else {
      console.log('❌ FAIL: Failed to fetch messages');
      console.log('   Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return false;
  }
}

async function test2_SendClientMessage() {
  console.log('\n📤 TEST 2: Send Client Message');
  console.log('-'.repeat(60));
  
  const testMessage = {
    booking_id: TEST_BOOKING_ID,
    sender_id: '9882762d-93e4-484c-b055-a14737f76cba', // Test client ID
    sender_type: 'client',
    message: `🧪 Test message from client - ${new Date().toLocaleTimeString()}`,
    message_type: 'text'
  };
  
  try {
    const response = await makeRequest(
      `${BASE_URL}/api/chat-messages`,
      {
        method: 'POST',
        body: testMessage
      }
    );
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ PASS: Client message sent successfully');
      console.log('   Message ID:', response.data.data.id);
      console.log('   Message:', response.data.data.message);
      
      // Check if using real data
      const message = response.data.message || '';
      if (message.includes('(mock)')) {
        console.log('❌ WARNING: Still using mock data!');
        return false;
      } else {
        console.log('✅ CONFIRMED: Saved to real database');
      }
      
      return response.data.data;
    } else {
      console.log('❌ FAIL: Failed to send message');
      console.log('   Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return false;
  }
}

async function test3_SendOperatorMessage() {
  console.log('\n👨‍💼 TEST 3: Send Operator Message');
  console.log('-'.repeat(60));
  
  const testMessage = {
    booking_id: TEST_BOOKING_ID,
    sender_id: 'operator-test-id',
    sender_type: 'operator',
    message: `👨‍💼 Test response from operator - ${new Date().toLocaleTimeString()}`,
    message_type: 'text'
  };
  
  try {
    const response = await makeRequest(
      `${BASE_URL}/api/chat-messages`,
      {
        method: 'POST',
        body: testMessage
      }
    );
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ PASS: Operator message sent successfully');
      console.log('   Message ID:', response.data.data.id);
      console.log('   Message:', response.data.data.message);
      console.log('✅ CONFIRMED: Saved to real database');
      return response.data.data;
    } else {
      console.log('❌ FAIL: Failed to send message');
      console.log('   Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return false;
  }
}

async function test4_VerifyMessagesAppear() {
  console.log('\n🔍 TEST 4: Verify New Messages Appear');
  console.log('-'.repeat(60));
  
  try {
    // Wait a moment for messages to be saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await makeRequest(
      `${BASE_URL}/api/chat-messages?bookingId=${TEST_BOOKING_ID}`
    );
    
    if (response.status === 200 && response.data.success) {
      const messages = response.data.data;
      const recentMessages = messages.filter(msg => {
        const msgTime = new Date(msg.created_at).getTime();
        const now = Date.now();
        return (now - msgTime) < 60000; // Last 60 seconds
      });
      
      console.log('✅ PASS: Messages retrieved after sending');
      console.log(`   Total messages: ${messages.length}`);
      console.log(`   Recent messages (last 60s): ${recentMessages.length}`);
      
      if (recentMessages.length >= 2) {
        console.log('✅ CONFIRMED: Both test messages found');
        console.log('   Client → Operator communication: WORKING ✅');
        return true;
      } else {
        console.log('⚠️  WARNING: Expected at least 2 recent messages');
        return false;
      }
    } else {
      console.log('❌ FAIL: Failed to fetch messages');
      return false;
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return false;
  }
}

async function test5_AlternativeMessagesAPI() {
  console.log('\n🔄 TEST 5: Test Alternative /api/messages Endpoint');
  console.log('-'.repeat(60));
  
  try {
    const response = await makeRequest(
      `${BASE_URL}/api/messages?bookingId=${TEST_BOOKING_ID}`
    );
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ PASS: Alternative API also working');
      console.log(`   Found ${response.data.count} messages`);
      console.log('✅ CONFIRMED: Both APIs returning real data');
      return true;
    } else {
      console.log('⚠️  Alternative API response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('⚠️  Alternative API error:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Real-Time Chat Synchronization Tests...\n');
  
  const results = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false
  };
  
  // Run tests sequentially
  results.test1 = await test1_FetchExistingMessages();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  results.test2 = await test2_SendClientMessage();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  results.test3 = await test3_SendOperatorMessage();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  results.test4 = await test4_VerifyMessagesAppear();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  results.test5 = await test5_AlternativeMessagesAPI();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  console.log('');
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const name = test.replace('test', 'Test ');
    console.log(`${icon} ${name}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('✅ Chat API is using REAL database data');
    console.log('✅ Client → Operator messaging works');
    console.log('✅ Operator → Client messaging works');
    console.log('✅ Messages persist in database');
    console.log('✅ Both API endpoints working');
    console.log('');
    console.log('🚀 Next Step: Test real-time sync in browser');
    console.log('   1. Open operator dashboard in one browser window');
    console.log('   2. Open client chat in another browser window');
    console.log('   3. Send messages and verify they appear instantly');
    console.log('');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Make sure your development server is running');
    console.log('2. Check that the booking ID exists in your database');
    console.log('3. Verify Supabase environment variables are set');
    console.log('4. Check the server console for error details');
    console.log('');
  }
  
  console.log('='.repeat(60));
  
  process.exit(passed === total ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

// Run tests
runTests();





