# Protector.Ng Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **pnpm**
3. **Supabase account** and project
4. **Git**

## Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Payment Gateway Configuration (Optional for now)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Protector.Ng
```

## Database Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

### 2. Run Database Scripts
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the scripts in this order:
   ```sql
   -- Run the complete setup
   \i scripts/setup_database.sql
   ```

   Or run them individually:
   ```sql
   \i scripts/01_create_database_schema.sql
   \i scripts/02_setup_rls_policies.sql
   \i scripts/03_seed_initial_data.sql
   ```

### 3. Verify Setup
Check that these tables were created:
- profiles
- agents
- vehicles
- services
- locations
- bookings
- payments
- emergency_alerts
- messages
- location_tracking
- ratings_reviews
- promo_codes
- notifications

## Installation

### 1. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 2. Start Development Server
```bash
npm run dev
# or
pnpm dev
```

### 3. Open Application
Navigate to [http://localhost:3000](http://localhost:3000)

## Testing the Integration

### 1. Test Authentication
- Try registering a new account
- Test login/logout functionality
- Verify user profile creation

### 2. Test Services
- Check if services load from database
- Test location search functionality
- Verify agent and vehicle data

### 3. Test Booking
- Create a test booking
- Check if it appears in the bookings tab
- Test booking status updates

## Key Features Implemented

### ✅ Authentication
- User registration and login
- Profile management
- Role-based access control

### ✅ Database Integration
- Complete Supabase schema
- Real-time data synchronization
- Secure data access with RLS

### ✅ Booking System
- Service selection
- Location-based booking
- Real-time status updates
- Booking history

### ✅ Real-time Features
- Live messaging
- Location tracking
- Emergency alerts
- Push notifications

### ✅ Mobile Optimization
- Responsive design
- Touch-friendly interface
- PWA capabilities

## API Endpoints

The application uses these API functions:

### Authentication
- `AuthAPI.signUp()` - User registration
- `AuthAPI.signIn()` - User login
- `AuthAPI.signOut()` - User logout
- `AuthAPI.getCurrentUser()` - Get current user

### Bookings
- `BookingAPI.createBooking()` - Create new booking
- `BookingAPI.getUserBookings()` - Get user bookings
- `BookingAPI.cancelBooking()` - Cancel booking
- `BookingAPI.updateBooking()` - Update booking status

### Services
- `ServicesAPI.getServices()` - Get available services
- `ServicesAPI.getLocations()` - Get locations
- `ServicesAPI.getAvailableAgents()` - Get available agents
- `ServicesAPI.getAvailableVehicles()` - Get available vehicles

### Real-time
- `RealtimeAPI.sendMessage()` - Send message
- `RealtimeAPI.getBookingMessages()` - Get chat messages
- `RealtimeAPI.createEmergencyAlert()` - Create emergency alert
- `RealtimeAPI.updateLocation()` - Update location

### Payments
- `PaymentAPI.createPayment()` - Create payment
- `PaymentAPI.processPaystackPayment()` - Process Paystack payment
- `PaymentAPI.verifyPayment()` - Verify payment

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check Supabase URL and key
   - Verify database scripts were run
   - Check RLS policies

2. **Authentication Not Working**
   - Verify Supabase auth is enabled
   - Check user registration flow
   - Verify profile creation

3. **Real-time Features Not Working**
   - Check WebSocket connection
   - Verify Supabase real-time is enabled
   - Check subscription setup

4. **Location Services Not Working**
   - Check browser permissions
   - Verify HTTPS in production
   - Check geolocation API

### Debug Mode

Enable debug logging by adding to your `.env.local`:
```env
NEXT_PUBLIC_DEBUG=true
```

## Next Steps

1. **Payment Integration**
   - Set up Paystack account
   - Configure payment processing
   - Test payment flow

2. **Production Deployment**
   - Set up production Supabase
   - Configure environment variables
   - Deploy to Vercel/Netlify

3. **Mobile App**
   - Set up PWA manifest
   - Configure service worker
   - Test mobile features

4. **Admin Dashboard**
   - Create admin interface
   - Add management features
   - Set up analytics

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check Supabase logs
4. Contact the development team

## Security Notes

- All data is protected with Row Level Security
- User authentication is handled by Supabase
- Sensitive data is encrypted
- API keys should be kept secure
- Regular security audits recommended

