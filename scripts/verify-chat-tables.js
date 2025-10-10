const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
);

async function verifyChatTables() {
  console.log('🔍 Verifying chat tables...\n');
  
  try {
    // Check chat_rooms table
    console.log('1️⃣ Checking chat_rooms table...');
    const { data: rooms, error: roomsError } = await supabase
      .from('chat_rooms')
      .select('*')
      .limit(1);
    
    if (roomsError) {
      console.log('❌ chat_rooms table does NOT exist');
      console.log('   Error:', roomsError.message);
    } else {
      console.log('✅ chat_rooms table exists');
      const { count } = await supabase
        .from('chat_rooms')
        .select('*', { count: 'exact', head: true });
      console.log(`   Total rooms: ${count}`);
    }
    
    // Check chat_messages table
    console.log('\n2️⃣ Checking chat_messages table...');
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(1);
    
    if (messagesError) {
      console.log('❌ chat_messages table does NOT exist');
      console.log('   Error:', messagesError.message);
    } else {
      console.log('✅ chat_messages table exists');
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true });
      console.log(`   Total messages: ${count}`);
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (!roomsError && !messagesError) {
      console.log('✅ CHAT SYSTEM IS READY!');
    } else {
      console.log('❌ CHAT SYSTEM NOT SET UP YET');
      console.log('\n📝 To set up the chat system:');
      console.log('1. Go to https://supabase.com/dashboard');
      console.log('2. Open your project');
      console.log('3. Click "SQL Editor" in the left sidebar');
      console.log('4. Click "New Query"');
      console.log('5. Copy and paste the content from setup-chat-tables.sql');
      console.log('6. Click "Run" to execute the SQL');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyChatTables();
