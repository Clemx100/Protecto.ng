import { createClient } from '../supabase/client'

export interface BookingData {
  id: string
  serviceType: string
  protectionType?: string
  pickupDetails: {
    location: string
    date: string
    time: string
    duration: string
  }
  destinationDetails?: {
    primary: string
    additional: string[]
  }
  personnel?: {
    protectors: number
    protectee: number
    dressCode?: string
  }
  vehicles: { [key: string]: number }
  contact: {
    phone: string
    user: any
  }
  status: string
  timestamp: string
}

class BookingService {
  private supabase = createClient()

  // Create a booking in the database
  async createBooking(bookingData: BookingData) {
    try {
      console.log('Creating booking in database:', bookingData.id)
      
      // Convert to database schema format
      const dbBooking = {
        id: bookingData.id,
        booking_code: `REQ${Date.now()}`,
        client_id: bookingData.contact.user.id,
        service_type: bookingData.serviceType,
        status: 'pending',
        protector_count: bookingData.personnel?.protectors || 0,
        protectee_count: bookingData.personnel?.protectee || 0,
        pickup_address: bookingData.pickupDetails.location,
        destination_address: bookingData.destinationDetails?.primary || '',
        pickup_time: new Date(`${bookingData.pickupDetails.date}T${bookingData.pickupDetails.time}`).toISOString(),
        duration_hours: parseInt(bookingData.pickupDetails.duration) || 1,
        created_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('bookings')
        .insert([dbBooking])
        .select()
        .single()

      if (error) {
        console.log('Database booking creation failed:', error.message)
        throw error
      }

      console.log('Booking created successfully in database:', data.id)
      return data
    } catch (error) {
      console.log('Using localStorage fallback for booking creation')
      // Store in localStorage as fallback
      const existingBookings = JSON.parse(localStorage.getItem('operator_bookings') || '[]')
      const updatedBookings = [bookingData, ...existingBookings]
      localStorage.setItem('operator_bookings', JSON.stringify(updatedBookings))
      
      return {
        id: bookingData.id,
        ...bookingData
      }
    }
  }

  // Get bookings for operator dashboard
  async getBookings() {
    try {
      // Try database first
      const { data, error } = await this.supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.log('Database booking retrieval failed:', error.message)
        throw error
      }

      return data || []
    } catch (error) {
      console.log('Using localStorage fallback for booking retrieval')
      // Fallback to localStorage
      return JSON.parse(localStorage.getItem('operator_bookings') || '[]')
    }
  }
}

export const bookingService = new BookingService()
