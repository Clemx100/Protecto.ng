# 🚀 Chat System Quick Start

## 1️⃣ Run the Migration (5 minutes)

### In Supabase Dashboard:

1. Go to **SQL Editor**
2. Open `scripts/rebuild-chat-system.sql`
3. Copy all content
4. Paste into SQL Editor
5. Click **Run** (Ctrl+Enter)
6. Wait for: "Chat system rebuilt successfully! ✅"

✅ Done! Your database is ready.

## 2️⃣ Test the API (2 minutes)

### Get a Booking ID:

```sql
-- Run in Supabase SQL Editor
SELECT id, booking_code, status FROM bookings LIMIT 1;
```

Copy the `id` (UUID) from the result.

### Test Sending a Message:

Open your browser console (F12) and run:

```javascript
// Replace with your actual booking ID
const bookingId = 'YOUR-BOOKING-UUID-HERE';

fetch('/api/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bookingId: bookingId,
    content: 'Test message from new chat system!',
    messageType: 'text'
  })
})
.then(r => r.json())
.then(d => console.log('✅ Message sent:', d))
.catch(e => console.error('❌ Error:', e));
```

### Test Fetching Messages:

```javascript
fetch(`/api/messages?bookingId=${bookingId}`)
  .then(r => r.json())
  .then(d => console.log('📨 Messages:', d))
  .catch(e => console.error('❌ Error:', e));
```

## 3️⃣ Update Your Components (10 minutes)

### Example: Operator Dashboard

```typescript
import { useChat } from '@/lib/hooks/useChat'

function OperatorChat({ bookingId }: { bookingId: string }) {
  const { 
    messages, 
    sendMessage, 
    isLoading, 
    error 
  } = useChat({
    bookingId,
    autoLoad: true,
    enableRealtime: true
  })

  const [newMessage, setNewMessage] = useState('')

  const handleSend = async () => {
    if (!newMessage.trim()) return
    
    try {
      await sendMessage(newMessage)
      setNewMessage('') // Clear input
    } catch (err) {
      console.error('Failed to send:', err)
    }
  }

  if (isLoading) return <div>Loading messages...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {/* Messages List */}
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.sender_role}`}>
            <strong>
              {msg.sender?.first_name} {msg.sender?.last_name}
            </strong>
            <p>{msg.content}</p>
            <small>{new Date(msg.created_at).toLocaleString()}</small>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="input">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  )
}
```

### Example: Status Update with System Message

```typescript
import { useSystemMessages } from '@/lib/hooks/useChat'

function StatusButtons({ bookingId, currentStatus }: Props) {
  const { sendSystemMessage } = useSystemMessages()

  const updateStatus = async (newStatus: string) => {
    // 1. Update booking status in database
    await updateBookingStatus(bookingId, newStatus)
    
    // 2. Send system message
    await sendSystemMessage(
      bookingId,
      `🔄 Status updated: ${currentStatus} → ${newStatus}`,
      {
        old_status: currentStatus,
        new_status: newStatus,
        timestamp: new Date().toISOString()
      }
    )
  }

  return (
    <div>
      <button onClick={() => updateStatus('accepted')}>
        Accept Booking
      </button>
      <button onClick={() => updateStatus('en_route')}>
        Team En Route
      </button>
    </div>
  )
}
```

## 4️⃣ Clear Old Data (1 minute)

Open browser console (F12) and run:

```javascript
// Clear old localStorage data
localStorage.removeItem('operator_bookings');
localStorage.removeItem('user_bookings');
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('chat_')) localStorage.removeItem(key);
});
console.log('✅ Old data cleared!');
```

Then refresh the page (F5).

## 5️⃣ Verify Real-time (2 minutes)

### Test Real-time Updates:

1. Open **two browser windows** side by side
2. Both open the same booking
3. Send a message from Window 1
4. ✅ Should appear instantly in Window 2!

If real-time doesn't work:

```sql
-- Check realtime is enabled
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'messages';
```

Should show the messages table. If not, run:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

## 🎉 You're Done!

Your new chat system is live! 

### What works now:
- ✅ No more UUID errors
- ✅ Real-time message updates
- ✅ System messages for status updates
- ✅ Proper user names in messages
- ✅ Clean database structure
- ✅ Better error handling

### Common Issues:

**"Unauthorized" error:**
- Make sure you're logged in
- Check cookies in Application tab

**Messages not showing:**
- Verify booking ID is correct (UUID format)
- Check browser console for errors
- Verify RLS policies in Supabase

**Real-time not working:**
- Check Realtime is enabled in project settings
- Verify tables are in realtime publication
- Check browser console for subscription status

Need more help? Check `CHAT_SYSTEM_REBUILD_GUIDE.md` for detailed information.

