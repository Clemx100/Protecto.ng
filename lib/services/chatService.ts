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
  invoiceData?: any
  is_system_message?: boolean
}

export class ChatService {
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

  // Send a message
  async sendMessage(message: Omit<ChatMessage, 'id' | 'created_at' | 'updated_at'>) {
    const chatMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...message,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Always store in localStorage first for immediate availability
    const existingMessages = JSON.parse(localStorage.getItem(`chat_${message.booking_id}`) || '[]')
    
    // Check if message already exists to prevent duplicates
    const messageExists = existingMessages.some((msg: any) => 
      msg.message === message.message && 
      msg.sender_type === message.sender_type && 
      msg.sender_id === message.sender_id &&
      Math.abs(new Date(msg.created_at).getTime() - new Date(chatMessage.created_at).getTime()) < 5000 // Within 5 seconds
    )
    
    if (messageExists) {
      console.log('Message already exists, skipping duplicate:', chatMessage.id)
      return existingMessages.find((msg: any) => 
        msg.message === message.message && 
        msg.sender_type === message.sender_type && 
        msg.sender_id === message.sender_id
      )
    }
    
    const updatedMessages = [...existingMessages, chatMessage]
    localStorage.setItem(`chat_${message.booking_id}`, JSON.stringify(updatedMessages))
    console.log('Message stored in localStorage:', chatMessage.id)

    // Try to store in Supabase if available
    if (this.isSupabaseAvailable) {
      try {
        const messageData = {
          booking_id: message.booking_id,
          sender_id: message.sender_id,
          recipient_id: message.sender_id,
          content: message.message,
          message_type: 'text'
        }

        const { data, error } = await this.supabase
          .from('messages')
          .insert([messageData])
          .select()
          .single()

        if (!error && data) {
          console.log('Message also stored in Supabase:', data.id)
        }
      } catch (error) {
        console.log('Failed to store in Supabase, using localStorage only:', error)
      }
    }

    return chatMessage
  }

  // Get messages for a specific booking
  async getMessages(bookingId: string) {
    // Always check localStorage first for immediate response
    const localMessages = JSON.parse(localStorage.getItem(`chat_${bookingId}`) || '[]')
    console.log('Loaded messages from localStorage:', localMessages.length)

    // Try to get from Supabase if available
    if (this.isSupabaseAvailable) {
      try {
        const { data, error } = await this.supabase
          .from('messages')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: true })

        if (!error && data && data.length > 0) {
          // Convert messages table format to ChatMessage format
          const dbMessages = data.map(msg => ({
            id: msg.id,
            booking_id: msg.booking_id,
            sender_type: 'client' as const,
            sender_id: msg.sender_id,
            message: msg.content,
            created_at: msg.created_at,
            updated_at: msg.created_at,
            has_invoice: false,
            is_system_message: false
          })) as ChatMessage[]

          // Merge with localStorage messages and remove duplicates
          const allMessages = [...localMessages, ...dbMessages]
          const uniqueMessages = allMessages.filter((msg, index, self) => 
            index === self.findIndex(m => m.id === msg.id)
          )
          
          // Update localStorage with merged messages
          localStorage.setItem(`chat_${bookingId}`, JSON.stringify(uniqueMessages))
          console.log('Merged messages from Supabase and localStorage:', uniqueMessages.length)
          return uniqueMessages
        }
      } catch (error) {
        console.log('Failed to fetch from Supabase, using localStorage only:', error)
      }
    }

    return localMessages as ChatMessage[]
  }

  // Subscribe to real-time messages for a specific booking
  subscribeToMessages(bookingId: string, callback: (message: ChatMessage) => void) {
    if (!this.isSupabaseAvailable) {
      // If Supabase not available, return a mock subscription that polls localStorage
      const pollInterval = setInterval(() => {
        const messages = JSON.parse(localStorage.getItem(`chat_${bookingId}`) || '[]')
        // This is a simple implementation - in a real app you'd track last seen message
      }, 3000)

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
            sender_type: 'client' as const,
            sender_id: msg.sender_id,
            message: msg.content,
            created_at: msg.created_at,
            updated_at: msg.created_at,
            has_invoice: false,
            is_system_message: false
          }
          callback(chatMessage)
        }
      )
      .subscribe()

    return subscription
  }

  // Subscribe to all messages for operators
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
            sender_type: 'client' as const,
            sender_id: msg.sender_id,
            message: msg.content,
            created_at: msg.created_at,
            updated_at: msg.created_at,
            has_invoice: false,
            is_system_message: false
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
      invoiceData: invoiceData
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
    if (subscription && subscription.unsubscribe) {
      subscription.unsubscribe()
    } else if (this.supabase && subscription) {
      this.supabase.removeChannel(subscription)
    }
  }
}

// Export a singleton instance
export const chatService = new ChatService()