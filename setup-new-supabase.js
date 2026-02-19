#!/usr/bin/env node

/**
 * Setup New Supabase Project for Protector.Ng
 * This script helps create a new Supabase project and update the configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🛡️  PROTECTOR.NG - Supabase Setup');
console.log('=====================================\n');

// Instructions for setting up a new Supabase project
const instructions = `
📋 SETUP INSTRUCTIONS:

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: protector-ng
   - Database Password: [generate a strong password]
   - Region: Choose closest to your users
5. Wait for the project to be created (2-3 minutes)
6. Go to Settings > API
7. Copy the following values:
   - Project URL
   - anon/public key
   - service_role key

🔧 NEXT STEPS:

After creating your Supabase project, run:
   node update-supabase-config.js [PROJECT_URL] [ANON_KEY] [SERVICE_ROLE_KEY]

Or manually update your .env.local file with the new values.

📝 EXAMPLE .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://your-new-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

🚀 QUICK START:
If you want to test locally without Supabase, run:
   npm run dev:mock
`;

console.log(instructions);

// Check if we have command line arguments
if (process.argv.length >= 5) {
  const projectUrl = process.argv[2];
  const anonKey = process.argv[3];
  const serviceRoleKey = process.argv[4];
  
  console.log('🔧 Updating configuration with provided credentials...\n');
  
  // Update .env.local
  const envContent = `# PROTECTOR.NG LIVE - Supabase Configuration
# Project: ${projectUrl}
# Dashboard: https://supabase.com/dashboard

NEXT_PUBLIC_SUPABASE_URL=${projectUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}

# Stripe Configuration (Add your keys when ready)
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# STRIPE_SECRET_KEY=
`;

  try {
    fs.writeFileSync('.env.local', envContent);
    console.log('✅ .env.local updated successfully!');
    
    // Test the connection
    console.log('\n🧪 Testing database connection...');
    const { checkDatabaseConnection } = require('./lib/config/database.ts');
    
    checkDatabaseConnection().then(result => {
      if (result.connected) {
        console.log('✅ Database connection successful!');
        console.log('\n🚀 You can now run: npm run dev');
      } else {
        console.log('❌ Database connection failed:', result.error);
        console.log('\n🔍 Please check your Supabase project settings and try again.');
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating configuration:', error.message);
  }
} else {
  console.log('\n💡 TIP: You can also run this script with your Supabase credentials:');
  console.log('   node setup-new-supabase.js [PROJECT_URL] [ANON_KEY] [SERVICE_ROLE_KEY]');
}






















