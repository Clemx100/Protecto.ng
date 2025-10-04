import { createClient } from '@/lib/supabase/client'

export interface ChatMessage {
  id: string
  booking_id: string
  booking_code?: string // For compatibility
  sender_type: 'client' | 'operator' | 'system'
  sender_id: string
  message: string
  created_at: string
  updated_at: string
  has_invoice?: boolean
  invoiceData?: any
  invoice_data?: any // For compatibility
  is_system_message?: boolean
  message_type?: string
  status?: 'sending' | 'sent' | 'delivered' | 'read'
  metadata?: any
}

export class UnifiedChatService {
  private supabase = createClient()
  private isSupabaseAvailable = false

  constructor() {
    this.checkSupabaseAvailability()
  }

  private async checkSupabaseAvailability() {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('count')
        .limit(1)
      
      this.isSupabaseAvailable = !error
      console.log('Supabase availability:', this.isSupabaseAvailable)
    } catch (error) {
      this.isSupabaseAvailable = false
      console.log('Supabase not available, using localStorage fallback')
    }
  }

  // Send a message using the existing messages table
  async sendMessage(message: Omit<ChatMessage, 'id' | 'created_at' | 'updated_at'>) {
    // Try to send via API first
    try {
      console.log('Sending message via API:', message)
      
      // Get the current session for authentication
      const { data: { session } } = await this.supabase.auth.getSession()
      
      // Try simple chat API first
      let response = await fetch('/api/simple-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingId: message.booking_id,
          content: message.message,
          senderType: message.sender_type,
          senderId: message.sender_id
        }),
      })

      // If client API fails, try operator API
      if (!response.ok) {
        console.log('Client API failed, trying operator API...')
        response = await fetch('/api/operator/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingId: message.booking_id,
            content: message.message,
            messageType: message.is_system_message ? 'system' : 'text',
            metadata: message.metadata || message.invoice_data
          }),
        })
      }

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Convert API response to ChatMessage format
          const chatMessage: ChatMessage = {
            id: result.data.id,
            booking_id: message.booking_id,
            sender_type: message.sender_type,
            sender_id: message.sender_id,
            message: message.message,
            created_at: result.data.created_at,
            updated_at: result.data.created_at,
            has_invoice: message.has_invoice || false,
            is_system_message: message.is_system_message || false,
            invoiceData: message.invoiceData,
            metadata: result.data.metadata
          }

          // Store in localStorage for immediate availability
          const existingMessages = JSON.parse(localStorage.getItem(`chat_${message.booking_id}`) || '[]')
          const updatedMessages = [...existingMessages, chatMessage]
          localStorage.setItem(`chat_${message.booking_id}`, JSON.stringify(updatedMessages))
          
          console.log('Message sent via API:', chatMessage.id)
          return chatMessage
        }
      }
    } catch (error) {
      console.log('API send failed, falling back to localStorage:', error)
    }

    // Fallback to localStorage if API fails
    const chatMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...message,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const existingMessages = JSON.parse(localStorage.getItem(`chat_${message.booking_id}`) || '[]')
    const updatedMessages = [...existingMessages, chatMessage]
    localStorage.setItem(`chat_${message.booking_id}`, JSON.stringify(updatedMessages))
    console.log('Message stored in localStorage:', chatMessage.id)

    return chatMessage
  }

  // Get messages for a specific booking using the existing messages table
  async getMessages(bookingId: string) {
    // Try to get from API first
    try {
      console.log('🔍 Getting messages for booking ID:', bookingId)
      
      // Get the current session for authentication
      const { data: { session } } = await this.supabase.auth.getSession()
      console.log('🔍 Session:', session ? 'authenticated' : 'not authenticated')
      
      // Try simple chat API first
      console.log('🔍 Calling /api/simple-chat with bookingId:', bookingId)
      let response = await fetch(`/api/simple-chat?bookingId=${bookingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      })
      
      console.log('🔍 API response status:', response.status, response.ok)

      // If client API fails, try operator API
      if (!response.ok) {
        console.log('Client API failed, trying operator API...')
        response = await fetch(`/api/operator/messages?bookingId=${bookingId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      }

      // If that fails and it looks like a booking code, try to find the database ID
      if (!response.ok && bookingId.startsWith('REQ')) {
        console.log('Booking code detected, trying to find database ID...')
        try {
          const bookingsResponse = await fetch('/api/operator/bookings')
          if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json()
            if (bookingsData.success) {
              const booking = bookingsData.data.find((b: any) => b.booking_code === bookingId)
              if (booking && booking.database_id) {
                console.log('Found database ID for booking code:', booking.database_id)
                response = await fetch(`/api/operator/messages?bookingId=${booking.database_id}`, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                })
              }
            }
          }
        } catch (error) {
          console.log('Failed to find database ID:', error)
        }
      }

      if (response.ok) {
        const result = await response.json()
        console.log('🔍 API response result:', result)
        if (result.success) {
          console.log('🔍 API response data:', result.data?.length || 0, 'messages')
          // Convert API response to ChatMessage format
          const apiMessages = result.data.map((msg: any) => ({
            id: msg.id,
            booking_id: msg.booking_id,
            sender_type: msg.sender_type || (msg.message_type === 'system' ? 'system' : 'client'),
            sender_id: msg.sender_id,
            message: msg.content || msg.message,
            created_at: msg.created_at,
            updated_at: msg.created_at,
            has_invoice: msg.has_invoice || msg.message_type === 'invoice',
            is_system_message: msg.is_system_message || msg.message_type === 'system',
            metadata: msg.metadata,
            invoice_data: msg.invoice_data || msg.metadata
          })) as ChatMessage[]

          console.log('🔍 Converted messages:', apiMessages.length)
          // Store in localStorage for offline access
          localStorage.setItem(`chat_${bookingId}`, JSON.stringify(apiMessages))
          console.log('✅ Messages loaded from API:', apiMessages.length)
          return apiMessages
        } else {
          console.log('❌ API response not successful:', result)
        }
      } else {
        console.log('❌ API response not ok:', response.status, response.statusText)
      }
    } catch (error) {
      console.log('API fetch failed, using localStorage:', error)
    }

    // Fallback to localStorage
    const localMessages = JSON.parse(localStorage.getItem(`chat_${bookingId}`) || '[]')
    console.log('Loaded messages from localStorage:', localMessages.length)
    return localMessages as ChatMessage[]
  }

  // Subscribe to real-time messages for a specific booking using the existing messages table
  subscribeToMessages(bookingId: string, callback: (message: ChatMessage) => void) {
    if (!this.isSupabaseAvailable) {
      // If Supabase not available, return a mock subscription that polls localStorage
      let lastMessageCount = 0
      const pollInterval = setInterval(async () => {
        try {
          // Try client API first
          let response = await fetch(`/api/messages?bookingId=${bookingId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          // If client API fails, try operator API
          if (!response.ok) {
            response = await fetch(`/api/operator/messages?bookingId=${bookingId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            })
          }

          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data.length > lastMessageCount) {
              // New messages available, update localStorage and trigger callback
              localStorage.setItem(`chat_${bookingId}`, JSON.stringify(result.data))
              const newMessages = result.data.slice(lastMessageCount)
              newMessages.forEach((msg: any) => {
                const chatMessage: ChatMessage = {
                  id: msg.id,
                  booking_id: msg.booking_id,
                  sender_type: msg.sender_type || (msg.message_type === 'system' ? 'system' : 'client'),
                  sender_id: msg.sender_id,
                  message: msg.content || msg.message,
                  created_at: msg.created_at,
                  updated_at: msg.created_at,
                  has_invoice: msg.has_invoice || msg.message_type === 'invoice',
                  is_system_message: msg.is_system_message || msg.message_type === 'system',
                  metadata: msg.metadata,
                  invoiceData: msg.invoice_data || msg.metadata
                }
                callback(chatMessage)
              })
              lastMessageCount = result.data.length
            }
          } else {
            // Fallback to localStorage polling
            const messages = JSON.parse(localStorage.getItem(`chat_${bookingId}`) || '[]')
            if (messages.length > lastMessageCount) {
              const newMessages = messages.slice(lastMessageCount)
              newMessages.forEach((msg: ChatMessage) => callback(msg))
              lastMessageCount = messages.length
            }
          }
        } catch (error) {
          console.log('Polling error, using localStorage:', error)
          const messages = JSON.parse(localStorage.getItem(`chat_${bookingId}`) || '[]')
          if (messages.length > lastMessageCount) {
            const newMessages = messages.slice(lastMessageCount)
            newMessages.forEach((msg: ChatMessage) => callback(msg))
            lastMessageCount = messages.length
          }
        }
      }, 2000) // Poll every 2 seconds

      return {
        unsubscribe: () => clearInterval(pollInterval)
      }
    }

    const subscription = this.supabase
      .channel(`messages:booking_id=eq.${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          const msg = payload.new as any
          const chatMessage: ChatMessage = {
            id: msg.id,
            booking_id: msg.booking_id,
            sender_type: msg.sender_type || (msg.message_type === 'system' ? 'system' : 'client'),
            sender_id: msg.sender_id,
            message: msg.content,
            created_at: msg.created_at,
            updated_at: msg.created_at,
            has_invoice: msg.has_invoice || msg.message_type === 'invoice',
            is_system_message: msg.is_system_message || msg.message_type === 'system',
            metadata: msg.metadata
          }
          
          // Store in localStorage
          const existingMessages = JSON.parse(localStorage.getItem(`chat_${bookingId}`) || '[]')
          const updatedMessages = [...existingMessages, chatMessage]
          localStorage.setItem(`chat_${bookingId}`, JSON.stringify(updatedMessages))
          
          callback(chatMessage)
        }
      )
      .subscribe()

    return subscription
  }

  // Subscribe to all messages for operators using the existing messages table
  subscribeToAllMessages(callback: (message: ChatMessage) => void) {
    if (!this.isSupabaseAvailable) {
    return {
        unsubscribe: () => {}
      }
    }

    const subscription = this.supabase
      .channel('messages:all')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const msg = payload.new as any
          const chatMessage: ChatMessage = {
      id: msg.id,
      booking_id: msg.booking_id,
            sender_type: msg.sender_type || (msg.message_type === 'system' ? 'system' : 'client'),
      sender_id: msg.sender_id,
            message: msg.content,
      created_at: msg.created_at,
            updated_at: msg.created_at,
            has_invoice: msg.has_invoice || msg.message_type === 'invoice',
      is_system_message: msg.is_system_message || msg.message_type === 'system',
            metadata: msg.metadata
          }
          callback(chatMessage)
        }
      )
      .subscribe()

    return subscription
  }

  // Create a system message
  async createSystemMessage(bookingId: string, message: string, senderId: string) {
    console.log('Creating system message for booking:', bookingId)
    
    return this.sendMessage({
      booking_id: bookingId,
      sender_type: 'system',
      sender_id: senderId,
      message,
      is_system_message: true
    })
  }

  // Create an operator message
  async createOperatorMessage(bookingId: string, message: string, senderId: string, hasInvoice = false, invoiceData?: any) {
    return this.sendMessage({
      booking_id: bookingId,
      sender_type: 'operator',
      sender_id: senderId,
      message,
      has_invoice: hasInvoice,
      invoiceData: invoiceData,
      metadata: invoiceData
    })
  }

  // Create a client message
  async createClientMessage(bookingId: string, message: string, senderId: string) {
    return this.sendMessage({
      booking_id: bookingId,
      sender_type: 'client',
      sender_id: senderId,
      message
    })
  }

  // Subscribe to booking updates
  subscribeToBookingUpdates(bookingId: string, callback: (booking: any) => void) {
    if (!this.isSupabaseAvailable) {
      return {
        unsubscribe: () => {}
      }
    }

    const subscription = this.supabase
      .channel(`bookings:booking_id=eq.${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          console.log('Booking update received:', payload)
          callback(payload.new)
        }
      )
      .subscribe()

    return subscription
  }

  // Update message status
  async updateMessageStatus(messageId: string, status: 'sending' | 'sent' | 'delivered' | 'read') {
    if (!this.isSupabaseAvailable) {
      console.log('Supabase not available, skipping status update')
      return
    }

    try {
      const { error } = await this.supabase
        .from('messages')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', messageId)

      if (error) {
        console.error('Error updating message status:', error)
      }
    } catch (error) {
      console.error('Error updating message status:', error)
    }
  }

  // Mark messages as read
  async markMessagesAsRead(bookingId: string, userId: string) {
    if (!this.isSupabaseAvailable) {
      console.log('Supabase not available, skipping mark as read')
      return
    }

    try {
      const { error } = await this.supabase
        .from('messages')
        .update({ 
          status: 'read', 
          updated_at: new Date().toISOString() 
        })
        .eq('booking_id', bookingId)
        .neq('sender_id', userId) // Don't mark own messages as read

      if (error) {
        console.error('Error marking messages as read:', error)
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  // Unsubscribe from a channel
  unsubscribe(subscription: any) {
    if (subscription && subscription.unsubscribe) {
      subscription.unsubscribe()
    } else if (this.supabase && subscription) {
      this.supabase.removeChannel(subscription)
    }
  }
}

// Export a singleton instance
export const unifiedChatService = new UnifiedChatService()
