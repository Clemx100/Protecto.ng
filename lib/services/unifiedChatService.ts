import { createClient } from '@/lib/supabase/client'

export interface UnifiedChatMessage {
  id: string
  booking_id: string
  booking_code?: string
  sender_type: 'client' | 'operator' | 'system'
  sender_id: string
  message: string
  created_at: string
  updated_at: string
  has_invoice?: boolean
  invoice_data?: any
  is_system_message?: boolean
  message_type?: 'text' | 'system' | 'invoice'
  status?: 'sending' | 'sent' | 'delivered' | 'read'
}

export interface BookingMapping {
  booking_code: string
  database_id: string
  client_id: string
}

export class UnifiedChatService {
  private supabase = createClient()
  private messageSubscriptions = new Map<string, any>()
  private bookingMappings = new Map<string, BookingMapping>()

  constructor() {
    this.loadBookingMappings()
  }

  // Load booking mappings from localStorage
  private loadBookingMappings() {
    try {
      // Check if we're in browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('booking_mappings')
        if (stored) {
          const mappings = JSON.parse(stored)
          this.bookingMappings = new Map(mappings)
        }
      }
    } catch (error) {
      console.error('Failed to load booking mappings:', error)
    }
  }

  // Save booking mappings to localStorage
  private saveBookingMappings() {
    try {
      // Check if we're in browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        const mappings = Array.from(this.bookingMappings.entries())
        localStorage.setItem('booking_mappings', JSON.stringify(mappings))
      }
    } catch (error) {
      console.error('Failed to save booking mappings:', error)
    }
  }

  // Get or create booking mapping
  async getBookingMapping(bookingIdentifier: string): Promise<BookingMapping | null> {
    // Check if it's already a database UUID
    if (this.isUUID(bookingIdentifier)) {
      // Find the booking code for this UUID
      for (const [code, mapping] of this.bookingMappings) {
        if (mapping.database_id === bookingIdentifier) {
          return mapping
        }
      }
      
      // If not found, try to fetch from API (DISABLED to prevent chat issues)
      // try {
      //   const response = await fetch(`/api/operator/bookings`)
      // if (response.ok) {
      //   const result = await response.json()
      //   if (result.success) {
      //       const booking = result.data.find((b: any) => b.database_id === bookingIdentifier)
      //       if (booking) {
      //         const mapping: BookingMapping = {
      //           booking_code: booking.booking_code,
      //           database_id: booking.database_id,
      //           client_id: booking.client_id
      //         }
      //         this.bookingMappings.set(booking.booking_code, mapping)
      //         this.saveBookingMappings()
      //         return mapping
      //       }
      //     }
      //   }
      // } catch (error) {
      //   console.error('Failed to fetch booking mapping:', error)
      // }
      
      return null
    }

    // Check if we have the mapping cached
    if (this.bookingMappings.has(bookingIdentifier)) {
      return this.bookingMappings.get(bookingIdentifier)!
    }

    // Try to find the mapping from API (DISABLED to prevent chat issues)
    // try {
    //   const response = await fetch(`/api/operator/bookings`)
    //   if (response.ok) {
    //     const result = await response.json()
    //     if (result.success) {
    //       const booking = result.data.find((b: any) => 
    //         b.booking_code === bookingIdentifier || b.database_id === bookingIdentifier
    //       )
    //       if (booking) {
    //         const mapping: BookingMapping = {
    //           booking_code: booking.booking_code,
    //           database_id: booking.database_id,
    //           client_id: booking.client_id
    //         }
    //         this.bookingMappings.set(booking.booking_code, mapping)
    //         this.saveBookingMappings()
    //         return mapping
    //       }
    //     }
    //   }
    // } catch (error) {
    //   console.error('Failed to fetch booking mapping:', error)
    // }

    return null
  }

  // Check if string is UUID
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  // Send a message
  async sendMessage(
    bookingIdentifier: string,
    message: string,
    senderType: 'client' | 'operator' | 'system',
    senderId: string,
    options: {
      hasInvoice?: boolean
      invoiceData?: any
      isSystemMessage?: boolean
    } = {}
  ): Promise<UnifiedChatMessage> {
    const mapping = await this.getBookingMapping(bookingIdentifier)
    
    // Use the identifier directly if mapping not found (it might already be a UUID)
    const actualBookingId = mapping?.database_id || bookingIdentifier
    const bookingCode = mapping?.booking_code

    const messageData: Omit<UnifiedChatMessage, 'id' | 'created_at' | 'updated_at'> = {
      booking_id: actualBookingId,
      booking_code: bookingCode,
      sender_type: senderType,
      sender_id: senderId,
      message,
      has_invoice: options.hasInvoice || false,
      invoice_data: options.invoiceData,
      is_system_message: options.isSystemMessage || false,
      message_type: options.hasInvoice ? 'invoice' : options.isSystemMessage ? 'system' : 'text',
      status: 'sending'
    }

    try {
      // Try API first
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: actualBookingId,
          content: message,
          messageType: messageData.message_type,
          senderType: senderType,
          senderId: senderId,
          hasInvoice: options.hasInvoice,
          invoiceData: options.invoiceData
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const chatMessage: UnifiedChatMessage = {
            id: result.data.id,
            ...messageData,
            created_at: result.data.created_at,
            updated_at: result.data.created_at,
            status: 'sent'
          }

          // Store in localStorage
          this.storeMessage(chatMessage)
          return chatMessage
        }
      }
    } catch (error) {
      console.error('API send failed, using fallback:', error)
    }

    // Fallback to localStorage
    const chatMessage: UnifiedChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...messageData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'sent'
    }

    this.storeMessage(chatMessage)
    return chatMessage
  }

  // Get messages for a booking
  async getMessages(bookingIdentifier: string): Promise<UnifiedChatMessage[]> {
    console.log('🔍 Getting messages for booking:', bookingIdentifier)
    
    const mapping = await this.getBookingMapping(bookingIdentifier)
    if (!mapping) {
      console.warn('Booking mapping not found, using identifier directly')
    }

    const bookingId = mapping?.database_id || bookingIdentifier
    console.log('🔍 Using booking ID:', bookingId)

    try {
      // Try API first
      const response = await fetch(`/api/messages?bookingId=${bookingId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const messages = result.data.map((msg: any) => this.convertToUnifiedMessage(msg, mapping))
          console.log('📨 API returned', messages.length, 'messages')
          
          // Store in localStorage
          this.storeMessages(bookingId, messages)
          return messages
        }
      }
    } catch (error) {
      console.error('API fetch failed, using localStorage:', error)
    }

    // Fallback to localStorage
    const storedMessages = this.getStoredMessages(bookingId)
    console.log('📨 localStorage returned', storedMessages.length, 'messages')
    return storedMessages
  }

  // Subscribe to real-time messages
  async subscribeToMessages(
    bookingIdentifier: string,
    callback: (message: UnifiedChatMessage) => void
  ) {
    const subscriptionKey = bookingIdentifier

    // Clean up existing subscription
    if (this.messageSubscriptions.has(subscriptionKey)) {
      this.unsubscribe(subscriptionKey)
    }

    // Get the correct database ID for the subscription filter
    const mapping = await this.getBookingMapping(bookingIdentifier)
    const databaseId = mapping?.database_id || bookingIdentifier

    console.log('🔗 Setting up real-time subscription for:', { bookingIdentifier, databaseId })

    // Set up new subscription with proper filter format
    const subscription = this.supabase
      .channel(`messages:${subscriptionKey}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `booking_id=eq.${databaseId}`
          },
          async (payload) => {
            console.log('📨 Real-time message received:', payload)
            const msg = payload.new as any
            const mapping = await this.getBookingMapping(bookingIdentifier)
            const unifiedMessage = this.convertToUnifiedMessage(msg, mapping)
            
            console.log('📨 Converted message:', unifiedMessage)
            
            // Store in localStorage
            this.storeMessage(unifiedMessage)
            
            callback(unifiedMessage)
          }
        )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for booking:', bookingIdentifier)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription failed for booking:', bookingIdentifier)
        }
      })

    this.messageSubscriptions.set(subscriptionKey, subscription)
    return subscription
  }

  // Convert API message to unified format
  private convertToUnifiedMessage(msg: any, mapping?: BookingMapping): UnifiedChatMessage {
    return {
      id: msg.id,
      booking_id: msg.booking_id,
      booking_code: mapping?.booking_code,
      sender_type: msg.sender_type || 'client',
      sender_id: msg.sender_id,
      message: msg.content || msg.message,
      created_at: msg.created_at,
      updated_at: msg.updated_at || msg.created_at,
      has_invoice: msg.has_invoice || false,
      invoice_data: msg.invoice_data || msg.metadata,
      is_system_message: msg.is_system_message || msg.message_type === 'system',
      message_type: msg.message_type || 'text',
      status: 'delivered'
    }
  }

  // Store message in localStorage
  private storeMessage(message: UnifiedChatMessage) {
    // Check if we're in browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      const key = `chat_${message.booking_id}`
      const existing = this.getStoredMessages(message.booking_id)
      const updated = [...existing.filter(m => m.id !== message.id), message]
      localStorage.setItem(key, JSON.stringify(updated))

      // Also store with booking code if available
      if (message.booking_code && message.booking_code !== message.booking_id) {
        const codeKey = `chat_${message.booking_code}`
        const existingCode = this.getStoredMessages(message.booking_code)
        const updatedCode = [...existingCode.filter(m => m.id !== message.id), message]
        localStorage.setItem(codeKey, JSON.stringify(updatedCode))
      }
    }
  }

  // Store multiple messages
  private storeMessages(bookingId: string, messages: UnifiedChatMessage[]) {
    // Check if we're in browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`chat_${bookingId}`, JSON.stringify(messages))
    }
  }

  // Get stored messages
  private getStoredMessages(bookingId: string): UnifiedChatMessage[] {
    try {
      // Check if we're in browser environment
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(`chat_${bookingId}`)
        return stored ? JSON.parse(stored) : []
      }
      return []
    } catch (error) {
      console.error('Failed to parse stored messages:', error)
      return []
    }
  }

  // Unsubscribe from messages
  unsubscribe(bookingIdentifier: string) {
    const subscription = this.messageSubscriptions.get(bookingIdentifier)
    if (subscription) {
      this.supabase.removeChannel(subscription)
      this.messageSubscriptions.delete(bookingIdentifier)
    }
  }

  // Clean up all subscriptions
  cleanup() {
    for (const [key, subscription] of this.messageSubscriptions) {
      this.supabase.removeChannel(subscription)
    }
    this.messageSubscriptions.clear()
  }
}

// Export singleton instance
export const unifiedChatService = new UnifiedChatService()
