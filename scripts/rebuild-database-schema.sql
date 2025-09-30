-- Complete Database Schema Rebuild for Protector.Ng
-- This script will recreate all necessary tables and relationships

-- Drop existing tables if they exist (in correct order to handle foreign keys)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS location_tracking CASCADE;
DROP TABLE IF EXISTS rating_reviews CASCADE;
DROP TABLE IF EXISTS emergency_alerts CASCADE;
DROP TABLE IF EXISTS booking_vehicles CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS promo_codes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table with all required columns
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'operator', 'admin')),
  avatar_url TEXT,
  address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create services table
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('armed_protection', 'unarmed_protection', 'armored_vehicle', 'convoy', 'event_security')),
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_per_hour DECIMAL(10,2) DEFAULT 0,
  minimum_duration INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create locations table
CREATE TABLE locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  coordinates POINT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT DEFAULT 'Nigeria',
  is_high_risk BOOLEAN DEFAULT false,
  surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agents table
CREATE TABLE agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_code TEXT UNIQUE NOT NULL,
  license_number TEXT,
  qualifications TEXT[],
  experience_years INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0,
  total_jobs INTEGER DEFAULT 0,
  is_armed BOOLEAN DEFAULT false,
  weapon_license TEXT,
  background_check_status TEXT DEFAULT 'pending',
  availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline')),
  current_location POINT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vehicles table
CREATE TABLE vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_code TEXT UNIQUE NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sedan', 'suv', 'van', 'motorcade')),
  is_armored BOOLEAN DEFAULT false,
  capacity INTEGER NOT NULL,
  license_plate TEXT UNIQUE NOT NULL,
  color TEXT,
  features TEXT[],
  is_available BOOLEAN DEFAULT true,
  current_location POINT,
  last_maintenance TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_code TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE RESTRICT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'en_route', 'arrived', 'in_service', 'completed', 'cancelled')),
  service_type TEXT NOT NULL CHECK (service_type IN ('armed_protection', 'unarmed_protection', 'armored_vehicle', 'convoy', 'event_security')),
  protector_count INTEGER DEFAULT 1,
  protectee_count INTEGER DEFAULT 1,
  dress_code TEXT DEFAULT 'tactical_casual' CHECK (dress_code IN ('business_formal', 'business_casual', 'tactical_casual', 'tactical_gear', 'plainclothes')),
  duration_hours INTEGER NOT NULL,
  pickup_location_id UUID REFERENCES locations(id),
  pickup_address TEXT NOT NULL,
  pickup_coordinates TEXT, -- Store as simple string format (lat,lng)
  destination_address TEXT,
  destination_coordinates TEXT, -- Store as simple string format (lat,lng)
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  base_price DECIMAL(10,2) NOT NULL,
  surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
  total_price DECIMAL(10,2) NOT NULL,
  assigned_agent_id UUID REFERENCES agents(id),
  assigned_vehicle_id UUID REFERENCES vehicles(id),
  special_instructions TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking_vehicles junction table
CREATE TABLE booking_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE RESTRICT NOT NULL,
  driver_id UUID REFERENCES agents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  gateway_response JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create emergency_alerts table
CREATE TABLE emergency_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_alarm')),
  location POINT NOT NULL,
  address TEXT,
  description TEXT,
  responded_by UUID REFERENCES agents(id),
  response_time INTEGER, -- in seconds
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'emergency')),
  is_encrypted BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create location_tracking table
CREATE TABLE location_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  location POINT NOT NULL,
  heading DECIMAL(5,2),
  speed DECIMAL(5,2),
  accuracy DECIMAL(5,2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rating_reviews table
CREATE TABLE rating_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create promo_codes table
CREATE TABLE promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_bookings_booking_code ON bookings(booking_code);
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_agents_availability ON agents(availability_status);
CREATE INDEX idx_vehicles_availability ON vehicles(is_available);
CREATE INDEX idx_location_tracking_booking_id ON location_tracking(booking_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Operators can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);

-- Create RLS policies for bookings
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Users can create own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Operators can view all bookings" ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);
CREATE POLICY "Operators can update bookings" ON bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);

-- Create RLS policies for messages
CREATE POLICY "Users can view booking messages" ON messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);
CREATE POLICY "Users can create messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

-- Create RLS policies for other tables
CREATE POLICY "Operators can view all data" ON services FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);
CREATE POLICY "Operators can view all data" ON agents FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);
CREATE POLICY "Operators can view all data" ON vehicles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);

-- Insert default services
INSERT INTO services (name, type, description, base_price, price_per_hour, minimum_duration) VALUES
('Armed Protection Service', 'armed_protection', 'Professional armed security protection with trained agents', 100000, 25000, 4),
('Unarmed Protection Service', 'unarmed_protection', 'Professional unarmed security protection', 50000, 15000, 4),
('Armored Vehicle Service', 'armored_vehicle', 'Secure transportation in armored vehicles', 75000, 20000, 2),
('Convoy Service', 'convoy', 'Multi-vehicle convoy protection', 200000, 50000, 6),
('Event Security', 'event_security', 'Comprehensive event security services', 150000, 30000, 8);

-- Insert sample locations
INSERT INTO locations (name, address, coordinates, city, state, is_high_risk, surge_multiplier) VALUES
('Lagos Island', 'Lagos Island, Lagos', POINT(3.3792, 6.5244), 'Lagos', 'Lagos', false, 1.0),
('Victoria Island', 'Victoria Island, Lagos', POINT(3.4216, 6.4281), 'Lagos', 'Lagos', false, 1.2),
('Ikoyi', 'Ikoyi, Lagos', POINT(3.4376, 6.4474), 'Lagos', 'Lagos', false, 1.1),
('Abuja Central', 'Central Area, Abuja', POINT(7.3986, 9.0765), 'Abuja', 'FCT', false, 1.0),
('Port Harcourt Central', 'Port Harcourt, Rivers', POINT(7.0498, 4.8156), 'Port Harcourt', 'Rivers', true, 1.5);

-- Insert sample vehicles
INSERT INTO vehicles (vehicle_code, make, model, year, type, is_armored, capacity, license_plate, color, features) VALUES
('VH001', 'Mercedes-Benz', 'S-Class', 2023, 'sedan', false, 4, 'LAG-001-ABC', 'Black', ARRAY['GPS', 'Bluetooth', 'Leather Seats']),
('VH002', 'BMW', 'X7', 2023, 'suv', false, 6, 'LAG-002-DEF', 'Black', ARRAY['GPS', 'Bluetooth', 'Third Row Seating']),
('VH003', 'Mercedes-Benz', 'Sprinter', 2023, 'van', false, 12, 'LAG-003-GHI', 'White', ARRAY['GPS', 'Bluetooth', 'High Capacity']),
('VH004', 'Mercedes-Benz', 'S-Class', 2023, 'sedan', true, 4, 'LAG-004-JKL', 'Black', ARRAY['GPS', 'Bluetooth', 'B6 Armor', 'Run Flat Tires']),
('VH005', 'BMW', 'X7', 2023, 'suv', true, 5, 'LAG-005-MNO', 'Black', ARRAY['GPS', 'Bluetooth', 'B6 Armor', 'Run Flat Tires']);

-- Insert sample agents
INSERT INTO agents (agent_code, license_number, qualifications, experience_years, is_armed, background_check_status, availability_status) VALUES
('AG001', 'LS001', ARRAY['Close Protection', 'First Aid', 'Defensive Driving'], 5, true, 'completed', 'available'),
('AG002', 'LS002', ARRAY['Close Protection', 'First Aid'], 3, false, 'completed', 'available'),
('AG003', 'LS003', ARRAY['Close Protection', 'First Aid', 'Defensive Driving', 'Tactical Training'], 8, true, 'completed', 'available'),
('AG004', 'LS004', ARRAY['Close Protection', 'First Aid', 'Defensive Driving'], 4, true, 'completed', 'available'),
('AG005', 'LS005', ARRAY['Close Protection', 'First Aid'], 2, false, 'completed', 'available');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emergency_alerts_updated_at BEFORE UPDATE ON emergency_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE profiles IS 'User profile information for Protector.ng app';
COMMENT ON TABLE services IS 'Available security services and their pricing';
COMMENT ON TABLE locations IS 'Geographic locations with risk assessment and surge pricing';
COMMENT ON TABLE agents IS 'Security agents and their qualifications';
COMMENT ON TABLE vehicles IS 'Fleet vehicles including armored options';
COMMENT ON TABLE bookings IS 'Client booking requests and their status';
COMMENT ON TABLE messages IS 'Communication between clients and operators';
COMMENT ON TABLE payments IS 'Payment transactions for bookings';
COMMENT ON TABLE emergency_alerts IS 'Emergency situations and responses';
COMMENT ON TABLE location_tracking IS 'Real-time location tracking for active bookings';
COMMENT ON TABLE rating_reviews IS 'Client feedback and ratings for completed services';
COMMENT ON TABLE promo_codes IS 'Promotional codes and discounts';
COMMENT ON TABLE notifications IS 'System notifications for users';

