// Services API functions for Protector.Ng
import { createClient } from '@/lib/supabase/client'
import { Service, Location, Vehicle, Agent, ApiResponse, PaginatedResponse } from '@/lib/types/database'

const supabase = createClient()

export class ServicesAPI {
  // Get all active services
  static async getServices(): Promise<ApiResponse<Service[]>> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data: data || [], message: 'Services retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve services' }
    }
  }

  // Get service by ID
  static async getServiceById(serviceId: string): Promise<ApiResponse<Service>> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Service retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve service' }
    }
  }

  // Get all locations
  static async getLocations(): Promise<ApiResponse<Location[]>> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name')

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data: data || [], message: 'Locations retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve locations' }
    }
  }

  // Search locations by query
  static async searchLocations(query: string): Promise<ApiResponse<Location[]>> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .or(`name.ilike.%${query}%,address.ilike.%${query}%,city.ilike.%${query}%`)
        .limit(10)

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data: data || [], message: 'Locations found successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to search locations' }
    }
  }

  // Get nearby locations
  static async getNearbyLocations(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<ApiResponse<Location[]>> {
    try {
      // Fetch all locations and filter by distance in JavaScript
      // For production, consider using PostGIS ST_DWithin function via RPC
      const { data, error } = await supabase
        .from('locations')
        .select('*')

      if (error) {
        return { data: null as any, error: error.message }
      }

      // Filter locations by distance using Haversine formula
      const nearbyLocations = (data || []).filter((location: any) => {
        if (!location.latitude || !location.longitude) return false
        const distance = this.calculateDistance(
          latitude,
          longitude,
          location.latitude,
          location.longitude
        )
        return distance <= radiusKm
      })

      return { data: nearbyLocations, message: 'Nearby locations retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve nearby locations' }
    }
  }

  // Haversine formula to calculate distance between two coordinates
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // Get all vehicles
  static async getVehicles(
    filters?: {
      type?: string;
      isArmored?: boolean;
      isAvailable?: boolean;
      minCapacity?: number;
    }
  ): Promise<ApiResponse<Vehicle[]>> {
    try {
      let query = supabase
        .from('vehicles')
        .select('*')

      if (filters?.type) {
        query = query.eq('type', filters.type)
      }

      if (filters?.isArmored !== undefined) {
        query = query.eq('is_armored', filters.isArmored)
      }

      if (filters?.isAvailable !== undefined) {
        query = query.eq('is_available', filters.isAvailable)
      }

      if (filters?.minCapacity) {
        query = query.gte('capacity', filters.minCapacity)
      }

      const { data, error } = await query.order('make')

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data: data || [], message: 'Vehicles retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve vehicles' }
    }
  }

  // Get available vehicles for booking
  static async getAvailableVehicles(
    vehicleType?: string,
    capacity?: number,
    location?: { x: number; y: number }
  ): Promise<ApiResponse<Vehicle[]>> {
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

      const { data, error } = await query.order('make')

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data: data || [], message: 'Available vehicles retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve available vehicles' }
    }
  }

  // Get all agents
  static async getAgents(
    filters?: {
      isArmed?: boolean;
      availabilityStatus?: string;
      minRating?: number;
    }
  ): Promise<ApiResponse<Agent[]>> {
    try {
      let query = supabase
        .from('agents')
        .select(`
          *,
          profile:profiles(*)
        `)

      if (filters?.isArmed !== undefined) {
        query = query.eq('is_armed', filters.isArmed)
      }

      if (filters?.availabilityStatus) {
        query = query.eq('availability_status', filters.availabilityStatus)
      }

      if (filters?.minRating) {
        query = query.gte('rating', filters.minRating)
      }

      const { data, error } = await query.order('rating', { ascending: false })

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data: data || [], message: 'Agents retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve agents' }
    }
  }

  // Get available agents
  static async getAvailableAgents(
    serviceType?: string,
    location?: { x: number; y: number }
  ): Promise<ApiResponse<Agent[]>> {
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

      const { data, error } = await query.order('rating', { ascending: false })

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data: data || [], message: 'Available agents retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve available agents' }
    }
  }

  // Get agent by ID
  static async getAgentById(agentId: string): Promise<ApiResponse<Agent>> {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('id', agentId)
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Agent retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve agent' }
    }
  }

  // Get vehicle by ID
  static async getVehicleById(vehicleId: string): Promise<ApiResponse<Vehicle>> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Vehicle retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve vehicle' }
    }
  }

  // Update agent availability
  static async updateAgentAvailability(
    agentId: string,
    status: string,
    location?: { x: number; y: number }
  ): Promise<ApiResponse<Agent>> {
    try {
      const updateData: any = { availability_status: status }
      
      if (location) {
        updateData.current_location = `POINT(${location.x} ${location.y})`
        updateData.last_seen = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('agents')
        .update(updateData)
        .eq('id', agentId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Agent availability updated successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to update agent availability' }
    }
  }

  // Update vehicle availability
  static async updateVehicleAvailability(
    vehicleId: string,
    isAvailable: boolean,
    location?: { x: number; y: number }
  ): Promise<ApiResponse<Vehicle>> {
    try {
      const updateData: any = { is_available: isAvailable }
      
      if (location) {
        updateData.current_location = `POINT(${location.x} ${location.y})`
      }

      const { data, error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', vehicleId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Vehicle availability updated successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to update vehicle availability' }
    }
  }

  // Get service pricing
  static async getServicePricing(
    serviceId: string,
    durationHours: number,
    location?: { x: number; y: number }
  ): Promise<ApiResponse<{
    basePrice: number;
    hourlyRate: number;
    surgeMultiplier: number;
    totalPrice: number;
  }>> {
    try {
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single()

      if (serviceError || !service) {
        return { data: null as any, error: 'Service not found' }
      }

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

      const basePrice = service.base_price
      const hourlyRate = service.price_per_hour || 0
      const totalPrice = (basePrice + (hourlyRate * durationHours)) * surgeMultiplier

      return {
        data: {
          basePrice,
          hourlyRate,
          surgeMultiplier,
          totalPrice
        },
        message: 'Pricing calculated successfully'
      }
    } catch (error) {
      return { data: null as any, error: 'Failed to calculate pricing' }
    }
  }
}

