-- Complete Fix for Operator Dashboard Communication Issues
-- This script addresses all the problems preventing operator dashboard from receiving requests

-- First, let's ensure we have the basic tables with correct structure
-- Drop and recreate profiles table with proper structure
DROP TABLE IF EXISTS profiles CASCADE;
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

-- Create services table if it doesn't exist
CREATE TABLE IF NOT EXISTS services (
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

-- Create bookings table with proper structure
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_code TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE RESTRICT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'en_route', 'arrived', 'in_service', 'completed', 'cancelled')),
  service_type TEXT NOT NULL CHECK (service_type IN ('armed_protection', 'unarmed_protection', 'armored_vehicle', 'convoy', 'event_security')),
  protector_count INTEGER DEFAULT 1,
  protectee_count INTEGER DEFAULT 1,
  dress_code TEXT DEFAULT 'tactical_casual',
  duration_hours INTEGER NOT NULL,
  pickup_address TEXT NOT NULL,
  pickup_coordinates TEXT, -- Store as simple string format (lat,lng)
  destination_address TEXT,
  destination_coordinates TEXT, -- Store as simple string format (lat,lng)
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table for communication
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  is_encrypted BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default services
INSERT INTO services (name, type, description, base_price, price_per_hour, minimum_duration) VALUES
('Armed Protection Service', 'armed_protection', 'Professional armed security protection with trained agents', 100000, 25000, 4),
('Unarmed Protection Service', 'unarmed_protection', 'Professional unarmed security protection', 50000, 15000, 4)
ON CONFLICT (type) DO NOTHING;

-- Create operator and admin profiles
INSERT INTO profiles (id, email, first_name, last_name, role, is_verified, is_active) VALUES
(gen_random_uuid(), 'operator@protector.ng', 'Operator', 'User', 'operator', true, true),
(gen_random_uuid(), 'admin@protector.ng', 'Admin', 'User', 'admin', true, true)
ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Operators can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Operators can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);

-- Booking policies
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Operators can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Operators can update bookings" ON bookings;

CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Users can create own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Operators can view all bookings" ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);
CREATE POLICY "Operators can update bookings" ON bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);

-- Message policies
DROP POLICY IF EXISTS "Users can view booking messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;

CREATE POLICY "Users can view booking messages" ON messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);
CREATE POLICY "Users can create messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

-- Service policies
DROP POLICY IF EXISTS "Everyone can view services" ON services;
CREATE POLICY "Everyone can view services" ON services FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code ON bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Create a function to get operator bookings
CREATE OR REPLACE FUNCTION get_operator_bookings()
RETURNS TABLE (
  id UUID,
  booking_code TEXT,
  database_id UUID,
  client_first_name TEXT,
  client_last_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  pickup_address TEXT,
  destination_address TEXT,
  status TEXT,
  service_name TEXT,
  service_type TEXT,
  duration_hours INTEGER,
  total_price DECIMAL(10,2),
  protector_count INTEGER,
  protectee_count INTEGER,
  dress_code TEXT,
  special_instructions TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.booking_code,
    b.id as database_id,
    p.first_name as client_first_name,
    p.last_name as client_last_name,
    p.email as client_email,
    p.phone as client_phone,
    b.pickup_address,
    b.destination_address,
    b.status,
    s.name as service_name,
    b.service_type,
    b.duration_hours,
    b.total_price,
    b.protector_count,
    b.protectee_count,
    b.dress_code,
    b.special_instructions,
    b.emergency_contact,
    b.emergency_phone,
    b.scheduled_date,
    b.scheduled_time,
    b.created_at
  FROM bookings b
  LEFT JOIN profiles p ON b.client_id = p.id
  LEFT JOIN services s ON b.service_id = s.id
  ORDER BY b.created_at DESC;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_operator_bookings() TO authenticated;

-- Create a function to update booking status
CREATE OR REPLACE FUNCTION update_booking_status(
  booking_id UUID,
  new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_exists BOOLEAN;
BEGIN
  -- Check if booking exists
  SELECT EXISTS(SELECT 1 FROM bookings WHERE id = booking_id) INTO booking_exists;
  
  IF NOT booking_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Update the booking status
  UPDATE bookings 
  SET status = new_status, updated_at = NOW()
  WHERE id = booking_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_booking_status(UUID, TEXT) TO authenticated;

-- Create a function to get booking messages
CREATE OR REPLACE FUNCTION get_booking_messages(booking_id_param UUID)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  recipient_id UUID,
  content TEXT,
  message_type TEXT,
  is_encrypted BOOLEAN,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  sender_name TEXT,
  recipient_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_id,
    m.recipient_id,
    m.content,
    m.message_type,
    m.is_encrypted,
    m.read_at,
    m.created_at,
    CONCAT(sp.first_name, ' ', sp.last_name) as sender_name,
    CONCAT(rp.first_name, ' ', rp.last_name) as recipient_name
  FROM messages m
  LEFT JOIN profiles sp ON m.sender_id = sp.id
  LEFT JOIN profiles rp ON m.recipient_id = rp.id
  WHERE m.booking_id = booking_id_param
  ORDER BY m.created_at ASC;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_booking_messages(UUID) TO authenticated;

-- Create a function to send a message
CREATE OR REPLACE FUNCTION send_booking_message(
  booking_id_param UUID,
  sender_id_param UUID,
  recipient_id_param UUID,
  content_param TEXT,
  message_type_param TEXT DEFAULT 'text'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_id UUID;
BEGIN
  INSERT INTO messages (booking_id, sender_id, recipient_id, content, message_type)
  VALUES (booking_id_param, sender_id_param, recipient_id_param, content_param, message_type_param)
  RETURNING id INTO message_id;
  
  RETURN message_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION send_booking_message(UUID, UUID, UUID, TEXT, TEXT) TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
DROP TRIGGER IF EXISTS update_services_updated_at ON services;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE profiles IS 'User profile information for Protector.ng app';
COMMENT ON TABLE services IS 'Available security services and their pricing';
COMMENT ON TABLE bookings IS 'Client booking requests and their status';
COMMENT ON TABLE messages IS 'Communication between clients and operators';
COMMENT ON FUNCTION get_operator_bookings() IS 'Get all bookings for operator dashboard with client and service details';
COMMENT ON FUNCTION update_booking_status(UUID, TEXT) IS 'Update booking status for operator actions';
COMMENT ON FUNCTION get_booking_messages(UUID) IS 'Get all messages for a specific booking';
COMMENT ON FUNCTION send_booking_message(UUID, UUID, UUID, TEXT, TEXT) IS 'Send a message in a booking conversation';

-- Test the setup by creating a sample booking
DO $$
DECLARE
  test_client_id UUID;
  test_service_id UUID;
  test_booking_id UUID;
BEGIN
  -- Get or create a test client
  SELECT id INTO test_client_id FROM profiles WHERE role = 'client' LIMIT 1;
  IF test_client_id IS NULL THEN
    INSERT INTO profiles (id, email, first_name, last_name, role) 
    VALUES (gen_random_uuid(), 'test@client.com', 'Test', 'Client', 'client')
    RETURNING id INTO test_client_id;
  END IF;
  
  -- Get a service
  SELECT id INTO test_service_id FROM services LIMIT 1;
  
  -- Create a test booking
  INSERT INTO bookings (
    booking_code, client_id, service_id, status, service_type,
    protector_count, protectee_count, duration_hours,
    pickup_address, scheduled_date, scheduled_time,
    base_price, total_price, emergency_contact, emergency_phone
  ) VALUES (
    'TEST' || EXTRACT(EPOCH FROM NOW())::TEXT,
    test_client_id,
    test_service_id,
    'pending',
    'armed_protection',
    2, 1, 4,
    'Test Pickup Location',
    CURRENT_DATE,
    '12:00:00',
    100000, 100000,
    'Test Contact', '1234567890'
  ) RETURNING id INTO test_booking_id;
  
  RAISE NOTICE 'Test booking created with ID: %', test_booking_id;
END $$;

