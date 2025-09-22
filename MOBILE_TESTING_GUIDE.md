# 📱 Mobile Testing Guide

## 🌐 Your Local Server Details
- **Computer IP:** `192.168.1.143`
- **Port:** `3000`
- **Mobile URL:** `http://192.168.1.143:3000`

## 📋 Testing Steps

### Step 1: Connect Mobile Device
1. **Ensure your phone is on the same WiFi network** as your computer
2. **Open your phone's browser** (Chrome, Safari, etc.)
3. **Navigate to:** `http://192.168.1.143:3000`

### Step 2: Test User Registration
1. **Click "Get Started"** or "Sign Up"
2. **Create a new account** with your phone number
3. **Verify email** (check your email)
4. **Log in** with your credentials

### Step 3: Test Booking Creation
1. **Fill out the booking form:**
   - Service Type: Executive Protection
   - Pickup Location: Your current location
   - Destination: Any destination
   - Date: Tomorrow
   - Time: 9:00 AM
   - Duration: 8 hours
   - Personnel: 1 protectee, 2 protectors
2. **Complete the booking process**
3. **Verify booking is created**

### Step 4: Test Operator Dashboard
1. **Open operator dashboard:** `http://192.168.1.143:3000/operator`
2. **Log in as operator** (use operator credentials)
3. **Verify the booking appears** in the dashboard
4. **Test real-time updates** by updating booking status

## 🔧 Troubleshooting

### If Mobile Can't Connect:
1. **Check firewall settings** - Windows might be blocking connections
2. **Try different port** - Run `npm run dev -- -p 3001`
3. **Check network** - Ensure both devices are on same WiFi

### If Booking Doesn't Appear:
1. **Check browser console** for errors
2. **Verify authentication** - User must be logged in
3. **Check database** - Run `node test-mobile-users.js`

## ✅ Success Indicators
- [ ] Mobile device can access the app
- [ ] User can register and log in
- [ ] Booking creation works without errors
- [ ] Booking appears on operator dashboard
- [ ] Real-time updates work

## 🚀 Next Steps
Once mobile testing is successful, we'll fix the Vercel deployment issue.
