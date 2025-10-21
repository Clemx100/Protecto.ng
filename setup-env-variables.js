#!/usr/bin/env node

/**
 * Environment Variables Setup Script for PROTECTOR.NG
 * This script helps you set up your .env.local file with the correct values
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 PROTECTOR.NG Environment Setup');
console.log('=====================================\n');

// Your Paystack test keys
const PAYSTACK_PUBLIC_KEY = 'pk_test_171f5c9b342d6b37c569434abc603eeb654b5f77';
const PAYSTACK_SECRET_KEY = 'sk_test_ab1a42c279c33780deca6c475f91c000d1d663c2';

// Your Supabase configuration
const SUPABASE_URL = 'https://kifcevffaputepvpjpip.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ0NzYsImV4cCI6MjA3NTM3MDQ3Nn0.YuVbfSbrDUy2nPigODzCcaOWTEXaJlPrVGE1L0C3y6g';

// Generate secure random keys
const generateSecureKey = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const JWT_SECRET = generateSecureKey(32);
const ENCRYPTION_KEY = generateSecureKey(32);

// Environment variables content
const envContent = `# Environment Variables for PROTECTOR.NG
# Generated on ${new Date().toISOString()}

# Supabase Configuration (Your Live Project)
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Paystack Payment Configuration (Test Mode)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=${PAYSTACK_PUBLIC_KEY}
PAYSTACK_SECRET_KEY=${PAYSTACK_SECRET_KEY}

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=PROTECTOR.NG
NEXT_PUBLIC_APP_DESCRIPTION=Executive Protection Services

# Email Configuration (Optional - for authentication emails)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key_here
SMTP_FROM=noreply@protector.ng

# Security (Auto-generated secure keys)
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PAYMENTS=true
NEXT_PUBLIC_ENABLE_REAL_TIME=true

# Development
NODE_ENV=development
`;

// Write the .env.local file
const envPath = path.join(process.cwd(), '.env.local');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Successfully created .env.local file!');
  console.log('📁 Location:', envPath);
  console.log('\n🔑 Your Paystack Test Keys:');
  console.log('   Public Key:', PAYSTACK_PUBLIC_KEY);
  console.log('   Secret Key:', PAYSTACK_SECRET_KEY.substring(0, 20) + '...');
  console.log('\n🔑 Your Supabase Configuration:');
  console.log('   URL:', SUPABASE_URL);
  console.log('   Anon Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
  console.log('\n⚠️  IMPORTANT: You still need to get your Supabase Service Role Key!');
  console.log('   1. Go to https://supabase.com/dashboard');
  console.log('   2. Select your project: kifcevffaputepvpjpip');
  console.log('   3. Go to Settings → API');
  console.log('   4. Copy the "service_role" key');
  console.log('   5. Replace "your_supabase_service_role_key_here" in .env.local');
  console.log('\n🚀 Next Steps:');
  console.log('   1. Get your Supabase service role key');
  console.log('   2. Run: npm run dev');
  console.log('   3. Test your Paystack integration!');
  console.log('\n💳 Test Card: 4084084084084081 (CVV: 123, Expiry: 12/25)');
} catch (error) {
  console.error('❌ Error creating .env.local file:', error.message);
  console.log('\n📝 Manual Setup:');
  console.log('Create a .env.local file in your project root with this content:');
  console.log('\n' + envContent);
}







