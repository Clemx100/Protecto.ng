# How to Create a Real Operator Account

## 🎯 Goal
Create a real operator account that can access the operator dashboard and manage client requests.

## 📋 Step-by-Step Instructions

### Step 1: Create User in Supabase Auth
1. Go to your Supabase dashboard
2. Navigate to **Authentication** > **Users**
3. Click **"Add User"**
4. Fill in the details:
   - **Email**: `operator@protector.ng`
   - **Password**: Choose a strong password
   - **Email Confirm**: Check this box
   - **User Metadata**: Add `{"role": "agent"}` in the JSON field
5. Click **"Create User"**
6. **Copy the User ID** (you'll need this for the next step)

### Step 2: Run the SQL Script
1. Go to **SQL Editor** in your Supabase dashboard
2. Open the `scripts/create_operator_account.sql` file
3. Replace `'OPERATOR_USER_ID_HERE'` with the actual User ID from Step 1
4. Run the script

### Step 3: Test the Operator Account
1. Go to your app: `https://protector-ng.vercel.app`
2. Click **"Login"**
3. Use the operator credentials:
   - **Email**: `operator@protector.ng`
   - **Password**: (the password you set)
4. You should now see the **"Operator"** tab in the bottom navigation
5. Click on it to access the operator dashboard

## 🔧 Alternative: Quick Test Method

If you want to test immediately without creating a real account, you can temporarily modify the app:

1. The app is currently set to `userRole = "agent"` for testing
2. This allows you to see the operator dashboard immediately
3. You can make booking requests and see them in the operator view

## 📊 What You'll See in Operator Dashboard

- **All booking requests** from clients
- **Request details** (client info, service type, timing, etc.)
- **Action buttons** to Accept, Reject, or Deploy bookings
- **Status tracking** for each request
- **Chat functionality** for client communication

## 🚨 Important Notes

- **Real accounts** require proper Supabase setup
- **Test accounts** work with mock data
- **Production** should use real Supabase credentials
- **Security** is handled by Supabase RLS policies

## 🔍 Troubleshooting

If the operator dashboard doesn't appear:
1. Check that the user role is set to "agent" in the database
2. Verify the user is properly authenticated
3. Check the browser console for any errors
4. Ensure the app is using real Supabase credentials (not mock data)

## 📞 Next Steps

Once you have a working operator account:
1. Test making a client request
2. Switch to operator view to see the request
3. Test accepting/rejecting bookings
4. Set up real Supabase environment variables for production
