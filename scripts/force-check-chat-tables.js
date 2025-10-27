const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mjdbhusnplveeaveeovd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZGJodXNucGx2ZWVhdmVlb3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0NTk1MywiZXhwIjoyMDczNTIxOTUzfQ.7KGWZNRe7q2OvE-DeOJL8MKKx_NP7iACNvOC2FCkR5E'
);

async function forceCheckChatTables() {
  console.log('🔧 FORCE CHECKING CHAT TABLES (bypassing cache)...');
  console.log('=' .repeat(60));
  
  try {
    // Method 1: Use raw SQL query to bypass schema cache
    console.log('1️⃣ Using raw SQL query...');
    
    const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          table_name,
          column_name,
          data_type
        FROM information_schema.columns 
        WHERE table_name IN ('chat_rooms', 'chat_messages')
        ORDER BY table_name, ordinal_position;
      `
    });
    
    if (sqlError) {
      console.log('⚠️ SQL method failed:', sqlError.message);
    } else {
      console.log('✅ SQL method result:', sqlResult);
    }
    
    // Method 2: Try direct table access with error handling
    console.log('\n2️⃣ Trying direct table access...');
    
    try {
      const { data: rooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('count(*)', { count: 'exact', head: true });
      
      if (roomsError) {
        console.log('❌ chat_rooms error:', roomsError.message);
      } else {
        console.log('✅ chat_rooms accessible, count:', rooms);
      }
    } catch (error) {
      console.log('❌ chat_rooms exception:', error.message);
    }
    
    try {
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('count(*)', { count: 'exact', head: true });
      
      if (messagesError) {
        console.log('❌ chat_messages error:', messagesError.message);
      } else {
        console.log('✅ chat_messages accessible, count:', messages);
      }
    } catch (error) {
      console.log('❌ chat_messages exception:', error.message);
    }
    
    // Method 3: Check if tables exist via system tables
    console.log('\n3️⃣ Checking system tables...');
    
    const { data: systemTables, error: systemError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['chat_rooms', 'chat_messages']);
    
    if (systemError) {
      console.log('❌ System tables check failed:', systemError.message);
    } else {
      console.log('✅ System tables result:', systemTables);
      if (systemTables && systemTables.length > 0) {
        console.log('🎉 Tables found in system catalog!');
        systemTables.forEach(table => {
          console.log(`   - ${table.table_name} ✅`);
        });
      } else {
        console.log('❌ Tables not found in system catalog');
      }
    }
    
    // Method 4: Try creating a test record
    console.log('\n4️⃣ Testing with a simple insert...');
    
    try {
      const testRoomData = {
        booking_id: 'TEST_CACHE_CHECK',
        client_id: '9882762d-93e4-484c-b055-a14737f76cba',
        status: 'active'
      };
      
      const { data: insertResult, error: insertError } = await supabase
        .from('chat_rooms')
        .insert([testRoomData])
        .select();
      
      if (insertError) {
        console.log('❌ Insert test failed:', insertError.message);
      } else {
        console.log('✅ Insert test successful!', insertResult);
        
        // Clean up test record
        await supabase
          .from('chat_rooms')
          .delete()
          .eq('booking_id', 'TEST_CACHE_CHECK');
        
        console.log('🧹 Test record cleaned up');
      }
    } catch (error) {
      console.log('❌ Insert test exception:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🔍 CACHE CHECK COMPLETE');
}

forceCheckChatTables();



























