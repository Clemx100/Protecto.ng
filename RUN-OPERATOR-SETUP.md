# 🎯 Final Step: Run the Operator Setup Script

## What This Does:
This script will automatically create:
- ✅ 2 operator accounts (people who respond to protection requests)
- ✅ 1 admin account (for managing the system)

## How to Run It:

### Option 1: Using PowerShell (Recommended for Windows)

1. **Open PowerShell**:
   - Press `Windows Key`
   - Type "PowerShell"
   - Click "Windows PowerShell" (the blue one)

2. **Navigate to your project**:
   - Copy and paste this command, then press Enter:
   ```powershell
   cd C:\Users\Mx01\Desktop\Protector.Ng
   ```

3. **Run the script**:
   - Copy and paste this command, then press Enter:
   ```powershell
   node scripts/create-operator-accounts.js
   ```

4. **Wait for it to finish** (should take 5-10 seconds)

---

## ✅ What You Should See:

If everything works, you'll see messages like:
```
🚀 Protector.Ng - Operator Account Creation Script
============================================================
📝 Creating operator account: operator@protector.ng
✅ Auth user created: [some-id]
✅ Profile created/updated
✅ Agent profile created/updated
...
✅ All accounts created successfully!
```

---

## 🎉 Success! What Now?

After the script runs successfully, you'll have these accounts:

### Operator Account 1:
- **Email**: operator@protector.ng
- **Password**: OperatorPass123!
- **Role**: Agent/Operator

### Operator Account 2:
- **Email**: operator2@protector.ng
- **Password**: OperatorPass456!
- **Role**: Agent/Operator

### Admin Account:
- **Email**: admin@protector.ng
- **Password**: AdminPass123!
- **Role**: Administrator

⚠️ **IMPORTANT**: Change these passwords after first login!

---

## 🔧 If You Get Errors:

### Error: "SUPABASE_SERVICE_ROLE_KEY is not set"
- ❌ You didn't complete Step 5 correctly
- ✅ Go back and make sure you pasted your service role key in .env.local

### Error: "Cannot find module '@supabase/supabase-js'"
- ❌ Missing dependencies
- ✅ Run: `npm install` first

### Error: "User already registered"
- ✅ This is actually OK! The script will update existing users
- Just make sure you see "✅ Found existing user" messages

---

## 📞 Need Help?

If you're stuck, make sure:
1. ✅ You copied the correct service_role key (not the anon key)
2. ✅ You saved the .env.local file
3. ✅ You're in the correct folder (C:\Users\Mx01\Desktop\Protector.Ng)
4. ✅ You have internet connection (script needs to connect to Supabase)


