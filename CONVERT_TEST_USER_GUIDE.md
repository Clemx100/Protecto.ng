# Convert Test User to Real User Guide

This guide explains how to convert a test user (with dummy/test data) to a real user with actual information in your Protector.ng application.

## Why Convert Test Users?

During development and testing, you may have created users with test data like:
- Name: "Test User", "Demo User", "John Doe"
- Email: "test@example.com"
- Phone: "1234567890"

When moving to production or when a real user signs up, you need to convert these test profiles to real user data.

## What Gets Updated?

The conversion process updates:
1. **Profile Information**
   - First name and last name
   - Email address
   - Phone number
   - Physical address
   - Emergency contact details

2. **Verification Status**
   - `is_verified` - marks user as verified
   - `is_active` - activates the account
   - `credentials_completed` - marks profile as complete

3. **Associated Data**
   - All bookings remain linked to the user
   - Booking history is preserved
   - Payment records remain intact

## How to Use

### Step 1: Find the User ID

First, identify the test user's ID from Supabase:

1. Go to your Supabase Dashboard
2. Navigate to **Table Editor** > **profiles**
3. Find the test user row
4. Copy the `id` (UUID format)

Alternatively, query directly:
```sql
SELECT id, first_name, last_name, email, phone 
FROM profiles 
WHERE first_name LIKE '%Test%' OR email LIKE '%test%';
```

### Step 2: Configure the Conversion Script

Open `convert-test-to-real-user.js` and update the `USER_CONFIG` object:

```javascript
const USER_CONFIG = {
  // The user ID to convert
  userId: 'YOUR-USER-UUID-HERE',
  
  // New real user information
  firstName: 'Stephen',
  lastName: 'Iwewezinem',
  email: 'stephen@example.com',
  phone: '+2348012345678',
  address: 'Lagos, Nigeria',
  emergencyContact: 'Jane Doe',
  emergencyPhone: '+2348087654321',
  
  // Verification status
  isVerified: true,
  isActive: true,
  credentialsCompleted: true
};
```

### Step 3: Run the Conversion

Execute the script:

```bash
node convert-test-to-real-user.js
```

### Step 4: Verify the Conversion

The script will automatically verify:
- ✅ Profile was updated successfully
- ✅ Bookings are still linked to the user
- ✅ Operator dashboard shows correct information
- ✅ Auth email status

You can also run the verification script separately:

```bash
node verify-conversion.js
```

## Expected Output

```
🔄 Converting Test User to Real User...

1. 📋 Fetching current user profile...
   Current Profile: { name: 'Test User', email: 'test@example.com', ... }

2. ✏️  Updating profile with real information...
   ✅ Profile updated successfully!
   New Profile: { name: 'Stephen Iwewezinem', email: 'stephen@example.com', ... }

3. 📚 Checking associated bookings...
   Found 5 bookings associated with this user

4. 📧 Checking auth email...
   ✅ Auth email matches profile email

5. 🎯 Verifying operator dashboard view...
   ✅ Operator dashboard will show:
   1. BK-001 - Stephen Iwewezinem - pending

🎉 CONVERSION COMPLETE!
```

## Manual Conversion (Alternative Method)

If you prefer to convert manually through SQL:

```sql
-- Update profile information
UPDATE profiles
SET 
  first_name = 'Stephen',
  last_name = 'Iwewezinem',
  email = 'stephen@realemail.com',
  phone = '+2348012345678',
  address = 'Lagos, Nigeria',
  emergency_contact = 'Jane Doe',
  emergency_phone = '+2348087654321',
  is_verified = true,
  is_active = true,
  credentials_completed = true,
  updated_at = NOW()
WHERE id = 'YOUR-USER-UUID-HERE';

-- Verify the update
SELECT 
  id, 
  first_name, 
  last_name, 
  email, 
  phone, 
  is_verified,
  credentials_completed
FROM profiles 
WHERE id = 'YOUR-USER-UUID-HERE';
```

## Update Auth Email (If Needed)

If you also need to update the authentication email:

1. Go to Supabase Dashboard
2. Navigate to **Authentication** > **Users**
3. Find the user by ID
4. Click **Edit User**
5. Update the email address
6. Save changes

## Important Notes

### ⚠️ Before Conversion

- **Backup your data** - Always backup before making changes
- **Verify user ID** - Double-check you have the correct user ID
- **Check bookings** - Ensure the user's bookings are what you expect

### ✅ After Conversion

- **Test login** - Verify the user can log in with new credentials
- **Check dashboard** - Confirm operator dashboard shows correct info
- **Verify bookings** - Ensure all bookings still display correctly
- **Test functionality** - Create a test booking to confirm everything works

## Common Issues

### Issue: "User not found"
**Solution**: Verify the user ID is correct in the `USER_CONFIG`

### Issue: "Error updating profile"
**Solution**: Check that all required fields are provided and the service role key is correct

### Issue: "Auth email doesn't match"
**Solution**: Manually update the auth email through Supabase Dashboard

### Issue: "Bookings not showing"
**Solution**: This may indicate a database relationship issue. Check foreign key constraints.

## Batch Conversion

To convert multiple test users at once, modify the script to loop through an array:

```javascript
const USERS_TO_CONVERT = [
  {
    userId: 'uuid-1',
    firstName: 'John',
    lastName: 'Smith',
    // ... other fields
  },
  {
    userId: 'uuid-2',
    firstName: 'Jane',
    lastName: 'Doe',
    // ... other fields
  }
];

for (const userConfig of USERS_TO_CONVERT) {
  await convertUser(userConfig);
}
```

## Security Best Practices

1. **Never commit service role keys** to version control
2. **Use environment variables** for sensitive data in production
3. **Verify user identity** before converting accounts
4. **Keep audit logs** of all conversions
5. **Notify users** if their profile information changes

## Related Scripts

- `convert-test-to-real-user.js` - Main conversion script
- `verify-conversion.js` - Verify a conversion was successful
- `test-check-users.js` - Check all users in the system
- `scripts/create-test-operator.js` - Create test operators

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your Supabase connection and credentials
3. Check the profiles table schema matches expected structure
4. Review the `DEPLOYMENT_GUIDE.md` and `SETUP.md` for system setup

---

**Last Updated**: October 1, 2025

