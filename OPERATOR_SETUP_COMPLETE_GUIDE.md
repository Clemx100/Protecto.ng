# 🎯 **OPERATOR SETUP - COMPLETE GUIDE**

**Date:** October 9, 2025  
**Project:** PROTECTOR.NG LIVE  
**Status:** ✅ **READY TO FINALIZE**

---

## ✅ **WHAT'S BEEN DONE:**

### **1. ✅ Environment Variables Created**
- `.env.local` file created with PROTECTOR.NG LIVE credentials
- All Supabase URLs and keys updated

### **2. ✅ User Account Created**
- **Email:** `iwewezinemstephen@gmail.com`
- **Password:** `Operator123!`
- **User ID:** `03ba6eac-a4fe-4074-b751-10f1276efac8`
- **Status:** ✅ User exists and can login

### **3. ⚠️ Role Update Needed**
- User profile exists but has 'client' role
- Database constraint prevents direct update to 'operator'
- **Solution:** Run SQL script to fix constraint and update role

---

## 🚀 **FINAL STEPS (DO THESE NOW):**

### **Step 1: Fix Database Constraint**

1. Go to your **PROTECTOR.NG LIVE** Supabase dashboard:
   ```
   https://supabase.com/dashboard/project/kifcevffaputepvpjpip
   ```

2. Click on **SQL Editor** in the left sidebar

3. Click **New Query**

4. Copy and paste this SQL script:

```sql
-- Fix the role constraint to allow operator, admin, agent roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('client', 'operator', 'admin', 'agent'));

-- Update user to operator role
UPDATE profiles 
SET role = 'operator', updated_at = NOW()
WHERE email = 'iwewezinemstephen@gmail.com';

-- Verify the update
SELECT id, email, role, first_name, last_name
FROM profiles
WHERE email = 'iwewezinemstephen@gmail.com';
```

5. Click **Run** (or press `Ctrl + Enter`)

6. **Expected Result**: You should see your user with `role = 'operator'`

---

### **Step 2: Restart Development Server**

1. Open your terminal in the project directory

2. Start the server:
   ```powershell
   npm run mobile
   ```

3. Wait for the server to start (should take 15-30 seconds)

4. **Expected Result**: 
   - Server starts on port 3000
   - **NO** errors about `mjdbhusnplveeaveeovd.supabase.co` (old URL)
   - Should see `kifcevffaputepvpjpip.supabase.co` (new URL) in logs

---

### **Step 3: Test Operator Login**

1. Go to the operator dashboard:
   ```
   http://localhost:3000/operator
   ```

2. Login with:
   - **Email:** `iwewezinemstephen@gmail.com`
   - **Password:** `Operator123!`

3. **Expected Result**: 
   - ✅ Login successful
   - ✅ Operator dashboard loads
   - ✅ No "Access denied" errors

---

## 📊 **VERIFICATION CHECKLIST:**

After completing the steps above, verify:

### **✅ Environment:**
- [ ] `.env.local` file exists in project root
- [ ] Server starts without old Supabase URL errors
- [ ] Port 3000 is accessible

### **✅ Operator Account:**
- [ ] User `iwewezinemstephen@gmail.com` exists
- [ ] User has `operator` role in database
- [ ] Can login to operator dashboard
- [ ] Dashboard shows "no bookings" (clean database)

### **✅ Client App:**
- [ ] Can access `http://localhost:3000`
- [ ] App loads correctly
- [ ] Can login/register new users

---

## 🎉 **AFTER SUCCESSFUL SETUP:**

### **Your PROTECTOR.NG LIVE Setup:**

✅ **Clean Database**
- New PROTECTOR.NG LIVE project
- No test data confusion
- Ready for real production data

✅ **Operator Account Ready**
- Email: `iwewezinemstephen@gmail.com`
- Password: `Operator123!`
- Role: operator (after SQL script)

✅ **All Fixes Applied**
- Chat summary persists
- Real-time messaging works
- Booking flow optimized
- Mobile access enabled

---

## 📝 **IMPORTANT FILES CREATED:**

1. **`.env.local`** - Environment variables with PROTECTOR.NG LIVE credentials
2. **`setup-protector-ng-live.js`** - Setup script (already run)
3. **`fix-operator-role-constraint.sql`** - SQL to fix role constraint (run in Supabase)
4. **This guide** - Complete instructions

---

## 🚨 **IF YOU ENCOUNTER ISSUES:**

### **Issue: Still seeing old Supabase URL errors**
**Solution:**
```powershell
# Stop all Node processes
taskkill /F /IM node.exe

# Clear Next.js cache
Remove-Item -Recurse -Force .next

# Restart server
npm run mobile
```

### **Issue: Can't login as operator**
**Solution:**
- Verify you ran the SQL script in Step 1
- Check that the profiles table was updated
- Run this query to verify:
  ```sql
  SELECT id, email, role FROM profiles WHERE email = 'iwewezinemstephen@gmail.com';
  ```
- Should show `role = 'operator'`

### **Issue: .env.local not being read**
**Solution:**
- Verify file exists in project root (same level as `package.json`)
- Restart the development server
- Check file permissions

---

## 🎯 **QUICK START COMMANDS:**

```powershell
# 1. Check if .env.local exists
Get-Content .env.local

# 2. Start development server
npm run mobile

# 3. Check server is running
netstat -ano | findstr :3000

# 4. Open operator dashboard
start http://localhost:3000/operator
```

---

## ✅ **SUCCESS CRITERIA:**

Your setup is complete when:

1. ✅ Server starts on port 3000 with NO old URL errors
2. ✅ Can login to `http://localhost:3000/operator` as `iwewezinemstephen@gmail.com`
3. ✅ Operator dashboard loads and shows empty state (no bookings yet)
4. ✅ Can create bookings from client app and see them in operator dashboard

---

**🚀 YOU'RE ALMOST THERE! Just run the SQL script in Step 1 and restart the server!**

**Dashboard:** https://supabase.com/dashboard/project/kifcevffaputepvpjpip  
**SQL Editor:** https://supabase.com/dashboard/project/kifcevffaputepvpjpip/sql/new
