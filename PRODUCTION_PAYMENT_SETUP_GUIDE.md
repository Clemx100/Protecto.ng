# 🚀 Production Payment Configuration - Complete Guide

## ✅ What's Already Done

Your Protector.Ng app already has **Paystack payment integration** configured in **TEST MODE**. This guide will help you switch to **PRODUCTION MODE** for real payments.

---

## 📋 Current Status

### ✅ Already Configured:
- Payment API endpoints (`/api/payments/paystack/create`, `/api/payments/paystack/verify`)
- Payment callback handling
- Invoice system with payment integration
- Test mode active with test keys

### ⚠️ Needs Configuration:
- Production Paystack API keys
- Production callback URLs
- Live payment verification

---

## 🔑 Step 1: Get Production Paystack Keys

### 1.1 Login to Paystack Dashboard
1. Go to [https://dashboard.paystack.com](https://dashboard.paystack.com)
2. Login with your Paystack merchant account
3. **If you don't have an account**: Sign up at [https://paystack.com](https://paystack.com)

### 1.2 Complete Business Verification (if not done)
- Submit business documents
- Wait for Paystack approval (usually 24-48 hours)
- Once approved, you'll get access to live mode

### 1.3 Get Your Live API Keys
1. In Paystack Dashboard, go to **Settings** → **API Keys & Webhooks**
2. Switch to **Live Mode** (toggle in top right)
3. Copy your live keys:
   - **Public Key**: `pk_live_...`
   - **Secret Key**: `sk_live_...`

⚠️ **SECURITY**: Never share your secret key or commit it to git!

---

## 🔧 Step 2: Configure Environment Variables

### 2.1 Local Development (.env.local)

Update your `.env.local` file:

```bash
# ===== PAYSTACK CONFIGURATION (PRODUCTION) =====
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_YOUR_LIVE_PUBLIC_KEY_HERE
PAYSTACK_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE

# ===== APP CONFIGURATION =====
NEXT_PUBLIC_APP_URL=https://www.protector.ng

# ===== SUPABASE CONFIGURATION (Existing) =====
NEXT_PUBLIC_SUPABASE_URL=https://kifcevffaputepvpjpip.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_existing_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_existing_service_role_key
```

### 2.2 Vercel Production Environment

#### Option A: Via Vercel Dashboard
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project: **protector-ng**
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | `pk_live_...` | Production |
| `PAYSTACK_SECRET_KEY` | `sk_live_...` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://www.protector.ng` | Production |

5. Click **Save** for each variable

#### Option B: Via Vercel CLI
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY production
# Paste: pk_live_YOUR_LIVE_PUBLIC_KEY_HERE

vercel env add PAYSTACK_SECRET_KEY production  
# Paste: sk_live_YOUR_LIVE_SECRET_KEY_HERE

vercel env add NEXT_PUBLIC_APP_URL production
# Paste: https://www.protector.ng
```

---

## 🌐 Step 3: Configure Paystack Dashboard

### 3.1 Set Callback URL
1. In Paystack Dashboard, go to **Settings** → **API Keys & Webhooks**
2. Scroll to **Callback URL**
3. Set to: `https://www.protector.ng/payment/callback`
4. Click **Save Changes**

### 3.2 Set Webhook URL
1. Still in **API Keys & Webhooks**
2. Scroll to **Webhook URL**
3. Set to: `https://www.protector.ng/api/payments/paystack/webhook`
4. Click **Save Changes**

### 3.3 Configure Webhook Events (Optional but Recommended)
Enable these events:
- ✅ `charge.success` - Payment successful
- ✅ `charge.failed` - Payment failed
- ✅ `transfer.success` - Transfer successful
- ✅ `transfer.failed` - Transfer failed

---

## 🧪 Step 4: Test Production Setup

### 4.1 Verify Environment Variables
```bash
# Run the verification script
node verify-production-paystack.js
```

Expected output:
```
✅ NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is set
✅ PAYSTACK_SECRET_KEY is set  
✅ Using LIVE keys (pk_live_... / sk_live_...)
✅ NEXT_PUBLIC_APP_URL is set: https://www.protector.ng
🎉 Production payment configuration looks good!
```

### 4.2 Test Payment Flow (Small Amount)
1. Create a real booking in your app
2. Operator sends invoice
3. Try to pay with a **real card** using a **small amount** (e.g., ₦100)
4. Verify:
   - ✅ Payment page opens correctly
   - ✅ Payment processes successfully
   - ✅ Redirects back to your app
   - ✅ Booking status updates
   - ✅ Payment recorded in database

### 4.3 Verify Webhook Receipt
1. Go to Paystack Dashboard → **Developers** → **Webhooks**
2. Check **Recent Deliveries**
3. Verify your webhook URL received the event
4. Check for any errors

---

## 💰 Step 5: Understand Paystack Fees

### Production Fee Structure:
- **Local Cards (Nigeria)**: 1.5% + ₦100 (capped at ₦2,000)
- **International Cards**: 3.9% + ₦100
- **Bank Transfer**: ₦50 flat fee
- **USSD**: 1.5% + ₦100
- **QR Code**: 0.5%

### Example Calculation:
```
Booking Amount: ₦775,000
Local Card Fee: (₦775,000 × 1.5%) + ₦100 = ₦11,725
(Capped at ₦2,000 max)

So actual fee: ₦2,000
Client Pays: ₦775,000
You Receive: ₦773,000
```

### Fee Management:
**Option A**: You absorb the fees
```
Client pays: ₦775,000
You receive: ₦773,000 (after ₦2,000 fee)
```

**Option B**: Client pays the fees (add to invoice)
```
Base amount: ₦775,000
Payment fee: ₦2,000
Client pays: ₦777,000
You receive: ₦775,000
```

To implement Option B, update your invoice calculation:
```typescript
// In your invoice creation code
const baseAmount = 775000;
const paystackFee = Math.min((baseAmount * 0.015) + 100, 2000);
const totalWithFees = baseAmount + paystackFee;
```

---

## 🔒 Step 6: Security Best Practices

### 6.1 Protect Your Secret Key
- ✅ Never commit secret keys to git
- ✅ Use environment variables only
- ✅ Set appropriate permissions in Vercel
- ✅ Rotate keys if compromised

### 6.2 Verify Payment Integrity
Your app already does this, but verify:
- ✅ Always verify payment on server-side
- ✅ Never trust client-side payment status
- ✅ Use Paystack's verification API
- ✅ Log all payment attempts

### 6.3 Monitor for Fraud
- Set up payment alerts in Paystack
- Monitor failed payment attempts
- Set velocity limits if needed
- Review suspicious transactions

---

## 📊 Step 7: Monitor Production Payments

### 7.1 Paystack Dashboard Monitoring
- Daily: Check **Transactions** → **All Payments**
- Weekly: Review **Analytics** → **Revenue**
- Monthly: Download **Reports** for accounting

### 7.2 Your App Database
Check the `bookings` table for payment status:
```sql
SELECT 
  booking_code,
  status,
  total_price,
  payment_status,
  created_at
FROM bookings
WHERE status IN ('paid', 'pending_payment')
ORDER BY created_at DESC
LIMIT 20;
```

### 7.3 Set Up Alerts
Configure email alerts for:
- Failed payments
- Successful high-value transactions
- Refund requests
- Chargebacks

---

## 🚀 Step 8: Go Live Checklist

Before accepting real payments, verify:

### Technical Checks:
- [ ] ✅ Production Paystack keys added to Vercel
- [ ] ✅ `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] ✅ Callback URL configured in Paystack
- [ ] ✅ Webhook URL configured in Paystack
- [ ] ✅ Test payment with small amount successful
- [ ] ✅ Payment redirects working correctly
- [ ] ✅ Booking status updates after payment
- [ ] ✅ Webhook events being received

### Business Checks:
- [ ] ✅ Paystack business verification approved
- [ ] ✅ Bank account linked for settlements
- [ ] ✅ Settlement schedule configured
- [ ] ✅ Payment fee strategy decided
- [ ] ✅ Refund policy defined
- [ ] ✅ Customer support process ready

### Legal/Compliance:
- [ ] ✅ Terms of Service mention payment terms
- [ ] ✅ Privacy Policy covers payment data
- [ ] ✅ Refund policy published
- [ ] ✅ Business registered (if required)

---

## 🔧 Troubleshooting

### Issue: "Invalid API Key"
**Solution**: 
- Verify you copied the complete key
- Check you're using live keys, not test keys
- Ensure no extra spaces in environment variables

### Issue: Payment Not Redirecting
**Solution**:
- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check Paystack callback URL matches your domain
- Ensure HTTPS is enabled

### Issue: Webhook Not Receiving Events
**Solution**:
- Test webhook URL manually
- Check webhook URL in Paystack dashboard
- Verify API endpoint is accessible
- Check server logs for errors

### Issue: Payment Successful But Status Not Updating
**Solution**:
- Check webhook is configured correctly
- Verify payment verification logic
- Check database logs
- Review API error logs

---

## 📞 Support Resources

### Paystack Support:
- **Dashboard**: [https://dashboard.paystack.com](https://dashboard.paystack.com)
- **Documentation**: [https://paystack.com/docs](https://paystack.com/docs)
- **Support Email**: support@paystack.com
- **Phone**: +234 1 888 1337

### Testing Resources:
- **Test Cards**: [https://paystack.com/docs/payments/test-payments](https://paystack.com/docs/payments/test-payments)
- **API Reference**: [https://paystack.com/docs/api](https://paystack.com/docs/api)

---

## 🎯 Quick Command Reference

```bash
# Verify production setup
node verify-production-paystack.js

# Test chat synchronization
node test-realtime-chat-sync.js

# Check environment variables
vercel env ls

# Deploy to production
git push origin main
# (Vercel will auto-deploy)

# View production logs
vercel logs --prod
```

---

## ✅ Summary

Once you complete these steps:

1. ✅ Get live Paystack keys
2. ✅ Add keys to Vercel environment variables
3. ✅ Configure callback/webhook URLs in Paystack
4. ✅ Test with small real payment
5. ✅ Monitor dashboard for first few days

**Your app will be ready to accept real payments! 🚀**

---

## 📝 Notes

### Current Configuration:
- **Test Mode**: ✅ Working with test keys
- **Production Mode**: ⚠️ Requires setup above
- **Database**: ✅ Ready for production
- **Chat**: ✅ Fixed to use real data
- **Bookings**: ✅ Ready for production

### Estimated Setup Time:
- **Getting live keys**: 5 minutes (if approved)
- **Configuring Vercel**: 5 minutes
- **Setting up Paystack**: 5 minutes
- **Testing**: 10 minutes
- **Total**: ~25 minutes

---

**Last Updated**: October 27, 2025
**Status**: Ready for production deployment





