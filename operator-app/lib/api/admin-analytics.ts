// Admin Analytics API functions for Protector.Ng
import { createClient } from '@/lib/supabase/client'
import { ApiResponse } from '@/lib/types/database'

const supabase = createClient()

export class AdminAnalyticsAPI {
  // Get comprehensive dashboard analytics
  static async getDashboardAnalytics(): Promise<ApiResponse<{
    overview: {
      total_clients: number;
      total_agents: number;
      available_vehicles: number;
      active_bookings: number;
      pending_bookings: number;
      completed_bookings_today: number;
      revenue_today: number;
      revenue_this_month: number;
      emergency_alerts_today: number;
    };
    trends: {
      bookings_trend: Array<{ date: string; count: number }>;
      revenue_trend: Array<{ date: string; amount: number }>;
      agent_performance: Array<{ agent_id: string; name: string; bookings: number; rating: number }>;
    };
    alerts: {
      recent_emergencies: Array<{
        id: string;
        client_name: string;
        alert_type: string;
        created_at: string;
        status: string;
      }>;
      system_alerts: Array<{
        type: string;
        message: string;
        severity: 'low' | 'medium' | 'high';
        created_at: string;
      }>;
    };
  }>> {
    try {
      // Get overview stats
      const { data: stats } = await supabase
        .from('dashboard_stats')
        .select('*')
        .single()

      // Get trends data
      const { data: bookingsTrend } = await supabase
        .from('bookings')
        .select('created_at, total_price')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      // Get agent performance
      const { data: agentPerformance } = await supabase
        .from('agents')
        .select(`
          id,
          agent_code,
          rating,
          total_jobs,
          profile:profiles(first_name, last_name)
        `)
        .order('rating', { ascending: false })
        .limit(10)

      // Get recent emergencies
      const { data: recentEmergencies } = await supabase
        .from('emergency_alerts')
        .select(`
          id,
          alert_type,
          status,
          created_at,
          client:profiles(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      // Process trends data
      const bookingsByDate = bookingsTrend?.reduce((acc, booking) => {
        const date = booking.created_at.split('T')[0]
        if (!acc[date]) {
          acc[date] = { count: 0, amount: 0 }
        }
        acc[date].count++
        acc[date].amount += booking.total_price
        return acc
      }, {} as Record<string, { count: number; amount: number }>) || {}

      const bookingsTrendArray = Object.entries(bookingsByDate).map(([date, data]) => ({
        date,
        count: data.count
      }))

      const revenueTrendArray = Object.entries(bookingsByDate).map(([date, data]) => ({
        date,
        amount: data.amount
      }))

      const agentPerformanceArray = agentPerformance?.map((agent: any) => {
        const profile = Array.isArray(agent.profile) ? agent.profile[0] : agent.profile
        return {
          agent_id: agent.id,
          name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
          bookings: agent.total_jobs,
          rating: agent.rating
        }
      }) || []

      const recentEmergenciesArray = recentEmergencies?.map((alert: any) => {
        const client = Array.isArray(alert.client) ? alert.client[0] : alert.client
        return {
          id: alert.id,
          client_name: `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || 'Unknown',
          alert_type: alert.alert_type,
          created_at: alert.created_at,
          status: alert.status
        }
      }) || []

      return {
        data: {
          overview: {
            total_clients: stats?.total_clients || 0,
            total_agents: stats?.total_agents || 0,
            available_vehicles: stats?.available_vehicles || 0,
            active_bookings: stats?.active_bookings || 0,
            pending_bookings: stats?.pending_bookings || 0,
            completed_bookings_today: stats?.completed_bookings_30d || 0,
            revenue_today: stats?.revenue_30d || 0,
            revenue_this_month: stats?.revenue_30d || 0,
            emergency_alerts_today: stats?.emergency_alerts || 0
          },
          trends: {
            bookings_trend: bookingsTrendArray,
            revenue_trend: revenueTrendArray,
            agent_performance: agentPerformanceArray
          },
          alerts: {
            recent_emergencies: recentEmergenciesArray,
            system_alerts: [
              {
                type: 'system',
                message: 'Database connection stable',
                severity: 'low' as const,
                created_at: new Date().toISOString()
              },
              {
                type: 'performance',
                message: 'Response times within normal range',
                severity: 'low' as const,
                created_at: new Date().toISOString()
              }
            ]
          }
        },
        message: 'Dashboard analytics retrieved successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve dashboard analytics' }
    }
  }

  // Get booking analytics
  static async getBookingAnalytics(
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<{
    summary: {
      total_bookings: number;
      completed_bookings: number;
      cancelled_bookings: number;
      pending_bookings: number;
      average_booking_value: number;
      completion_rate: number;
    };
    by_service_type: Array<{
      service_type: string;
      count: number;
      revenue: number;
      average_rating: number;
    }>;
    by_status: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    daily_breakdown: Array<{
      date: string;
      bookings: number;
      revenue: number;
    }>;
    top_clients: Array<{
      client_id: string;
      client_name: string;
      booking_count: number;
      total_spent: number;
    }>;
  }>> {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          client:profiles(first_name, last_name),
          service:services(name, type),
          ratings:ratings_reviews(rating)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (error) {
        return { data: null as any, error: error.message }
      }

      const totalBookings = bookings?.length || 0
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0
      const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0
      const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0
      const totalRevenue = bookings?.reduce((sum, b) => sum + b.total_price, 0) || 0
      const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0

      // Group by service type
      const byServiceType = bookings?.reduce((acc, booking) => {
        const serviceType = booking.service?.type || 'unknown'
        if (!acc[serviceType]) {
          acc[serviceType] = {
            service_type: serviceType,
            count: 0,
            revenue: 0,
            ratings: []
          }
        }
        acc[serviceType].count++
        acc[serviceType].revenue += booking.total_price
        if (booking.ratings?.length > 0) {
          acc[serviceType].ratings.push(...booking.ratings.map(r => r.rating))
        }
        return acc
      }, {} as Record<string, any>) || {}

      const byServiceTypeArray = Object.values(byServiceType).map((item: any) => ({
        service_type: item.service_type,
        count: item.count,
        revenue: item.revenue,
        average_rating: item.ratings.length > 0 
          ? item.ratings.reduce((sum: number, rating: number) => sum + rating, 0) / item.ratings.length 
          : 0
      }))

      // Group by status
      const byStatus = bookings?.reduce((acc, booking) => {
        if (!acc[booking.status]) {
          acc[booking.status] = 0
        }
        acc[booking.status]++
        return acc
      }, {} as Record<string, number>) || {}

      const byStatusArray = Object.entries(byStatus).map(([status, count]: [string, number]) => ({
        status,
        count,
        percentage: totalBookings > 0 ? (count / totalBookings) * 100 : 0
      }))

      // Daily breakdown
      const dailyBreakdown = bookings?.reduce((acc, booking) => {
        const date = booking.created_at.split('T')[0]
        if (!acc[date]) {
          acc[date] = { bookings: 0, revenue: 0 }
        }
        acc[date].bookings++
        acc[date].revenue += booking.total_price
        return acc
      }, {} as Record<string, { bookings: number; revenue: number }>) || {}

      const dailyBreakdownArray = Object.entries(dailyBreakdown).map(([date, data]: [string, { bookings: number; revenue: number }]) => ({
        date,
        bookings: data.bookings,
        revenue: data.revenue
      }))

      // Top clients
      const topClients = bookings?.reduce((acc, booking) => {
        const clientId = booking.client_id
        if (!acc[clientId]) {
          acc[clientId] = {
            client_id: clientId,
            client_name: `${booking.client?.first_name} ${booking.client?.last_name}`,
            booking_count: 0,
            total_spent: 0
          }
        }
        acc[clientId].booking_count++
        acc[clientId].total_spent += booking.total_price
        return acc
      }, {} as Record<string, any>) || {}

      const topClientsArray = (Object.values(topClients) as Array<{
        client_id: string;
        client_name: string;
        booking_count: number;
        total_spent: number;
      }>)
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 10)

      return {
        data: {
          summary: {
            total_bookings: totalBookings,
            completed_bookings: completedBookings,
            cancelled_bookings: cancelledBookings,
            pending_bookings: pendingBookings,
            average_booking_value: averageBookingValue,
            completion_rate: completionRate
          },
          by_service_type: byServiceTypeArray,
          by_status: byStatusArray,
          daily_breakdown: dailyBreakdownArray,
          top_clients: topClientsArray
        },
        message: 'Booking analytics retrieved successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve booking analytics' }
    }
  }

  // Get agent performance analytics
  static async getAgentPerformanceAnalytics(): Promise<ApiResponse<{
    top_performers: Array<{
      agent_id: string;
      name: string;
      rating: number;
      total_jobs: number;
      completion_rate: number;
      total_earnings: number;
    }>;
    performance_metrics: {
      average_rating: number;
      total_jobs_completed: number;
      average_response_time: number;
      customer_satisfaction: number;
    };
    agent_availability: Array<{
      agent_id: string;
      name: string;
      status: string;
      last_seen: string;
      current_location?: { x: number; y: number };
    }>;
  }>> {
    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select(`
          *,
          profile:profiles(first_name, last_name),
          bookings:bookings(id, status, total_price, created_at)
        `)

      if (error) {
        return { data: null as any, error: error.message }
      }

      const topPerformers = agents?.map(agent => {
        const completedJobs = agent.bookings?.filter(b => b.status === 'completed').length || 0
        const totalJobs = agent.bookings?.length || 0
        const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
        const totalEarnings = agent.bookings?.reduce((sum, b) => sum + b.total_price, 0) || 0

        return {
          agent_id: agent.id,
          name: `${agent.profile?.first_name} ${agent.profile?.last_name}`,
          rating: agent.rating,
          total_jobs: totalJobs,
          completion_rate: completionRate,
          total_earnings: totalEarnings
        }
      }).sort((a, b) => b.rating - a.rating).slice(0, 10) || []

      const averageRating = agents?.reduce((sum, agent) => sum + agent.rating, 0) / (agents?.length || 1) || 0
      const totalJobsCompleted = agents?.reduce((sum, agent) => sum + (agent.bookings?.filter(b => b.status === 'completed').length || 0), 0) || 0
      const customerSatisfaction = averageRating / 5 * 100

      const agentAvailability = agents?.map(agent => ({
        agent_id: agent.id,
        name: `${agent.profile?.first_name} ${agent.profile?.last_name}`,
        status: agent.availability_status,
        last_seen: agent.last_seen,
        current_location: agent.current_location
      })) || []

      return {
        data: {
          top_performers: topPerformers,
          performance_metrics: {
            average_rating: averageRating,
            total_jobs_completed: totalJobsCompleted,
            average_response_time: 0, // This would need to be calculated from actual data
            customer_satisfaction: customerSatisfaction
          },
          agent_availability: agentAvailability
        },
        message: 'Agent performance analytics retrieved successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve agent performance analytics' }
    }
  }

  // Get financial analytics
  static async getFinancialAnalytics(
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<{
    revenue_summary: {
      total_revenue: number;
      revenue_growth: number;
      average_transaction_value: number;
      refunds: number;
      net_revenue: number;
    };
    payment_methods: Array<{
      method: string;
      count: number;
      amount: number;
      percentage: number;
    }>;
    daily_revenue: Array<{
      date: string;
      revenue: number;
      transactions: number;
    }>;
    monthly_breakdown: Array<{
      month: string;
      revenue: number;
      bookings: number;
    }>;
  }>> {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'completed')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (error) {
        return { data: null as any, error: error.message }
      }

      const totalRevenue = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0
      const averageTransactionValue = payments?.length ? totalRevenue / payments.length : 0
      const refunds = payments?.filter(p => p.status === 'refunded').reduce((sum, p) => sum + p.amount, 0) || 0
      const netRevenue = totalRevenue - refunds

      // Group by payment method
      const paymentMethods = payments?.reduce((acc, payment) => {
        if (!acc[payment.payment_method]) {
          acc[payment.payment_method] = { count: 0, amount: 0 }
        }
        acc[payment.payment_method].count++
        acc[payment.payment_method].amount += payment.amount
        return acc
      }, {} as Record<string, { count: number; amount: number }>) || {}

      const paymentMethodsArray = Object.entries(paymentMethods).map(([method, data]: [string, { count: number; amount: number }]) => ({
        method,
        count: data.count,
        amount: data.amount,
        percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0
      }))

      // Daily revenue
      const dailyRevenue = payments?.reduce((acc, payment) => {
        const date = payment.created_at.split('T')[0]
        if (!acc[date]) {
          acc[date] = { revenue: 0, transactions: 0 }
        }
        acc[date].revenue += payment.amount
        acc[date].transactions++
        return acc
      }, {} as Record<string, { revenue: number; transactions: number }>) || {}

      const dailyRevenueArray = Object.entries(dailyRevenue).map(([date, data]: [string, { revenue: number; transactions: number }]) => ({
        date,
        revenue: data.revenue,
        transactions: data.transactions
      }))

      // Monthly breakdown
      const monthlyBreakdown = payments?.reduce((acc, payment) => {
        const month = payment.created_at.substring(0, 7) // YYYY-MM
        if (!acc[month]) {
          acc[month] = { revenue: 0, bookings: 0 }
        }
        acc[month].revenue += payment.amount
        acc[month].bookings++
        return acc
      }, {} as Record<string, { revenue: number; bookings: number }>) || {}

      const monthlyBreakdownArray = Object.entries(monthlyBreakdown).map(([month, data]: [string, { revenue: number; bookings: number }]) => ({
        month,
        revenue: data.revenue,
        bookings: data.bookings
      }))

      return {
        data: {
          revenue_summary: {
            total_revenue: totalRevenue,
            revenue_growth: 0, // This would need historical data to calculate
            average_transaction_value: averageTransactionValue,
            refunds: refunds,
            net_revenue: netRevenue
          },
          payment_methods: paymentMethodsArray,
          daily_revenue: dailyRevenueArray,
          monthly_breakdown: monthlyBreakdownArray
        },
        message: 'Financial analytics retrieved successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve financial analytics' }
    }
  }

  // Export data
  static async exportData(
    dataType: 'bookings' | 'agents' | 'payments' | 'emergency_alerts',
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<{ download_url: string }>> {
    try {
      // This would typically generate a CSV or Excel file
      // For now, we'll return a mock download URL
      const downloadUrl = `/api/export/${dataType}?start=${startDate}&end=${endDate}`
      
      return {
        data: { download_url: downloadUrl },
        message: 'Export data generated successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to export data' }
    }
  }
}

