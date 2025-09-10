-- Complete Database Setup for Protector.Ng
-- This script sets up the entire database schema, policies, and initial data

-- Run the schema creation
\i 01_create_database_schema.sql

-- Run the RLS policies
\i 02_setup_rls_policies.sql

-- Run the initial data seeding
\i 03_seed_initial_data.sql

-- Additional setup for production
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_date ON bookings(status, scheduled_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_rating_availability ON agents(rating DESC, availability_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_type_availability ON vehicles(type, is_available);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status_created ON payments(status, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_booking_created ON messages(booking_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_tracking_agent_timestamp ON location_tracking(agent_id, timestamp);

-- Create materialized view for dashboard statistics
CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM profiles WHERE role = 'client' AND is_active = true) as total_clients,
    (SELECT COUNT(*) FROM profiles WHERE role = 'agent' AND is_active = true) as total_agents,
    (SELECT COUNT(*) FROM vehicles WHERE is_available = true) as available_vehicles,
    (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'in_service') as active_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'completed' AND scheduled_date >= CURRENT_DATE - INTERVAL '30 days') as completed_bookings_30d,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '30 days') as revenue_30d;

-- Create function to refresh dashboard stats
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Create function to get nearby agents
CREATE OR REPLACE FUNCTION get_nearby_agents(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    agent_code TEXT,
    first_name TEXT,
    last_name,
    rating DECIMAL,
    distance_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.agent_code,
        p.first_name,
        p.last_name,
        a.rating,
        ST_Distance(
            a.current_location,
            ST_Point(lng, lat)
        ) / 1000 as distance_km
    FROM agents a
    JOIN profiles p ON a.id = p.id
    WHERE a.availability_status = 'available'
    AND a.current_location IS NOT NULL
    AND ST_DWithin(
        a.current_location,
        ST_Point(lng, lat),
        radius_km * 1000
    )
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Create function to get nearby vehicles
CREATE OR REPLACE FUNCTION get_nearby_vehicles(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    vehicle_type TEXT DEFAULT NULL,
    radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    vehicle_code TEXT,
    make TEXT,
    model TEXT,
    type TEXT,
    capacity INTEGER,
    is_armored BOOLEAN,
    distance_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.vehicle_code,
        v.make,
        v.model,
        v.type,
        v.capacity,
        v.is_armored,
        ST_Distance(
            v.current_location,
            ST_Point(lng, lat)
        ) / 1000 as distance_km
    FROM vehicles v
    WHERE v.is_available = true
    AND v.current_location IS NOT NULL
    AND (vehicle_type IS NULL OR v.type = vehicle_type)
    AND ST_DWithin(
        v.current_location,
        ST_Point(lng, lat),
        radius_km * 1000
    )
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate booking price with surge
CREATE OR REPLACE FUNCTION calculate_booking_price(
    service_id UUID,
    duration_hours INTEGER,
    pickup_lat DOUBLE PRECISION,
    pickup_lng DOUBLE PRECISION
)
RETURNS TABLE (
    base_price DECIMAL,
    hourly_rate DECIMAL,
    surge_multiplier DECIMAL,
    total_price DECIMAL
) AS $$
DECLARE
    service_record RECORD;
    location_surge DECIMAL := 1.0;
BEGIN
    -- Get service details
    SELECT * INTO service_record
    FROM services
    WHERE id = service_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service not found';
    END IF;
    
    -- Get surge multiplier for location
    SELECT COALESCE(surge_multiplier, 1.0) INTO location_surge
    FROM locations
    WHERE ST_DWithin(
        coordinates,
        ST_Point(pickup_lng, pickup_lat),
        1000 -- 1km radius
    )
    ORDER BY ST_Distance(coordinates, ST_Point(pickup_lng, pickup_lat))
    LIMIT 1;
    
    RETURN QUERY
    SELECT 
        service_record.base_price,
        COALESCE(service_record.price_per_hour, 0),
        location_surge,
        (service_record.base_price + (COALESCE(service_record.price_per_hour, 0) * duration_hours)) * location_surge;
END;
$$ LANGUAGE plpgsql;

-- Create function to assign best agent to booking
CREATE OR REPLACE FUNCTION assign_best_agent(
    booking_id UUID
)
RETURNS UUID AS $$
DECLARE
    booking_record RECORD;
    best_agent_id UUID;
BEGIN
    -- Get booking details
    SELECT * INTO booking_record
    FROM bookings
    WHERE id = booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;
    
    -- Find best available agent
    SELECT a.id INTO best_agent_id
    FROM agents a
    JOIN profiles p ON a.id = p.id
    WHERE a.availability_status = 'available'
    AND p.is_active = true
    AND (booking_record.service_type != 'armed_protection' OR a.is_armed = true)
    AND a.current_location IS NOT NULL
    ORDER BY 
        a.rating DESC,
        ST_Distance(
            a.current_location,
            ST_Point(
                ST_X(booking_record.pickup_coordinates),
                ST_Y(booking_record.pickup_coordinates)
            )
        )
    LIMIT 1;
    
    -- Update booking with assigned agent
    UPDATE bookings
    SET assigned_agent_id = best_agent_id
    WHERE id = booking_id;
    
    -- Update agent availability
    UPDATE agents
    SET availability_status = 'busy'
    WHERE id = best_agent_id;
    
    RETURN best_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to assign best vehicle to booking
CREATE OR REPLACE FUNCTION assign_best_vehicle(
    booking_id UUID
)
RETURNS UUID AS $$
DECLARE
    booking_record RECORD;
    best_vehicle_id UUID;
BEGIN
    -- Get booking details
    SELECT * INTO booking_record
    FROM bookings
    WHERE id = booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;
    
    -- Find best available vehicle
    SELECT v.id INTO best_vehicle_id
    FROM vehicles v
    WHERE v.is_available = true
    AND v.capacity >= booking_record.protectee_count
    AND v.current_location IS NOT NULL
    ORDER BY 
        ST_Distance(
            v.current_location,
            ST_Point(
                ST_X(booking_record.pickup_coordinates),
                ST_Y(booking_record.pickup_coordinates)
            )
        )
    LIMIT 1;
    
    -- Update booking with assigned vehicle
    UPDATE bookings
    SET assigned_vehicle_id = best_vehicle_id
    WHERE id = booking_id;
    
    -- Update vehicle availability
    UPDATE vehicles
    SET is_available = false
    WHERE id = best_vehicle_id;
    
    RETURN best_vehicle_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to complete booking
CREATE OR REPLACE FUNCTION complete_booking(
    booking_id UUID
)
RETURNS VOID AS $$
DECLARE
    booking_record RECORD;
BEGIN
    -- Get booking details
    SELECT * INTO booking_record
    FROM bookings
    WHERE id = booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;
    
    -- Update booking status
    UPDATE bookings
    SET 
        status = 'completed',
        actual_end_time = NOW()
    WHERE id = booking_id;
    
    -- Free up agent
    IF booking_record.assigned_agent_id IS NOT NULL THEN
        UPDATE agents
        SET availability_status = 'available'
        WHERE id = booking_record.assigned_agent_id;
    END IF;
    
    -- Free up vehicle
    IF booking_record.assigned_vehicle_id IS NOT NULL THEN
        UPDATE vehicles
        SET is_available = true
        WHERE id = booking_record.assigned_vehicle_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to cancel booking
CREATE OR REPLACE FUNCTION cancel_booking(
    booking_id UUID
)
RETURNS VOID AS $$
DECLARE
    booking_record RECORD;
BEGIN
    -- Get booking details
    SELECT * INTO booking_record
    FROM bookings
    WHERE id = booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;
    
    -- Only allow cancellation if booking is pending or accepted
    IF booking_record.status NOT IN ('pending', 'accepted') THEN
        RAISE EXCEPTION 'Cannot cancel booking in current status: %', booking_record.status;
    END IF;
    
    -- Update booking status
    UPDATE bookings
    SET status = 'cancelled'
    WHERE id = booking_id;
    
    -- Free up agent
    IF booking_record.assigned_agent_id IS NOT NULL THEN
        UPDATE agents
        SET availability_status = 'available'
        WHERE id = booking_record.assigned_agent_id;
    END IF;
    
    -- Free up vehicle
    IF booking_record.assigned_vehicle_id IS NOT NULL THEN
        UPDATE vehicles
        SET is_available = true
        WHERE id = booking_record.assigned_vehicle_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create a view for active bookings with details
CREATE VIEW active_bookings_view AS
SELECT 
    b.*,
    c.first_name as client_first_name,
    c.last_name as client_last_name,
    c.phone as client_phone,
    s.name as service_name,
    a.agent_code,
    a.rating as agent_rating,
    CONCAT(p.first_name, ' ', p.last_name) as agent_name,
    v.vehicle_code,
    v.make as vehicle_make,
    v.model as vehicle_model,
    v.type as vehicle_type
FROM bookings b
LEFT JOIN profiles c ON b.client_id = c.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN agents a ON b.assigned_agent_id = a.id
LEFT JOIN profiles p ON a.id = p.id
LEFT JOIN vehicles v ON b.assigned_vehicle_id = v.id
WHERE b.status IN ('pending', 'accepted', 'en_route', 'arrived', 'in_service');

-- Create a view for completed bookings with ratings
CREATE VIEW completed_bookings_view AS
SELECT 
    b.*,
    c.first_name as client_first_name,
    c.last_name as client_last_name,
    s.name as service_name,
    a.agent_code,
    CONCAT(p.first_name, ' ', p.last_name) as agent_name,
    rr.rating as client_rating,
    rr.review as client_review
FROM bookings b
LEFT JOIN profiles c ON b.client_id = c.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN agents a ON b.assigned_agent_id = a.id
LEFT JOIN profiles p ON a.id = p.id
LEFT JOIN ratings_reviews rr ON b.id = rr.booking_id
WHERE b.status = 'completed';

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
    RAISE NOTICE '- Materialized views for dashboard statistics';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Set up environment variables for Supabase';
    RAISE NOTICE '2. Test the API functions';
    RAISE NOTICE '3. Deploy to production';
END $$;

