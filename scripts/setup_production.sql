-- Production Database Setup Script
-- Run this script in your production Supabase database

-- 1. Create production admin user
INSERT INTO profiles (id, first_name, last_name, email, role, phone, created_at, updated_at)
VALUES (
  'admin-001',
  'System',
  'Administrator',
  'admin@protector.ng',
  'admin',
  '+234-800-000-0000',
  NOW(),
  NOW()
);

-- 2. Create initial operator accounts
INSERT INTO profiles (id, first_name, last_name, email, role, phone, created_at, updated_at)
VALUES 
  ('operator-001', 'John', 'Doe', 'operator1@protector.ng', 'agent', '+234-800-000-0001', NOW(), NOW()),
  ('operator-002', 'Jane', 'Smith', 'operator2@protector.ng', 'agent', '+234-800-000-0002', NOW(), NOW());

-- 3. Create service types
INSERT INTO services (id, name, type, description, base_price_ngn, hourly_rate_ngn, created_at, updated_at)
VALUES 
  ('service-001', 'Armed Protection', 'armed_protection', 'Professional armed security personnel', 100000, 25000, NOW(), NOW()),
  ('service-002', 'Unarmed Protection', 'unarmed_protection', 'Professional unarmed security personnel', 50000, 15000, NOW(), NOW()),
  ('service-003', 'Vehicle Only', 'vehicle_only', 'Armored vehicle service without personnel', 30000, 10000, NOW(), NOW()),
  ('service-004', 'Armored Vehicle', 'armored_vehicle', 'Armored vehicle with security personnel', 150000, 35000, NOW(), NOW()),
  ('service-005', 'Event Security', 'event_security', 'Event security and crowd control', 80000, 20000, NOW(), NOW());

-- 4. Create vehicle fleet
INSERT INTO vehicles (id, make, model, type, plate_number, capacity, is_armored, status, created_at, updated_at)
VALUES 
  ('vehicle-001', 'Mercedes-Benz', 'S-Class', 'sedan', 'ABC-123-AB', 4, true, 'available', NOW(), NOW()),
  ('vehicle-002', 'BMW', 'X7', 'suv', 'DEF-456-CD', 7, true, 'available', NOW(), NOW()),
  ('vehicle-003', 'Mercedes-Benz', 'Sprinter', 'van', 'GHI-789-EF', 12, true, 'available', NOW(), NOW()),
  ('vehicle-004', 'Toyota', 'Land Cruiser', 'suv', 'JKL-012-GH', 7, false, 'available', NOW(), NOW()),
  ('vehicle-005', 'Lexus', 'LX570', 'suv', 'MNO-345-IJ', 7, true, 'available', NOW(), NOW());

-- 5. Create agent profiles
INSERT INTO agents (id, profile_id, specializations, certifications, experience_years, status, created_at, updated_at)
VALUES 
  ('agent-001', 'operator-001', '["armed_protection", "executive_protection"]', '["CPP", "PSP"]', 8, 'available', NOW(), NOW()),
  ('agent-002', 'operator-002', '["unarmed_protection", "event_security"]', '["CPP"]', 5, 'available', NOW(), NOW());

-- 6. Create system settings
INSERT INTO system_settings (key, value, description, created_at, updated_at)
VALUES 
  ('exchange_rate_usd_ngn', '1500', 'USD to NGN exchange rate', NOW(), NOW()),
  ('min_booking_hours', '4', 'Minimum booking duration in hours', NOW(), NOW()),
  ('max_booking_hours', '24', 'Maximum booking duration in hours', NOW(), NOW()),
  ('emergency_contact', '+234-800-911-0000', 'Emergency contact number', NOW(), NOW()),
  ('support_email', 'support@protector.ng', 'Customer support email', NOW(), NOW()),
  ('company_name', 'Protector.Ng', 'Company name', NOW(), NOW()),
  ('company_address', 'Lagos, Nigeria', 'Company address', NOW(), NOW());

-- 7. Create notification templates
INSERT INTO notification_templates (id, type, subject, body, created_at, updated_at)
VALUES 
  ('template-001', 'booking_confirmation', 'Booking Confirmed - Protector.Ng', 'Your protection service has been confirmed. Booking ID: {booking_id}', NOW(), NOW()),
  ('template-002', 'payment_received', 'Payment Received - Protector.Ng', 'Payment of {amount} {currency} has been received for booking {booking_id}', NOW(), NOW()),
  ('template-003', 'team_deployed', 'Team Deployed - Protector.Ng', 'Your protection team has been deployed and is en route to your location.', NOW(), NOW()),
  ('template-004', 'service_completed', 'Service Completed - Protector.Ng', 'Your protection service has been completed. Thank you for choosing Protector.Ng', NOW(), NOW());

-- 8. Create initial admin dashboard data
INSERT INTO dashboard_stats (id, total_bookings, total_revenue_ngn, total_revenue_usd, active_agents, available_vehicles, created_at, updated_at)
VALUES 
  ('stats-001', 0, 0, 0, 2, 5, NOW(), NOW());

-- 9. Set up RLS policies for production
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles: Users can only see their own profile, admins can see all
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'admin')
);

-- Bookings: Clients see their own, agents/admins see all
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (client_id = auth.uid()::text);
CREATE POLICY "Agents can view all bookings" ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('agent', 'admin'))
);

-- Messages: Users can see messages for their bookings
CREATE POLICY "Users can view booking messages" ON messages FOR SELECT USING (
  booking_id IN (
    SELECT id FROM bookings WHERE client_id = auth.uid()::text
    UNION
    SELECT id FROM bookings WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('agent', 'admin')
    )
  )
);

-- Invoices: Users can see invoices for their bookings
CREATE POLICY "Users can view booking invoices" ON invoices FOR SELECT USING (
  booking_id IN (
    SELECT id FROM bookings WHERE client_id = auth.uid()::text
    UNION
    SELECT id FROM bookings WHERE EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('agent', 'admin')
    )
  )
);

-- 10. Create indexes for performance
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_vehicles_status ON vehicles(status);

-- 11. Create functions for dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_bookings bigint,
  total_revenue_ngn numeric,
  total_revenue_usd numeric,
  active_agents bigint,
  available_vehicles bigint,
  pending_bookings bigint,
  completed_bookings bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM bookings) as total_bookings,
    (SELECT COALESCE(SUM(amount_ngn), 0) FROM invoices WHERE status = 'paid') as total_revenue_ngn,
    (SELECT COALESCE(SUM(amount_usd), 0) FROM invoices WHERE status = 'paid') as total_revenue_usd,
    (SELECT COUNT(*) FROM agents WHERE status = 'available') as active_agents,
    (SELECT COUNT(*) FROM vehicles WHERE status = 'available') as available_vehicles,
    (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 13. Create audit log table
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Create audit log function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
  VALUES (
    auth.uid()::text,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::text,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 15. Add audit triggers to important tables
CREATE TRIGGER audit_bookings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_invoices_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 16. Create backup and maintenance functions
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- 17. Set up automated cleanup (run daily)
-- This would typically be set up as a cron job or scheduled task
-- For now, we'll create the function that can be called manually

COMMIT;
