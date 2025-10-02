# Quick Reference: Convert Test User to Real User

## ✅ Current Status

A test user has already been successfully converted to:
- **Name**: Stephen Iwewezinem
- **Email**: stephen.iwewezinem@protector.ng
- **Phone**: +234 813 107 4911
- **Status**: Verified and active
- **Bookings**: 5 bookings preserved

## 🚀 Quick Start - Convert Another User

### Option 1: JavaScript Script (Recommended)

1. **Edit the configuration** in `convert-test-to-real-user.js`:
   ```javascript
   const USER_CONFIG = {
     userId: 'YOUR-USER-UUID',
     firstName: 'John',
     lastName: 'Doe',
     email: 'john@example.com',
     phone: '+2348012345678',
     // ... other fields
   };
   ```

2. **Run the script**:
   ```bash
   node convert-test-to-real-user.js
   ```

3. **Verify the conversion**:
   ```bash
   node verify-conversion.js
   ```

### Option 2: SQL Script

1. **Open Supabase SQL Editor**
2. **Open** `scripts/convert-test-user.sql`
3. **Replace** all instances of `4d2535f4-e7c7-4e06-b78a-469f68cc96be` with your user's UUID
4. **Update** the user information fields
5. **Run** each section step by step

### Option 3: Quick SQL Query

```sql
-- Update the profile
UPDATE profiles
SET 
  first_name = 'FirstName',
  last_name = 'LastName',
  email = 'email@example.com',
  phone = '+2348012345678',
  is_verified = true,
  is_active = true,
  credentials_completed = true,
  updated_at = NOW()
WHERE id = 'USER-UUID-HERE';
```

## 📋 Find User ID

### Method 1: Supabase Dashboard
1. Go to Table Editor → `profiles`
2. Search for the test user
3. Copy the `id` field

### Method 2: SQL Query
```sql
SELECT id, first_name, last_name, email 
FROM profiles 
WHERE first_name LIKE '%Test%' OR email LIKE '%test%';
```

## 🔍 Verify Conversion

Check if the conversion worked:

```bash
node verify-conversion.js
```

Or via SQL:
```sql
SELECT 
  p.id,
  p.first_name || ' ' || p.last_name as name,
  p.email,
  p.phone,
  p.is_verified,
  COUNT(b.id) as total_bookings
FROM profiles p
LEFT JOIN bookings b ON p.id = b.client_id
WHERE p.id = 'USER-UUID'
GROUP BY p.id, p.first_name, p.last_name, p.email, p.phone, p.is_verified;
```

## 📁 Files Created

1. **`convert-test-to-real-user.js`** - Main conversion script with full verification
2. **`scripts/convert-test-user.sql`** - SQL-only conversion script
3. **`CONVERT_TEST_USER_GUIDE.md`** - Comprehensive guide with troubleshooting
4. **`QUICK_USER_CONVERSION.md`** - This quick reference

## ⚠️ Important Notes

- **Backup first**: Always backup before converting
- **Verify user ID**: Double-check you have the correct UUID
- **Test after**: Verify login and booking display work correctly
- **Bookings preserved**: All bookings remain linked to the user

## 🔧 Common User Types to Convert

```sql
-- Find all test users
SELECT id, first_name, last_name, email 
FROM profiles 
WHERE 
  first_name ILIKE '%test%' OR 
  last_name ILIKE '%user%' OR 
  email LIKE '%test%@%' OR
  email LIKE '%demo%@%';
```

## 📞 Support

For detailed instructions, see `CONVERT_TEST_USER_GUIDE.md`

