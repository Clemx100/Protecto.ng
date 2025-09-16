import { createClient } from '@/lib/supabase/client'

export interface ChatMessage {
  id: string
  booking_id: string
  sender_type: 'client' | 'operator' | 'system'
  sender_id: string
  message: string
  created_at: string
  updated_at: string
  has_invoice?: boolean
  invoice_data?: any
  is_system_message?: boolean
}

export class ChatService {
  private supabase = createClient()

  // Send a message
  async sendMessage(message: Omit<ChatMessage, 'id' | 'created_at' | 'updated_at'>) {
    try {
      // Convert to messages table format
      const messageData = {
        booking_id: message.booking_id, // This will be a UUID
        sender_id: message.sender_id,
        recipient_id: message.sender_id, // For system messages, use same as sender
        content: message.message,
        message_type: 'text',
        has_invoice: message.has_invoice || false,
        invoice_data: message.invoice_data || null,
        is_system_message: message.is_system_message || false
      }

      const { data, error } = await this.supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single()

      if (error) {
        console.error('Error sending message:', error)
        // Fallback: return a mock message if database is not available
        return {
          id: `mock_${Date.now()}`,
          ...message,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }

      // Convert back to ChatMessage format
      return {
        id: data.id,
        booking_id: data.booking_id,
        sender_type: message.sender_type,
        sender_id: data.sender_id,
        message: data.content,
        created_at: data.created_at,
        updated_at: data.created_at, // messages table doesn't have updated_at
        has_invoice: false,
        is_system_message: message.is_system_message || false
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Fallback: create a mock message and store in localStorage
      const mockMessage: ChatMessage = {
        id: `mock_${Date.now()}`,
        booking_id: message.booking_id,
        sender_type: message.sender_type,
        sender_id: message.sender_id,
        message: message.message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        has_invoice: message.has_invoice || false,
        invoice_data: message.invoice_data || null,
        is_system_message: message.is_system_message || false
      }
      
      // Store in localStorage as fallback
      const existingMessages = JSON.parse(localStorage.getItem(`chat_${message.booking_id}`) || '[]')
      const updatedMessages = [...existingMessages, mockMessage]
      localStorage.setItem(`chat_${message.booking_id}`, JSON.stringify(updatedMessages))
      
      console.log('✅ Mock message stored in localStorage:', mockMessage)
      return mockMessage
    }
  }

  // Get messages for a specific booking
  async getMessages(bookingId: string) {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        // Fallback: return empty array if database is not available
        return []
      }

      // Convert messages table format to ChatMessage format
      return data.map(msg => ({
        id: msg.id,
        booking_id: msg.booking_id,
        sender_type: msg.sender_type || 'client' as const,
        sender_id: msg.sender_id,
        message: msg.content,
        created_at: msg.created_at,
        updated_at: msg.created_at, // messages table doesn't have updated_at
        has_invoice: msg.has_invoice || false,
        invoice_data: msg.invoice_data || null,
        is_system_message: msg.is_system_message || false
      })) as ChatMessage[]
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      // Fallback: return empty array if database is not available
      return []
    }
  }

  // Subscribe to real-time messages for a specific booking
  subscribeToMessages(bookingId: string, callback: (message: ChatMessage) => void) {
    console.log('🔗 CHATSERVICE: Setting up subscription for booking:', bookingId)
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
          console.log('🔔 CHATSERVICE: Real-time message received:', payload)
          // Convert messages table format to ChatMessage format
          const msg = payload.new as any
          const chatMessage: ChatMessage = {
            id: msg.id,
            booking_id: msg.booking_id,
            sender_type: msg.sender_type || 'client' as const,
            sender_id: msg.sender_id,
            message: msg.content,
            created_at: msg.created_at,
            updated_at: msg.created_at,
            has_invoice: msg.has_invoice || false,
            invoice_data: msg.invoice_data || null,
            is_system_message: msg.is_system_message || false
          }
          console.log('📤 CHATSERVICE: Calling callback with message:', chatMessage)
          callback(chatMessage)
        }
      )
      .subscribe((status) => {
        console.log('📡 CHATSERVICE: Subscription status:', status)
      })

    return subscription
  }

  // Subscribe to all messages for operators
  subscribeToAllMessages(callback: (message: ChatMessage) => void) {
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
          // Convert messages table format to ChatMessage format
          const msg = payload.new as any
          const chatMessage: ChatMessage = {
            id: msg.id,
            booking_id: msg.booking_id,
            sender_type: msg.sender_type || 'client' as const,
            sender_id: msg.sender_id,
            message: msg.content,
            created_at: msg.created_at,
            updated_at: msg.created_at,
            has_invoice: msg.has_invoice || false,
            invoice_data: msg.invoice_data || null,
            is_system_message: msg.is_system_message || false
          }
          callback(chatMessage)
        }
      )
      .subscribe()

    return subscription
  }

  // Create a system message
  async createSystemMessage(bookingId: string, message: string, senderId: string) {
    try {
      // Try to send to database first
      const result = await this.sendMessage({
        booking_id: bookingId,
        sender_type: 'system',
        sender_id: senderId,
        message,
        is_system_message: true
      })
      
      // If it's a mock message (database failed), ensure it's stored in localStorage
      if (result.id.startsWith('mock_')) {
        console.log('Database insertion failed, storing in localStorage as fallback')
        const existingMessages = JSON.parse(localStorage.getItem(`chat_${bookingId}`) || '[]')
        const updatedMessages = [...existingMessages, result]
        localStorage.setItem(`chat_${bookingId}`, JSON.stringify(updatedMessages))
      }
      
      return result
    } catch (error) {
      console.error('Failed to create system message:', error)
      // Return a mock message as fallback
      const mockMessage = {
        id: `mock_${Date.now()}`,
        booking_id: bookingId,
        sender_type: 'system' as const,
        sender_id: senderId,
        message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        has_invoice: false,
        is_system_message: true
      }
      
      // Store in localStorage as fallback
      const existingMessages = JSON.parse(localStorage.getItem(`chat_${bookingId}`) || '[]')
      const updatedMessages = [...existingMessages, mockMessage]
      localStorage.setItem(`chat_${bookingId}`, JSON.stringify(updatedMessages))
      
      return mockMessage
    }
  }

  // Create an operator message
  async createOperatorMessage(bookingId: string, message: string, senderId: string, hasInvoice = false, invoiceData?: any) {
    return this.sendMessage({
      booking_id: bookingId,
      sender_type: 'operator',
      sender_id: senderId,
      message,
      has_invoice: hasInvoice,
      invoice_data: invoiceData
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

  // Unsubscribe from a channel
  unsubscribe(subscription: any) {
    this.supabase.removeChannel(subscription)
  }
}

// Export a singleton instance
export const chatService = new ChatService()
