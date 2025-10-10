/**
 * PROTECTOR.NG FULL SYSTEM DIAGNOSIS
 * 
 * This script performs a comprehensive check of:
 * - Database connectivity
 * - User accounts and roles
 * - Bookings system
 * - Messages system
 * - Operator dashboard access
 * - Real-time functionality
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kifcevffaputepvpjpip.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio';

const checklist = {
  database: { status: '⏳', name: 'Database Connection' },
  tables: { status: '⏳', name: 'Required Tables Exist' },
  operator: { status: '⏳', name: 'Operator Account Setup' },
  bookings: { status: '⏳', name: 'Bookings System' },
  messages: { status: '⏳', name: 'Messages System' },
  profiles: { status: '⏳', name: 'Profiles Configuration' },
  realtime: { status: '⏳', name: 'Real-time Subscriptions' },
  rls: { status: '⏳', name: 'Row Level Security' }
};

function updateStatus(key, status, details = '') {
  checklist[key].status = status;
  checklist[key].details = details;
}

function printChecklist() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 PROTECTOR.NG SYSTEM DIAGNOSIS CHECKLIST');
  console.log('='.repeat(80) + '\n');
  
  Object.entries(checklist).forEach(([key, value]) => {
    console.log(`${value.status} ${value.name}`);
    if (value.details) {
      console.log(`   ${value.details}`);
    }
  });
  
  console.log('\n' + '='.repeat(80) + '\n');
}

async function diagnose() {
  console.log('🔍 Starting Full System Diagnosis...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // ============================================================================
    // 1. DATABASE CONNECTION
    // ============================================================================
    console.log('1️⃣  Testing database connection...');
    try {
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      if (error && error.code !== 'PGRST116') throw error;
      updateStatus('database', '✅', 'Connected to PROTECTOR.NG LIVE');
      console.log('   ✅ Database connected\n');
    } catch (error) {
      updateStatus('database', '❌', `Connection failed: ${error.message}`);
      console.log(`   ❌ Database connection failed: ${error.message}\n`);
    }

    // ============================================================================
    // 2. CHECK REQUIRED TABLES
    // ============================================================================
    console.log('2️⃣  Checking required tables...');
    const requiredTables = ['profiles', 'bookings', 'messages', 'services'];
    const missingTables = [];
    
    for (const table of requiredTables) {
      try {
        await supabase.from(table).select('count', { count: 'exact', head: true });
        console.log(`   ✅ Table '${table}' exists`);
      } catch (error) {
        console.log(`   ❌ Table '${table}' missing or inaccessible`);
        missingTables.push(table);
      }
    }
    
    if (missingTables.length === 0) {
      updateStatus('tables', '✅', 'All required tables exist');
    } else {
      updateStatus('tables', '❌', `Missing tables: ${missingTables.join(', ')}`);
    }
    console.log('');

    // ============================================================================
    // 3. OPERATOR ACCOUNT
    // ============================================================================
    console.log('3️⃣  Checking operator account...');
    const operatorEmail = 'iwewezinemstephen@gmail.com';
    
    try {
      // Check auth user
      const { data: users } = await supabase.auth.admin.listUsers();
      const operator = users.users.find(u => u.email === operatorEmail);
      
      if (!operator) {
        updateStatus('operator', '❌', `User ${operatorEmail} not found in auth`);
        console.log(`   ❌ Operator user not found\n`);
      } else {
        console.log(`   ✅ Auth user exists: ${operator.id}`);
        
        // Check profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', operator.id)
          .maybeSingle();
        
        if (!profile) {
          updateStatus('operator', '⚠️', 'User exists but no profile found');
          console.log(`   ⚠️  No profile found for operator`);
        } else {
          console.log(`   ✅ Profile exists`);
          console.log(`   📧 Email: ${profile.email}`);
          console.log(`   👤 Role: ${profile.role}`);
          
          if (profile.role === 'operator' || profile.role === 'admin' || profile.role === 'agent') {
            updateStatus('operator', '✅', `Role: ${profile.role} ✓`);
          } else {
            updateStatus('operator', '❌', `Wrong role: ${profile.role} (needs: operator/admin/agent)`);
          }
        }
      }
    } catch (error) {
      updateStatus('operator', '❌', error.message);
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');

    // ============================================================================
    // 4. BOOKINGS SYSTEM
    // ============================================================================
    console.log('4️⃣  Analyzing bookings system...');
    try {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, client:profiles!bookings_client_id_fkey(email, role), service:services(name)')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (bookingsError) throw bookingsError;
      
      console.log(`   📊 Total bookings found: ${bookings.length}`);
      
      if (bookings.length === 0) {
        updateStatus('bookings', '⚠️', 'No bookings in database');
        console.log(`   ⚠️  No bookings found - this is normal for a new system`);
      } else {
        // Analyze bookings
        const clientEmails = [...new Set(bookings.map(b => b.client?.email).filter(Boolean))];
        const statuses = [...new Set(bookings.map(b => b.status))];
        
        console.log(`   👥 Unique clients: ${clientEmails.length}`);
        console.log(`   📋 Statuses: ${statuses.join(', ')}`);
        
        // Show recent bookings
        console.log(`\n   📌 Recent bookings:`);
        bookings.slice(0, 5).forEach((booking, i) => {
          console.log(`   ${i + 1}. ${booking.booking_code || booking.id.substring(0, 8)}`);
          console.log(`      Client: ${booking.client?.email || 'Unknown'}`);
          console.log(`      Status: ${booking.status}`);
          console.log(`      Service: ${booking.service?.name || 'Unknown'}`);
          console.log(`      Created: ${new Date(booking.created_at).toLocaleString()}`);
        });
        
        updateStatus('bookings', '✅', `${bookings.length} booking(s) found`);
      }
    } catch (error) {
      updateStatus('bookings', '❌', error.message);
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');

    // ============================================================================
    // 5. MESSAGES SYSTEM
    // ============================================================================
    console.log('5️⃣  Analyzing messages system...');
    try {
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (messagesError) throw messagesError;
      
      console.log(`   💬 Total messages found: ${messages.length}`);
      
      if (messages.length === 0) {
        updateStatus('messages', '⚠️', 'No messages in database');
        console.log(`   ⚠️  No messages found`);
      } else {
        // Analyze messages
        const senderTypes = [...new Set(messages.map(m => m.sender_type))];
        const bookingIds = [...new Set(messages.map(m => m.booking_id).filter(Boolean))];
        
        console.log(`   🗨️  Sender types: ${senderTypes.join(', ')}`);
        console.log(`   🔗 Related to ${bookingIds.length} booking(s)`);
        
        // Check message schema
        const sampleMessage = messages[0];
        const hasContent = 'content' in sampleMessage;
        const hasMessage = 'message' in sampleMessage;
        
        console.log(`\n   📝 Message schema:`);
        console.log(`      'content' column: ${hasContent ? '✅' : '❌'}`);
        console.log(`      'message' column: ${hasMessage ? '✅' : '❌'}`);
        
        updateStatus('messages', '✅', `${messages.length} message(s) found`);
      }
    } catch (error) {
      updateStatus('messages', '❌', error.message);
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');

    // ============================================================================
    // 6. PROFILES CONFIGURATION
    // ============================================================================
    console.log('6️⃣  Checking profiles configuration...');
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, role, first_name, last_name')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (profilesError) throw profilesError;
      
      console.log(`   👥 Total profiles: ${profiles.length}`);
      
      const roleDistribution = profiles.reduce((acc, p) => {
        acc[p.role || 'null'] = (acc[p.role || 'null'] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`\n   📊 Role distribution:`);
      Object.entries(roleDistribution).forEach(([role, count]) => {
        console.log(`      ${role}: ${count}`);
      });
      
      // Check for constraint
      console.log(`\n   🔒 Checking role constraint...`);
      try {
        // Try to get constraint info
        const { data: constraints } = await supabase
          .rpc('exec_sql', { 
            sql: `SELECT conname FROM pg_constraint WHERE conname LIKE '%role%' AND conrelid = 'profiles'::regclass;` 
          })
          .single();
        
        console.log(`      Constraint exists: ${constraints ? '✅' : '⚠️'}`);
      } catch (e) {
        console.log(`      Could not check constraint (this is okay)`);
      }
      
      updateStatus('profiles', '✅', `${profiles.length} profile(s) configured`);
    } catch (error) {
      updateStatus('profiles', '❌', error.message);
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');

    // ============================================================================
    // 7. REAL-TIME SUBSCRIPTIONS
    // ============================================================================
    console.log('7️⃣  Checking real-time configuration...');
    try {
      // Check if tables are in realtime publication
      console.log(`   📡 Checking real-time publication...`);
      
      // This is a basic check - in production, you'd verify via SQL
      console.log(`      messages table: assumed enabled`);
      console.log(`      bookings table: assumed enabled`);
      
      updateStatus('realtime', '⚠️', 'Cannot verify without SQL access - assumed enabled');
      console.log(`   ⚠️  Real-time status cannot be fully verified from here`);
      console.log(`      Run this in Supabase SQL Editor to verify:`);
      console.log(`      SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`);
    } catch (error) {
      updateStatus('realtime', '❌', error.message);
    }
    console.log('');

    // ============================================================================
    // 8. ROW LEVEL SECURITY
    // ============================================================================
    console.log('8️⃣  Checking Row Level Security (RLS)...');
    try {
      console.log(`   🔐 RLS status (requires service role to bypass):`);
      console.log(`      profiles: checking...`);
      console.log(`      bookings: checking...`);
      console.log(`      messages: checking...`);
      
      updateStatus('rls', '⚠️', 'RLS status requires SQL verification');
      console.log(`   ⚠️  RLS policies should be configured in Supabase dashboard`);
    } catch (error) {
      updateStatus('rls', '❌', error.message);
    }
    console.log('');

    // ============================================================================
    // PRINT FINAL CHECKLIST
    // ============================================================================
    printChecklist();

    // ============================================================================
    // RECOMMENDATIONS
    // ============================================================================
    console.log('💡 RECOMMENDATIONS:\n');
    
    const issues = Object.entries(checklist).filter(([k, v]) => v.status === '❌');
    const warnings = Object.entries(checklist).filter(([k, v]) => v.status === '⚠️');
    
    if (issues.length > 0) {
      console.log('🚨 CRITICAL ISSUES TO FIX:');
      issues.forEach(([key, value]) => {
        console.log(`   ❌ ${value.name}`);
        if (value.details) {
          console.log(`      ${value.details}`);
        }
      });
      console.log('');
    }
    
    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS (may need attention):');
      warnings.forEach(([key, value]) => {
        console.log(`   ⚠️  ${value.name}`);
        if (value.details) {
          console.log(`      ${value.details}`);
        }
      });
      console.log('');
    }
    
    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ System appears to be healthy!\n');
    }

    // ============================================================================
    // SPECIFIC BOOKING ISSUE CHECK
    // ============================================================================
    console.log('🔍 INVESTIGATING YOUR RECENT BOOKING ISSUE:\n');
    
    try {
      // Get the most recent booking
      const { data: recentBooking } = await supabase
        .from('bookings')
        .select('*, client:profiles!bookings_client_id_fkey(email, role, first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!recentBooking) {
        console.log('   ❌ No bookings found in database at all!');
        console.log('   🔍 Possible causes:');
        console.log('      1. Booking creation API is not saving to database');
        console.log('      2. RLS policies blocking inserts');
        console.log('      3. Foreign key constraints failing');
        console.log('');
      } else {
        console.log(`   ✅ Found most recent booking:`);
        console.log(`      ID: ${recentBooking.id}`);
        console.log(`      Code: ${recentBooking.booking_code || 'N/A'}`);
        console.log(`      Client: ${recentBooking.client?.email || 'Unknown'}`);
        console.log(`      Status: ${recentBooking.status}`);
        console.log(`      Created: ${new Date(recentBooking.created_at).toLocaleString()}`);
        console.log(`      Time ago: ${Math.round((Date.now() - new Date(recentBooking.created_at)) / 60000)} minutes ago`);
        console.log('');
        
        // Check if it has messages
        const { data: bookingMessages } = await supabase
          .from('messages')
          .select('count')
          .eq('booking_id', recentBooking.id);
        
        console.log(`      📨 Messages: ${bookingMessages?.length || 0}`);
        
        if ((Date.now() - new Date(recentBooking.created_at)) / 60000 < 10) {
          console.log(`\n   ✅ This is likely YOUR booking (created < 10 min ago)!`);
          console.log(`   📊 Checking why it might not appear in dashboard...`);
          console.log('');
          console.log(`   🔍 Possible reasons:`);
          console.log(`      1. ✅ Booking IS in database`);
          console.log(`      2. ❓ Dashboard API might not be fetching it`);
          console.log(`      3. ❓ Dashboard might be filtered by status`);
          console.log(`      4. ❓ Frontend might not be refreshing`);
          console.log('');
          console.log(`   💡 Next steps:`);
          console.log(`      1. Refresh the operator dashboard page`);
          console.log(`      2. Check browser console for errors`);
          console.log(`      3. Verify operator is logged in`);
          console.log(`      4. Check if dashboard filters are hiding the booking`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error checking recent booking: ${error.message}`);
    }

  } catch (error) {
    console.error('\n💥 FATAL ERROR during diagnosis:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Diagnosis Complete!');
  console.log('='.repeat(80) + '\n');
}

// Run diagnosis
diagnose();

