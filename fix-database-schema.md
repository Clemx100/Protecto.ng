# Fix Database Schema - Missing profile_completed Column

## Issue
The error "Could not find the 'profile_completed' column of 'profiles' in the schema cache" indicates that the `profile_completed` column is missing from the profiles table.

## Solution
Run the following SQL in your Supabase SQL Editor:

### Step 1: Add the Missing Column
```sql
-- Add the profile_completed column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
```

### Step 2: Update Existing Profiles
```sql
-- Mark existing profiles as completed if they have all required fields
UPDATE profiles 
SET profile_completed = TRUE 
WHERE first_name IS NOT NULL 
  AND last_name IS NOT NULL 
  AND phone IS NOT NULL 
  AND address IS NOT NULL 
  AND emergency_contact IS NOT NULL 
  AND emergency_phone IS NOT NULL;
```

### Step 3: Verify the Column
```sql
-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'profile_completed';
```

## How to Execute
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL commands above
4. Execute them one by one
5. Verify the column exists

## Expected Result
After running these commands, the profile completion form should work without the schema cache error.

