export interface ChatMessage {
  id: string
  booking_id: string
  sender_type: 'client' | 'operator' | 'system'
  sender_id: string
  message: string
  created_at: string
  updated_at: string
  is_system_message?: boolean
}

class ChatService {
  async createSystemMessage(bookingId: string, message: string, senderId: string) {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          content: message,
          messageType: 'system',
          senderType: 'system',
          senderId,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result?.success && result?.data) {
          return {
            id: result.data.id,
            booking_id: bookingId,
            sender_type: 'system' as const,
            sender_id: senderId,
            message,
            created_at: result.data.created_at,
            updated_at: result.data.created_at,
            is_system_message: true,
          } satisfies ChatMessage
        }
      }
    } catch (error) {
      console.error('createSystemMessage API fallback:', error)
    }

    // Fallback keeps UX functional when API fails.
    return {
      id: `msg_${Date.now()}`,
      booking_id: bookingId,
      sender_type: 'system',
      sender_id: senderId,
      message,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_system_message: true,
    } satisfies ChatMessage
  }
}

export const chatService = new ChatService()
