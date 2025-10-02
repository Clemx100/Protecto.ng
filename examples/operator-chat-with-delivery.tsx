/**
 * Example: Operator Dashboard Chat with Guaranteed Message Delivery
 * 
 * This example shows how to integrate the reliable real-time chat system
 * into the operator dashboard with delivery tracking and retry logic.
 */

"use client"

import { useState, useRef, useEffect } from "react"
import { Send, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChatWithDelivery } from "@/lib/hooks/useChatWithDelivery"
import {
  ConnectionStatus,
  MessageDeliveryIndicator,
  ChatOfflineBanner,
  PendingMessagesBanner
} from "@/components/ui/chat-status-indicator"

interface OperatorChatExampleProps {
  selectedBooking: {
    id: string
    database_id: string
    booking_code: string
    client: {
      first_name: string
      last_name: string
    }
  } | null
}

export default function OperatorChatExample({ selectedBooking }: OperatorChatExampleProps) {
  const [newMessage, setNewMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use the enhanced chat hook with delivery tracking
  const {
    messages,
    sendMessage,
    isLoading,
    error: chatError,
    connectionStatus,
    pendingMessagesCount,
    retryFailedMessages,
    clearError
  } = useChatWithDelivery({
    bookingId: selectedBooking?.database_id || '',
    autoLoad: true,
    enableRealtime: true,
    onConnectionChange: (status) => {
      console.log('📡 Connection status changed:', status)
      
      // Show user-friendly notifications
      if (status === 'disconnected') {
        setError('Connection lost. Messages may not be delivered immediately.')
      } else if (status === 'connected') {
        setError(null)
      }
    }
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle send message
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedBooking) {
      return
    }

    const messageText = newMessage.trim()
    setNewMessage('') // Clear immediately for better UX
    setError(null)

    try {
      await sendMessage(messageText, 'text')
      console.log('✅ Message sent successfully')
    } catch (err) {
      console.error('❌ Failed to send message:', err)
      setError('Failed to send message. It will be retried automatically.')
      // Don't restore the message - it's in the retry queue
    }
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!selectedBooking) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Select a booking to start chatting</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white/10 rounded-xl border border-white/20">
      {/* Header with Connection Status */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {selectedBooking.client.first_name} {selectedBooking.client.last_name}
            </h3>
            <p className="text-sm text-gray-400">
              Booking: {selectedBooking.booking_code}
            </p>
          </div>
          
          {/* Connection Status Badge */}
          <ConnectionStatus
            status={connectionStatus}
            pendingCount={pendingMessagesCount}
            onRetry={retryFailedMessages}
          />
        </div>
      </div>

      {/* Alerts */}
      <div className="p-4">
        {/* Offline Banner */}
        {connectionStatus === 'disconnected' && (
          <ChatOfflineBanner onRetry={retryFailedMessages} />
        )}

        {/* Pending Messages Banner */}
        <PendingMessagesBanner
          count={pendingMessagesCount}
          onRetry={retryFailedMessages}
        />

        {/* Error Message */}
        {(error || chatError) && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-300">
              {error || chatError}
            </p>
            <button
              onClick={clearError}
              className="text-xs text-red-400 hover:text-red-300 mt-1"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading messages...</span>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOperator = message.sender_role === 'operator' || message.sender_role === 'admin'
              const isSystem = message.sender_role === 'system' || message.message_type === 'system'

              return (
                <div
                  key={message.id}
                  className={`flex ${isOperator ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isSystem
                        ? 'bg-gray-800/50 text-gray-300 border border-gray-700 text-center mx-auto'
                        : isOperator
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    {/* Message Content */}
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </div>

                    {/* Message Footer */}
                    {!isSystem && (
                      <div className="flex items-center justify-between mt-2 gap-2">
                        {/* Timestamp */}
                        <span className="text-xs opacity-70">
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>

                        {/* Delivery Status (only for sent messages) */}
                        {isOperator && (
                          <MessageDeliveryIndicator
                            status={message.delivery_status || 'delivered'}
                            retryCount={message.retry_count}
                            onRetry={retryFailedMessages}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={connectionStatus === 'disconnected'}
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || connectionStatus === 'disconnected'}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Connection hint */}
        {connectionStatus === 'disconnected' && (
          <p className="text-xs text-red-400 mt-2">
            Cannot send messages while disconnected
          </p>
        )}

        {connectionStatus === 'reconnecting' && (
          <p className="text-xs text-yellow-400 mt-2">
            Reconnecting... Messages will be sent once connected
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Usage in operator dashboard:
 * 
 * import OperatorChatExample from '@/examples/operator-chat-with-delivery'
 * 
 * <OperatorChatExample selectedBooking={selectedBooking} />
 */

