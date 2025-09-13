// Booking API functions for Protector.Ng
import { createClient } from '@/lib/supabase/client'
import { 
  Booking, 
  BookingWithDetails, 
  CreateBookingRequest, 
  UpdateBookingRequest,
  ApiResponse,
  PaginatedResponse 
} from '@/lib/types/database'

const supabase = createClient()

export class BookingAPI {
  // Create a new booking
  static async createBooking(bookingData: CreateBookingRequest): Promise<ApiResponse<Booking>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null as any, error: 'User not authenticated' }
      }

      // Calculate pricing
      const { data: service } = await supabase
        .from('services')
        .select('*')
        .eq('id', bookingData.service_id)
        .single()

      if (!service) {
        return { data: null as any, error: 'Service not found' }
      }

      const basePrice = service.base_price
      const hourlyRate = service.price_per_hour || 0
      const totalPrice = basePrice + (hourlyRate * bookingData.duration_hours)

      // Generate booking code
      const bookingCode = `BK${Date.now().toString().slice(-6)}`

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          booking_code: bookingCode,
          client_id: user.id,
          service_id: bookingData.service_id,
          service_type: bookingData.service_type,
          protector_count: bookingData.protector_count,
          protectee_count: bookingData.protectee_count,
          dress_code: bookingData.dress_code,
          duration_hours: bookingData.duration_hours,
          pickup_address: bookingData.pickup_address,
          pickup_coordinates: `POINT(${bookingData.pickup_coordinates.x} ${bookingData.pickup_coordinates.y})`,
          destination_address: bookingData.destination_address,
          destination_coordinates: bookingData.destination_coordinates 
            ? `POINT(${bookingData.destination_coordinates.x} ${bookingData.destination_coordinates.y})`
            : null,
          scheduled_date: bookingData.scheduled_date,
          scheduled_time: bookingData.scheduled_time,
          base_price: basePrice,
          total_price: totalPrice,
          special_instructions: bookingData.special_instructions,
          emergency_contact: bookingData.emergency_contact,
          emergency_phone: bookingData.emergency_phone,
        })
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Booking created successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to create booking' }
    }
  }

  // Get booking by ID with full details
  static async getBookingById(bookingId: string): Promise<ApiResponse<BookingWithDetails>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(*),
          service:services(*),
          assigned_agent:agents(*),
          assigned_vehicle:vehicles(*),
          pickup_location:locations(*),
          payments(*),
          messages(*)
        `)
        .eq('id', bookingId)
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Booking retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve booking' }
    }
  }

  // Get user's bookings
  static async getUserBookings(
    userId?: string, 
    page = 1, 
    limit = 10
  ): Promise<ApiResponse<PaginatedResponse<BookingWithDetails>>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const clientId = userId || user?.id

      if (!clientId) {
        return { data: null as any, error: 'User not authenticated' }
      }

      const offset = (page - 1) * limit

      const { data, error, count } = await supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(*),
          service:services(*),
          assigned_agent:agents(*),
          assigned_vehicle:vehicles(*),
          pickup_location:locations(*)
        `, { count: 'exact' })
        .eq('client_id', clientId)
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

  // Update booking
  static async updateBooking(
    bookingId: string, 
    updates: UpdateBookingRequest
  ): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Booking updated successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to update booking' }
    }
  }

  // Cancel booking
  static async cancelBooking(bookingId: string): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Booking cancelled successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to cancel booking' }
    }
  }

  // Get available agents for booking
  static async getAvailableAgents(
    serviceType: string,
    location?: { x: number; y: number }
  ): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('agents')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('availability_status', 'available')
        .eq('is_active', true)

      if (serviceType === 'armed_protection') {
        query = query.eq('is_armed', true)
      }

      const { data, error } = await query

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data: data || [], message: 'Available agents retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve available agents' }
    }
  }

  // Get available vehicles for booking
  static async getAvailableVehicles(
    vehicleType?: string,
    capacity?: number
  ): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('vehicles')
        .select('*')
        .eq('is_available', true)

      if (vehicleType) {
        query = query.eq('type', vehicleType)
      }

      if (capacity) {
        query = query.gte('capacity', capacity)
      }

      const { data, error } = await query

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data: data || [], message: 'Available vehicles retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve available vehicles' }
    }
  }

  // Calculate booking price
  static async calculatePrice(
    serviceId: string,
    durationHours: number,
    location?: { x: number; y: number }
  ): Promise<ApiResponse<{ base_price: number; total_price: number; surge_multiplier: number }>> {
    try {
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single()

      if (serviceError || !service) {
        return { data: null as any, error: 'Service not found' }
      }

      const basePrice = service.base_price
      const hourlyRate = service.price_per_hour || 0
      let surgeMultiplier = 1.0

      // Check for surge pricing based on location
      if (location) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('surge_multiplier')
          .contains('coordinates', `POINT(${location.x} ${location.y})`)
          .single()

        if (locationData) {
          surgeMultiplier = locationData.surge_multiplier
        }
      }

      const totalPrice = (basePrice + (hourlyRate * durationHours)) * surgeMultiplier

      return {
        data: {
          base_price: basePrice,
          total_price: totalPrice,
          surge_multiplier: surgeMultiplier
        },
        message: 'Price calculated successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to calculate price' }
    }
  }
}

