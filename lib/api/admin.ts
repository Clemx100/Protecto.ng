// Admin API functions for Protector.Ng
import { createClient } from '@/lib/supabase/client'
import { 
  Profile, 
  Agent, 
  Booking, 
  Vehicle, 
  EmergencyAlert,
  Payment,
  ApiResponse,
  PaginatedResponse 
} from '@/lib/types/database'

const supabase = createClient()

export class AdminAPI {
  // Dashboard Statistics
  static async getDashboardStats(): Promise<ApiResponse<{
    total_clients: number;
    total_agents: number;
    available_vehicles: number;
    pending_bookings: number;
    active_bookings: number;
    completed_bookings_30d: number;
    revenue_30d: number;
    emergency_alerts: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('dashboard_stats')
        .select('*')
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Dashboard stats retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve dashboard stats' }
    }
  }

  // User Management
  static async getAllUsers(
    role?: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<PaginatedResponse<Profile>>> {
    try {
      const offset = (page - 1) * limit
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })

      if (role) {
        query = query.eq('role', role)
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return { data: null as any, error: error.message }
      }

      const totalPages = Math.ceil((count || 0) / limit)

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          limit,
          total_pages: totalPages
        },
        message: 'Users retrieved successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve users' }
    }
  }

  static async updateUserStatus(
    userId: string,
    isActive: boolean
  ): Promise<ApiResponse<Profile>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'User status updated successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to update user status' }
    }
  }

  // Agent Management
  static async getAllAgents(
    status?: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<PaginatedResponse<Agent & { profile: Profile }>>> {
    try {
      const offset = (page - 1) * limit
      let query = supabase
        .from('agents')
        .select(`
          *,
          profile:profiles(*)
        `, { count: 'exact' })

      if (status) {
        query = query.eq('availability_status', status)
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return { data: null as any, error: error.message }
      }

      const totalPages = Math.ceil((count || 0) / limit)

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          limit,
          total_pages: totalPages
        },
        message: 'Agents retrieved successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve agents' }
    }
  }

  static async approveAgent(
    agentId: string,
    approvalData: {
      background_check_status: string;
      is_armed?: boolean;
      weapon_license?: string;
    }
  ): Promise<ApiResponse<Agent>> {
    try {
      const { data, error } = await supabase
        .from('agents')
        .update({
          background_check_status: approvalData.background_check_status,
          is_armed: approvalData.is_armed,
          weapon_license: approvalData.weapon_license,
          availability_status: 'available'
        })
        .eq('id', agentId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Agent approved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to approve agent' }
    }
  }

  static async updateAgentStatus(
    agentId: string,
    status: string
  ): Promise<ApiResponse<Agent>> {
    try {
      const { data, error } = await supabase
        .from('agents')
        .update({ availability_status: status })
        .eq('id', agentId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Agent status updated successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to update agent status' }
    }
  }

  // Booking Management
  static async getAllBookings(
    status?: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<PaginatedResponse<Booking & {
    client: Profile;
    service: any;
    assigned_agent?: Agent & { profile: Profile };
    assigned_vehicle?: Vehicle;
  }>>> {
    try {
      const offset = (page - 1) * limit
      let query = supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(*),
          service:services(*),
          assigned_agent:agents(*, profile:profiles(*)),
          assigned_vehicle:vehicles(*)
        `, { count: 'exact' })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return { data: null as any, error: error.message }
      }

      const totalPages = Math.ceil((count || 0) / limit)

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          limit,
          total_pages: totalPages
        },
        message: 'Bookings retrieved successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve bookings' }
    }
  }

  static async assignAgentToBooking(
    bookingId: string,
    agentId: string
  ): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          assigned_agent_id: agentId,
          status: 'accepted'
        })
        .eq('id', bookingId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      // Update agent status to busy
      await supabase
        .from('agents')
        .update({ availability_status: 'busy' })
        .eq('id', agentId)

      return { data, message: 'Agent assigned successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to assign agent' }
    }
  }

  static async assignVehicleToBooking(
    bookingId: string,
    vehicleId: string
  ): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ assigned_vehicle_id: vehicleId })
        .eq('id', bookingId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      // Update vehicle availability
      await supabase
        .from('vehicles')
        .update({ is_available: false })
        .eq('id', vehicleId)

      return { data, message: 'Vehicle assigned successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to assign vehicle' }
    }
  }

  static async updateBookingStatus(
    bookingId: string,
    status: string
  ): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: status as any })
        .eq('id', bookingId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Booking status updated successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to update booking status' }
    }
  }

  // Vehicle Management
  static async getAllVehicles(
    isAvailable?: boolean,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<PaginatedResponse<Vehicle>>> {
    try {
      const offset = (page - 1) * limit
      let query = supabase
        .from('vehicles')
        .select('*', { count: 'exact' })

      if (isAvailable !== undefined) {
        query = query.eq('is_available', isAvailable)
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return { data: null as any, error: error.message }
      }

      const totalPages = Math.ceil((count || 0) / limit)

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          limit,
          total_pages: totalPages
        },
        message: 'Vehicles retrieved successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve vehicles' }
    }
  }

  static async updateVehicleStatus(
    vehicleId: string,
    isAvailable: boolean
  ): Promise<ApiResponse<Vehicle>> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update({ is_available: isAvailable })
        .eq('id', vehicleId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Vehicle status updated successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to update vehicle status' }
    }
  }

  // Emergency Management
  static async getAllEmergencyAlerts(
    status?: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<PaginatedResponse<EmergencyAlert & {
    client: Profile;
    booking?: Booking;
    responded_by_agent?: Agent & { profile: Profile };
  }>>> {
    try {
      const offset = (page - 1) * limit
      let query = supabase
        .from('emergency_alerts')
        .select(`
          *,
          client:profiles!emergency_alerts_client_id_fkey(*),
          booking:bookings(*),
          responded_by_agent:agents!emergency_alerts_responded_by_fkey(*, profile:profiles(*))
        `, { count: 'exact' })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return { data: null as any, error: error.message }
      }

      const totalPages = Math.ceil((count || 0) / limit)

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          limit,
          total_pages: totalPages
        },
        message: 'Emergency alerts retrieved successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve emergency alerts' }
    }
  }

  static async respondToEmergency(
    alertId: string,
    agentId: string
  ): Promise<ApiResponse<EmergencyAlert>> {
    try {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .update({
          responded_by: agentId,
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Emergency response initiated successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to respond to emergency' }
    }
  }

  // Analytics
  static async getRevenueAnalytics(
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<{
    total_revenue: number;
    daily_revenue: Array<{ date: string; revenue: number }>;
    payment_methods: Array<{ method: string; count: number; amount: number }>;
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

      // Group by date
      const dailyRevenue = payments?.reduce((acc, payment) => {
        const date = payment.created_at.split('T')[0]
        if (!acc[date]) {
          acc[date] = 0
        }
        acc[date] += payment.amount
        return acc
      }, {} as Record<string, number>) || {}

      const dailyRevenueArray = Object.entries(dailyRevenue).map(([date, revenue]: [string, number]) => ({
        date,
        revenue
      }))

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
        ...data
      }))

      return {
        data: {
          total_revenue: totalRevenue,
          daily_revenue: dailyRevenueArray,
          payment_methods: paymentMethodsArray
        },
        message: 'Revenue analytics retrieved successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve revenue analytics' }
    }
  }

  static async getBookingAnalytics(
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<{
    total_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    average_rating: number;
    service_types: Array<{ type: string; count: number }>;
  }>> {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (error) {
        return { data: null as any, error: error.message }
      }

      const totalBookings = bookings?.length || 0
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0
      const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0

      // Get average rating
      const { data: ratings } = await supabase
        .from('ratings_reviews')
        .select('rating')
        .in('booking_id', bookings?.map(b => b.id) || [])

      const averageRating = ratings?.length 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : 0

      // Group by service type
      const serviceTypes = bookings?.reduce((acc, booking) => {
        if (!acc[booking.service_type]) {
          acc[booking.service_type] = 0
        }
        acc[booking.service_type]++
        return acc
      }, {} as Record<string, number>) || {}

      const serviceTypesArray = Object.entries(serviceTypes).map(([type, count]: [string, number]) => ({
        type,
        count
      }))

      return {
        data: {
          total_bookings: totalBookings,
          completed_bookings: completedBookings,
          cancelled_bookings: cancelledBookings,
          average_rating: averageRating,
          service_types: serviceTypesArray
        },
        message: 'Booking analytics retrieved successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve booking analytics' }
    }
  }

  // Real-time subscriptions
  static subscribeToBookings(callback: (payload: any) => void) {
    return supabase
      .channel('admin-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        callback
      )
      .subscribe()
  }

  static subscribeToEmergencyAlerts(callback: (payload: any) => void) {
    return supabase
      .channel('admin-emergency')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emergency_alerts'
        },
        callback
      )
      .subscribe()
  }

  static subscribeToAgents(callback: (payload: any) => void) {
    return supabase
      .channel('admin-agents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents'
        },
        callback
      )
      .subscribe()
  }
}

