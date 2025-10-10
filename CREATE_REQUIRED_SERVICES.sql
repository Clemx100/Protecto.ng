-- ====================================================================
-- CREATE REQUIRED SERVICES - PROTECTOR.NG LIVE
-- ====================================================================
-- This creates the default service that the app expects
-- ====================================================================

-- First, check if the service already exists
SELECT id, name, base_price, price_per_hour 
FROM services 
WHERE id = 'd5bcc8bd-a566-4094-8ac9-d25b7b356834';

-- Insert the default Armed Protection Service with the specific ID
INSERT INTO services (
    id,
    name,
    description,
    base_price,
    price_per_hour
) VALUES (
    'd5bcc8bd-a566-4094-8ac9-d25b7b356834',
    'Armed Protection Service',
    'Professional armed protection service with trained security personnel',
    100000,
    25000
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_price = EXCLUDED.base_price,
    price_per_hour = EXCLUDED.price_per_hour;

-- Create additional services for completeness
INSERT INTO services (name, description, base_price, price_per_hour)
VALUES 
    ('Unarmed Protection Service', 'Professional unarmed protection service', 50000, 15000),
    ('Vehicle Only Service', 'Secure transportation service without armed personnel', 30000, 10000),
    ('Executive Protection', 'Premium executive protection with advanced security measures', 200000, 50000)
ON CONFLICT DO NOTHING;

-- Verify services were created
SELECT id, name, base_price, price_per_hour, created_at
FROM services
ORDER BY created_at DESC;

-- ====================================================================
-- ✅ SUCCESS: Services created
-- ✅ Armed Protection Service ID: d5bcc8bd-a566-4094-8ac9-d25b7b356834
-- ✅ Ready for bookings!
-- ====================================================================

