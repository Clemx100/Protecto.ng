-- Create Operator Account Script for Protector.Ng
-- Ready to run with your User ID: b7dfc1b4-5fd8-4d01-b157-e1d057900241

-- Step 1: Insert operator profile
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
    'b7dfc1b4-5fd8-4d01-b157-e1d057900241',
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

-- Step 2: Create agent profile for the operator
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
    'b7dfc1b4-5fd8-4d01-b157-e1d057900241',
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

-- Step 3: Verify the account was created
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
WHERE p.id = 'b7dfc1b4-5fd8-4d01-b157-e1d057900241';
