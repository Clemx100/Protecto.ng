-- Row Level Security (RLS) Policies for Protector.Ng
-- This file sets up security policies to ensure data privacy and proper access control

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

