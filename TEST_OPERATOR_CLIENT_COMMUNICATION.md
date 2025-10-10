# PROTECTOR.NG - Operator-Client Communication Test Guide

## ✅ FIXES APPLIED

### 1. Message API Fixes
- **Fixed message column names**: All APIs now set both `content` and `message` columns for maximum compatibility
- **Fixed operator messages API**: Removed column name guessing, directly sets both columns
- **Fixed client messages API**: Same dual-column approach
- **Fixed status update messages**: System messages now properly saved with both columns

### 2. Operator Dashboard Fixes
- **Fixed status update flow**: Status updates now create system messages in database
- **Fixed operator action messages**: Messages are now sent via API to database (not just localStorage)
- **Fixed PATCH endpoint**: Operator bookings PATCH now has proper authentication
- **Fixed booking ID resolution**: All APIs now handle both UUIDs and booking codes (REQ...)

### 3. Database Message Storage
-  ✅ Messages stored in `messages` table with both `content` and `message` columns
- ✅ Proper `sender_type` set ('operator', 'client', or 'system')
- ✅ Proper `message_type` set ('text', 'invoice', or 'system')
- ✅ Metadata stored for invoices

## 🧪 HOW TO TEST

### Test 1: Operator Accepts Booking

1. **Open Operator Dashboard**: http://localhost:3001/operator
2. **Login as Operator**
3. **Select a pending booking**
4. **Click "Confirm" button**
5. **Expected Results**:
   - ✅ Booking status changes to "accepted"
   - ✅ System message appears in operator chat: "Booking confirmed by operator"
   - ✅ Operator message appears: "✅ Request confirmed! Your protection team is being assigned."
   - ✅ Success message shows: "Action completed: confirm"

6. **Open Client App**: http://localhost:3001/client
7. **Navigate to the same booking**
8. **Expected Results**:
   - ✅ Booking status shows "accepted"
   - ✅ Both messages appear in client chat
   - ✅ System message shows: "✅ Your booking has been accepted by our team..."

### Test 2: Send Invoice from Operator

1. **In Operator Dashboard**, with a booking selected
2. **Click "Send Invoice" button**
3. **Fill in invoice details**:
   - Base Price: e.g., 100,000 NGN
   - Hourly Rate: e.g., 25,000 NGN
   - Duration: e.g., 24 hours
   - Vehicle Fee: e.g., 20,000 NGN
   - Personnel Fee: e.g., 30,000 NGN
4. **Select currency**: NGN or USD
5. **Click "Send Invoice"**
6. **Expected Results**:
   - ✅ Invoice modal closes
   - ✅ Invoice message appears in operator chat with pricing breakdown
   - ✅ "Approve & Pay" button shows on invoice
   - ✅ Success message: "Invoice sent successfully!"

7. **In Client App**, check the same booking's chat
8. **Expected Results**:
   - ✅ Invoice message displays with all pricing details
   - ✅ "Approve Payment" or "Approve & Pay" button visible
   - ✅ Total amount clearly shown

### Test 3: Operator Sends Regular Message

1. **In Operator Dashboard**, with a booking selected
2. **Type a message** in the chat input: "Hello, we're preparing your team"
3. **Press Enter or click Send**
4. **Expected Results**:
   - ✅ Message appears instantly in operator chat
   - ✅ Message shows with blue operator bubble
   - ✅ Timestamp displayed

5. **In Client App**, refresh or check the booking chat
6. **Expected Results**:
   - ✅ Operator message appears
   - ✅ Message shows in chat history
   - ✅ Proper timestamp

### Test 4: Client Sends Message to Operator

1. **In Client App**, with a booking open
2. **Type a message**: "When will the team arrive?"
3. **Press Send**
4. **Expected Results**:
   - ✅ Message appears instantly in client chat
   - ✅ Message shows with green client bubble
   - ✅ Timestamp displayed

5. **In Operator Dashboard**, select the same booking
6. **Expected Results**:
   - ✅ Client message appears in operator chat
   - ✅ Message shows with green client bubble
   - ✅ Can reply to the message

### Test 5: Status Progression

Test full booking lifecycle:

1. **Pending → Accepted**: Click "Confirm"
   - ✅ System message created
   - ✅ Operator message sent

2. **Accepted → En Route** (after invoice approved): Click "Deploy Team"
   - ✅ Payment approval checked
   - ✅ Status updated
   - ✅ Messages created

3. **En Route → Arrived**: Click "Mark Arrived"
   - ✅ Status updated
   - ✅ System message: "📍 Your security team has arrived..."

4. **Arrived → In Service**: Click "Start Service"
   - ✅ Status updated
   - ✅ System message: "🛡️ Security service is now active..."

5. **In Service → Completed**: Click "Complete Service"
   - ✅ Status updated
   - ✅ System message: "✅ Security service completed successfully..."

## 🔍 DEBUGGING

### Check Database Messages

Run this in your terminal to see all messages for a booking:

```javascript
node -e "const { createClient } = require('@supabase/supabase-js'); const supabase = createClient('https://kifcevffaputepvpjpip.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio'); supabase.from('messages').select('*').order('created_at', {ascending: false}).limit(10).then(r => { console.log('Latest 10 messages:'); r.data.forEach(m => { console.log(\`\${m.created_at} | \${m.sender_type} | \${m.content || m.message}\`); }); });"
```

### Check Browser Console

**Operator Dashboard Console** should show:
- ✅ "Operator authenticated: ..."
- ✅ "Found X bookings"
- ✅ "Fetched X messages from database"
- ✅ "Operator message sent to database: ..."

**Client App Console** should show:
- ✅ "Fetched X messages"
- ✅ "Message sent successfully"

### Common Issues

**Issue**: Messages not appearing
- Check browser console for errors
- Verify booking ID is correct (UUID vs booking code)
- Check that API returns success: `{success: true, data: {...}}`

**Issue**: Status not updating
- Check console for "Status update response: 200 OK"
- Verify booking exists in database
- Check that status is a valid value

**Issue**: Invoice not sending
- Check that all invoice fields are filled
- Verify booking ID resolution
- Check metadata is properly attached

## 📊 API Endpoints Used

1. **GET /api/operator/bookings** - Fetch all bookings
2. **GET /api/operator/messages?bookingId=XXX** - Fetch messages
3. **POST /api/operator/messages** - Send operator message
4. **PATCH /api/bookings/status** - Update booking status
5. **GET /api/messages?bookingId=XXX** - Fetch messages (client)
6. **POST /api/messages** - Send client message

All endpoints now:
- ✅ Accept both UUID and booking code format
- ✅ Set both `content` and `message` columns
- ✅ Return proper success/error responses
- ✅ Create proper database entries

## ✅ SUCCESS CRITERIA

- [ ] Operator can send messages that appear in client chat
- [ ] Client can send messages that appear in operator dashboard
- [ ] Status updates create system messages visible to both
- [ ] Invoices can be sent and appear in client chat
- [ ] All messages persist in database
- [ ] Messages load when page is refreshed
- [ ] No console errors during normal operation
- [ ] Mobile users can access and chat (on http://192.168.1.142:3001)

---

**Test Date**: October 9, 2025
**Server**: Running on port 3001
**Status**: ✅ ALL FIXES APPLIED - READY FOR TESTING


