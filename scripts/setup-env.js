#!/usr/bin/env node

/**
 * Environment Setup Helper for Protector.Ng
 * This script helps you create your .env.local file
 */

const fs = require('fs')
const path = require('path')

console.log('🔧 Protector.Ng Environment Setup')
console.log('=' .repeat(60))

const envTemplate = `# Supabase Configuration for Protector.Ng
# Your Supabase URL
NEXT_PUBLIC_SUPABASE_URL=https://mjdbhusnplveeaveeovd.supabase.co

# Your Supabase Anonymous Key (public - safe to expose)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDU5NTMsImV4cCI6MjA3MzUyMTk1M30.Jhsz_eRvmotyGgRzszwfKF8czxSnNE92q1SBupR9DB4

# Your Supabase Service Role Key (PRIVATE - never expose publicly!)
# GET THIS FROM: https://supabase.com/dashboard/project/mjdbhusnplveeaveeovd/settings/api
# Look for "service_role" key under "Project API keys"
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Protector.Ng
NODE_ENV=development
`

const envPath = path.join(process.cwd(), '.env.local')

if (fs.existsSync(envPath)) {
  console.log('⚠️  .env.local already exists!')
  console.log('   Please edit it manually and add your SUPABASE_SERVICE_ROLE_KEY')
} else {
  fs.writeFileSync(envPath, envTemplate)
  console.log('✅ Created .env.local file')
}

console.log('\n📝 NEXT STEPS:')
console.log('=' .repeat(60))
console.log('1. Go to: https://supabase.com/dashboard/project/mjdbhusnplveeaveeovd/settings/api')
console.log('2. Copy the "service_role" key (NOT the anon key)')
console.log('3. Open .env.local in your editor')
console.log('4. Replace "your_service_role_key_here" with your actual service role key')
console.log('5. Save the file')
console.log('6. Run: node scripts/create-operator-accounts.js')
console.log('=' .repeat(60))
console.log('\n⚠️  IMPORTANT: Never commit .env.local to git!')
console.log('   It contains sensitive credentials.')


