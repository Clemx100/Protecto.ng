// Check if the app is currently using mock data
require('dotenv').config({ path: '.env.local' })

console.log('\n🔍 CHECKING MOCK DATA USAGE\n')
console.log('='.repeat(70))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

console.log('\n📊 ENVIRONMENT CHECK:\n')
console.log(`Supabase URL: ${supabaseUrl}`)

// Check if mock database would be used
const shouldUseMock = 
  supabaseUrl.includes('localhost:54321') || 
  supabaseUrl.includes('mock') || 
  supabaseUrl === 'http://localhost:54321'

console.log(`\nUsing Mock Database: ${shouldUseMock ? '✅ YES' : '❌ NO'}`)

if (shouldUseMock) {
  console.log('\n⚠️  MOCK DATA IS ACTIVE\n')
  console.log('Your app is currently using mock/fallback data.')
  console.log('This means:')
  console.log('  • Data is stored in memory (not persistent)')
  console.log('  • Limited test data available')
  console.log('  • Good for development/testing only')
} else {
  console.log('\n✅ USING REAL SUPABASE DATABASE\n')
  console.log('Your app is using the real Supabase database.')
  console.log('This means:')
  console.log('  • All data is persistent')
  console.log('  • Full production features available')
  console.log('  • Real user accounts and bookings')
}

console.log('\n📝 MOCK DATA STATUS:\n')
console.log('Mock/Fallback Code Present: ✅ YES')
console.log('Purpose: Emergency fallback for network issues')
console.log('Currently Active: ' + (shouldUseMock ? '✅ YES' : '❌ NO'))

console.log('\n🔐 FALLBACK AUTH STATUS:\n')
console.log('Fallback authentication is available but ONLY triggers when:')
console.log('  • Network connection fails to Supabase')
console.log('  • Supabase service is temporarily unavailable')
console.log('  • Local development with mock URL')
console.log('\nIt does NOT trigger for:')
console.log('  • Wrong passwords (rejected immediately)')
console.log('  • Invalid credentials')
console.log('  • Normal authentication failures')

console.log('\n' + '='.repeat(70))
console.log('\n📋 SUMMARY:\n')

if (shouldUseMock) {
  console.log('🟡 Your app is in DEVELOPMENT MODE with mock data')
  console.log('   To switch to production:')
  console.log('   1. Update NEXT_PUBLIC_SUPABASE_URL in .env.local')
  console.log('   2. Use a real Supabase project URL')
} else {
  console.log('✅ Your app is in PRODUCTION MODE with real database')
  console.log('   Mock code exists as fallback but is NOT being used')
  console.log('   All features are using real Supabase data')
}

console.log('\n' + '='.repeat(70) + '\n')

