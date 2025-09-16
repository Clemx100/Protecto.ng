-- Initial Data Seeding for Protector.Ng
-- This file populates the database with initial data for testing and development

-- Insert initial services
INSERT INTO services (name, type, description, base_price, price_per_hour, minimum_duration) VALUES
('Armed Personal Protection', 'armed_protection', 'Licensed armed security agent for personal protection', 50000.00, 15000.00, 4),
('Unarmed Personal Protection', 'unarmed_protection', 'Professional unarmed security agent for escort and protection', 30000.00, 8000.00, 4),
('Armored Vehicle Service', 'armored_vehicle', 'Armored vehicle with professional driver for secure transportation', 80000.00, 20000.00, 4),
('Convoy Protection', 'convoy', 'Multiple vehicle convoy with armed security team', 150000.00, 40000.00, 4),
('Event Security Team', 'event_security', 'Large-scale security team for events and gatherings', 200000.00, 50000.00, 8);

-- Insert initial vehicles
INSERT INTO vehicles (vehicle_code, make, model, year, type, is_armored, capacity, license_plate, color, features) VALUES
('VH001', 'Mercedes-Benz', 'S-Class', 2023, 'sedan', true, 4, 'ABC-123-AB', 'Black', ARRAY['bulletproof', 'run_flat_tires', 'gps_tracking']),
('VH002', 'BMW', 'X7', 2023, 'suv', true, 7, 'DEF-456-CD', 'Black', ARRAY['bulletproof', 'run_flat_tires', 'gps_tracking', 'night_vision']),
('VH003', 'Mercedes-Benz', 'Sprinter', 2022, 'van', true, 12, 'GHI-789-EF', 'White', ARRAY['bulletproof', 'run_flat_tires', 'gps_tracking', 'medical_equipment']),
('VH004', 'Toyota', 'Land Cruiser', 2023, 'suv', false, 8, 'JKL-012-GH', 'White', ARRAY['gps_tracking', 'communication_system']),
('VH005', 'Mercedes-Benz', 'E-Class', 2023, 'sedan', false, 4, 'MNO-345-IJ', 'Black', ARRAY['gps_tracking', 'comfort_features']);

-- Insert initial locations (major Nigerian cities)
INSERT INTO locations (name, address, coordinates, city, state, country, is_high_risk, surge_multiplier) VALUES
('Victoria Island', 'Victoria Island, Lagos', ST_Point(6.4281, 3.4219), 'Lagos', 'Lagos', 'Nigeria', false, 1.2),
('Ikoyi', 'Ikoyi, Lagos', ST_Point(6.4483, 3.4200), 'Lagos', 'Lagos', 'Nigeria', false, 1.1),
('Maitama', 'Maitama, Abuja', ST_Point(9.0765, 7.3986), 'Abuja', 'FCT', 'Nigeria', false, 1.0),
('Asokoro', 'Asokoro, Abuja', ST_Point(9.0417, 7.5167), 'Abuja', 'FCT', 'Nigeria', false, 1.0),
('GRA Port Harcourt', 'GRA, Port Harcourt', ST_Point(4.8156, 7.0020), 'Port Harcourt', 'Rivers', 'Nigeria', true, 1.5),
('Wuse 2', 'Wuse 2, Abuja', ST_Point(9.0833, 7.4833), 'Abuja', 'FCT', 'Nigeria', false, 1.0),
('Lekki Phase 1', 'Lekki Phase 1, Lagos', ST_Point(6.4658, 3.5661), 'Lagos', 'Lagos', 'Nigeria', false, 1.1),
('Surulere', 'Surulere, Lagos', ST_Point(6.5000, 3.3500), 'Lagos', 'Lagos', 'Nigeria', true, 1.3);

-- Insert sample promo codes
INSERT INTO promo_codes (code, description, discount_type, discount_value, max_uses, valid_until) VALUES
('WELCOME20', 'Welcome discount for new users', 'percentage', 20.00, 100, NOW() + INTERVAL '30 days'),
('FIRST50', 'First booking discount', 'fixed', 50000.00, 50, NOW() + INTERVAL '60 days'),
('VIP10', 'VIP member discount', 'percentage', 10.00, 1000, NOW() + INTERVAL '365 days'),
('EMERGENCY', 'Emergency service discount', 'percentage', 15.00, 20, NOW() + INTERVAL '7 days');

-- Create sample admin user (this would normally be done through the app)
-- Note: This is just for reference - actual admin creation should be done through the app
INSERT INTO profiles (id, email, first_name, last_name, role, is_verified, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@protector.ng', 'Admin', 'User', 'admin', true, true);

-- Create sample agent profiles (these would be created through the app registration)
INSERT INTO profiles (id, email, first_name, last_name, role, phone, is_verified, is_active) VALUES
('00000000-0000-0000-0000-000000000002', 'agent1@protector.ng', 'Marcus', 'Johnson', 'agent', '+2348012345678', true, true),
('00000000-0000-0000-0000-000000000003', 'agent2@protector.ng', 'David', 'Okafor', 'agent', '+2348012345679', true, true),
('00000000-0000-0000-0000-000000000004', 'agent3@protector.ng', 'James', 'Adebayo', 'agent', '+2348012345680', true, true);

-- Insert corresponding agent records
INSERT INTO agents (id, agent_code, license_number, qualifications, experience_years, rating, is_armed, weapon_license, background_check_status, availability_status) VALUES
('00000000-0000-0000-0000-000000000002', 'AGT001', 'LIC-2023-001', ARRAY['ex_military', 'firearms_training', 'first_aid'], 8, 4.8, true, 'WL-2023-001', 'approved', 'available'),
('00000000-0000-0000-0000-000000000003', 'AGT002', 'LIC-2023-002', ARRAY['ex_police', 'security_training', 'cpr'], 12, 4.9, true, 'WL-2023-002', 'approved', 'available'),
('00000000-0000-0000-0000-000000000004', 'AGT003', 'LIC-2023-003', ARRAY['security_guard', 'unarmed_combat', 'first_aid'], 5, 4.6, false, NULL, 'approved', 'available');

-- Create sample client profiles
INSERT INTO profiles (id, email, first_name, last_name, role, phone, address, emergency_contact, emergency_phone, is_verified, is_active) VALUES
('00000000-0000-0000-0000-000000000005', 'client1@example.com', 'John', 'Doe', 'client', '+2348012345681', '123 Victoria Island, Lagos', 'Jane Doe', '+2348012345682', true, true),
('00000000-0000-0000-0000-000000000006', 'client2@example.com', 'Mary', 'Smith', 'client', '+2348012345683', '456 Maitama, Abuja', 'Bob Smith', '+2348012345684', true, true);

-- Insert sample bookings
INSERT INTO bookings (
    booking_code, client_id, service_id, service_type, protector_count, protectee_count, 
    dress_code, duration_hours, pickup_location_id, pickup_address, pickup_coordinates,
    scheduled_date, scheduled_time, base_price, total_price, assigned_agent_id, assigned_vehicle_id,
    special_instructions, emergency_contact, emergency_phone
) VALUES
(
    'BK001', '00000000-0000-0000-0000-000000000005', 
    (SELECT id FROM services WHERE type = 'armed_protection' LIMIT 1),
    'armed_protection', 1, 1, 'business_formal', 8,
    (SELECT id FROM locations WHERE name = 'Victoria Island' LIMIT 1),
    '123 Victoria Island, Lagos', ST_Point(6.4281, 3.4219),
    '2024-02-22', '11:45:00', 50000.00, 120000.00,
    '00000000-0000-0000-0000-000000000002', 
    (SELECT id FROM vehicles WHERE vehicle_code = 'VH001' LIMIT 1),
    'Business meeting in Ikoyi', 'Jane Doe', '+2348012345682'
),
(
    'BK002', '00000000-0000-0000-0000-000000000006',
    (SELECT id FROM services WHERE type = 'armored_vehicle' LIMIT 1),
    'armored_vehicle', 1, 2, 'tactical_casual', 6,
    (SELECT id FROM locations WHERE name = 'Maitama' LIMIT 1),
    '456 Maitama, Abuja', ST_Point(9.0765, 7.3986),
    '2024-02-23', '14:30:00', 80000.00, 200000.00,
    '00000000-0000-0000-0000-000000000003',
    (SELECT id FROM vehicles WHERE vehicle_code = 'VH002' LIMIT 1),
    'Airport pickup and drop-off', 'Bob Smith', '+2348012345684'
);

-- Insert sample payments
INSERT INTO payments (booking_id, client_id, amount, status, payment_method, payment_reference) VALUES
(
    (SELECT id FROM bookings WHERE booking_code = 'BK001' LIMIT 1),
    '00000000-0000-0000-0000-000000000005',
    120000.00, 'completed', 'card', 'PAY-001-2024'
),
(
    (SELECT id FROM bookings WHERE booking_code = 'BK002' LIMIT 1),
    '00000000-0000-0000-0000-000000000006',
    200000.00, 'completed', 'bank_transfer', 'PAY-002-2024'
);

-- Insert sample notifications
INSERT INTO notifications (user_id, title, message, type, data) VALUES
('00000000-0000-0000-0000-000000000005', 'Booking Confirmed', 'Your booking BK001 has been confirmed and assigned to Agent Marcus Johnson', 'booking_confirmed', '{"booking_id": "BK001", "agent_name": "Marcus Johnson"}'),
('00000000-0000-0000-0000-000000000006', 'Payment Successful', 'Payment for booking BK002 has been processed successfully', 'payment_success', '{"booking_id": "BK002", "amount": 200000.00}'),
('00000000-0000-0000-0000-000000000002', 'New Assignment', 'You have been assigned to booking BK001', 'new_assignment', '{"booking_id": "BK001", "client_name": "John Doe"}');

-- Update vehicle locations to simulate current positions
UPDATE vehicles SET current_location = ST_Point(6.4281, 3.4219) WHERE vehicle_code = 'VH001';
UPDATE vehicles SET current_location = ST_Point(9.0765, 7.3986) WHERE vehicle_code = 'VH002';
UPDATE vehicles SET current_location = ST_Point(6.4658, 3.5661) WHERE vehicle_code = 'VH003';
UPDATE vehicles SET current_location = ST_Point(9.0833, 7.4833) WHERE vehicle_code = 'VH004';
UPDATE vehicles SET current_location = ST_Point(6.5000, 3.3500) WHERE vehicle_code = 'VH005';

-- Update agent locations
UPDATE agents SET current_location = ST_Point(6.4281, 3.4219) WHERE agent_code = 'AGT001';
UPDATE agents SET current_location = ST_Point(9.0765, 7.3986) WHERE agent_code = 'AGT002';
UPDATE agents SET current_location = ST_Point(6.4658, 3.5661) WHERE agent_code = 'AGT003';

