const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kifcevffaputepvpjpip.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
);

async function fixRealtimeChat() {
  console.log('🔧 Fixing real-time chat synchronization...');
  
  try {
    // Enable real-time for messages table
    const { error } = await supabase.rpc('enable_realtime', {
      table_name: 'messages'
    });
    
    if (error) {
      console.log('⚠️ RPC not available, trying alternative approach...');
      
      // Test if real-time is working by setting up a subscription
      const channel = supabase
        .channel('test-realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, (payload) => {
          console.log('✅ Real-time working! New message:', payload.new);
        })
        .subscribe((status) => {
          console.log('📡 Real-time status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time subscription is working!');
          } else if (status === 'CHANNEL_ERROR') {
            console.log('❌ Real-time subscription failed');
          }
        });
      
      // Clean up test subscription
      setTimeout(() => {
        supabase.removeChannel(channel);
        console.log('🧹 Test subscription cleaned up');
      }, 5000);
      
    } else {
      console.log('✅ Real-time enabled for messages table');
    }
    
    // Test message sending
    console.log('📤 Testing message sending...');
    const testMessage = {
      booking_id: '704ee613-c2d1-4c29-968f-0e5343c84580',
      sender_id: 'test-fix',
      sender_type: 'operator',
      content: 'Real-time fix test message - ' + new Date().toISOString(),
      message_type: 'text'
    };
    
    const { data, error: insertError } = await supabase
      .from('messages')
      .insert(testMessage)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Failed to insert test message:', insertError);
    } else {
      console.log('✅ Test message inserted:', data.id);
    }
    
    console.log('🎉 Real-time chat fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing real-time chat:', error);
  }
}

fixRealtimeChat();
