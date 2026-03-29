-- Create Super Admin account: stepheniwewezinem@gmail.com / Operator123!
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- Option A: If your auth.users table matches the structure below (self-hosted or older Supabase),
--           the full script creates the user and profile.
-- Option B: If INSERT into auth.users fails (e.g. Supabase Cloud has extra columns),
--           1. Create the user first: Dashboard → Authentication → Users → Add user
--              Email: stepheniwewezinem@gmail.com  Password: Operator123!
--           2. Then run only the "PROFILES" section below (update role to admin).

-- Enable password hashing (required for auth.users insert)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. AUTH.USERS (create login account)
-- =============================================================================
-- If this fails (e.g. "column does not exist"), create the user via Dashboard
-- (Authentication → Add user) then run only section 2.
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'stepheniwewezinem@gmail.com',
    crypt('Operator123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
)
ON CONFLICT (email) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    updated_at = NOW();

-- =============================================================================
-- 2. PROFILES (set role to admin for this user)
-- =============================================================================
-- This creates or updates the profile so this user is an admin.
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    is_verified,
    is_active,
    created_at,
    updated_at
)
SELECT
    u.id,
    'stepheniwewezinem@gmail.com',
    'Stephen',
    'Iwewezinem',
    'admin',
    true,
    true,
    COALESCE(u.created_at, NOW()),
    NOW()
FROM auth.users u
WHERE u.email = 'stepheniwewezinem@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    is_verified = true,
    is_active = true,
    updated_at = NOW();

-- Verify
SELECT id, email, role, first_name, last_name FROM profiles WHERE email = 'stepheniwewezinem@gmail.com';

-- =============================================================================
-- ALTERNATIVE: If you already created the user in Dashboard (Authentication → Add user)
-- Run ONLY this to make that user an admin (replace with the user's email if different):
-- =============================================================================
-- UPDATE profiles
-- SET role = 'admin', updated_at = NOW()
-- WHERE email = 'stepheniwewezinem@gmail.com';
