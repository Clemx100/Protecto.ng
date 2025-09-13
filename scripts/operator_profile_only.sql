-- Create Operator Profile Only (Minimal Version)
-- This will work with your current database schema

-- Step 1: Insert operator profile
INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    phone
) VALUES (
    'b7dfc1b4-5fd8-4d01-b157-e1d057900241',
    'operator@protector.ng',
    'John Operator',
    'agent',
    '+234-800-000-0000'
) ON CONFLICT (id) DO UPDATE SET
    role = 'agent',
    full_name = 'John Operator',
    phone = '+234-800-000-0000';

-- Step 2: Verify the profile was created
SELECT 
    id,
    email,
    full_name,
    role,
    phone
FROM profiles 
WHERE id = 'b7dfc1b4-5fd8-4d01-b157-e1d057900241';
