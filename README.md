# 🛡️ Protector.Ng - Executive Protection Services Platform

A comprehensive, production-ready platform for executive protection services built with Next.js 15, featuring real-time booking management, secure payments, and multi-role user interfaces.

## 🚀 Live Demo

- **Client App**: [https://protector-ng.vercel.app](https://protector-ng.vercel.app)
- **Operator Interface**: [https://protector-ng.vercel.app/operator](https://protector-ng.vercel.app/operator)
- **Admin Dashboard**: [https://protector-ng.vercel.app/admin](https://protector-ng.vercel.app/admin)

## ✨ Features

### 🎯 **Client Interface**
- **Service Booking**: Armed/unarmed protection, vehicle services, event security
- **Real-time Chat**: Direct communication with operators
- **Secure Payments**: Stripe integration with dual currency support (NGN/USD)
- **Status Tracking**: Real-time updates on service progress
- **Profile Management**: Complete user profile and booking history

### 🛠️ **Operator Interface**
- **Booking Management**: View and manage all service requests
- **Invoice Creation**: Professional invoicing with detailed pricing breakdowns
- **Payment Processing**: Secure payment approval and confirmation
- **Team Deployment**: Deploy protection teams after payment confirmation
- **Real-time Communication**: Chat with clients and team members

### 📊 **Admin Dashboard**
- **Analytics**: Revenue tracking, booking statistics, performance metrics
- **User Management**: Client and agent account management
- **Service Configuration**: Pricing, vehicles, and service area management
- **Financial Reporting**: Comprehensive financial insights and reporting
- **System Monitoring**: Real-time system health and performance monitoring

## 🛠️ Tech Stack

### **Frontend**
- **Next.js 15** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** components
- **Lucide React** icons

### **Backend & Database**
- **Supabase** (Backend as a Service)
- **PostgreSQL** with Row Level Security (RLS)
- **Real-time subscriptions**
- **Email authentication**

### **Payments**
- **Stripe** for payment processing
- **Multi-currency support** (NGN/USD)
- **Webhook handling**
- **Refund capabilities**

### **Deployment**
- **Vercel** for hosting
- **Custom domain** support
- **SSL certificates**
- **CDN optimization**

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account (for payments)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/protector-ng.git
   cd protector-ng
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   ```

4. **Set up the database**
   - Create a new Supabase project
   - Run the SQL script in `scripts/setup_production.sql`
   - Configure authentication settings

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
protector-ng/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard pages
│   ├── operator/          # Operator interface pages
│   ├── chat/              # Chat system pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── protector-app.tsx # Main client application
│   ├── operator-dashboard.tsx # Operator interface
│   └── admin-dashboard.tsx # Admin dashboard
├── lib/                  # Utility libraries
│   ├── api/             # API functions
│   ├── supabase/        # Database configuration
│   └── types/           # TypeScript type definitions
├── scripts/             # Database setup scripts
├── public/              # Static assets
└── styles/              # Global styles
```

## 🔧 Configuration

### **Database Setup**
1. Create a Supabase project
2. Run `scripts/setup_production.sql` in the SQL editor
3. Configure Row Level Security policies
4. Set up authentication providers

### **Payment Integration**
1. Create a Stripe account
2. Get your API keys
3. Set up webhooks for payment events
4. Configure currency settings

### **Email Configuration**
1. Set up SMTP provider (SendGrid recommended)
2. Configure email templates
3. Test email delivery

## 🚀 Deployment

### **Vercel Deployment**
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with custom domain
4. Configure SSL certificates

### **Environment Variables**
See `DEPLOYMENT_GUIDE.md` for complete setup instructions.

## 📊 Features Overview

### **User Roles**
- **Clients**: Book protection services, make payments, track status
- **Operators**: Manage bookings, create invoices, deploy teams
- **Admins**: Oversee system, view analytics, manage users

### **Service Types**
- **Armed Protection**: Professional armed security personnel
- **Unarmed Protection**: Professional unarmed security personnel
- **Vehicle Only**: Armored vehicle service without personnel
- **Armored Vehicle**: Armored vehicle with security personnel
- **Event Security**: Event security and crowd control

### **Payment Features**
- **Dual Currency**: Nigerian Naira (₦) and US Dollar ($)
- **Real-time Conversion**: Live currency conversion rates
- **Secure Processing**: Stripe-powered payment processing
- **Invoice Management**: Professional invoicing system
- **Refund Support**: Complete refund processing

## 🔒 Security

- **Row Level Security** (RLS) for data protection
- **HTTPS enforcement** for all connections
- **Input validation** and sanitization
- **SQL injection protection**
- **Rate limiting** and abuse prevention
- **Audit logging** for all actions

## 📈 Performance

- **Server-side rendering** with Next.js
- **Image optimization** and lazy loading
- **CDN distribution** via Vercel
- **Database indexing** for optimal queries
- **Real-time updates** with Supabase

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: See `DEPLOYMENT_GUIDE.md` for setup instructions
- **Issues**: Report bugs via GitHub Issues
- **Email**: support@protector.ng

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] GPS tracking integration
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] API documentation
- [ ] Third-party integrations

## 🙏 Acknowledgments

- **Next.js** team for the amazing framework
- **Supabase** for the backend infrastructure
- **Stripe** for payment processing
- **Vercel** for hosting and deployment
- **Radix UI** for accessible components

---

**Built with ❤️ for executive protection services**

**Ready for production use** 🚀