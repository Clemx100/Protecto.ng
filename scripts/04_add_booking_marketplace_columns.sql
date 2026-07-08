-- Add optional marketplace columns to bookings when missing.
-- Safe to run multiple times.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_mode TEXT DEFAULT 'protector_only';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_listing_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS protector_listing_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS with_driver BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rental_days INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_bookings_mode ON bookings(booking_mode);
