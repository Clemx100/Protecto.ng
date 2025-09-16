# Production Supabase Setup Guide

## 🚀 Step 1: Create Production Supabase Project

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Click "New Project"

2. **Project Configuration**
   - **Name**: `protector-ng-production`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users (e.g., `us-east-1` for US, `eu-west-1` for Europe)
   - **Pricing Plan**: Start with Free tier, upgrade as needed

3. **Wait for Setup**
   - Project creation takes 2-3 minutes
   - Note down the project URL and API keys

## 🔧 Step 2: Configure Database Schema

### Run the following SQL scripts in Supabase SQL Editor:

```sql
-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'operator', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  client_id UUID REFERENCES profiles(id),
  service_type TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_address TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  duration TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'en_route', 'arrived', 'in_service', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  source TEXT DEFAULT 'protector.ng',
  client_data JSONB,
  service_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id),
  sender_type TEXT CHECK (sender_type IN ('client', 'operator', 'system')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create services table
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  base_price_ngn INTEGER,
  hourly_rate_ngn INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Insert default services
INSERT INTO services (name, type, base_price_ngn, hourly_rate_ngn, description) VALUES
('Armed Protection Service', 'armed_protection', 100000, 25000, 'Full armed protection with trained personnel'),
('Vehicle Only Service', 'vehicle_only', 50000, 15000, 'Secure vehicle transportation only'),
('Executive Protection', 'executive_protection', 150000, 35000, 'High-level executive protection service'),
('Event Security', 'event_security', 80000, 20000, 'Security for events and gatherings');

-- 6. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Operators can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Operators can update bookings" ON bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('operator', 'admin')
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages for their bookings" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE id = messages.booking_id AND client_id = auth.uid()
    )
  );

CREATE POLICY "Operators can view all messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('operator', 'admin')
    )
  );

-- Services policies
CREATE POLICY "Everyone can view active services" ON services
  FOR SELECT USING (is_active = true);

-- 8. Create indexes for performance
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- 9. Create functions for real-time
CREATE OR REPLACE FUNCTION notify_booking_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('booking_changes', json_build_object(
    'event', TG_OP,
    'id', COALESCE(NEW.id, OLD.id),
    'status', COALESCE(NEW.status, OLD.status)
  )::text);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers
CREATE TRIGGER booking_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION notify_booking_change();
```

## 🔑 Step 3: Get API Keys

1. **Go to Project Settings**
   - In your Supabase dashboard, go to Settings → API

2. **Copy the following values:**
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep this secret!)

## 🔐 Step 4: Configure Environment Variables in Vercel

### For Main App (protector-ng.vercel.app):

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click on `protector-ng` project

2. **Navigate to Settings → Environment Variables**

3. **Add the following variables:**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=https://protector-ng.vercel.app
OPERATOR_DASHBOARD_URL=https://protector-ng-lxtd.vercel.app
NODE_ENV=production
```

### For Operator Dashboard (protector-ng-lxtd.vercel.app):

1. **Go to Vercel Dashboard**
   - Click on `protector-ng-lxtd` project

2. **Navigate to Settings → Environment Variables**

3. **Add the following variables:**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=https://protector-ng-lxtd.vercel.app
MAIN_APP_URL=https://protector-ng.vercel.app
NODE_ENV=production
```

## 🧪 Step 5: Test Real-Time Communication

### Test Script:

```javascript
// test-realtime.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://your-project-id.supabase.co';
const supabaseKey = 'your_anon_key_here';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test real-time subscription
const channel = supabase
  .channel('test-bookings')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'bookings'
  }, (payload) => {
    console.log('New booking received:', payload);
  })
  .subscribe();

console.log('Listening for real-time updates...');
```

## 📊 Step 6: Monitor and Optimize

1. **Enable Database Monitoring**
   - Go to Supabase Dashboard → Settings → Database
   - Enable query monitoring and performance insights

2. **Set up Alerts**
   - Configure alerts for high CPU usage, slow queries, etc.

3. **Backup Strategy**
   - Enable automatic backups
   - Set up point-in-time recovery

## 🚀 Step 7: Deploy and Test

1. **Redeploy both applications** after setting environment variables
2. **Test the complete flow:**
   - Create a booking on main app
   - Verify it appears in operator dashboard
   - Test real-time updates
   - Test payment flow
   - Test status updates

## 🔒 Security Checklist

- [ ] RLS policies are enabled
- [ ] Service role key is kept secret
- [ ] API keys are in environment variables
- [ ] Database password is strong
- [ ] HTTPS is enabled
- [ ] CORS is properly configured

## 📞 Support

If you encounter any issues:
1. Check Supabase logs in the dashboard
2. Check Vercel function logs
3. Verify environment variables are set correctly
4. Test database connection manually

---

**Next Steps:**
1. Follow this guide to set up production Supabase
2. Configure environment variables in Vercel
3. Test real-time communication
4. Monitor performance and optimize as needed
