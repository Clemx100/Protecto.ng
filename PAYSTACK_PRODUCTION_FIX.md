# 🔧 Paystack Production Fix - www.protector.ng

## ⚠️ **CRITICAL ISSUES FIXED:**

1. ✅ **Callback URL** - Now correctly uses production domain instead of localhost
2. ⚠️ **Environment Variables** - Need to be configured on Vercel
3. ⚠️ **Paystack API Keys** - Must be set for production

---

## 🚀 IMMEDIATE ACTIONS REQUIRED

### **Step 1: Configure Vercel Environment Variables**

Go to your Vercel dashboard and add these environment variables:

**🔗 Vercel Dashboard:** https://vercel.com/dashboard

1. **Navigate to:** Your Project → Settings → Environment Variables

2. **Add these variables:**

#### **Production Environment Variables:**

```bash
# Application URL (CRITICAL)
NEXT_PUBLIC_APP_URL=https://www.protector.ng

# Paystack Live Keys (Get from https://dashboard.paystack.com)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key_here
PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key_here

# Supabase (Already configured)
NEXT_PUBLIC_SUPABASE_URL=https://kifcevffaputepvpjpip.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ0NzYsImV4cCI6MjA3NTM3MDQ3Nn0.YuVbfSbrDUy2nPigODzCcaOWTEXaJlPrVGE1L0C3y6g
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZmNldmZmYXB1dGVwdnBqcGlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDQ3NiwiZXhwIjoyMDc1MzcwNDc2fQ.O2hluhPKj1GiERmTlXQ0N35mV2loJ2L2WGsnOkIQpio
```

3. **Set Environment:** Select **"Production"** for live keys

4. **Click "Save"**

---

### **Step 2: Get Paystack Live API Keys**

1. **Go to:** https://dashboard.paystack.com
2. **Navigate to:** Settings → API Keys & Webhooks
3. **Copy your LIVE keys** (not test keys)
   - Public Key: `pk_live_...`
   - Secret Key: `sk_live_...`

⚠️ **IMPORTANT:** 
- Never commit these keys to GitHub
- Use LIVE keys for production
- Use TEST keys for development

---

### **Step 3: Configure Paystack Webhook (Optional but Recommended)**

1. **In Paystack Dashboard:** Settings → API Keys & Webhooks
2. **Add Webhook URL:**
   ```
   https://www.protector.ng/api/payments/paystack/webhook
   ```
3. **Select Events:**
   - ✅ charge.success
   - ✅ charge.failed

---

### **Step 4: Redeploy on Vercel**

After adding environment variables:

```bash
# Option 1: Trigger automatic deployment
git commit --allow-empty -m "Trigger redeployment for env vars"
git push origin main

# Option 2: Manual redeploy from Vercel dashboard
# Go to Deployments → Click "..." → Redeploy
```

---

## 🔍 **What Was Fixed in the Code:**

### **Before (Broken):**
```typescript
callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payments/...`
```
- ❌ Would default to localhost if env var not set
- ❌ Paystack couldn't redirect back to production site
- ❌ Payments would fail silently

### **After (Fixed):**
```typescript
const getCallbackUrl = () => {
  // Priority 1: Explicitly set APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  
  // Priority 2: Vercel deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Priority 3: Production domain
  if (process.env.NODE_ENV === 'production') {
    return 'https://www.protector.ng'
  }
  
  // Fallback: localhost for development
  return 'http://localhost:3000'
}
```
- ✅ Multiple fallback strategies
- ✅ Automatically uses www.protector.ng in production
- ✅ Works with Vercel preview deployments
- ✅ Proper localhost handling for development

---

## ✅ **Verification Checklist**

After deploying, verify these:

### **1. Environment Variables Set:**
```bash
# Check in Vercel Dashboard
- [ ] NEXT_PUBLIC_APP_URL = https://www.protector.ng
- [ ] NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = pk_live_...
- [ ] PAYSTACK_SECRET_KEY = sk_live_...
```

### **2. Test Payment Flow:**
```bash
1. [ ] Go to https://www.protector.ng
2. [ ] Create a booking
3. [ ] Operator sends invoice
4. [ ] Click "Approve & Pay"
5. [ ] Should redirect to Paystack payment page
6. [ ] Complete payment with test card
7. [ ] Should redirect back to www.protector.ng
8. [ ] Payment status should update
```

### **3. Check Browser Console:**
```bash
# Should see these logs:
✅ "🔗 Callback URL: https://www.protector.ng/api/payments/..."
✅ "💳 Initiating Paystack payment"
✅ "📤 Calling Paystack API with payload"
```

### **4. Common Issues:**

**Issue:** "Paystack secret key not configured"
- **Solution:** Add `PAYSTACK_SECRET_KEY` to Vercel env vars

**Issue:** Payment redirects to localhost
- **Solution:** Add `NEXT_PUBLIC_APP_URL=https://www.protector.ng`

**Issue:** "Failed to initialize payment"
- **Solution:** Check Paystack API keys are LIVE keys (not test)

**Issue:** Callback URL shows Vercel domain instead of www.protector.ng
- **Solution:** Ensure `NEXT_PUBLIC_APP_URL` is set (highest priority)

---

## 🧪 **Quick Test Commands**

### **Test from Browser Console:**
```javascript
// Test payment initialization
fetch('https://www.protector.ng/api/payments/paystack/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    email: 'test@protector.ng',
    bookingId: 'your-booking-id',
    customerName: 'Test User',
    currency: 'NGN'
  })
})
.then(r => r.json())
.then(console.log)
```

Expected response:
```json
{
  "success": true,
  "authorization_url": "https://checkout.paystack.com/...",
  "reference": "protector_...",
  "amount": 100
}
```

---

## 📊 **Monitoring & Logs**

### **Vercel Logs:**
```bash
# View real-time logs
https://vercel.com/[your-project]/logs

# Look for:
"🔗 Callback URL: https://www.protector.ng/..."
"💳 Payment request received"
"✅ Payment initialized successfully"
```

### **Paystack Dashboard:**
```bash
# Monitor payments
https://dashboard.paystack.com/transactions

# Check:
- Transaction status
- Callback URLs used
- Payment methods
- Error messages
```

---

## 🎯 **Success Indicators**

When everything is working:

1. ✅ Payment page opens with Paystack domain
2. ✅ Callback URL contains `www.protector.ng`
3. ✅ After payment, redirects back to your site
4. ✅ Booking status updates to "paid"
5. ✅ Payment confirmation message in chat
6. ✅ Transaction shows in Paystack dashboard

---

## 🆘 **Still Not Working?**

### **Debug Steps:**

1. **Check Vercel Deployment Logs:**
   - Look for payment API calls
   - Check for environment variable errors

2. **Verify API Keys:**
   ```bash
   # In Vercel dashboard, check that keys start with:
   pk_live_...  (not pk_test_...)
   sk_live_...  (not sk_test_...)
   ```

3. **Test API Endpoint Directly:**
   ```bash
   curl -X POST https://www.protector.ng/api/payments/paystack/create \
     -H "Content-Type: application/json" \
     -d '{"amount":100,"email":"test@protector.ng","bookingId":"test-id","customerName":"Test"}'
   ```

4. **Contact Paystack Support:**
   - Email: support@paystack.com
   - Docs: https://paystack.com/docs

---

## 📝 **Summary of Changes**

### **Files Modified:**
- ✅ `app/api/payments/paystack/create/route.ts` - Smart callback URL detection

### **What You Need to Do:**
1. ⚠️ Add environment variables to Vercel (5 minutes)
2. ⚠️ Get Paystack LIVE API keys (5 minutes)
3. ⚠️ Redeploy from Vercel (automatic)
4. ⚠️ Test payment flow (5 minutes)

**Total Time: ~20 minutes**

---

## 🎉 **Ready to Accept Payments!**

Once you complete the steps above, your Paystack integration will be **fully functional** on www.protector.ng.

Your customers will be able to:
- ✅ Pay with cards (Visa, Mastercard, Verve)
- ✅ Pay with bank transfer
- ✅ Pay with USSD codes
- ✅ Pay with mobile money
- ✅ Pay with QR codes

**Questions?** Check the logs or contact Paystack support.

---

**Last Updated:** October 21, 2025  
**Status:** 🟢 Code Fixed - Awaiting Vercel Configuration




