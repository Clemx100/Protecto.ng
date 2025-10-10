# 🔐 How to Access the Operator Dashboard

**Quick Guide for Operators**

---

## 🌐 **OPERATOR DASHBOARD URL:**

### **On Your Computer:**
```
http://localhost:3000/operator
```

### **On Mobile (Same WiFi):**
```
http://192.168.1.142:3000/operator
```

---

## 🔑 **LOGIN REQUIREMENTS:**

To access the operator dashboard, you need:

1. ✅ **An account in the system**
2. ✅ **Operator, Admin, or Agent role** (NOT client role)

---

## 📋 **STEP-BY-STEP ACCESS:**

### **Step 1: Open the Operator URL**

**On Desktop:**
- Open your browser
- Go to: `http://localhost:3000/operator`

**On Mobile:**
- Open Safari (iPhone) or Chrome (Android)
- Go to: `http://192.168.1.142:3000/operator`

### **Step 2: You'll see the Operator Login Page**

The system will show a login screen specifically for operators.

### **Step 3: Login with Operator Credentials**

Enter your:
- Email address
- Password

### **Step 4: Access Granted!**

If you have the correct role, you'll see the operator dashboard with:
- 📊 All bookings
- 💬 Chat with clients
- 📄 Invoice creation
- ✅ Booking management

---

## ⚠️ **IMPORTANT SECURITY NOTES:**

### **WHO CAN ACCESS:**
- ✅ **operator** role - Full access
- ✅ **admin** role - Full access
- ✅ **agent** role - Full access

### **WHO CANNOT ACCESS:**
- ❌ **client** role - Will be redirected with error
- ❌ **Not logged in** - Will see login page

### **Security Features:**
- 🔒 4 layers of security protection
- 🔒 JWT token validation
- 🔒 Role verification from database
- 🔒 Automatic redirect if unauthorized

---

## 👤 **HOW TO CREATE AN OPERATOR ACCOUNT:**

### **Method 1: Database Direct (Recommended)**

If you already have a user account but need to make it an operator:

1. **Go to your Supabase Dashboard:**
   - URL: `https://mjdbhusnplveeaveeovd.supabase.co`
   - Login to your Supabase account

2. **Navigate to Table Editor → profiles**

3. **Find your user** by email

4. **Edit the `role` column:**
   - Change from: `client`
   - Change to: `operator` (or `admin` or `agent`)

5. **Save the changes**

6. **Done!** You can now access the operator dashboard

### **Method 2: Using SQL Editor**

In Supabase SQL Editor, run:

```sql
-- Update a user's role to operator
UPDATE profiles 
SET role = 'operator' 
WHERE email = 'your-email@example.com';

-- Verify the change
SELECT id, email, role, first_name, last_name 
FROM profiles 
WHERE email = 'your-email@example.com';
```

### **Method 3: Create New Operator Account**

1. **Register a new account** at `http://localhost:3000`

2. **After registration, go to Supabase**

3. **Update the role** in the profiles table as shown above

---

## 🧪 **TESTING YOUR ACCESS:**

### **Test 1: Try to Access as Client**
1. Login with a client account
2. Try to go to `/operator`
3. **Expected:** Redirected to home with "Access denied" message
4. **Status:** ✅ Security working!

### **Test 2: Access as Operator**
1. Login with an operator account
2. Go to `/operator`
3. **Expected:** Dashboard loads successfully
4. **Status:** ✅ Access granted!

---

## 🎛️ **OPERATOR DASHBOARD FEATURES:**

Once logged in, you can:

### **View All Bookings:**
- 📊 See all client bookings
- 🔍 Search by client name
- 📂 Filter by status (pending, accepted, etc.)

### **Chat with Clients:**
- 💬 Send messages to clients
- 📨 Receive client messages in real-time
- 📄 Send invoices through chat

### **Manage Bookings:**
- ✅ Accept booking requests
- ❌ Reject bookings
- 📝 Update booking status
- 🚗 Assign vehicles/agents

### **Create Invoices:**
- 💰 Calculate service costs
- 💵 Support both NGN and USD
- 📤 Send to clients for approval

---

## 🔧 **TROUBLESHOOTING:**

### **"I keep getting redirected to home"**

**Solution:** Your account doesn't have operator role.

Fix:
1. Go to Supabase → profiles table
2. Find your user by email
3. Change `role` to `operator`
4. Logout and login again

### **"Login page keeps showing"**

**Solution:** You need to login first.

Fix:
1. Enter your email and password
2. Make sure you have an account
3. Check your role in Supabase

### **"Access denied message appears"**

**Solution:** You're logged in but don't have operator role.

Fix:
1. Go to Supabase
2. Update your role in profiles table
3. Logout and login again

### **"Page won't load at all"**

**Solution:** Server might not be running.

Fix:
```bash
# Make sure server is running
npm run dev
```

---

## 📱 **MOBILE OPERATOR ACCESS:**

Operators can also access the dashboard from mobile:

1. **Connect to same WiFi** as the server
2. **Open mobile browser**
3. **Go to:** `http://192.168.1.142:3000/operator`
4. **Login** with operator credentials
5. **Done!** Mobile operator dashboard

---

## 🚀 **QUICK COMMANDS:**

### **Start the Server:**
```bash
npm run dev
```

### **Start for Mobile Access:**
```bash
npm run mobile
```

### **Check Server Status:**
```bash
# Server should show:
# ▲ Next.js 14.2.32
# - Local:        http://localhost:3000
```

---

## 📊 **ACCESS URL SUMMARY:**

| Location | URL | Notes |
|----------|-----|-------|
| **Desktop - Operator** | `http://localhost:3000/operator` | Main operator URL |
| **Desktop - Client** | `http://localhost:3000` | Client app |
| **Mobile - Operator** | `http://192.168.1.142:3000/operator` | Same WiFi required |
| **Mobile - Client** | `http://192.168.1.142:3000` | Same WiFi required |

---

## ✅ **VERIFICATION CHECKLIST:**

Before accessing operator dashboard:

- [ ] Server is running (`npm run dev`)
- [ ] You have a registered account
- [ ] Your account has operator/admin/agent role (check Supabase)
- [ ] You're using the correct URL (`/operator`)
- [ ] Browser is up to date

Once logged in, you should see:

- [ ] List of all bookings
- [ ] Search and filter options
- [ ] Chat interface for each booking
- [ ] Invoice creation buttons
- [ ] Booking status management

---

## 🎉 **QUICK START EXAMPLE:**

```bash
# 1. Start the server
npm run dev

# 2. Open browser
# Go to: http://localhost:3000/operator

# 3. Login with operator credentials
# Email: your-operator-email@example.com
# Password: your-password

# 4. Done! You're now in the operator dashboard
```

---

## 📞 **NEED HELP CREATING AN OPERATOR ACCOUNT?**

If you need to create your first operator account:

1. **Register at:** `http://localhost:3000`
2. **Then run this in Supabase SQL Editor:**

```sql
-- Make your account an operator
UPDATE profiles 
SET role = 'operator' 
WHERE email = 'YOUR_EMAIL_HERE';

-- Verify it worked
SELECT email, role FROM profiles WHERE email = 'YOUR_EMAIL_HERE';
```

3. **Logout and login again**
4. **Go to:** `http://localhost:3000/operator`
5. **Success!** You're now an operator

---

## 🔐 **SECURITY REMINDER:**

The operator dashboard is **fully secured** with:
- ✅ Middleware protection
- ✅ Page-level authentication
- ✅ API endpoint security
- ✅ JWT token validation

**Only authorized operators can access!** 🛡️

---

**Ready to manage bookings?** Go to: `http://localhost:3000/operator` 🚀

