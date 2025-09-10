# Production Deployment Guide - Protector.Ng

## 🚀 Quick Start: Deploy to Production

### **Step 1: Set Up Production Supabase**

1. **Create Supabase Project**
   ```bash
   # Go to https://supabase.com
   # Create new project
   # Note down your project URL and anon key
   ```

2. **Run Database Setup**
   ```bash
   # Copy scripts/setup_production.sql
   # Run in Supabase SQL Editor
   # This creates all tables, policies, and initial data
   ```

3. **Configure Authentication**
   - Go to Authentication > Settings
   - Set Site URL to your production domain
   - Configure email templates
   - Set up email provider (SendGrid recommended)

### **Step 2: Set Up Payment Processing**

1. **Create Stripe Account**
   ```bash
   # Go to https://stripe.com
   # Create account and get API keys
   # Set up webhooks for payment events
   ```

2. **Configure Webhooks**
   - Endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

### **Step 3: Deploy to Vercel**

1. **Prepare Environment Variables**
   ```bash
   # Create .env.production file
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   ```

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   
   # Set environment variables in Vercel dashboard
   ```

### **Step 4: Configure Domain**

1. **Custom Domain**
   - Add domain in Vercel dashboard
   - Update DNS records
   - Configure SSL certificate

2. **Update Supabase Settings**
   - Update Site URL in Supabase
   - Add domain to allowed origins

## 📋 Pre-Deployment Checklist

### **Database Setup**
- [ ] Production Supabase project created
- [ ] Database schema deployed
- [ ] RLS policies configured
- [ ] Initial data seeded
- [ ] Admin accounts created

### **Authentication**
- [ ] Email provider configured
- [ ] Email templates customized
- [ ] Password reset flow tested
- [ ] User registration flow tested

### **Payment Integration**
- [ ] Stripe account created
- [ ] API keys configured
- [ ] Webhooks set up
- [ ] Payment flow tested
- [ ] Refund process tested

### **Application**
- [ ] Environment variables set
- [ ] Production build tested
- [ ] All features working
- [ ] Error handling in place
- [ ] Monitoring configured

### **Security**
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Input validation
- [ ] SQL injection protection

## 🔧 Environment Configuration

### **Required Environment Variables**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=Protector.Ng
```

### **Optional Environment Variables**

```bash
# Monitoring
SENTRY_DSN=your_sentry_dsn
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PAYMENTS=true
NEXT_PUBLIC_ENABLE_REAL_TIME=true
```

## 🛠️ Post-Deployment Setup

### **1. Create Admin Accounts**

```sql
-- Run in Supabase SQL Editor
INSERT INTO profiles (id, first_name, last_name, email, role, phone)
VALUES (
  'admin-001',
  'Admin',
  'User',
  'admin@yourdomain.com',
  'admin',
  '+234-800-000-0000'
);
```

### **2. Configure Services**

```sql
-- Update service pricing
UPDATE services SET 
  base_price_ngn = 100000,
  hourly_rate_ngn = 25000
WHERE type = 'armed_protection';
```

### **3. Set Up Monitoring**

```bash
# Install monitoring tools
npm install @sentry/nextjs

# Configure Sentry
# Add to next.config.js
```

### **4. Test All Features**

- [ ] User registration
- [ ] Email verification
- [ ] Service booking
- [ ] Payment processing
- [ ] Operator interface
- [ ] Admin dashboard
- [ ] Real-time chat

## 📊 Production Monitoring

### **Key Metrics to Track**

1. **Performance**
   - Page load times
   - API response times
   - Database query performance
   - Error rates

2. **Business**
   - User registrations
   - Service bookings
   - Payment success rate
   - User engagement

3. **Technical**
   - Server uptime
   - Memory usage
   - CPU usage
   - Database connections

### **Monitoring Tools**

- **Vercel Analytics** - Built-in performance monitoring
- **Sentry** - Error tracking and performance
- **Supabase Dashboard** - Database monitoring
- **Stripe Dashboard** - Payment monitoring

## 🔒 Security Best Practices

### **Application Security**

1. **Input Validation**
   - Validate all user inputs
   - Sanitize data before processing
   - Use TypeScript for type safety

2. **Authentication**
   - Implement proper session management
   - Use secure password policies
   - Enable two-factor authentication

3. **API Security**
   - Rate limiting
   - CORS configuration
   - API key management

### **Database Security**

1. **Row Level Security**
   - All tables have RLS enabled
   - Proper policies for data access
   - Regular policy audits

2. **Data Protection**
   - Encrypt sensitive data
   - Regular backups
   - Access logging

## 🚨 Troubleshooting

### **Common Issues**

1. **Authentication Errors**
   - Check Supabase configuration
   - Verify email settings
   - Check CORS settings

2. **Payment Issues**
   - Verify Stripe keys
   - Check webhook configuration
   - Test payment flow

3. **Database Errors**
   - Check RLS policies
   - Verify table permissions
   - Check connection limits

### **Debug Steps**

1. **Check Logs**
   - Vercel function logs
   - Supabase logs
   - Browser console

2. **Test Endpoints**
   - API endpoints
   - Database queries
   - Authentication flow

3. **Verify Configuration**
   - Environment variables
   - Database schema
   - Third-party services

## 📞 Support & Maintenance

### **Regular Maintenance**

- **Daily**: Check system health
- **Weekly**: Review error logs
- **Monthly**: Update dependencies
- **Quarterly**: Security audit

### **Backup Strategy**

- **Database**: Daily automated backups
- **Code**: Git repository
- **Files**: Vercel file system
- **Configuration**: Environment variables

### **Scaling Considerations**

- **Database**: Supabase auto-scaling
- **CDN**: Vercel Edge Network
- **Caching**: Redis for session storage
- **Load Balancing**: Vercel handles this

---

## 🎉 Launch Checklist

- [ ] Production environment configured
- [ ] Database set up and tested
- [ ] Payment processing working
- [ ] All features tested
- [ ] Monitoring configured
- [ ] Security measures in place
- [ ] Admin accounts created
- [ ] Documentation updated
- [ ] Team trained on system
- [ ] Launch plan ready

**Ready to launch!** 🚀
