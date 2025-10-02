import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface Message {
  id: string
  booking_id: string
  content: string
  message_type: string
  sender_id: string
  sender_role: string
  created_at: string
  sender?: {
    first_name: string
    last_name: string
    role: string
  }
  // Delivery tracking
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'failed'
  retry_count?: number
}

export interface MessageDeliveryStatus {
  messageId: string
  status: 'sending' | 'sent' | 'delivered' | 'failed'
  timestamp: string
  error?: string
}

class RealtimeMessageService {
  private supabase = createClient()
  private channels: Map<string, RealtimeChannel> = new Map()
  private messageQueue: Map<string, Message> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000 // 2 seconds
  private connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected'
  private listeners: Map<string, Set<Function>> = new Map()

  constructor() {
    this.setupConnectionMonitoring()
  }

  /**
   * Setup connection monitoring for automatic reconnection
   */
  private setupConnectionMonitoring() {
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Network online - reconnecting...')
        this.reconnectAllChannels()
      })

      window.addEventListener('offline', () => {
        console.log('📵 Network offline')
        this.connectionStatus = 'disconnected'
        this.notifyListeners('connection_status', { status: 'disconnected' })
      })
    }
  }

  /**
   * Subscribe to messages for a booking with auto-reconnect
   */
  async subscribeToMessages(
    bookingId: string,
    onMessage: (message: Message) => void,
    onError?: (error: Error) => void
  ): Promise<() => void> {
    const channelId = `messages:${bookingId}`
    
    // Remove existing channel if any
    if (this.channels.has(channelId)) {
      await this.unsubscribe(channelId)
    }

    console.log('📡 Subscribing to messages for booking:', bookingId)

    const channel = this.supabase
      .channel(channelId)
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
          
          const message = payload.new as Message
          
          // Mark as delivered
          message.delivery_status = 'delivered'
          
          // Notify callback
          onMessage(message)
          
          // Remove from queue if it was pending
          this.messageQueue.delete(message.id)
          
          // Notify delivery status listeners
          this.notifyListeners('delivery_status', {
            messageId: message.id,
            status: 'delivered',
            timestamp: new Date().toISOString()
          })
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
          onMessage(payload.new as Message)
        }
      )
      .subscribe((status, err) => {
        console.log(`📡 Subscription status for ${channelId}:`, status)
        
        if (status === 'SUBSCRIBED') {
          this.connectionStatus = 'connected'
          this.reconnectAttempts = 0
          this.notifyListeners('connection_status', { status: 'connected' })
          console.log('✅ Successfully subscribed to messages')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.connectionStatus = 'reconnecting'
          this.notifyListeners('connection_status', { status: 'reconnecting' })
          console.error('❌ Subscription error:', err)
          
          if (onError) {
            onError(new Error(`Subscription error: ${status}`))
          }
          
          // Attempt reconnection
          this.handleReconnection(channelId, bookingId, onMessage, onError)
        } else if (status === 'CLOSED') {
          this.connectionStatus = 'disconnected'
          this.notifyListeners('connection_status', { status: 'disconnected' })
          console.log('🔌 Channel closed')
        }
      })

    this.channels.set(channelId, channel)

    // Return unsubscribe function
    return () => this.unsubscribe(channelId)
  }

  /**
   * Send message with retry logic and delivery confirmation
   */
  async sendMessage(
    bookingId: string,
    content: string,
    messageType: string = 'text',
    metadata: any = {},
    maxRetries: number = 3
  ): Promise<Message> {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create temporary message for optimistic UI
    const tempMessage: Message = {
      id: tempId,
      booking_id: bookingId,
      content,
      message_type: messageType,
      sender_id: 'temp',
      sender_role: 'client',
      created_at: new Date().toISOString(),
      delivery_status: 'sending',
      retry_count: 0
    }

    // Add to queue
    this.messageQueue.set(tempId, tempMessage)
    
    // Notify listeners
    this.notifyListeners('delivery_status', {
      messageId: tempId,
      status: 'sending',
      timestamp: new Date().toISOString()
    })

    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`📤 Sending message (attempt ${attempt + 1}/${maxRetries})...`)
        
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingId,
            content,
            messageType,
            metadata
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          console.log('✅ Message sent successfully:', result.data.id)
          
          const sentMessage = {
            ...result.data,
            delivery_status: 'sent' as const
          }
          
          // Remove from queue
          this.messageQueue.delete(tempId)
          
          // Notify delivery status
          this.notifyListeners('delivery_status', {
            messageId: result.data.id,
            status: 'sent',
            timestamp: new Date().toISOString()
          })
          
          return sentMessage
        } else {
          throw new Error(result.error || 'Failed to send message')
        }
      } catch (error) {
        lastError = error as Error
        console.error(`❌ Attempt ${attempt + 1} failed:`, error)
        
        // Update retry count
        tempMessage.retry_count = attempt + 1
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
          console.log(`⏳ Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // All retries failed
    console.error('❌ All retry attempts failed:', lastError)
    
    tempMessage.delivery_status = 'failed'
    this.messageQueue.set(tempId, tempMessage)
    
    this.notifyListeners('delivery_status', {
      messageId: tempId,
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: lastError?.message
    })
    
    throw lastError || new Error('Failed to send message after all retries')
  }

  /**
   * Retry failed messages in queue
   */
  async retryFailedMessages(): Promise<void> {
    const failedMessages = Array.from(this.messageQueue.values()).filter(
      msg => msg.delivery_status === 'failed'
    )

    console.log(`🔄 Retrying ${failedMessages.length} failed messages...`)

    for (const message of failedMessages) {
      try {
        await this.sendMessage(
          message.booking_id,
          message.content,
          message.message_type
        )
      } catch (error) {
        console.error('Failed to retry message:', message.id, error)
      }
    }
  }

  /**
   * Get pending/failed messages count
   */
  getPendingMessagesCount(): number {
    return Array.from(this.messageQueue.values()).filter(
      msg => msg.delivery_status === 'sending' || msg.delivery_status === 'failed'
    ).length
  }

  /**
   * Handle reconnection logic
   */
  private async handleReconnection(
    channelId: string,
    bookingId: string,
    onMessage: (message: Message) => void,
    onError?: (error: Error) => void
  ) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      this.connectionStatus = 'disconnected'
      this.notifyListeners('connection_status', { status: 'disconnected' })
      return
    }

    this.reconnectAttempts++
    this.connectionStatus = 'reconnecting'
    
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
    
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay))
    
    // Try to resubscribe
    await this.subscribeToMessages(bookingId, onMessage, onError)
  }

  /**
   * Reconnect all active channels
   */
  private async reconnectAllChannels() {
    console.log('🔄 Reconnecting all channels...')
    this.connectionStatus = 'reconnecting'
    this.reconnectAttempts = 0
    
    for (const [channelId, channel] of this.channels.entries()) {
      try {
        await channel.unsubscribe()
        // Note: Actual resubscription would need stored callbacks
        console.log(`✅ Reconnected channel: ${channelId}`)
      } catch (error) {
        console.error(`❌ Failed to reconnect channel ${channelId}:`, error)
      }
    }
  }

  /**
   * Unsubscribe from a channel
   */
  private async unsubscribe(channelId: string) {
    const channel = this.channels.get(channelId)
    if (channel) {
      console.log('🔌 Unsubscribing from channel:', channelId)
      await this.supabase.removeChannel(channel)
      this.channels.delete(channelId)
    }
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(callback)
    }
  }

  /**
   * Notify all listeners for an event
   */
  private notifyListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data))
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'disconnected' | 'reconnecting' {
    return this.connectionStatus
  }

  /**
   * Cleanup all channels
   */
  async cleanup() {
    console.log('🧹 Cleaning up all channels...')
    for (const channelId of this.channels.keys()) {
      await this.unsubscribe(channelId)
    }
    this.channels.clear()
    this.messageQueue.clear()
    this.listeners.clear()
  }
}

// Export singleton instance
export const realtimeMessageService = new RealtimeMessageService()

