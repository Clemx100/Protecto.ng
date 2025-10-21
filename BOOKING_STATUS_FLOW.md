# PROTECTOR.NG Booking Status Flow

## Complete Status Lifecycle

Here's the complete flow of how a booking progresses from creation to completion:

---

## 📋 Status Overview

| Status | Color | Description | Available Actions |
|--------|-------|-------------|-------------------|
| `pending` | 🟡 Yellow | Initial booking created by client | Confirm, Send Invoice |
| `accepted` / `confirmed` | 🔵 Blue | Operator confirmed the request | Send Invoice (if not paid) / Deploy Team (if paid) |
| `paid` | 🔵 Blue | Payment verified by Paystack | Deploy Team |
| `en_route` | 🟣 Purple | Protection team traveling to pickup | Mark Arrived |
| `arrived` | 🟢 Green | Team arrived at pickup location | Start Service |
| `in_service` | 🟢 Green | Service actively running | Complete Service |
| `completed` | ⚪ Gray | Service finished | No actions |
| `cancelled` | 🔴 Red | Booking cancelled | No actions |

---

## 🔄 Detailed Status Flow

### **STEP 1: Booking Created** 
**Status:** `pending` 🟡

**How it happens:**
- Client fills out booking form
- Submits protection request
- Booking created in database

**Operator sees:**
- New booking in dashboard
- Status: "PENDING" (yellow badge)
- Available actions:
  - ✅ **Confirm** - Accept the request
  - 📄 **Send Invoice** - Send pricing

**What happens in database:**
```sql
INSERT INTO bookings (
  status: 'pending',
  ...booking details
)
```

---

### **STEP 2: Operator Confirms Request**
**Status:** `pending` → `accepted` 🔵

**How it happens:**
- Operator clicks **"Confirm"** button
- System sends confirmation message to client

**Operator sees:**
- Status changes to "ACCEPTED" (blue badge)
- Available actions:
  - 📄 **Send Invoice** - Send pricing to client

**Messages sent:**
```
To Client: "✅ Request confirmed! Your protection team is being assigned."
System: "Booking confirmed by operator"
```

**Database update:**
```sql
UPDATE bookings 
SET status = 'accepted' 
WHERE id = booking_id
```

---

### **STEP 3: Invoice Sent** *(Optional but Recommended)*
**Status:** Remains `accepted` 🔵

**How it happens:**
- Operator clicks **"Send Invoice"**
- Fills in pricing details (base price, hourly rate, vehicle fee, personnel fee)
- Selects currency (NGN or USD)
- Clicks **"Send Invoice"**

**Client sees:**
- Invoice message in chat with full pricing breakdown
- **"Approve & Pay"** button

**Operator sees:**
- Invoice sent confirmation
- Waiting for payment

**No status change** - Still `accepted`

---

### **STEP 4: Client Makes Payment**
**Status:** `accepted` → `paid` 💰

**How it happens:**
1. Client clicks **"Approve & Pay"**
2. Redirected to Paystack payment gateway
3. Client completes payment (Card/Bank Transfer/USSD)
4. Paystack redirects to: `/api/payments/paystack/callback`
5. System automatically verifies payment
6. Status updated to `paid`
7. Client redirected to: `/?payment=success&booking={id}`

**Automatic actions by callback:**
```javascript
// 1. Verify payment with Paystack API
// 2. Update booking status
UPDATE bookings SET status = 'paid'

// 3. Create payment record
INSERT INTO payments (
  booking_id,
  amount,
  reference,
  status: 'success',
  ...
)

// 4. Send system message
INSERT INTO messages (
  message: "✅ Payment received! Amount: ₦X,XXX..."
)
```

**Operator sees:**
- Booking status: "PAID" (blue)
- Green "Paid" badge next to booking
- Payment confirmation message in chat
- Available action:
  - 🚀 **Deploy Team** - Send the team

**Client sees:**
- Success message: "Payment successful"
- Confirmation message in chat

---

### **STEP 5: Team Deployed**
**Status:** `paid` → `en_route` 🟣

**How it happens:**
- Operator clicks **"Deploy Team"**
- System notifies client

**⚠️ IMPORTANT:** 
- Deploy button only appears if `payment_approved = true` OR status = `paid`
- Cannot deploy without payment confirmation

**Operator sees:**
- Status changes to "EN ROUTE" (purple badge)
- Available action:
  - 📍 **Mark Arrived** - Team reached pickup location

**Messages sent:**
```
To Client: "🚀 Protection team deployed! They are preparing for departure."
System: "Protection team deployed"
```

**Database update:**
```sql
UPDATE bookings 
SET status = 'en_route' 
WHERE id = booking_id
```

---

### **STEP 6: Team Arrived at Pickup**
**Status:** `en_route` → `arrived` 🟢

**How it happens:**
- Operator clicks **"Mark Arrived"**
- Team confirms they're at pickup location

**Operator sees:**
- Status changes to "ARRIVED" (green badge)
- Available action:
  - 🛡️ **Start Service** - Begin protection service

**Messages sent:**
```
To Client: "📍 Your protection team has arrived at the pickup location."
System: "Protection team arrived"
```

**Database update:**
```sql
UPDATE bookings 
SET status = 'arrived' 
WHERE id = booking_id
```

---

### **STEP 7: Service Started**
**Status:** `arrived` → `in_service` 🟢

**How it happens:**
- Operator clicks **"Start Service"**
- Protection service officially begins

**Operator sees:**
- Status changes to "IN SERVICE" (green badge)
- Available action:
  - ✅ **Complete Service** - End the service

**Messages sent:**
```
To Client: "🛡️ Protection service has begun. Your team is now active."
System: "Protection service started"
```

**Database update:**
```sql
UPDATE bookings 
SET status = 'in_service' 
WHERE id = booking_id
```

---

### **STEP 8: Service Completed**
**Status:** `in_service` → `completed` ⚪

**How it happens:**
- Operator clicks **"Complete Service"**
- Service officially ends

**Operator sees:**
- Status changes to "COMPLETED" (gray badge)
- No more actions available
- Booking archived

**Messages sent:**
```
To Client: "✅ Service completed successfully. Thank you for choosing Protector.Ng!"
System: "Service completed"
```

**Database update:**
```sql
UPDATE bookings 
SET status = 'completed' 
WHERE id = booking_id
```

---

## 🚨 Alternative Flow: Cancellation

**Status:** Any → `cancelled` 🔴

**How it happens:**
- Client can cancel before service starts
- System calculates refund if payment was made

**Refund policy:**
- 20% cancellation fee deducted
- 80% refunded within 3-5 business days

---

## ⚡ Quick Reference Flow

```
1. PENDING (🟡)
   └─ Operator clicks "Confirm"
      ↓
2. ACCEPTED (🔵)
   └─ Operator sends "Invoice"
      └─ Client clicks "Approve & Pay"
         └─ Client completes payment on Paystack
            ↓
3. PAID (🔵) [payment_approved = true]
   └─ Operator clicks "Deploy Team"
      ↓
4. EN_ROUTE (🟣)
   └─ Operator clicks "Mark Arrived"
      ↓
5. ARRIVED (🟢)
   └─ Operator clicks "Start Service"
      ↓
6. IN_SERVICE (🟢)
   └─ Operator clicks "Complete Service"
      ↓
7. COMPLETED (⚪)
```

---

## 🔑 Key Points

1. **Payment is MANDATORY before deployment**
   - Cannot click "Deploy Team" without payment
   - System checks `payment_approved` flag or `paid` status

2. **Automatic Payment Verification**
   - Paystack callback handles everything
   - No manual operator confirmation needed
   - Status automatically changes to `paid`

3. **Status Changes Are One-Way**
   - Cannot go backwards in the flow
   - Exception: Cancellation can happen anytime before completion

4. **Each Status Has Specific Actions**
   - Actions change based on current status
   - Actions disabled during processing
   - No actions available for completed bookings

5. **Real-time Updates**
   - Operator dashboard refreshes every 3 seconds
   - Client sees updates in real-time via chat
   - Both sides stay synchronized

---

## 📊 Status Progression Matrix

| Current Status | Next Status | Trigger | Required Condition |
|---------------|-------------|---------|-------------------|
| `pending` | `accepted` | Operator confirms | None |
| `accepted` | `paid` | Payment callback | Payment successful |
| `paid` | `en_route` | Operator deploys | Payment approved |
| `en_route` | `arrived` | Operator marks | None |
| `arrived` | `in_service` | Operator starts | None |
| `in_service` | `completed` | Operator completes | None |
| Any | `cancelled` | Client/Operator cancels | Before completion |

---

## ✅ Issue Fixed!

**Previous Problem:** The payment callback only set status to `paid`, but didn't set the `payment_approved` flag.

**Fixed:** 
- Callback now sets both `status = 'paid'` AND `payment_approved = true`
- Dashboard recognizes `paid` status with blue badge
- "Deploy Team" button appears automatically after payment
- Flow works seamlessly!

**Changes made:**
```javascript
// In callback route:
UPDATE bookings SET 
  status = 'paid',
  payment_approved = true  // ✅ Added this
  
// In operator dashboard:
case 'paid':  // ✅ Added paid status
  return [{ action: 'deploy', label: 'Deploy Team' }]
```

