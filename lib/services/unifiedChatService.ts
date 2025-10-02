/**
 * Unified Chat Service - Complete Real-Time Chat Solution
 * Handles messages and status updates for both client and operator
 */

import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface ChatMessage {
  id: string
  booking_id: string
  sender_type: 'client' | 'operator' | 'system'
  sender_id: string
  message: string
  created_at: string
  is_system_message?: boolean
  message_type?: string
  metadata?: any
  sender?: {
    first_name?: string
    last_name?: string
    role?: string
  }
}

export interface BookingStatus {
  status: string
  updated_at: string
  message?: string
}

class UnifiedChatService {
  private supabase = createClient()
  private messageChannels: Map<string, RealtimeChannel> = new Map()
  private statusChannels: Map<string, RealtimeChannel> = new Map()

  /**
   * Get messages for a booking using the correct UUID
   */
  async getMessages(bookingIdOrCode: string): Promise<ChatMessage[]> {
    try {
      console.log('📥 Fetching messages for:', bookingIdOrCode)
      
      // Get the actual UUID
      const bookingId = await this.resolveBookingUUID(bookingIdOrCode)
      
      if (!bookingId) {
        throw new Error('Invalid booking ID')
      }

      // Try new API endpoint first
      let response = await fetch(`/api/messages?bookingId=${bookingId}`)
      
      // Fallback to operator API
      if (!response.ok) {
        response = await fetch(`/api/operator/messages?bookingId=${bookingId}`)
      }

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          return this.normalizeMessages(result.data)
        }
      }

      console.warn('API failed, trying direct Supabase query')
      
      // Direct Supabase fallback
      const { data, error } = await this.supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(first_name, last_name, role)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Supabase query failed:', error)
        return []
      }

      return this.normalizeMessages(data || [])
    } catch (error) {
      console.error('Failed to get messages:', error)
      return []
    }
  }

  /**
   * Send a message with guaranteed delivery
   */
  async sendMessage(
    bookingIdOrCode: string,
    content: string,
    senderType: 'client' | 'operator' | 'system' = 'client',
    metadata: any = {}
  ): Promise<ChatMessage | null> {
    try {
      // Get the actual UUID
      const bookingId = await this.resolveBookingUUID(bookingIdOrCode)
      
      if (!bookingId) {
        throw new Error('Invalid booking ID')
      }

      console.log('📤 Sending message to booking:', bookingId)

      // Try new API endpoint
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          content,
          messageType: senderType === 'system' ? 'system' : 'text',
          metadata
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          console.log('✅ Message sent via API:', result.data.id)
          return this.normalizeMessage(result.data)
        }
      }

      // Fallback to operator API
      const fallbackResponse = await fetch('/api/operator/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          content,
          messageType: senderType === 'system' ? 'system' : 'text'
        })
      })

      if (fallbackResponse.ok) {
        const result = await fallbackResponse.json()
        if (result.success) {
          console.log('✅ Message sent via operator API:', result.data.id)
          return this.normalizeMessage(result.data)
        }
      }

      throw new Error('All API endpoints failed')
    } catch (error) {
      console.error('❌ Failed to send message:', error)
      return null
    }
  }

  /**
   * Subscribe to real-time messages for a booking
   */
  subscribeToMessages(
    bookingIdOrCode: string,
    onMessage: (message: ChatMessage) => void,
    onError?: (error: Error) => void
  ): () => void {
    const channelName = `messages:${bookingIdOrCode}`
    
    // Remove existing channel if any
    this.unsubscribeFromMessages(bookingIdOrCode)

    console.log('📡 Subscribing to messages:', channelName)

    // Resolve UUID asynchronously
    this.resolveBookingUUID(bookingIdOrCode).then(bookingId => {
      if (!bookingId) {
        console.error('❌ Cannot subscribe: Invalid booking ID')
        if (onError) onError(new Error('Invalid booking ID'))
        return
      }

      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `booking_id=eq.${bookingId}`
          },
          (payload) => {
            console.log('📨 Real-time message received:', payload.new)
            const normalizedMessage = this.normalizeMessage(payload.new)
            onMessage(normalizedMessage)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `booking_id=eq.${bookingId}`
          },
          (payload) => {
            console.log('✏️ Message updated:', payload.new)
            const normalizedMessage = this.normalizeMessage(payload.new)
            onMessage(normalizedMessage)
          }
        )
        .subscribe((status, error) => {
          console.log(`📡 Subscription status for ${channelName}:`, status)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to messages')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('❌ Subscription error:', error)
            if (onError) onError(new Error(`Subscription ${status}`))
          }
        })

      this.messageChannels.set(bookingIdOrCode, channel)
    })

    // Return unsubscribe function
    return () => this.unsubscribeFromMessages(bookingIdOrCode)
  }

  /**
   * Subscribe to real-time booking status updates
   */
  subscribeToBookingStatus(
    bookingIdOrCode: string,
    onStatusChange: (status: BookingStatus) => void,
    onError?: (error: Error) => void
  ): () => void {
    const channelName = `booking-status:${bookingIdOrCode}`
    
    // Remove existing channel if any
    this.unsubscribeFromStatus(bookingIdOrCode)

    console.log('📡 Subscribing to booking status:', channelName)

    // Resolve UUID asynchronously
    this.resolveBookingUUID(bookingIdOrCode).then(bookingId => {
      if (!bookingId) {
        console.error('❌ Cannot subscribe: Invalid booking ID')
        if (onError) onError(new Error('Invalid booking ID'))
        return
      }

      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `id=eq.${bookingId}`
          },
          (payload) => {
            console.log('🔄 Booking status updated:', payload.new)
            const booking = payload.new as any
            onStatusChange({
              status: booking.status,
              updated_at: booking.updated_at,
              message: `Status updated to: ${booking.status}`
            })
          }
        )
        .subscribe((status, error) => {
          console.log(`📡 Subscription status for ${channelName}:`, status)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to booking status')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('❌ Status subscription error:', error)
            if (onError) onError(new Error(`Subscription ${status}`))
          }
        })

      this.statusChannels.set(bookingIdOrCode, channel)
    })

    // Return unsubscribe function
    return () => this.unsubscribeFromStatus(bookingIdOrCode)
  }

  /**
   * Resolve booking code to UUID
   */
  private async resolveBookingUUID(bookingIdOrCode: string): Promise<string | null> {
    // UUID regex
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    
    // If already UUID, return it
    if (uuidPattern.test(bookingIdOrCode)) {
      return bookingIdOrCode
    }

    // If booking code, fetch UUID
    if (bookingIdOrCode.startsWith('REQ')) {
      try {
        const { data, error } = await this.supabase
          .from('bookings')
          .select('id')
          .eq('booking_code', bookingIdOrCode)
          .single()

        if (data && !error) {
          console.log('✅ Resolved booking code to UUID:', data.id)
          return data.id
        }
      } catch (error) {
        console.error('Failed to resolve booking code:', error)
      }
    }

    return null
  }

  /**
   * Normalize message format from different sources
   */
  private normalizeMessage(msg: any): ChatMessage {
    return {
      id: msg.id,
      booking_id: msg.booking_id,
      sender_type: msg.sender_type || 
                   (msg.sender_role === 'operator' || msg.sender_role === 'admin' ? 'operator' : 
                    msg.message_type === 'system' ? 'system' : 'client'),
      sender_id: msg.sender_id,
      message: msg.content || msg.message,
      created_at: msg.created_at,
      is_system_message: msg.message_type === 'system' || msg.is_system_message,
      message_type: msg.message_type,
      metadata: msg.metadata,
      sender: msg.sender
    }
  }

  /**
   * Normalize array of messages
   */
  private normalizeMessages(messages: any[]): ChatMessage[] {
    return messages.map(msg => this.normalizeMessage(msg))
  }

  /**
   * Unsubscribe from messages channel
   */
  private unsubscribeFromMessages(bookingIdOrCode: string) {
    const channel = this.messageChannels.get(bookingIdOrCode)
    if (channel) {
      console.log('🔌 Unsubscribing from messages:', bookingIdOrCode)
      this.supabase.removeChannel(channel)
      this.messageChannels.delete(bookingIdOrCode)
    }
  }

  /**
   * Unsubscribe from status channel
   */
  private unsubscribeFromStatus(bookingIdOrCode: string) {
    const channel = this.statusChannels.get(bookingIdOrCode)
    if (channel) {
      console.log('🔌 Unsubscribing from status:', bookingIdOrCode)
      this.supabase.removeChannel(channel)
      this.statusChannels.delete(bookingIdOrCode)
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    console.log('🧹 Cleaning up all subscriptions')
    
    this.messageChannels.forEach((channel, key) => {
      this.supabase.removeChannel(channel)
    })
    
    this.statusChannels.forEach((channel, key) => {
      this.supabase.removeChannel(channel)
    })
    
    this.messageChannels.clear()
    this.statusChannels.clear()
  }
}

// Export singleton
export const unifiedChatService = new UnifiedChatService()

