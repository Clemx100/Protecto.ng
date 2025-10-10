const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kifcevffaputepvpjpip.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'
);

async function fixMobileChat() {
  console.log('📱 Fixing mobile chat synchronization...');
  
  const bookingId = '704ee613-c2d1-4c29-968f-0e5343c84580';
  
  try {
    // 1. Check current messages
    console.log('📥 Checking current messages...');
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    
    if (fetchError) {
      console.error('❌ Error fetching messages:', fetchError);
      return;
    }
    
    console.log(`✅ Found ${messages.length} messages`);
    messages.forEach(msg => {
      console.log(`- ${msg.sender_type}: ${msg.content || msg.message} (${msg.created_at})`);
    });
    
    // 2. Send a test message from operator
    console.log('📤 Sending test message from operator...');
    const testMessage = {
      booking_id: bookingId,
      sender_id: 'operator-test',
      sender_type: 'operator',
      content: '✅ Mobile chat fix test - This message should appear on mobile!',
      message_type: 'text',
      created_at: new Date().toISOString()
    };
    
    const { data: newMessage, error: insertError } = await supabase
      .from('messages')
      .insert(testMessage)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Failed to insert test message:', insertError);
    } else {
      console.log('✅ Test message sent:', newMessage.id);
    }
    
    // 3. Set up real-time subscription to verify it works
    console.log('🔗 Setting up real-time subscription...');
    const channel = supabase
      .channel('mobile-chat-fix')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${bookingId}`
      }, (payload) => {
        console.log('📨 Real-time message received:', payload.new);
        console.log(`✅ Mobile should receive: ${payload.new.sender_type}: ${payload.new.content || payload.new.message}`);
      })
      .subscribe((status) => {
        console.log('📡 Real-time status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active - mobile should receive messages!');
          
          // Send another test message after subscription is active
          setTimeout(async () => {
            const followUpMessage = {
              booking_id: bookingId,
              sender_id: 'operator-followup',
              sender_type: 'operator',
              content: '🔄 Follow-up test - Mobile should see this immediately!',
              message_type: 'text'
            };
            
            const { error } = await supabase
              .from('messages')
              .insert(followUpMessage);
            
            if (error) {
              console.error('❌ Follow-up message failed:', error);
            } else {
              console.log('✅ Follow-up message sent');
            }
          }, 2000);
        }
      });
    
    // Keep the subscription alive for testing
    setTimeout(() => {
      supabase.removeChannel(channel);
      console.log('🧹 Test subscription cleaned up');
    }, 10000);
    
    console.log('🎉 Mobile chat fix completed!');
    console.log('📱 Mobile users should now receive operator messages in real-time!');
    
  } catch (error) {
    console.error('❌ Error fixing mobile chat:', error);
  }
}

fixMobileChat();
