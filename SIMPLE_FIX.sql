-- ====================================================================
-- SIMPLE FIX - COPY AND RUN THESE LINES
-- ====================================================================

-- Remove constraints
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_dress_code_check;

-- Create the service the app needs
INSERT INTO services (
    id,
    name,
    base_price,
    price_per_hour
) VALUES (
    'd5bcc8bd-a566-4094-8ac9-d25b7b356834',
    'Armed Protection Service',
    100000,
    25000
)
ON CONFLICT (id) DO NOTHING;

-- Verify service was created
SELECT id, name FROM services WHERE id = 'd5bcc8bd-a566-4094-8ac9-d25b7b356834';

-- ====================================================================
-- Expected result: You should see one row with the service
-- ====================================================================

