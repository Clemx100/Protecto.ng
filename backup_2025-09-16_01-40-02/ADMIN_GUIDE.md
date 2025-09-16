# Protector.Ng Admin Dashboard Guide

## Overview

The Protector.Ng Admin Dashboard is a comprehensive management interface for administrators to oversee all aspects of the security service platform. It provides real-time monitoring, agent management, booking oversight, and detailed analytics.

## Access

### Admin Access
- Navigate to `/admin` to access the main dashboard
- Navigate to `/admin/analytics` for detailed analytics
- Only users with `admin` role can access these pages
- Automatic redirect to login if not authenticated

### Role-Based Security
- **Admin**: Full access to all features
- **Agent**: Limited access to assigned bookings
- **Client**: Access to their own bookings only

## Dashboard Features

### 1. Overview Tab
**Real-time monitoring of key metrics**

#### Key Metrics Cards
- **Total Clients**: Number of registered clients
- **Active Agents**: Number of available security agents
- **Available Vehicles**: Number of operational vehicles
- **Active Bookings**: Current bookings in progress

#### Revenue & Emergency Alerts
- **Revenue (30 Days)**: Total revenue from completed bookings
- **Emergency Alerts**: Number of active emergency alerts

#### Recent Activity
- Live feed of recent bookings
- Real-time status updates
- Quick access to booking details

### 2. Analytics Tab
**Comprehensive data analysis and reporting**

#### Available Analytics
- **Overview Analytics**: Key performance indicators
- **Booking Analytics**: Service performance metrics
- **Financial Analytics**: Revenue and payment analysis
- **Agent Performance**: Agent ratings and performance

#### Features
- **Date Range Filtering**: Analyze data for specific periods
- **Export Functionality**: Download data as CSV/Excel
- **Interactive Charts**: Visual representation of trends
- **Real-time Updates**: Live data synchronization

### 3. Bookings Tab
**Complete booking management system**

#### Booking Management
- **View All Bookings**: Complete booking history
- **Filter by Status**: Pending, accepted, in-service, completed
- **Search & Sort**: Find specific bookings quickly
- **Bulk Actions**: Manage multiple bookings

#### Assignment Features
- **Agent Assignment**: Assign agents to bookings
- **Vehicle Assignment**: Assign vehicles to bookings
- **Status Updates**: Change booking status
- **Manual Override**: Override automatic assignments

#### Booking Details
- **Client Information**: Contact and profile details
- **Service Details**: Service type and requirements
- **Location Data**: Pickup and destination addresses
- **Pricing Information**: Cost breakdown and payment status

### 4. Agents Tab
**Agent management and oversight**

#### Agent Management
- **View All Agents**: Complete agent directory
- **Filter by Status**: Available, busy, offline
- **Search Agents**: Find specific agents
- **Performance Metrics**: Ratings and job history

#### Agent Actions
- **Approve Agents**: Approve new agent registrations
- **Update Status**: Change agent availability
- **View Profile**: Complete agent information
- **Performance Review**: Ratings and feedback

#### Agent Information
- **Personal Details**: Name, contact, qualifications
- **Professional Info**: License, experience, ratings
- **Availability Status**: Current availability
- **Location Tracking**: Real-time location data

### 5. Vehicles Tab
**Vehicle fleet management**

#### Vehicle Management
- **Fleet Overview**: All vehicles in the system
- **Availability Status**: Available/unavailable vehicles
- **Maintenance Tracking**: Service history and schedules
- **Location Monitoring**: Real-time vehicle locations

#### Vehicle Actions
- **Update Status**: Mark vehicles as available/unavailable
- **Assign to Bookings**: Assign vehicles to specific bookings
- **Maintenance Records**: Track service and repairs
- **Performance Metrics**: Utilization and efficiency

#### Vehicle Information
- **Specifications**: Make, model, year, capacity
- **Features**: Armored, equipment, capabilities
- **Status**: Operational status and availability
- **Location**: Current and historical locations

### 6. Emergency Tab
**Emergency response and control center**

#### Emergency Management
- **Active Alerts**: Real-time emergency notifications
- **Alert History**: Complete emergency log
- **Response Tracking**: Agent response times
- **Resolution Status**: Alert resolution tracking

#### Emergency Actions
- **Assign Response**: Assign agents to emergencies
- **Escalate Alerts**: Escalate to higher authorities
- **Update Status**: Mark alerts as resolved
- **Communication**: Direct communication with clients

#### Emergency Information
- **Alert Details**: Type, location, description
- **Client Information**: Emergency contact details
- **Response Team**: Assigned agents and vehicles
- **Timeline**: Alert creation and response times

### 7. Users Tab
**User account management**

#### User Management
- **User Directory**: All registered users
- **Role Management**: Assign and change user roles
- **Account Status**: Activate/deactivate accounts
- **Profile Management**: Update user information

#### User Actions
- **Activate/Deactivate**: Enable or disable accounts
- **Role Changes**: Promote users to different roles
- **Profile Updates**: Modify user information
- **Account Monitoring**: Track user activity

## Real-time Features

### Live Updates
- **WebSocket Integration**: Real-time data synchronization
- **Automatic Refresh**: Data updates without page reload
- **Push Notifications**: Instant alerts for important events
- **Status Changes**: Live booking and agent status updates

### Notifications
- **Emergency Alerts**: Immediate emergency notifications
- **Booking Updates**: Status change notifications
- **System Alerts**: System health and performance alerts
- **Agent Updates**: Agent availability and location changes

## Analytics & Reporting

### Dashboard Analytics
- **Key Performance Indicators**: Revenue, bookings, agents
- **Trend Analysis**: Historical data and patterns
- **Performance Metrics**: Agent and service performance
- **Financial Reports**: Revenue and payment analysis

### Export Features
- **Data Export**: Download data in CSV/Excel format
- **Report Generation**: Automated report creation
- **Custom Date Ranges**: Flexible reporting periods
- **Filtered Exports**: Export specific data subsets

### Charts & Visualizations
- **Revenue Trends**: Revenue over time
- **Booking Patterns**: Booking frequency and types
- **Agent Performance**: Agent ratings and job counts
- **Geographic Data**: Location-based analytics

## Security Features

### Access Control
- **Role-Based Access**: Different access levels for different roles
- **Authentication**: Secure login and session management
- **Authorization**: Permission-based feature access
- **Audit Logging**: Track all admin actions

### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **Privacy Controls**: User data protection
- **Secure Communication**: Encrypted messaging
- **Compliance**: GDPR/NDPR compliance

## Best Practices

### Daily Operations
1. **Monitor Dashboard**: Check overview metrics daily
2. **Review Bookings**: Ensure all bookings are properly assigned
3. **Check Agents**: Verify agent availability and performance
4. **Emergency Readiness**: Ensure emergency response is ready

### Weekly Tasks
1. **Analytics Review**: Analyze performance trends
2. **Agent Performance**: Review agent ratings and feedback
3. **Vehicle Maintenance**: Check vehicle status and maintenance
4. **User Management**: Review user accounts and roles

### Monthly Tasks
1. **Financial Reports**: Generate revenue and payment reports
2. **Performance Analysis**: Comprehensive performance review
3. **System Health**: Check system performance and alerts
4. **Data Export**: Backup important data

## Troubleshooting

### Common Issues

#### Dashboard Not Loading
- Check internet connection
- Verify admin role permissions
- Clear browser cache
- Check Supabase connection

#### Real-time Updates Not Working
- Check WebSocket connection
- Verify browser compatibility
- Check network firewall settings
- Refresh the page

#### Data Not Updating
- Check database connection
- Verify API endpoints
- Check for error messages
- Contact technical support

#### Export Issues
- Check file permissions
- Verify data availability
- Check export format
- Try different date ranges

### Error Messages

#### "Access Denied"
- User doesn't have admin role
- Session expired
- Invalid permissions

#### "Data Not Found"
- No data for selected criteria
- Database connection issue
- Invalid date range

#### "Export Failed"
- File system permissions
- Data too large
- Network connectivity

## Support

### Technical Support
- Check system logs for errors
- Verify database connectivity
- Test API endpoints
- Contact development team

### User Support
- Provide user training
- Create user documentation
- Set up user accounts
- Manage user permissions

## Updates & Maintenance

### Regular Updates
- Keep system updated
- Monitor performance
- Update documentation
- Train users on new features

### Maintenance Tasks
- Database optimization
- Performance monitoring
- Security updates
- Backup verification

---

For additional support or questions, contact the development team or refer to the technical documentation.

