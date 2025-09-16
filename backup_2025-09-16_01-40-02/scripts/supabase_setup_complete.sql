-- Complete Protector.Ng Database Setup for Supabase
-- Run this entire script in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom types
CREATE TYPE user_role AS ENUM ('client', 'agent', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'en_route', 'arrived', 'in_service', 'completed', 'cancelled');
CREATE TYPE service_type AS ENUM ('armed_protection', 'unarmed_protection', 'armored_vehicle', 'convoy', 'event_security');
CREATE TYPE vehicle_type AS ENUM ('sedan', 'suv', 'van', 'motorcade');
CREATE TYPE dress_code AS ENUM ('business_formal', 'business_casual', 'tactical_casual', 'tactical_gear', 'plainclothes');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE emergency_status AS ENUM ('active', 'resolved', 'false_alarm');

-- 1. PROFILES TABLE (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'client',
    avatar_url TEXT,
    address TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    profile_completed BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AGENTS TABLE (extends profiles for security agents)
CREATE TABLE agents (
    id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    agent_code TEXT UNIQUE NOT NULL,
    license_number TEXT,
    qualifications TEXT[],
    experience_years INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_jobs INTEGER DEFAULT 0,
    is_armed BOOLEAN DEFAULT FALSE,
    weapon_license TEXT,
    background_check_status TEXT DEFAULT 'pending',
    availability_status TEXT DEFAULT 'available',
    current_location POINT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. VEHICLES TABLE
CREATE TABLE vehicles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vehicle_code TEXT UNIQUE NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    type vehicle_type NOT NULL,
    is_armored BOOLEAN DEFAULT FALSE,
    capacity INTEGER NOT NULL,
    license_plate TEXT UNIQUE NOT NULL,
    color TEXT,
    features TEXT[],
    is_available BOOLEAN DEFAULT TRUE,
    current_location POINT,
    last_maintenance DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SERVICES TABLE
CREATE TABLE services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type service_type NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    price_per_hour DECIMAL(10,2),
    minimum_duration INTEGER DEFAULT 4, -- in hours
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. LOCATIONS TABLE
CREATE TABLE locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    coordinates POINT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT DEFAULT 'Nigeria',
    is_high_risk BOOLEAN DEFAULT FALSE,
    surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. BOOKINGS TABLE
CREATE TABLE bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_code TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES services(id) NOT NULL,
    status booking_status DEFAULT 'pending',
    
    -- Service details
    service_type service_type NOT NULL,
    protector_count INTEGER DEFAULT 1,
    protectee_count INTEGER DEFAULT 1,
    dress_code dress_code,
    duration_hours INTEGER NOT NULL,
    
    -- Location details
    pickup_location_id UUID REFERENCES locations(id),
    pickup_address TEXT NOT NULL,
    pickup_coordinates POINT NOT NULL,
    destination_address TEXT,
    destination_coordinates POINT,
    
    -- Timing
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Pricing
    base_price DECIMAL(10,2) NOT NULL,
    surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
    total_price DECIMAL(10,2) NOT NULL,
    
    -- Assignment
    assigned_agent_id UUID REFERENCES agents(id),
    assigned_vehicle_id UUID REFERENCES vehicles(id),
    
    -- Additional details
    special_instructions TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. BOOKING_VEHICLES TABLE (for convoy bookings)
CREATE TABLE booking_vehicles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) NOT NULL,
    driver_id UUID REFERENCES agents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. PAYMENTS TABLE
CREATE TABLE payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'NGN',
    status payment_status DEFAULT 'pending',
    payment_method TEXT NOT NULL,
    payment_reference TEXT UNIQUE,
    gateway_response JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. EMERGENCY_ALERTS TABLE
CREATE TABLE emergency_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    booking_id UUID REFERENCES bookings(id),
    alert_type TEXT NOT NULL,
    status emergency_status DEFAULT 'active',
    location POINT NOT NULL,
    address TEXT,
    description TEXT,
    responded_by UUID REFERENCES agents(id),
    response_time INTEGER, -- in seconds
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. MESSAGES TABLE (for in-app communication)
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    is_encrypted BOOLEAN DEFAULT TRUE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. LOCATION_TRACKING TABLE (for real-time tracking)
CREATE TABLE location_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id),
    location POINT NOT NULL,
    heading DECIMAL(5,2),
    speed DECIMAL(5,2),
    accuracy DECIMAL(5,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. RATINGS_REVIEWS TABLE
CREATE TABLE ratings_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. PROMO_CODES TABLE
CREATE TABLE promo_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL, -- 'percentage' or 'fixed'
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_agents_availability ON agents(availability_status);
CREATE INDEX idx_agents_location ON agents USING GIST(current_location);
CREATE INDEX idx_vehicles_availability ON vehicles(is_available);
CREATE INDEX idx_vehicles_type ON vehicles(type);
CREATE INDEX idx_vehicles_location ON vehicles USING GIST(current_location);
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(scheduled_date);
CREATE INDEX idx_bookings_location ON bookings USING GIST(pickup_coordinates);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_emergency_alerts_status ON emergency_alerts(status);
CREATE INDEX idx_emergency_alerts_location ON emergency_alerts USING GIST(location);
CREATE INDEX idx_messages_booking ON messages(booking_id);
CREATE INDEX idx_location_tracking_booking ON location_tracking(booking_id);
CREATE INDEX idx_location_tracking_timestamp ON location_tracking(timestamp);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_emergency_alerts_updated_at BEFORE UPDATE ON emergency_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ratings_reviews_updated_at BEFORE UPDATE ON ratings_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON promo_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is agent
CREATE OR REPLACE FUNCTION is_agent()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'agent';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is client
CREATE OR REPLACE FUNCTION is_client()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'client';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES TABLE POLICIES
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (is_admin());

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (is_admin());

-- AGENTS TABLE POLICIES
-- Agents can view their own agent profile
CREATE POLICY "Agents can view own profile" ON agents
    FOR SELECT USING (auth.uid() = id);

-- Agents can update their own profile
CREATE POLICY "Agents can update own profile" ON agents
    FOR UPDATE USING (auth.uid() = id);

-- Clients can view agent profiles (for booking)
CREATE POLICY "Clients can view agent profiles" ON agents
    FOR SELECT USING (is_client() OR is_admin());

-- Admins can view and update all agent profiles
CREATE POLICY "Admins can manage all agents" ON agents
    FOR ALL USING (is_admin());

-- VEHICLES TABLE POLICIES
-- Everyone can view available vehicles
CREATE POLICY "Anyone can view vehicles" ON vehicles
    FOR SELECT USING (true);

-- Only admins can manage vehicles
CREATE POLICY "Admins can manage vehicles" ON vehicles
    FOR ALL USING (is_admin());

-- SERVICES TABLE POLICIES
-- Everyone can view active services
CREATE POLICY "Anyone can view active services" ON services
    FOR SELECT USING (is_active = true);

-- Only admins can manage services
CREATE POLICY "Admins can manage services" ON services
    FOR ALL USING (is_admin());

-- LOCATIONS TABLE POLICIES
-- Everyone can view locations
CREATE POLICY "Anyone can view locations" ON locations
    FOR SELECT USING (true);

-- Only admins can manage locations
CREATE POLICY "Admins can manage locations" ON locations
    FOR ALL USING (is_admin());

-- BOOKINGS TABLE POLICIES
-- Clients can view their own bookings
CREATE POLICY "Clients can view own bookings" ON bookings
    FOR SELECT USING (auth.uid() = client_id);

-- Clients can create bookings
CREATE POLICY "Clients can create bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Clients can update their own pending bookings
CREATE POLICY "Clients can update own pending bookings" ON bookings
    FOR UPDATE USING (auth.uid() = client_id AND status = 'pending');

-- Agents can view bookings assigned to them
CREATE POLICY "Agents can view assigned bookings" ON bookings
    FOR SELECT USING (auth.uid() = assigned_agent_id);

-- Agents can update status of their assigned bookings
CREATE POLICY "Agents can update assigned booking status" ON bookings
    FOR UPDATE USING (auth.uid() = assigned_agent_id);

-- Admins can view and manage all bookings
CREATE POLICY "Admins can manage all bookings" ON bookings
    FOR ALL USING (is_admin());

-- BOOKING_VEHICLES TABLE POLICIES
-- Users can view booking vehicles for their bookings
CREATE POLICY "Users can view booking vehicles" ON booking_vehicles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = booking_vehicles.booking_id 
            AND (bookings.client_id = auth.uid() OR bookings.assigned_agent_id = auth.uid())
        ) OR is_admin()
    );

-- Admins can manage booking vehicles
CREATE POLICY "Admins can manage booking vehicles" ON booking_vehicles
    FOR ALL USING (is_admin());

-- PAYMENTS TABLE POLICIES
-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (auth.uid() = client_id);

-- Users can create payments for their bookings
CREATE POLICY "Users can create payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Admins can view and manage all payments
CREATE POLICY "Admins can manage all payments" ON payments
    FOR ALL USING (is_admin());

-- EMERGENCY_ALERTS TABLE POLICIES
-- Users can view their own emergency alerts
CREATE POLICY "Users can view own emergency alerts" ON emergency_alerts
    FOR SELECT USING (auth.uid() = client_id);

-- Users can create emergency alerts
CREATE POLICY "Users can create emergency alerts" ON emergency_alerts
    FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Agents can view emergency alerts for their bookings
CREATE POLICY "Agents can view related emergency alerts" ON emergency_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = emergency_alerts.booking_id 
            AND bookings.assigned_agent_id = auth.uid()
        ) OR is_admin()
    );

-- Admins can view and manage all emergency alerts
CREATE POLICY "Admins can manage all emergency alerts" ON emergency_alerts
    FOR ALL USING (is_admin());

-- MESSAGES TABLE POLICIES
-- Users can view messages in their bookings
CREATE POLICY "Users can view booking messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = messages.booking_id 
            AND (bookings.client_id = auth.uid() OR bookings.assigned_agent_id = auth.uid())
        ) OR is_admin()
    );

-- Users can send messages in their bookings
CREATE POLICY "Users can send booking messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = messages.booking_id 
            AND (bookings.client_id = auth.uid() OR bookings.assigned_agent_id = auth.uid())
        )
    );

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (auth.uid() = recipient_id);

-- LOCATION_TRACKING TABLE POLICIES
-- Agents can view location tracking for their bookings
CREATE POLICY "Agents can view own location tracking" ON location_tracking
    FOR SELECT USING (auth.uid() = agent_id);

-- Agents can insert location tracking
CREATE POLICY "Agents can insert location tracking" ON location_tracking
    FOR INSERT WITH CHECK (auth.uid() = agent_id);

-- Clients can view location tracking for their bookings
CREATE POLICY "Clients can view booking location tracking" ON location_tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = location_tracking.booking_id 
            AND bookings.client_id = auth.uid()
        )
    );

-- Admins can view all location tracking
CREATE POLICY "Admins can view all location tracking" ON location_tracking
    FOR SELECT USING (is_admin());

-- RATINGS_REVIEWS TABLE POLICIES
-- Users can view ratings for their bookings
CREATE POLICY "Users can view booking ratings" ON ratings_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = ratings_reviews.booking_id 
            AND (bookings.client_id = auth.uid() OR bookings.assigned_agent_id = auth.uid())
        ) OR is_admin()
    );

-- Clients can create ratings for their completed bookings
CREATE POLICY "Clients can create ratings" ON ratings_reviews
    FOR INSERT WITH CHECK (
        auth.uid() = client_id AND
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = ratings_reviews.booking_id 
            AND bookings.client_id = auth.uid()
            AND bookings.status = 'completed'
        )
    );

-- PROMO_CODES TABLE POLICIES
-- Everyone can view active promo codes
CREATE POLICY "Anyone can view active promo codes" ON promo_codes
    FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- Only admins can manage promo codes
CREATE POLICY "Admins can manage promo codes" ON promo_codes
    FOR ALL USING (is_admin());

-- NOTIFICATIONS TABLE POLICIES
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- System can create notifications for users
CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications" ON notifications
    FOR SELECT USING (is_admin());

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update agent rating
CREATE OR REPLACE FUNCTION update_agent_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE agents 
    SET 
        rating = (
            SELECT AVG(rating)::DECIMAL(3,2) 
            FROM ratings_reviews 
            WHERE agent_id = NEW.agent_id
        ),
        total_jobs = (
            SELECT COUNT(*) 
            FROM bookings 
            WHERE assigned_agent_id = NEW.agent_id 
            AND status = 'completed'
        )
    WHERE id = NEW.agent_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update agent rating when new review is added
CREATE TRIGGER on_rating_added
    AFTER INSERT ON ratings_reviews
    FOR EACH ROW EXECUTE FUNCTION update_agent_rating();

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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Final message
DO $$
BEGIN
    RAISE NOTICE 'Protector.Ng database setup completed successfully!';
    RAISE NOTICE 'Database includes:';
    RAISE NOTICE '- 14 main tables with proper relationships';
    RAISE NOTICE '- Row Level Security policies for data protection';
    RAISE NOTICE '- Initial data for testing and development';
    RAISE NOTICE '- Optimized indexes for performance';
    RAISE NOTICE '- Helper functions for common operations';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create admin user account';
    RAISE NOTICE '2. Test the admin dashboard';
    RAISE NOTICE '3. Deploy to production';
END $$;

