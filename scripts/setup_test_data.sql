-- Setup test data for Protector.Ng
-- This script ensures we have the necessary services and test data

-- Insert default services if they don't exist
INSERT INTO services (id, name, type, description, base_price, price_per_hour, minimum_duration, is_active)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Armed Protection Service', 'armed_protection', 'Professional armed security protection', 100000, 25000, 4, true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Vehicle Only Service', 'unarmed_protection', 'Vehicle transportation service', 50000, 15000, 4, true)
ON CONFLICT (id) DO NOTHING;

-- Insert test locations
INSERT INTO locations (id, name, address, coordinates, city, state, country, is_high_risk, surge_multiplier)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440003', 'Victoria Island', 'Victoria Island, Lagos', 'POINT(3.4219 6.4281)', 'Lagos', 'Lagos', 'Nigeria', false, 1.0),
  ('550e8400-e29b-41d4-a716-446655440004', 'Ikoyi', 'Ikoyi, Lagos', 'POINT(3.4244 6.4474)', 'Lagos', 'Lagos', 'Nigeria', false, 1.0)
ON CONFLICT (id) DO NOTHING;

-- Create a test operator user profile (if needed)
-- Note: This would typically be done through the auth system
-- INSERT INTO profiles (id, email, first_name, last_name, role, is_verified, is_active)
-- VALUES ('550e8400-e29b-41d4-a716-446655440005', 'operator@protector.ng', 'Test', 'Operator', 'operator', true, true)
-- ON CONFLICT (id) DO NOTHING;

-- Verify data
SELECT 'Services:' as table_name, count(*) as count FROM services
UNION ALL
SELECT 'Locations:', count(*) FROM locations
UNION ALL
SELECT 'Profiles:', count(*) FROM profiles;













