// Real-time API functions for Protector.Ng
import { createClient } from '@/lib/supabase/client'
import { 
  Message, 
  LocationTracking, 
  EmergencyAlert, 
  Notification,
  SendMessageRequest,
  CreateEmergencyAlertRequest,
  UpdateLocationRequest,
  ApiResponse 
} from '@/lib/types/database'

const supabase = createClient()

export class RealtimeAPI {
  // Send message
  static async sendMessage(messageData: SendMessageRequest): Promise<ApiResponse<Message>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null as any, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          booking_id: messageData.booking_id,
          sender_id: user.id,
          recipient_id: messageData.recipient_id,
          content: messageData.content,
          message_type: messageData.message_type || 'text',
          is_encrypted: true
        })
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Message sent successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to send message' }
    }
  }

  // Get messages for booking
  static async getBookingMessages(bookingId: string): Promise<ApiResponse<Message[]>> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*),
          recipient:profiles!messages_recipient_id_fkey(*)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data: data || [], message: 'Messages retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve messages' }
    }
  }

  // Mark message as read
  static async markMessageAsRead(messageId: string): Promise<ApiResponse<Message>> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Message marked as read' }
    } catch (error) {
      return { data: null as any, error: 'Failed to mark message as read' }
    }
  }

  // Update location tracking
  static async updateLocation(locationData: UpdateLocationRequest): Promise<ApiResponse<LocationTracking>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null as any, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('location_tracking')
        .insert({
          booking_id: locationData.booking_id,
          agent_id: user.id,
          location: `POINT(${locationData.location.x} ${locationData.location.y})`,
          heading: locationData.heading,
          speed: locationData.speed,
          accuracy: locationData.accuracy
        })
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Location updated successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to update location' }
    }
  }

  // Get location tracking for booking
  static async getBookingLocationTracking(bookingId: string): Promise<ApiResponse<LocationTracking[]>> {
    try {
      const { data, error } = await supabase
        .from('location_tracking')
        .select('*')
        .eq('booking_id', bookingId)
        .order('timestamp', { ascending: false })
        .limit(100)

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data: data || [], message: 'Location tracking retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve location tracking' }
    }
  }

  // Create emergency alert
  static async createEmergencyAlert(alertData: CreateEmergencyAlertRequest): Promise<ApiResponse<EmergencyAlert>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null as any, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('emergency_alerts')
        .insert({
          client_id: user.id,
          booking_id: alertData.booking_id,
          alert_type: alertData.alert_type,
          location: `POINT(${alertData.location.x} ${alertData.location.y})`,
          address: alertData.address,
          description: alertData.description
        })
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Emergency alert created successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to create emergency alert' }
    }
  }

  // Get emergency alerts
  static async getEmergencyAlerts(
    userId?: string,
    status?: string
  ): Promise<ApiResponse<EmergencyAlert[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const clientId = userId || user?.id

      if (!clientId) {
        return { data: null as any, error: 'User not authenticated' }
      }

      let query = supabase
        .from('emergency_alerts')
        .select('*')
        .eq('client_id', clientId)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data: data || [], message: 'Emergency alerts retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve emergency alerts' }
    }
  }

  // Update emergency alert status
  static async updateEmergencyAlertStatus(
    alertId: string,
    status: string,
    respondedBy?: string
  ): Promise<ApiResponse<EmergencyAlert>> {
    try {
      const updateData: any = { status }
      
      if (respondedBy) {
        updateData.responded_by = respondedBy
        updateData.resolved_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('emergency_alerts')
        .update(updateData)
        .eq('id', alertId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Emergency alert status updated successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to update emergency alert status' }
    }
  }

  // Get notifications
  static async getNotifications(
    userId?: string,
    isRead?: boolean
  ): Promise<ApiResponse<Notification[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const clientId = userId || user?.id

      if (!clientId) {
        return { data: null as any, error: 'User not authenticated' }
      }

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', clientId)

      if (isRead !== undefined) {
        query = query.eq('is_read', isRead)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data: data || [], message: 'Notifications retrieved successfully' }
    } catch (error) {
      return { data: null as any, error: 'Failed to retrieve notifications' }
    }
  }

  // Mark notification as read
  static async markNotificationAsRead(notificationId: string): Promise<ApiResponse<Notification>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select()
        .single()

      if (error) {
        return { data: null as any, error: error.message }
      }

      return { data, message: 'Notification marked as read' }
    } catch (error) {
      return { data: null as any, error: 'Failed to mark notification as read' }
    }
  }

  // Mark all notifications as read
  static async markAllNotificationsAsRead(userId?: string): Promise<ApiResponse<null>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const clientId = userId || user?.id

      if (!clientId) {
        return { data: null, error: 'User not authenticated' }
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', clientId)

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: null, message: 'All notifications marked as read' }
    } catch (error) {
      return { data: null, error: 'Failed to mark all notifications as read' }
    }
  }

  // Subscribe to real-time updates
  static subscribeToBookingUpdates(
    bookingId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`
        },
        callback
      )
      .subscribe()
  }

  // Subscribe to message updates
  static subscribeToMessageUpdates(
    bookingId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`messages-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`
        },
        callback
      )
      .subscribe()
  }

  // Subscribe to location tracking updates
  static subscribeToLocationUpdates(
    bookingId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`location-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_tracking',
          filter: `booking_id=eq.${bookingId}`
        },
        callback
      )
      .subscribe()
  }

  // Subscribe to emergency alerts
  static subscribeToEmergencyAlerts(
    userId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`emergency-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emergency_alerts',
          filter: `client_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  }

  // Subscribe to notifications
  static subscribeToNotifications(
    userId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  }

  // Unsubscribe from channel
  static unsubscribe(channel: any) {
    return supabase.removeChannel(channel)
  }
}

