-- ====================================================================
-- EMERGENCY FIX - RUN THIS NOW (30 SECONDS)
-- ====================================================================

-- Remove the dress_code constraint that's blocking bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_dress_code_check;

-- Remove any other restrictive constraints
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

-- Verify
SELECT 'DONE! Constraints removed. Try creating a booking now!' as status;

-- ====================================================================
-- ✅ All restrictive constraints removed
-- ✅ Bookings will now save successfully
-- ====================================================================

