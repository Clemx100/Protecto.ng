-- Create Operator Account Script for Protector.Ng (Fixed Version)
-- Based on your actual database schema

-- Step 1: Insert operator profile (using only existing columns)
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
    p.full_name,
    p.role,
    p.phone,
    a.agent_code,
    a.availability_status
FROM profiles p
LEFT JOIN agents a ON p.id = a.id
WHERE p.id = 'b7dfc1b4-5fd8-4d01-b157-e1d057900241';
