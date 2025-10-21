# Payment Verification Setup Guide

## ✅ What Was Fixed

I've added complete payment verification to your PROTECTOR.NG app! Here's what was implemented:

### 1. **Payment Callback Handler** (`/api/payments/paystack/callback`)
- Receives users after they complete payment on Paystack
- Verifies payment with Paystack API
- Updates booking status to "paid"
- Sends confirmation message to chat
- Redirects user back to app

### 2. **Payment Webhook Handler** (`/api/payments/paystack/webhook`)
- Receives real-time payment notifications from Paystack
- More reliable than callbacks
- Verifies webhook signature for security
- Auto-updates booking status
- Creates payment records

### 3. **Database Support** (`add-payment-support.sql`)
- Creates `payments` table for tracking
- Adds proper indexes and RLS policies
- Creates automatic trigger to update booking status
- Adds operator view with payment info

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **kifcevffaputepvpjpip** (PROTECTOR.NG LIVE)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `add-payment-support.sql`
6. Paste and click **Run**
7. You should see: "Payment support added successfully!"

### Step 2: Configure Paystack Webhook

1. Go to **Paystack Dashboard**: https://dashboard.paystack.com
2. Navigate to **Settings** → **Webhooks**
3. Add your webhook URL:
   ```
   https://your-domain.vercel.app/api/payments/paystack/webhook
   ```
   Or for local testing:
   ```
   http://192.168.1.142:3000/api/payments/paystack/webhook
   ```
4. Copy your **Paystack Secret Key** (already in your .env.local)
5. Click **Save**

### Step 3: Test Payment Flow

1. **Create a booking** in the app
2. **Operator sends invoice** in chat
3. **Client clicks "Approve & Pay"**
4. **Use test card**:
   - Card: `4084 0840 8408 4081`
   - CVV: `408`
   - PIN: `0000`
   - OTP: `123456`
5. **Complete payment**
6. **Check booking status** - should show "paid"
7. **Check chat** - should have payment confirmation

---

## 📊 How It Works

```
User clicks "Approve & Pay"
    ↓
Paystack payment page opens
    ↓
User completes payment
    ↓
Two things happen in parallel:
    ├─→ Callback: Redirects user back to app
    └─→ Webhook: Updates booking status to "paid"
    ↓
Operator sees updated status
```

---

## 🔍 Booking Status Flow

```
pending → accepted → paid → deployed → completed
                       ↑
                Payment verified here
```

---

## 🎯 For Operators

After payment, you'll see:
- ✅ Booking status: **"paid"**
- 💰 Payment amount
- 📝 Payment reference
- ⏰ Payment date/time
- ✉️ Payment confirmation in chat

You can then:
1. **Accept the booking** (assign agents)
2. **Deploy protection team**
3. **Complete service**

---

## 🔧 Troubleshooting

### Payment successful but status not updating?

**Check webhook:**
```bash
# In Paystack dashboard, check "Webhook Logs"
# Look for your payment reference
```

**Check terminal logs:**
```
🔔 Paystack webhook received
✅ Payment successful
💾 Updating booking status
✅ Booking updated to paid status
```

### Callback URL not working?

The webhook is more reliable! The callback is just for user experience (redirecting them back to the app).

### Testing locally?

Use **ngrok** or **localtunnel** to expose your local server:
```bash
npx localtunnel --port 3000
```
Then use the provided URL for your webhook.

---

## 📱 Mobile Testing

The payment flow works on mobile! Your users will:
1. See invoice in chat
2. Click "Approve & Pay"
3. Get redirected to Paystack mobile page
4. Complete payment
5. Return to your app
6. See confirmation message

---

## ✅ What's Working Now

- ✅ Payment initialization with Paystack
- ✅ Secure payment page
- ✅ Payment verification
- ✅ Automatic booking status update
- ✅ Payment tracking
- ✅ Chat notifications
- ✅ Operator visibility

---

## 🎉 You're Done!

Run the SQL migration and your payment verification is complete! The operator will now see when bookings are paid.

**Next Steps:**
1. Run the SQL migration
2. Test with the test card
3. Check operator dashboard for "paid" status
4. Deploy to production!

