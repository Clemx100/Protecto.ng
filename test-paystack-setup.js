#!/usr/bin/env node

/**
 * Test Paystack Integration Setup
 * This script tests if your Paystack integration is working correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Paystack Integration Setup');
console.log('=====================================\n');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found!');
  console.log('   Run: node setup-env-variables.js');
  process.exit(1);
}

console.log('✅ .env.local file found');

// Check Paystack keys
const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

if (!paystackPublicKey || !paystackSecretKey) {
  console.log('❌ Paystack keys not found in environment variables');
  process.exit(1);
}

console.log('✅ Paystack keys found');
console.log('   Public Key:', paystackPublicKey);
console.log('   Secret Key:', paystackSecretKey.substring(0, 20) + '...');

// Check Supabase keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Supabase keys not found in environment variables');
  process.exit(1);
}

console.log('✅ Supabase keys found');
console.log('   URL:', supabaseUrl);
console.log('   Anon Key:', supabaseAnonKey.substring(0, 20) + '...');

if (!supabaseServiceKey || supabaseServiceKey === 'your_supabase_service_role_key_here') {
  console.log('⚠️  Supabase Service Role Key not set');
  console.log('   You need to get this from your Supabase dashboard');
} else {
  console.log('✅ Supabase Service Role Key found');
}

// Test Paystack API connection
async function testPaystackConnection() {
  try {
    console.log('\n🔍 Testing Paystack API connection...');
    
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 100000, // 1000 NGN in kobo
        email: 'test@protector.ng',
        currency: 'NGN',
        reference: `test_${Date.now()}`,
        metadata: {
          test: true,
          booking_id: 'test_booking',
          customer_name: 'Test Customer',
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.status) {
        console.log('✅ Paystack API connection successful!');
        console.log('   Test transaction initialized:', data.data.reference);
        return true;
      } else {
        console.log('❌ Paystack API error:', data.message);
        return false;
      }
    } else {
      const errorData = await response.json();
      console.log('❌ Paystack API error:', errorData.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ Paystack API connection failed:', error.message);
    return false;
  }
}

// Run the test
testPaystackConnection().then(success => {
  if (success) {
    console.log('\n🎉 Paystack integration is ready!');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Get your Supabase service role key (if not done)');
    console.log('   2. Run: npm run dev');
    console.log('   3. Open: http://localhost:3000');
    console.log('   4. Test the payment flow with test card: 4084084084084081');
  } else {
    console.log('\n❌ Paystack integration needs attention');
    console.log('   Check your API keys and try again');
  }
});















