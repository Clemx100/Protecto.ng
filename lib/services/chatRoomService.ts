import { createClient } from '@/lib/supabase/client'

export interface ChatRoom {
  id: string
  booking_id: string
  booking_code: string
  client_id: string
  operator_id?: string
  status: 'active' | 'closed' | 'archived'
  created_at: string
  updated_at: string
  last_message_at?: string
  last_message?: string
  unread_count_client: number
  unread_count_operator: number
  client?: {
    first_name: string
    last_name: string
    email: string
    phone?: string
  }
  booking?: {
    id: string
    status: string
    pickup_address: string
    destination_address?: string
    scheduled_date: string
    scheduled_time: string
  }
}

export interface ChatRoomMessage {
  id: string
  room_id: string
  booking_id: string
  sender_id: string
  sender_type: 'client' | 'operator' | 'system'
  message: string
  message_type: 'text' | 'system' | 'invoice' | 'status_update'
  metadata?: any
  created_at: string
  updated_at: string
  read_at?: string
  status: 'sending' | 'sent' | 'delivered' | 'read'
  has_invoice?: boolean
  invoice_data?: any
}

export class ChatRoomService {
  private supabase = createClient()

  // Create a new chat room for a booking
  async createChatRoom(bookingId: string, bookingCode: string, clientId: string): Promise<ChatRoom> {
    try {
      console.log('Creating chat room for booking:', { bookingId, bookingCode, clientId })
      
      const { data, error } = await this.supabase
        .from('chat_rooms')
        .insert([{
          booking_id: bookingId,
          booking_code: bookingCode,
          client_id: clientId,
          status: 'active',
          unread_count_client: 0,
          unread_count_operator: 0
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating chat room:', error)
        throw error
      }

      console.log('✅ Chat room created successfully:', data.id)
      return data
    } catch (error) {
      console.error('Failed to create chat room:', error)
      throw error
    }
  }

  // Get chat room by booking ID
  async getChatRoomByBooking(bookingId: string): Promise<ChatRoom | null> {
    try {
      const { data, error } = await this.supabase
        .from('chat_rooms')
        .select('*')
        .eq('booking_id', bookingId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No chat room found
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error getting chat room:', error)
      return null
    }
  }

  // Get chat room by booking code
  async getChatRoomByBookingCode(bookingCode: string): Promise<ChatRoom | null> {
    try {
      const { data, error } = await this.supabase
        .from('chat_rooms')
        .select('*')
        .eq('booking_code', bookingCode)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No chat room found
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error getting chat room by booking code:', error)
      return null
    }
  }

  // Send a message to a chat room
  async sendMessage(roomId: string, bookingId: string, senderId: string, senderType: 'client' | 'operator' | 'system', message: string, messageType: 'text' | 'system' | 'invoice' | 'status_update' = 'text', metadata?: any): Promise<ChatRoomMessage> {
    try {
      console.log('Sending message to chat room:', { roomId, bookingId, senderId, senderType, messageType })
      
      const { data, error } = await this.supabase
        .from('chat_room_messages')
        .insert([{
          room_id: roomId,
          booking_id: bookingId,
          sender_id: senderId,
          sender_type: senderType,
          message: message,
          message_type: messageType,
          metadata: metadata,
          status: 'sent'
        }])
        .select()
        .single()

      if (error) {
        console.error('Error sending message:', error)
        throw error
      }

      // Update chat room last message info
      await this.updateChatRoomLastMessage(roomId, message, data.id)

      // Update unread counts
      if (senderType === 'client') {
        await this.incrementUnreadCount(roomId, 'operator')
      } else if (senderType === 'operator') {
        await this.incrementUnreadCount(roomId, 'client')
      }

      console.log('✅ Message sent successfully:', data.id)
      return data
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }

  // Get messages for a chat room
  async getChatRoomMessages(roomId: string, limit: number = 50, offset: number = 0): Promise<ChatRoomMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('chat_room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error getting messages:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to get messages:', error)
      return []
    }
  }

  // Subscribe to new messages in a chat room
  subscribeToChatRoomMessages(roomId: string, callback: (message: ChatRoomMessage) => void) {
    const subscription = this.supabase
      .channel(`chat_room_messages:room_id=eq.${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_room_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const message = payload.new as ChatRoomMessage
          callback(message)
        }
      )
      .subscribe()

    return subscription
  }

  // Mark messages as read
  async markMessagesAsRead(roomId: string, userId: string, userType: 'client' | 'operator') {
    try {
      // Mark messages as read
      const { error: messagesError } = await this.supabase
        .from('chat_room_messages')
        .update({ 
          read_at: new Date().toISOString(),
          status: 'read'
        })
        .eq('room_id', roomId)
        .neq('sender_id', userId) // Don't mark own messages as read

      if (messagesError) {
        console.error('Error marking messages as read:', messagesError)
        return
      }

      // Reset unread count
      const unreadField = userType === 'client' ? 'unread_count_client' : 'unread_count_operator'
      const { error: countError } = await this.supabase
        .from('chat_rooms')
        .update({ [unreadField]: 0 })
        .eq('id', roomId)

      if (countError) {
        console.error('Error resetting unread count:', countError)
      }

      console.log('✅ Messages marked as read for', userType)
    } catch (error) {
      console.error('Failed to mark messages as read:', error)
    }
  }

  // Update chat room last message info
  private async updateChatRoomLastMessage(roomId: string, message: string, messageId: string) {
    try {
      await this.supabase
        .from('chat_rooms')
        .update({
          last_message: message,
          last_message_at: new Date().toISOString()
        })
        .eq('id', roomId)
    } catch (error) {
      console.error('Error updating chat room last message:', error)
    }
  }

  // Increment unread count
  private async incrementUnreadCount(roomId: string, userType: 'client' | 'operator') {
    try {
      const unreadField = userType === 'client' ? 'unread_count_client' : 'unread_count_operator'
      
      // Get current count
      const { data: room } = await this.supabase
        .from('chat_rooms')
        .select(unreadField)
        .eq('id', roomId)
        .single()

      if (room) {
        const currentCount = room[unreadField] || 0
        await this.supabase
          .from('chat_rooms')
          .update({ [unreadField]: currentCount + 1 })
          .eq('id', roomId)
      }
    } catch (error) {
      console.error('Error incrementing unread count:', error)
    }
  }

  // Get all chat rooms for an operator
  async getOperatorChatRooms(): Promise<ChatRoom[]> {
    try {
      const { data, error } = await this.supabase
        .from('chat_rooms')
        .select(`
          *,
          client:profiles!chat_rooms_client_id_fkey(first_name, last_name, email, phone)
        `)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false })

      if (error) {
        console.error('Error getting operator chat rooms:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to get operator chat rooms:', error)
      return []
    }
  }

  // Get chat room for a client
  async getClientChatRoom(bookingId: string): Promise<ChatRoom | null> {
    try {
      const { data, error } = await this.supabase
        .from('chat_rooms')
        .select('*')
        .eq('booking_id', bookingId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Error getting client chat room:', error)
      return null
    }
  }

  // Close a chat room
  async closeChatRoom(roomId: string) {
    try {
      await this.supabase
        .from('chat_rooms')
        .update({ status: 'closed' })
        .eq('id', roomId)
      
      console.log('✅ Chat room closed:', roomId)
    } catch (error) {
      console.error('Error closing chat room:', error)
      throw error
    }
  }
}

// Export singleton instance
export const chatRoomService = new ChatRoomService()
