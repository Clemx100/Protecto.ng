// Quick script to test Supabase connection and get keys
const { createClient } = require('@supabase/supabase-js');

// Test with the anon key we have
const supabaseUrl = 'https://kifcevffaputepvpjpip.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ0NzYsImV4cCI6MjA3NTM3MDQ3Nn0.YuVbfSbrDUy2nPigODzCcaOWTEXaJlPrVGE1L0C3y6g';

const supabase = createClient(supabaseUrl, anonKey);

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('Anon Key (first 20 chars):', anonKey.substring(0, 20) + '...');
    
    // Test a simple query
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('❌ Error:', error.message);
      if (error.message.includes('Invalid API key')) {
        console.log('🔑 The anon key is invalid. You need to get the correct keys from your Supabase dashboard.');
        console.log('📋 Steps to get correct keys:');
        console.log('1. Go to https://supabase.com/dashboard');
        console.log('2. Select your project: kifcevffaputepvpjpip');
        console.log('3. Go to Settings → API');
        console.log('4. Copy the "anon public" key');
        console.log('5. Copy the "service_role" key (secret)');
      }
    } else {
      console.log('✅ Connection successful!');
      console.log('Data:', data);
    }
  } catch (err) {
    console.log('❌ Connection failed:', err.message);
  }
}

testConnection();



















