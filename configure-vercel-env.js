#!/usr/bin/env node

/**
 * Vercel Environment Variables Configuration Script
 * This script helps you configure environment variables for www.protector.ng
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 VERCEL ENVIRONMENT VARIABLES SETUP');
console.log('=====================================\n');

// Environment variables needed for www.protector.ng
const requiredEnvVars = {
  'NEXT_PUBLIC_SUPABASE_URL': 'https://kifcevffaputepvpjpip.supabase.co',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ0NzYsImV4cCI6MjA3NTM3MDQ3Nn0.YuVbfSbrDUy2nPigODzCcaOWTEXaJlPrVGE1L0C3y6g',
  'NEXT_PUBLIC_APP_URL': 'https://www.protector.ng',
  'NEXT_PUBLIC_APP_NAME': 'PROTECTOR.NG',
  'NEXT_PUBLIC_APP_DESCRIPTION': 'Executive Protection Services',
  'NEXT_PUBLIC_ENABLE_ANALYTICS': 'true',
  'NEXT_PUBLIC_ENABLE_PAYMENTS': 'true',
  'NEXT_PUBLIC_ENABLE_REAL_TIME': 'true'
};

console.log('📋 REQUIRED ENVIRONMENT VARIABLES:');
console.log('==================================\n');

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n🚀 HOW TO SET THESE IN VERCEL:');
console.log('==============================\n');

console.log('1. Go to your Vercel Dashboard: https://vercel.com/dashboard');
console.log('2. Select your "Protector.Ng" project');
console.log('3. Click on "Settings" tab');
console.log('4. Click on "Environment Variables" in the sidebar');
console.log('5. Add each variable above with these settings:');
console.log('   - Environment: Production, Preview, Development');
console.log('   - Value: Copy from the list above');
console.log('\n6. After adding all variables, redeploy your project');

console.log('\n🔍 SUPABASE API SETTINGS CHECK:');
console.log('===============================\n');

console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
console.log('2. Select your project: kifcevffaputepvpjpip');
console.log('3. Go to Settings → API');
console.log('4. Check "Allowed Origins" section');
console.log('5. Ensure these are added:');
console.log('   - https://www.protector.ng');
console.log('   - https://*.protector.ng (optional, for subdomains)');

console.log('\n✅ VERIFICATION STEPS:');
console.log('=====================\n');

console.log('After configuration:');
console.log('1. Test authentication at https://www.protector.ng');
console.log('2. Check browser console for any CORS errors');
console.log('3. Verify realtime chat functionality');
console.log('4. Test booking creation flow');

console.log('\n📝 NOTES:');
console.log('==========\n');
console.log('- Your app has hardcoded fallback values, so it will work even without env vars');
console.log('- But setting them properly ensures better security and configuration');
console.log('- The redirect URLs you already added in Supabase are perfect!');

// Create a .env.production file for reference
const envContent = Object.entries(requiredEnvVars)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

fs.writeFileSync('.env.production', envContent);
console.log('\n💾 Created .env.production file for reference');
console.log('   (This file is for reference only, not used by Vercel)');