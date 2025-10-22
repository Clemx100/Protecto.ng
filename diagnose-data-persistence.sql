-- ====================================================================
-- DATA PERSISTENCE DIAGNOSTIC SCRIPT
-- ====================================================================
-- This script checks for issues that could cause data to disappear
-- or not be displayed correctly in the client app
-- ====================================================================

-- 1. CHECK RLS POLICIES ON CRITICAL TABLES
-- ============================================================================
\echo '========================================='
\echo '1. CHECKING RLS POLICIES'
\echo '========================================='

-- Check if RLS is enabled on critical tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('bookings', 'profiles', 'messages')
ORDER BY tablename;

\echo ''
\echo 'Current RLS Policies on bookings table:'
SELECT 
    policyname as "Policy Name",
    permissive as "Permissive",
    roles as "Applies To",
    cmd as "Command",
    qual as "USING clause",
    with_check as "WITH CHECK clause"
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY cmd, policyname;

\echo ''
\echo 'Current RLS Policies on profiles table:'
SELECT 
    policyname as "Policy Name",
    permissive as "Permissive",
    roles as "Applies To",
    cmd as "Command"
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 2. CHECK DATA INTEGRITY
-- ============================================================================
\echo ''
\echo '========================================='
\echo '2. CHECKING DATA INTEGRITY'
\echo '========================================='

-- Check for orphaned bookings (bookings with non-existent client_id)
\echo 'Orphaned bookings (client_id not in profiles):'
SELECT COUNT(*) as orphaned_bookings
FROM bookings b
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = b.client_id
);

-- Check for bookings with NULL critical fields
\echo ''
\echo 'Bookings with NULL critical fields:'
SELECT 
    COUNT(CASE WHEN client_id IS NULL THEN 1 END) as "NULL client_id",
    COUNT(CASE WHEN status IS NULL THEN 1 END) as "NULL status",
    COUNT(CASE WHEN service_type IS NULL THEN 1 END) as "NULL service_type",
    COUNT(CASE WHEN total_price IS NULL THEN 1 END) as "NULL total_price"
FROM bookings;

-- Check for profiles with NULL critical fields
\echo ''
\echo 'Profiles with NULL or default critical fields:'
SELECT 
    COUNT(CASE WHEN email IS NULL THEN 1 END) as "NULL email",
    COUNT(CASE WHEN first_name IS NULL OR first_name = 'User' THEN 1 END) as "NULL or default first_name",
    COUNT(CASE WHEN role IS NULL THEN 1 END) as "NULL role"
FROM profiles;

-- 3. CHECK DATA CONSISTENCY
-- ============================================================================
\echo ''
\echo '========================================='
\echo '3. CHECKING DATA CONSISTENCY'
\echo '========================================='

-- Check for recent bookings per status
\echo 'Booking count by status (last 30 days):'
SELECT 
    status,
    COUNT(*) as count,
    MAX(created_at) as latest_booking
FROM bookings
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY status
ORDER BY count DESC;

-- Check for profiles with bookings
\echo ''
\echo 'Profile stats:'
SELECT 
    COUNT(DISTINCT p.id) as total_profiles,
    COUNT(DISTINCT CASE WHEN p.role = 'client' THEN p.id END) as client_profiles,
    COUNT(DISTINCT CASE WHEN p.role = 'operator' THEN p.id END) as operator_profiles,
    COUNT(DISTINCT b.client_id) as profiles_with_bookings
FROM profiles p
LEFT JOIN bookings b ON p.id = b.client_id;

-- 4. CHECK FOR COMMON ISSUES
-- ============================================================================
\echo ''
\echo '========================================='
\echo '4. CHECKING FOR COMMON ISSUES'
\echo '========================================='

-- Check for duplicate profiles (same email)
\echo 'Duplicate email addresses in profiles:'
SELECT 
    email,
    COUNT(*) as count,
    string_agg(id::text, ', ') as profile_ids
FROM profiles
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- Check for bookings with inconsistent timestamps
\echo ''
\echo 'Bookings with inconsistent timestamps:'
SELECT COUNT(*) as count
FROM bookings
WHERE updated_at < created_at;

-- Check for very old 'pending' bookings (likely stale)
\echo ''
\echo 'Stale pending bookings (older than 7 days):'
SELECT 
    id,
    client_id,
    status,
    created_at,
    NOW() - created_at as age
FROM bookings
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- 5. CHECK INDEXES AND PERFORMANCE
-- ============================================================================
\echo ''
\echo '========================================='
\echo '5. CHECKING INDEXES'
\echo '========================================='

-- Check if critical indexes exist
\echo 'Indexes on bookings table:'
SELECT 
    indexname as "Index Name",
    indexdef as "Definition"
FROM pg_indexes
WHERE tablename = 'bookings'
AND schemaname = 'public'
ORDER BY indexname;

\echo ''
\echo 'Indexes on profiles table:'
SELECT 
    indexname as "Index Name",
    indexdef as "Definition"
FROM pg_indexes
WHERE tablename = 'profiles'
AND schemaname = 'public'
ORDER BY indexname;

-- 6. CHECK FOR MISSING FOREIGN KEY CONSTRAINTS
-- ============================================================================
\echo ''
\echo '========================================='
\echo '6. CHECKING FOREIGN KEY CONSTRAINTS'
\echo '========================================='

SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('bookings', 'messages')
ORDER BY tc.table_name, kcu.column_name;

-- 7. RECOMMEND FIXES
-- ============================================================================
\echo ''
\echo '========================================='
\echo '7. RECOMMENDED FIXES (if needed)'
\echo '========================================='

\echo 'To fix orphaned bookings (if any exist), run:'
\echo '-- DELETE FROM bookings WHERE client_id NOT IN (SELECT id FROM profiles);'
\echo ''
\echo 'To fix stale pending bookings (if any exist), run:'
\echo '-- UPDATE bookings SET status = ''cancelled'', updated_at = NOW() WHERE status = ''pending'' AND created_at < NOW() - INTERVAL ''7 days'';'
\echo ''
\echo 'To ensure proper RLS policies, run the COMPLETE_FIX_ALL_ISSUES.sql script'
\echo ''
\echo '========================================='
\echo 'DIAGNOSTIC COMPLETE'
\echo '========================================='

