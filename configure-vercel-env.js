// Script to help configure Vercel environment variables
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 Vercel Environment Variables Configuration Helper\n');

console.log('📋 Step 1: Get your Supabase credentials from:');
console.log('   https://supabase.com/dashboard → Your Project → Settings → API\n');

console.log('📋 Step 2: Configure Main App (protector-ng.vercel.app):');
console.log('   https://vercel.com/dashboard → protector-ng → Settings → Environment Variables\n');

console.log('📋 Step 3: Configure Operator Dashboard (protector-ng-lxtd.vercel.app):');
console.log('   https://vercel.com/dashboard → protector-ng-lxtd → Settings → Environment Variables\n');

console.log('🔑 Environment Variables to Set:\n');

console.log('=== MAIN APP (protector-ng.vercel.app) ===');
console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here');
console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
console.log('NEXT_PUBLIC_APP_URL=https://protector-ng.vercel.app');
console.log('OPERATOR_DASHBOARD_URL=https://protector-ng-lxtd.vercel.app');
console.log('NODE_ENV=production\n');

console.log('=== OPERATOR DASHBOARD (protector-ng-lxtd.vercel.app) ===');
console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here');
console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
console.log('NEXT_PUBLIC_APP_URL=https://protector-ng-lxtd.vercel.app');
console.log('MAIN_APP_URL=https://protector-ng.vercel.app');
console.log('NODE_ENV=production\n');

console.log('⚠️  Important Notes:');
console.log('• Use the SAME Supabase project for both apps');
console.log('• Keep SUPABASE_SERVICE_ROLE_KEY secret');
console.log('• Set all variables for Production environment');
console.log('• Redeploy both apps after setting variables\n');

console.log('🧪 Step 4: Test Real-Time Communication');
console.log('1. Create a booking on main app');
console.log('2. Check if it appears in operator dashboard');
console.log('3. Test status updates');
console.log('4. Test payment flow\n');

console.log('📊 Step 5: Monitor Performance');
console.log('• Check Supabase dashboard for database performance');
console.log('• Monitor Vercel function logs');
console.log('• Test under load\n');

rl.question('Press Enter when you have completed the configuration...', () => {
  console.log('\n✅ Configuration complete! Your apps should now be connected to production Supabase.');
  console.log('\n🚀 Next steps:');
  console.log('1. Test both deployments');
  console.log('2. Create a test booking');
  console.log('3. Verify real-time updates');
  console.log('4. Monitor performance');
  
  rl.close();
});
