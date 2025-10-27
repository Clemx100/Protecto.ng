# Automatic Paystack Payment Flow

## Overview
PROTECTOR.NG uses an automatic payment verification system through Paystack callbacks. No manual operator confirmation is required.

## How It Works

### 1. **Client Receives Invoice**
- Operator sends an invoice through the chat
- Client sees the invoice with an **"Approve & Pay"** button

### 2. **Client Redirects to Paystack**
- Client clicks **"Approve & Pay"**
- Opens Paystack payment gateway in a new window
- Client completes payment on Paystack (Card, Bank Transfer, USSD, etc.)

### 3. **Automatic Payment Verification**
After successful payment on Paystack:
- Paystack redirects to: `/?payment=success&booking={bookingId}`
- Callback API automatically verifies payment with Paystack
- Booking status updated to 'paid'
- Payment record created in database
- System message sent to chat confirming payment

### 4. **Ready for Deployment**
- Operator sees booking with "Paid" badge (green)
- "Deploy Team" button becomes available
- Operator can proceed with service deployment

## Technical Details

### Paystack Callback Flow
```
Client completes payment on Paystack
           ↓
Paystack redirects to: /api/payments/paystack/callback
           ↓
API verifies payment with Paystack API
           ↓
Updates booking status to 'paid'
           ↓
Creates payment record in database
           ↓
Sends system message to chat
           ↓
Redirects to: /?payment=success&booking={id}
```

### API Endpoint: `/api/payments/paystack/callback`

**What it does:**
1. Receives payment reference and booking ID from Paystack
2. Verifies payment status with Paystack API
3. Updates booking status to 'paid'
4. Creates payment record in `payments` table
5. Sends confirmation message to chat
6. Redirects client back to app

### Database Updates

**Bookings Table:**
- `status` → 'paid'
- `updated_at` → current timestamp

**Payments Table (new record):**
```sql
{
  booking_id: UUID,
  amount: number (in naira),
  currency: 'NGN',
  reference: string,
  status: 'success',
  payment_method: 'paystack',
  paid_at: timestamp,
  customer_email: string,
  metadata: JSON
}
```

**Messages Table (system message):**
```sql
{
  booking_id: UUID,
  sender_type: 'system',
  message: "✅ Payment received! Amount: ₦X,XXX\n\nReference: protector_xxx\n\nYour protection service request is being processed.",
  is_system_message: true
}
```

## Client Experience

```
1. View invoice in chat
   ↓
2. Click "Approve & Pay"
   ↓
3. Complete payment on Paystack
   ↓
4. Automatically redirected back to app
   ↓
5. See "Payment successful" status
   ↓
6. Receive confirmation message in chat
```

## Operator Experience

```
1. Send invoice to client
   ↓
2. Wait for payment notification
   ↓
3. See booking updated with "Paid" badge
   ↓
4. See payment confirmation in chat
   ↓
5. Click "Deploy Team" to proceed
```

## Error Handling

**If payment fails:**
- Redirects to: `/?payment=failed`
- Client can try again

**If verification fails:**
- Redirects to: `/?payment=error`
- Client should contact support

**If reference missing:**
- Redirects to: `/?payment=failed`
- Client should retry payment

## Benefits

1. **Fully Automatic**: No manual steps required
2. **Real-time Verification**: Payment verified immediately with Paystack
3. **Secure**: Uses Paystack's verification API
4. **Trackable**: All payments recorded in database
5. **User-Friendly**: Seamless redirect flow

## Testing in Development

When testing with Paystack test mode:
1. Use test cards provided by Paystack
2. Callback will still work normally
3. Test credentials in `.env`:
   - `PAYSTACK_SECRET_KEY=sk_test_xxx`
   - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx`

## Production Setup

Before going live:
1. Replace test keys with live Paystack keys
2. Ensure `NEXT_PUBLIC_APP_URL` is set to production URL
3. Test the full payment flow
4. Verify callback URL is accessible from Paystack servers

## No Webhook Required

This implementation uses **callback URLs** instead of webhooks:
- **Callback**: User is redirected to your API after payment
- **Webhook**: Paystack sends POST request to your API (not implemented)

The callback approach is simpler and works well for this use case.

## Status Flow

```
Booking Created (status: 'pending')
           ↓
Operator Confirms (status: 'accepted')
           ↓
Invoice Sent
           ↓
Client Pays
           ↓
Callback Verifies (status: 'paid')
           ↓
Operator Deploys (status: 'en_route')
           ↓
... rest of service flow
```






