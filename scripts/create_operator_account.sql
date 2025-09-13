-- Create Operator Account Script for Protector.Ng
-- Run this script in your Supabase SQL Editor

-- Step 1: Create the operator user in auth.users (if not exists)
-- Note: You'll need to create this user through Supabase Auth UI first
-- Go to Authentication > Users > Add User in your Supabase dashboard

-- Step 2: Insert operator profile (replace the UUID with the actual user ID from auth.users)
-- You can get the user ID from the Authentication > Users section in Supabase dashboard

-- Example operator profile (replace 'OPERATOR_USER_ID_HERE' with actual UUID)
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    phone,
    is_verified,
    is_active
) VALUES (
    'OPERATOR_USER_ID_HERE', -- Replace with actual user ID from auth.users
    'operator@protector.ng',
    'John',
    'Operator',
    'agent',
    '+234-800-000-0000',
    true,
    true
) ON CONFLICT (id) DO UPDATE SET
    role = 'agent',
    is_verified = true,
    is_active = true;

-- Step 3: Create agent profile for the operator
INSERT INTO agents (
    id,
    agent_code,
    license_number,
    qualifications,
    experience_years,
    rating,
    total_jobs,
    is_armed,
    weapon_license,
    background_check_status,
    availability_status
) VALUES (
    'OPERATOR_USER_ID_HERE', -- Same UUID as above
    'OP001',
    'LIC-2024-001',
    ARRAY['Executive Protection', 'Close Protection', 'Security Management'],
    5,
    4.8,
    0,
    true,
    'WL-2024-001',
    'completed',
    'available'
) ON CONFLICT (id) DO UPDATE SET
    agent_code = 'OP001',
    availability_status = 'available';

-- Step 4: Create additional operator accounts (optional)
-- You can duplicate this pattern for more operators

-- Operator 2
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    phone,
    is_verified,
    is_active
) VALUES (
    'OPERATOR_USER_ID_2', -- Replace with actual user ID
    'operator2@protector.ng',
    'Sarah',
    'Manager',
    'agent',
    '+234-800-000-0001',
    true,
    true
) ON CONFLICT (id) DO UPDATE SET
    role = 'agent',
    is_verified = true,
    is_active = true;

INSERT INTO agents (
    id,
    agent_code,
    license_number,
    qualifications,
    experience_years,
    rating,
    total_jobs,
    is_armed,
    weapon_license,
    background_check_status,
    availability_status
) VALUES (
    'OPERATOR_USER_ID_2', -- Same UUID as above
    'OP002',
    'LIC-2024-002',
    ARRAY['Security Management', 'Risk Assessment', 'Team Leadership'],
    8,
    4.9,
    0,
    true,
    'WL-2024-002',
    'completed',
    'available'
) ON CONFLICT (id) DO UPDATE SET
    agent_code = 'OP002',
    availability_status = 'available';

-- Step 5: Create admin account (optional)
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    phone,
    is_verified,
    is_active
) VALUES (
    'ADMIN_USER_ID_HERE', -- Replace with actual user ID
    'admin@protector.ng',
    'Admin',
    'User',
    'admin',
    '+234-800-000-0002',
    true,
    true
) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_verified = true,
    is_active = true;

-- Verify the accounts were created
SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.phone,
    p.is_verified,
    p.is_active,
    a.agent_code,
    a.availability_status
FROM profiles p
LEFT JOIN agents a ON p.id = a.id
WHERE p.role IN ('agent', 'admin')
ORDER BY p.created_at DESC;
