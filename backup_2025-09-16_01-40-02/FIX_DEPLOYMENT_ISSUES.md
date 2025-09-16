# Fix Deployment Issues - Action Plan

## 🚨 Current Issues Identified

1. **Main App API Error (500)**: `/api/send-to-operator` endpoint failing
2. **Operator API Error**: Not returning JSON response
3. **Real-time Communication**: Not working between apps

## 🔧 Step 1: Fix Main App API

### Issue: 500 Error on `/api/send-to-operator`

**Root Cause**: Missing environment variables or Supabase connection issues

**Fix Steps:**

1. **Check Environment Variables in Vercel:**
   - Go to: https://vercel.com/dashboard → protector-ng → Settings → Environment Variables
   - Ensure these are set:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
     OPERATOR_DASHBOARD_URL=https://protector-ng-lxtd.vercel.app
     NODE_ENV=production
     ```

2. **Update API Route** (if needed):
   - The `/api/send-to-operator` route should handle errors gracefully
   - Add proper error logging

## 🔧 Step 2: Fix Operator API

### Issue: Operator API returning HTML instead of JSON

**Root Cause**: API route not properly configured or missing dependencies

**Fix Steps:**

1. **Check Operator App Environment Variables:**
   - Go to: https://vercel.com/dashboard → protector-ng-lxtd → Settings → Environment Variables
   - Ensure these are set:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
     MAIN_APP_URL=https://protector-ng.vercel.app
     NODE_ENV=production
     ```

2. **Verify API Route Structure:**
   - Check if `/api/realtime/requests/route.ts` exists
   - Ensure proper Next.js 13+ API route structure

## 🔧 Step 3: Set Up Production Supabase

### Critical: Both apps need a real Supabase database

**Steps:**

1. **Create Supabase Project:**
   - Go to: https://supabase.com/dashboard
   - Create new project: `protector-ng-production`
   - Choose region closest to your users
   - Save the project URL and API keys

2. **Run Database Schema:**
   - Use the SQL scripts from `PRODUCTION_SUPABASE_SETUP.md`
   - Create tables: profiles, bookings, messages, services
   - Set up RLS policies
   - Enable real-time features

3. **Update Environment Variables:**
   - Use the SAME Supabase project for both apps
   - Update all environment variables in both Vercel projects

## 🔧 Step 4: Test and Verify

### After fixing the above issues:

1. **Redeploy Both Apps:**
   - Trigger redeployment in Vercel after setting environment variables
   - Wait for deployment to complete

2. **Run Test Script:**
   ```bash
   node test-realtime-communication.js
   ```

3. **Manual Testing:**
   - Visit both app URLs
   - Test booking creation
   - Verify real-time updates

## 🚀 Quick Fix Commands

### 1. Check Current Environment Variables:
```bash
# Check if .env.local exists
ls -la .env.local

# Check Vercel environment variables (requires Vercel CLI)
vercel env ls
```

### 2. Redeploy Apps:
```bash
# Redeploy main app
vercel --prod

# Redeploy operator app (from operator-app directory)
cd operator-app
vercel --prod
```

## 📋 Priority Order

1. **HIGH**: Set up production Supabase database
2. **HIGH**: Configure environment variables in both Vercel projects
3. **MEDIUM**: Redeploy both applications
4. **MEDIUM**: Test real-time communication
5. **LOW**: Monitor and optimize performance

## 🆘 If Issues Persist

1. **Check Vercel Function Logs:**
   - Go to Vercel Dashboard → Functions tab
   - Check for error logs

2. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Logs
   - Check for database errors

3. **Test Locally:**
   - Run `npm run dev` locally
   - Test API endpoints locally first

## 📞 Next Steps

1. **Follow this guide step by step**
2. **Set up production Supabase first** (most critical)
3. **Configure environment variables**
4. **Redeploy both apps**
5. **Test everything works**

---

**Current Status**: Apps deployed but not connected to production database
**Next Action**: Set up production Supabase and configure environment variables
