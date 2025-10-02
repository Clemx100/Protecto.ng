import { useState, useEffect, useCallback, useRef } from 'react'
import { realtimeMessageService, Message, MessageDeliveryStatus } from '@/lib/services/realtimeMessageService'

interface UseChatWithDeliveryOptions {
  bookingId: string
  autoLoad?: boolean
  enableRealtime?: boolean
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'reconnecting') => void
}

interface UseChatWithDeliveryReturn {
  messages: Message[]
  isLoading: boolean
  error: string | null
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  pendingMessagesCount: number
  sendMessage: (content: string, messageType?: string, metadata?: any) => Promise<void>
  loadMessages: () => Promise<void>
  retryFailedMessages: () => Promise<void>
  clearError: () => void
}

/**
 * Enhanced chat hook with delivery tracking and retry logic
 * Ensures all messages are delivered successfully in real-time
 */
export function useChatWithDelivery({
  bookingId,
  autoLoad = true,
  enableRealtime = true,
  onConnectionChange
}: UseChatWithDeliveryOptions): UseChatWithDeliveryReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected')
  const [pendingMessagesCount, setPendingMessagesCount] = useState(0)
  
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const deliveryStatusListenerRef = useRef<Function | null>(null)
  const connectionStatusListenerRef = useRef<Function | null>(null)

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
        const messagesWithStatus = (result.data || []).map((msg: Message) => ({
          ...msg,
          delivery_status: 'delivered' as const
        }))
        setMessages(messagesWithStatus)
        console.log(`✅ Loaded ${messagesWithStatus.length} messages`)
      } else {
        throw new Error(result.error || 'Failed to load messages')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('❌ Error loading messages:', err)
    } finally {
      setIsLoading(false)
    }
  }, [bookingId])

  // Send message with delivery tracking
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

    // Add optimistic message
    const tempId = `temp_${Date.now()}`
    const optimisticMessage: Message = {
      id: tempId,
      booking_id: bookingId,
      content: content.trim(),
      message_type: messageType,
      sender_id: 'temp',
      sender_role: 'client',
      created_at: new Date().toISOString(),
      delivery_status: 'sending'
    }

    setMessages(prev => [...prev, optimisticMessage])

    try {
      const sentMessage = await realtimeMessageService.sendMessage(
        bookingId,
        content.trim(),
        messageType,
        metadata
      )

      // Update the optimistic message with the real one
      setMessages(prev => 
        prev.map(msg => msg.id === tempId ? sentMessage : msg)
      )

      console.log('✅ Message sent successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      
      // Update message status to failed
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId
            ? { ...msg, delivery_status: 'failed' as const }
            : msg
        )
      )
      
      console.error('❌ Error sending message:', err)
      throw err
    }
  }, [bookingId])

  // Retry failed messages
  const retryFailedMessages = useCallback(async () => {
    try {
      await realtimeMessageService.retryFailedMessages()
      await loadMessages() // Reload to get updated status
    } catch (err) {
      console.error('❌ Error retrying messages:', err)
    }
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

  // Set up real-time subscription with delivery tracking
  useEffect(() => {
    if (!enableRealtime || !bookingId) {
      return
    }

    console.log('🔴 Setting up real-time subscription with delivery tracking')

    // Subscribe to messages
    const setupSubscription = async () => {
      try {
        const unsubscribe = await realtimeMessageService.subscribeToMessages(
          bookingId,
          (newMessage: Message) => {
            console.log('📨 New message received via real-time:', newMessage.id)
            
            // Add or update message in state
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id)
              if (exists) {
                // Update existing message
                return prev.map(msg =>
                  msg.id === newMessage.id ? newMessage : msg
                )
              } else {
                // Add new message
                return [...prev, newMessage]
              }
            })
          },
          (error: Error) => {
            console.error('❌ Real-time subscription error:', error)
            setError(`Real-time error: ${error.message}`)
          }
        )

        unsubscribeRef.current = unsubscribe
      } catch (err) {
        console.error('❌ Failed to setup subscription:', err)
        setError('Failed to setup real-time connection')
      }
    }

    setupSubscription()

    // Listen for delivery status updates
    const handleDeliveryStatus = (status: MessageDeliveryStatus) => {
      console.log('📬 Delivery status update:', status)
      
      setMessages(prev =>
        prev.map(msg =>
          msg.id === status.messageId
            ? { ...msg, delivery_status: status.status }
            : msg
        )
      )
      
      // Update pending count
      setPendingMessagesCount(realtimeMessageService.getPendingMessagesCount())
    }

    // Listen for connection status changes
    const handleConnectionStatus = (data: { status: 'connected' | 'disconnected' | 'reconnecting' }) => {
      console.log('🔌 Connection status changed:', data.status)
      setConnectionStatus(data.status)
      
      if (onConnectionChange) {
        onConnectionChange(data.status)
      }

      // If reconnected, reload messages to ensure sync
      if (data.status === 'connected') {
        loadMessages()
      }
    }

    deliveryStatusListenerRef.current = handleDeliveryStatus
    connectionStatusListenerRef.current = handleConnectionStatus

    realtimeMessageService.addEventListener('delivery_status', handleDeliveryStatus)
    realtimeMessageService.addEventListener('connection_status', handleConnectionStatus)

    // Cleanup
    return () => {
      console.log('🔴 Cleaning up real-time subscription')
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      if (deliveryStatusListenerRef.current) {
        realtimeMessageService.removeEventListener('delivery_status', deliveryStatusListenerRef.current)
      }
      if (connectionStatusListenerRef.current) {
        realtimeMessageService.removeEventListener('connection_status', connectionStatusListenerRef.current)
      }
    }
  }, [enableRealtime, bookingId, loadMessages, onConnectionChange])

  // Update pending count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingMessagesCount(realtimeMessageService.getPendingMessagesCount())
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return {
    messages,
    isLoading,
    error,
    connectionStatus,
    pendingMessagesCount,
    sendMessage,
    loadMessages,
    retryFailedMessages,
    clearError
  }
}

