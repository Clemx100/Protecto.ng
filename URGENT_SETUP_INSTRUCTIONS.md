# 🚨 URGENT: Setup Required - Messages Not Sending

## **Problem:** Invalid Supabase API Keys

Your application cannot send messages because it cannot connect to the Supabase database.

---

## ✅ **SOLUTION: Add Your Supabase Credentials**

### Step 1: Get Your Supabase Keys

1. Go to: **https://supabase.com/dashboard**
2. Select your **Protector.Ng** project
3. Click **Settings** (gear icon) → **API**
4. You'll see:
   - **Project URL**
   - **anon/public key**
   - **service_role key** (click "Reveal" to see it)

### Step 2: Update `.env.local` File

I've created a `.env.local` file for you. **Open it and replace these values:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
```

**Replace:**
- `your_supabase_url_here` → Your actual Project URL
- `your_supabase_anon_key_here` → Your actual anon/public key
- `your_supabase_service_role_key_here` → Your actual service_role key

### Step 3: Restart the Application

After saving `.env.local`:

1. **Stop the dev server:** Press `Ctrl + C` in terminal
2. **Start again:** Run `npm run dev`
3. **Test messages:** Try sending a message

---

## 🔍 **How to Know It's Working**

After adding the keys:
- ✅ No more "Invalid API key" errors in terminal
- ✅ Messages send when you press send button
- ✅ Text clears from input box after sending
- ✅ Messages appear in chat

---

## 📝 **Current Error (from your terminal):**

```
Error fetching messages: {
  message: 'Invalid API key',
  hint: 'Double check your Supabase anon or service_role API key.'
}
```

This error appears because the keys in `.env.local` are placeholders, not real keys.

---

## 🆘 **Need Help Finding Your Keys?**

### Option 1: Run the Helper Script

```bash
node get-supabase-keys.js
```

This script will guide you through getting your keys.

### Option 2: Manual Steps

1. **Login to Supabase:** https://supabase.com/dashboard
2. **Open your project**
3. **Settings → API**
4. **Copy the three values** mentioned above
5. **Paste into `.env.local`**
6. **Save the file**
7. **Restart npm run dev**

---

## ⚠️ **IMPORTANT NOTES**

1. **Never commit `.env.local`** to git (it's in `.gitignore`)
2. **Keep service_role key secret** - it has full database access
3. **Use the same keys** that your Supabase project is configured with
4. **Restart the dev server** after changing environment variables

---

## 🎯 **After You Fix This**

Once you've added the correct Supabase keys:

1. Messages will start working immediately
2. You'll also need to run the SQL migration I created:
   - File: `fix-messages-table-schema.sql`
   - Run in: Supabase Dashboard → SQL Editor
3. This adds the missing `sender_type` column to your database

---

## 📞 **Still Not Working?**

If you add the keys and restart but still see errors:

1. **Check the terminal** for NEW error messages
2. **Verify the keys** are copied correctly (no extra spaces)
3. **Make sure** you're using the correct Supabase project
4. **Check** that your Supabase project is active (not paused)

---

**Once you add the keys, everything will work!** 🚀




