/**
 * Real-Time Chat Hook - Complete solution for client and operator
 * Handles messages + booking status updates in real-time
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { unifiedChatService, ChatMessage, BookingStatus } from '@/lib/services/unifiedChatService'

interface UseRealtimeChatOptions {
  bookingId: string
  onStatusUpdate?: (status: string) => void
  autoLoad?: boolean
}

interface UseRealtimeChatReturn {
  messages: ChatMessage[]
  currentStatus: string
  isLoading: boolean
  isSending: boolean
  error: string | null
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
  sendMessage: (content: string) => Promise<boolean>
  refreshMessages: () => Promise<void>
  clearError: () => void
}

export function useRealtimeChat({
  bookingId,
  onStatusUpdate,
  autoLoad = true
}: UseRealtimeChatOptions): UseRealtimeChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentStatus, setCurrentStatus] = useState<string>('pending')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null)
  const unsubscribeStatusRef = useRef<(() => void) | null>(null)

  /**
   * Load messages from backend
   */
  const loadMessages = useCallback(async () => {
    if (!bookingId) {
      setError('Booking ID is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('📥 Loading messages for booking:', bookingId)
      const loadedMessages = await unifiedChatService.getMessages(bookingId)
      
      console.log(`✅ Loaded ${loadedMessages.length} messages`)
      setMessages(loadedMessages)
      
      // Extract current status from system messages
      const statusMessages = loadedMessages.filter(m => 
        m.is_system_message && m.message.includes('Status updated to:')
      )
      if (statusMessages.length > 0) {
        const latestStatusMsg = statusMessages[statusMessages.length - 1]
        const statusMatch = latestStatusMsg.message.match(/Status updated to: (\w+)/)
        if (statusMatch) {
          setCurrentStatus(statusMatch[1])
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages'
      console.error('❌ Error loading messages:', err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [bookingId])

  /**
   * Send a message
   */
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!bookingId || !content.trim()) {
      setError('Message content is required')
      return false
    }

    setIsSending(true)
    setError(null)

    try {
      console.log('📤 Sending message:', content)
      
      const sentMessage = await unifiedChatService.sendMessage(
        bookingId,
        content.trim(),
        'client'
      )

      if (sentMessage) {
        console.log('✅ Message sent successfully:', sentMessage.id)
        
        // Add to local state if not already there (optimistic update)
        setMessages(prev => {
          const exists = prev.some(m => m.id === sentMessage.id)
          if (exists) return prev
          return [...prev, sentMessage]
        })
        
        return true
      } else {
        throw new Error('Failed to send message')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      console.error('❌ Error sending message:', err)
      setError(errorMessage)
      return false
    } finally {
      setIsSending(false)
    }
  }, [bookingId])

  /**
   * Refresh messages
   */
  const refreshMessages = useCallback(async () => {
    await loadMessages()
  }, [loadMessages])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Auto-load messages on mount
   */
  useEffect(() => {
    if (autoLoad && bookingId) {
      loadMessages()
    }
  }, [autoLoad, bookingId, loadMessages])

  /**
   * Setup real-time subscriptions
   */
  useEffect(() => {
    if (!bookingId) {
      return
    }

    console.log('🔴 Setting up real-time subscriptions for:', bookingId)
    setConnectionStatus('connecting')

    // Subscribe to messages
    const unsubMessages = unifiedChatService.subscribeToMessages(
      bookingId,
      (newMessage) => {
        console.log('📨 New message received via real-time:', newMessage)
        
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(m => m.id === newMessage.id)
          if (exists) {
            console.log('Message already exists, skipping')
            return prev
          }
          
          console.log('Adding new message to state')
          return [...prev, newMessage]
        })
        
        // Update connection status
        setConnectionStatus('connected')
      },
      (error) => {
        console.error('❌ Message subscription error:', error)
        setError(error.message)
        setConnectionStatus('disconnected')
      }
    )

    // Subscribe to booking status updates
    const unsubStatus = unifiedChatService.subscribeToBookingStatus(
      bookingId,
      (statusUpdate) => {
        console.log('🔄 Booking status updated:', statusUpdate)
        
        setCurrentStatus(statusUpdate.status)
        
        // Notify parent component
        if (onStatusUpdate) {
          onStatusUpdate(statusUpdate.status)
        }
        
        // Add system message to chat about status change
        if (statusUpdate.message) {
          const systemMessage: ChatMessage = {
            id: `status_${Date.now()}`,
            booking_id: bookingId,
            sender_type: 'system',
            sender_id: 'system',
            message: statusUpdate.message,
            created_at: statusUpdate.updated_at,
            is_system_message: true,
            message_type: 'system'
          }
          
          setMessages(prev => [...prev, systemMessage])
        }
      },
      (error) => {
        console.error('❌ Status subscription error:', error)
      }
    )

    unsubscribeMessagesRef.current = unsubMessages
    unsubscribeStatusRef.current = unsubStatus

    // Cleanup on unmount
    return () => {
      console.log('🔴 Cleaning up subscriptions')
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current()
      }
      if (unsubscribeStatusRef.current) {
        unsubscribeStatusRef.current()
      }
    }
  }, [bookingId, onStatusUpdate])

  return {
    messages,
    currentStatus,
    isLoading,
    isSending,
    error,
    connectionStatus,
    sendMessage,
    refreshMessages,
    clearError
  }
}

