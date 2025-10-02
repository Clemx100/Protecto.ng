import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Message {
  id: string
  booking_id: string
  content: string
  message_type: 'text' | 'system' | 'invoice' | 'status_update' | 'image' | 'file'
  sender_id: string
  sender_role: 'client' | 'operator' | 'admin' | 'system'
  recipient_id?: string
  metadata?: any
  is_edited: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  sender?: {
    id: string
    first_name: string
    last_name: string
    role: string
  }
}

interface UseChatOptions {
  bookingId: string
  autoLoad?: boolean
  enableRealtime?: boolean
}

interface UseChatReturn {
  messages: Message[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string, messageType?: string, metadata?: any) => Promise<void>
  loadMessages: () => Promise<void>
  refreshMessages: () => Promise<void>
  clearError: () => void
}

/**
 * Custom hook for managing chat messages with real-time updates
 * 
 * @example
 * ```typescript
 * const { messages, sendMessage, isLoading } = useChat({
 *   bookingId: 'xxx-xxx-xxx',
 *   autoLoad: true,
 *   enableRealtime: true
 * })
 * ```
 */
export function useChat({
  bookingId,
  autoLoad = true,
  enableRealtime = true
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Load messages from API
  const loadMessages = useCallback(async () => {
    if (!bookingId) {
      setError('Booking ID is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/messages?bookingId=${bookingId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setMessages(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to load messages')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error loading messages:', err)
    } finally {
      setIsLoading(false)
    }
  }, [bookingId])

  // Send a new message
  const sendMessage = useCallback(async (
    content: string,
    messageType: string = 'text',
    metadata: any = {}
  ) => {
    if (!bookingId || !content.trim()) {
      setError('Booking ID and message content are required')
      return
    }

    setError(null)

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          content: content.trim(),
          messageType,
          metadata
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        // Optimistically add message to local state
        setMessages(prev => [...prev, result.data])
      } else {
        throw new Error(result.error || 'Failed to send message')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error sending message:', err)
      throw err // Re-throw so caller can handle
    }
  }, [bookingId])

  // Refresh messages (alias for loadMessages)
  const refreshMessages = useCallback(() => {
    return loadMessages()
  }, [loadMessages])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Auto-load messages on mount
  useEffect(() => {
    if (autoLoad && bookingId) {
      loadMessages()
    }
  }, [autoLoad, bookingId, loadMessages])

  // Set up real-time subscription
  useEffect(() => {
    if (!enableRealtime || !bookingId) {
      return
    }

    console.log('🔴 Setting up real-time subscription for booking:', bookingId)

    const channel = supabase
      .channel(`messages:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          console.log('📨 New message received:', payload.new)
          
          // Add new message to state if not already present
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === payload.new.id)
            if (exists) {
              return prev
            }
            return [...prev, payload.new as Message]
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
          
          // Update message in state
          setMessages(prev =>
            prev.map(msg =>
              msg.id === payload.new.id ? { ...msg, ...payload.new } as Message : msg
            )
          )
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status)
      })

    return () => {
      console.log('🔴 Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
  }, [enableRealtime, bookingId, supabase])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    loadMessages,
    refreshMessages,
    clearError
  }
}

/**
 * Hook for sending system messages
 */
export function useSystemMessages() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendSystemMessage = useCallback(async (
    bookingId: string,
    content: string,
    metadata: any = {}
  ) => {
    if (!bookingId || !content.trim()) {
      throw new Error('Booking ID and content are required')
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/messages/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          content: content.trim(),
          metadata
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send system message: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send system message')
      }

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error sending system message:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    sendSystemMessage,
    isLoading,
    error
  }
}

