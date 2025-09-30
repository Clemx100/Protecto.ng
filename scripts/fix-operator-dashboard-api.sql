-- Fix Operator Dashboard API Issues
-- This script ensures the operator dashboard can properly receive and display bookings

-- First, let's ensure we have proper operator profiles
-- Create operator profiles if they don't exist
INSERT INTO profiles (id, email, first_name, last_name, role, is_verified, is_active)
SELECT 
  gen_random_uuid(),
  'operator@protector.ng',
  'Operator',
  'User',
  'operator',
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE role = 'operator'
);

-- Create admin profile if it doesn't exist
INSERT INTO profiles (id, email, first_name, last_name, role, is_verified, is_active)
SELECT 
  gen_random_uuid(),
  'admin@protector.ng',
  'Admin',
  'User',
  'admin',
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE role = 'admin'
);

-- Update the profiles table to ensure it has all required columns for operator dashboard
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client',
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing profiles to have proper role if missing
UPDATE profiles 
SET role = 'client' 
WHERE role IS NULL OR role = '';

-- Ensure we have proper foreign key relationships
-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- Add foreign key for bookings to profiles if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_client_id_fkey'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for bookings to services if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_service_id_fkey'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_service_id_fkey 
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Create a view for operator dashboard that includes all necessary data
CREATE OR REPLACE VIEW operator_bookings_view AS
SELECT 
  b.id,
  b.booking_code,
  b.database_id,
  b.client_id,
  b.service_id,
  b.status,
  b.service_type,
  b.protector_count,
  b.protectee_count,
  b.dress_code,
  b.duration_hours,
  b.pickup_address,
  b.pickup_coordinates,
  b.destination_address,
  b.destination_coordinates,
  b.scheduled_date,
  b.scheduled_time,
  b.base_price,
  b.total_price,
  b.special_instructions,
  b.emergency_contact,
  b.emergency_phone,
  b.created_at,
  b.updated_at,
  -- Client information
  p.first_name as client_first_name,
  p.last_name as client_last_name,
  p.email as client_email,
  p.phone as client_phone,
  -- Service information
  s.name as service_name,
  s.description as service_description,
  s.base_price as service_base_price,
  s.price_per_hour as service_price_per_hour
FROM bookings b
LEFT JOIN profiles p ON b.client_id = p.id
LEFT JOIN services s ON b.service_id = s.id
ORDER BY b.created_at DESC;

-- Grant access to the view for operators
GRANT SELECT ON operator_bookings_view TO authenticated;

-- Create a function to get bookings for operator dashboard
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
    obv.id,
    obv.booking_code,
    obv.id as database_id,
    obv.client_first_name,
    obv.client_last_name,
    obv.client_email,
    obv.client_phone,
    obv.pickup_address,
    obv.destination_address,
    obv.status,
    obv.service_name,
    obv.service_type,
    obv.duration_hours,
    obv.total_price,
    obv.protector_count,
    obv.protectee_count,
    obv.dress_code,
    obv.special_instructions,
    obv.emergency_contact,
    obv.emergency_phone,
    obv.scheduled_date,
    obv.scheduled_time,
    obv.created_at
  FROM operator_bookings_view obv
  ORDER BY obv.created_at DESC;
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

-- Create indexes for better performance on operator queries
CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_client_service ON bookings(client_id, service_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking_created ON messages(booking_id, created_at ASC);

-- Update RLS policies to ensure operators can access all data
DROP POLICY IF EXISTS "Operators can view all bookings" ON bookings;
CREATE POLICY "Operators can view all bookings" ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);

DROP POLICY IF EXISTS "Operators can update bookings" ON bookings;
CREATE POLICY "Operators can update bookings" ON bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);

-- Ensure operators can view all profiles
DROP POLICY IF EXISTS "Operators can view all profiles" ON profiles;
CREATE POLICY "Operators can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);

-- Ensure operators can view all messages
DROP POLICY IF EXISTS "Users can view booking messages" ON messages;
CREATE POLICY "Users can view booking messages" ON messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('operator', 'admin'))
);

-- Add helpful comments
COMMENT ON FUNCTION get_operator_bookings() IS 'Get all bookings for operator dashboard with client and service details';
COMMENT ON FUNCTION update_booking_status(UUID, TEXT) IS 'Update booking status for operator actions';
COMMENT ON FUNCTION get_booking_messages(UUID) IS 'Get all messages for a specific booking';
COMMENT ON FUNCTION send_booking_message(UUID, UUID, UUID, TEXT, TEXT) IS 'Send a message in a booking conversation';

