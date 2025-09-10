# Protector.Ng Database Setup

This directory contains all the necessary SQL scripts to set up the Protector.Ng database schema and initial data.

## Files Overview

### Core Schema Files
- **`01_create_database_schema.sql`** - Creates all database tables, types, and indexes
- **`02_setup_rls_policies.sql`** - Sets up Row Level Security policies for data protection
- **`03_seed_initial_data.sql`** - Populates the database with initial test data

### Setup Scripts
- **`setup_database.sql`** - Complete setup script that runs all other scripts
- **`README.md`** - This documentation file

## Database Schema

### Core Tables
1. **`profiles`** - User profiles (clients, agents, admins)
2. **`agents`** - Security agent details and qualifications
3. **`vehicles`** - Vehicle inventory and specifications
4. **`services`** - Available security services
5. **`locations`** - Geographic locations with surge pricing
6. **`bookings`** - Client booking requests and status
7. **`booking_vehicles`** - Vehicle assignments for convoy bookings
8. **`payments`** - Payment transactions and status
9. **`emergency_alerts`** - Emergency SOS requests
10. **`messages`** - In-app communication
11. **`location_tracking`** - Real-time GPS tracking data
12. **`ratings_reviews`** - Client feedback and ratings
13. **`promo_codes`** - Discount codes and promotions
14. **`notifications`** - User notifications

### Key Features
- **PostGIS Integration** - Geographic data support for location tracking
- **Row Level Security** - Data protection based on user roles
- **Real-time Capabilities** - WebSocket support for live updates
- **Comprehensive Indexing** - Optimized for performance
- **Helper Functions** - Common operations like agent assignment

## Setup Instructions

### Option 1: Complete Setup (Recommended)
```sql
-- Run the complete setup script
\i setup_database.sql
```

### Option 2: Step-by-Step Setup
```sql
-- 1. Create schema
\i 01_create_database_schema.sql

-- 2. Set up security policies
\i 02_setup_rls_policies.sql

-- 3. Add initial data
\i 03_seed_initial_data.sql
```

## Environment Variables Required

Make sure these environment variables are set in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## User Roles

The system supports three user roles:

### Client
- Can create and manage bookings
- Can view assigned agents and vehicles
- Can send messages and emergency alerts
- Can rate completed services

### Agent
- Can view assigned bookings
- Can update booking status
- Can send location updates
- Can respond to emergency alerts

### Admin
- Full access to all data
- Can manage users, agents, and vehicles
- Can view all bookings and analytics
- Can handle emergency escalations

## Key Functions

### Geographic Functions
- `get_nearby_agents(lat, lng, radius_km)` - Find agents within radius
- `get_nearby_vehicles(lat, lng, vehicle_type, radius_km)` - Find vehicles within radius

### Pricing Functions
- `calculate_booking_price(service_id, duration_hours, lat, lng)` - Calculate total price with surge

### Assignment Functions
- `assign_best_agent(booking_id)` - Automatically assign best available agent
- `assign_best_vehicle(booking_id)` - Automatically assign best available vehicle

### Booking Management
- `complete_booking(booking_id)` - Mark booking as completed
- `cancel_booking(booking_id)` - Cancel booking and free resources

## Security Features

### Row Level Security (RLS)
- Users can only access their own data
- Agents can only see their assigned bookings
- Admins have full access
- Sensitive data is protected

### Data Encryption
- Messages are encrypted by default
- Location data is stored securely
- Payment information is protected

## Performance Optimizations

### Indexes
- Geographic indexes for location queries
- Composite indexes for common queries
- Partial indexes for filtered data

### Materialized Views
- `dashboard_stats` - Pre-computed statistics
- `active_bookings_view` - Current active bookings
- `completed_bookings_view` - Completed bookings with ratings

## Testing Data

The initial data includes:
- 3 sample agents with different qualifications
- 5 vehicles of various types
- 8 major Nigerian locations
- 4 promo codes for testing
- 2 sample bookings
- Sample payments and notifications

## API Integration

The database is designed to work with the TypeScript API functions in `/lib/api/`:
- `AuthAPI` - User authentication and profiles
- `BookingAPI` - Booking management
- `ServicesAPI` - Services, agents, and vehicles
- `RealtimeAPI` - Messages and location tracking
- `PaymentAPI` - Payment processing

## Monitoring and Maintenance

### Regular Tasks
- Refresh materialized views: `SELECT refresh_dashboard_stats();`
- Monitor performance with query analysis
- Update location data as needed
- Clean up old tracking data

### Backup Strategy
- Regular automated backups
- Point-in-time recovery capability
- Data export for compliance

## Troubleshooting

### Common Issues
1. **Permission Errors** - Ensure RLS policies are properly set up
2. **Performance Issues** - Check if indexes are being used
3. **Location Queries** - Verify PostGIS extension is enabled
4. **Real-time Updates** - Check WebSocket connections

### Support
For database-related issues, check:
1. Supabase logs in the dashboard
2. Query performance in the SQL editor
3. RLS policy violations in the logs

## Next Steps

After setting up the database:
1. Test the API functions
2. Set up payment gateway integration
3. Configure real-time subscriptions
4. Deploy to production
5. Set up monitoring and alerts

