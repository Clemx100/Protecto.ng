-- Setup Operator Account and Fix Booking Synchronization
-- This script creates an operator account and applies all necessary database changes

-- 1. Add operator role to existing enum (if not already added)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typtype = 'e') THEN
        CREATE TYPE user_role AS ENUM ('client', 'agent', 'operator', 'admin');
    ELSE
        -- Add operator to existing enum if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'operator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
            ALTER TYPE user_role ADD VALUE 'operator';
        END IF;
    END IF;
END $$;

-- 2. Create operator account
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'operator@protector.ng',
    crypt('operator123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (email) DO NOTHING;

-- 3. Create operator profile
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    phone,
    is_verified,
    is_active,
    created_at,
    updated_at
)
SELECT 
    u.id,
    'operator@protector.ng',
    'Protector',
    'Operator',
    'operator',
    '+234-800-000-0000',
    true,
    true,
    NOW(),
    NOW()
FROM auth.users u
WHERE u.email = 'operator@protector.ng'
ON CONFLICT (id) DO UPDATE SET
    role = 'operator',
    updated_at = NOW();

-- 4. Add operator helper function
CREATE OR REPLACE FUNCTION is_operator()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'operator';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add operator RLS policies for bookings
CREATE POLICY "Operators can view all bookings" ON bookings
    FOR SELECT USING (is_operator() OR is_admin());

CREATE POLICY "Operators can update booking status" ON bookings
    FOR UPDATE USING (is_operator() OR is_admin());

-- 6. Add operator RLS policies for messages
CREATE POLICY "Operators can view all messages" ON messages
    FOR SELECT USING (is_operator() OR is_admin());

CREATE POLICY "Operators can send messages" ON messages
    FOR INSERT WITH CHECK (is_operator() OR is_admin());

-- 7. Create default services if they don't exist
INSERT INTO services (name, type, description, base_price, price_per_hour, minimum_duration, is_active)
VALUES 
    ('Armed Protection Service', 'armed_protection', 'Professional armed security protection', 100000, 25000, 4, true),
    ('Vehicle Only Service', 'unarmed_protection', 'Vehicle transportation service', 50000, 15000, 4, true)
ON CONFLICT (name) DO NOTHING;

-- 8. Create some sample locations
INSERT INTO locations (name, address, coordinates, city, state, country, is_high_risk, surge_multiplier)
VALUES 
    ('Lagos Island', 'Lagos Island, Lagos', 'POINT(3.3792 6.5244)', 'Lagos', 'Lagos', 'Nigeria', false, 1.0),
    ('Victoria Island', 'Victoria Island, Lagos', 'POINT(3.4212 6.4281)', 'Lagos', 'Lagos', 'Nigeria', false, 1.2),
    ('Abuja Central', 'Central Business District, Abuja', 'POINT(7.3986 9.0765)', 'Abuja', 'FCT', 'Nigeria', false, 1.0),
    ('Port Harcourt City', 'Port Harcourt, Rivers', 'POINT(7.0498 4.8156)', 'Port Harcourt', 'Rivers', 'Nigeria', false, 1.1)
ON CONFLICT (name) DO NOTHING;

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 10. Enable real-time for bookings and messages tables
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_client_status ON bookings(client_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_booking_created ON messages(booking_id, created_at);

-- 12. Create notification for new bookings
CREATE OR REPLACE FUNCTION notify_new_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notification for operators
    INSERT INTO notifications (user_id, title, message, type, data)
    SELECT 
        p.id,
        'New Booking Request',
        'New protection request #' || NEW.booking_code || ' from ' || COALESCE(NEW.pickup_address, 'Unknown location'),
        'booking',
        jsonb_build_object(
            'booking_id', NEW.id,
            'booking_code', NEW.booking_code,
            'client_id', NEW.client_id,
            'service_type', NEW.service_type,
            'pickup_address', NEW.pickup_address
        )
    FROM profiles p
    WHERE p.role = 'operator' OR p.role = 'admin';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create trigger for new booking notifications
DROP TRIGGER IF EXISTS on_booking_created ON bookings;
CREATE TRIGGER on_booking_created
    AFTER INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION notify_new_booking();

-- 14. Create function to handle booking status updates
CREATE OR REPLACE FUNCTION handle_booking_status_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify client when booking status changes
    IF OLD.status != NEW.status THEN
        INSERT INTO notifications (user_id, title, message, type, data)
        VALUES (
            NEW.client_id,
            'Booking Status Update',
            'Your booking #' || NEW.booking_code || ' status has been updated to: ' || NEW.status,
            'booking_status',
            jsonb_build_object(
                'booking_id', NEW.id,
                'booking_code', NEW.booking_code,
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create trigger for booking status updates
DROP TRIGGER IF EXISTS on_booking_status_updated ON bookings;
CREATE TRIGGER on_booking_status_updated
    AFTER UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION handle_booking_status_update();

-- 16. Create function to handle new messages
CREATE OR REPLACE FUNCTION handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
    booking_client_id UUID;
    booking_agent_id UUID;
BEGIN
    -- Get booking participants
    SELECT client_id, assigned_agent_id INTO booking_client_id, booking_agent_id
    FROM bookings
    WHERE id = NEW.booking_id;
    
    -- Notify the recipient
    IF NEW.recipient_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, data)
        VALUES (
            NEW.recipient_id,
            'New Message',
            'You have a new message in booking #' || NEW.booking_id,
            'message',
            jsonb_build_object(
                'booking_id', NEW.booking_id,
                'message_id', NEW.id,
                'sender_id', NEW.sender_id
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Create trigger for new messages
DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION handle_new_message();

-- 18. Create a view for operator dashboard
CREATE OR REPLACE VIEW operator_bookings_view AS
SELECT 
    b.*,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    s.name as service_name,
    s.description as service_description
FROM bookings b
LEFT JOIN profiles p ON b.client_id = p.id
LEFT JOIN services s ON b.service_id = s.id
ORDER BY b.created_at DESC;

-- 19. Grant access to the view
GRANT SELECT ON operator_bookings_view TO authenticated;

-- 20. Create a function to get operator dashboard stats
CREATE OR REPLACE FUNCTION get_operator_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_bookings', (SELECT COUNT(*) FROM bookings),
        'pending_bookings', (SELECT COUNT(*) FROM bookings WHERE status = 'pending'),
        'active_bookings', (SELECT COUNT(*) FROM bookings WHERE status IN ('accepted', 'en_route', 'arrived', 'in_service')),
        'completed_bookings', (SELECT COUNT(*) FROM bookings WHERE status = 'completed'),
        'today_bookings', (SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = CURRENT_DATE),
        'recent_bookings', (
            SELECT json_agg(
                json_build_object(
                    'id', id,
                    'booking_code', booking_code,
                    'client_name', (SELECT first_name || ' ' || last_name FROM profiles WHERE id = client_id),
                    'service_type', service_type,
                    'status', status,
                    'created_at', created_at
                )
            )
            FROM bookings
            ORDER BY created_at DESC
            LIMIT 10
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 21. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_operator_dashboard_stats() TO authenticated;

COMMIT;
