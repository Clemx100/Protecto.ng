/**
 * EXAMPLE: Client Chat with Real-Time Messages and Status Updates
 * 
 * This is a complete, production-ready chat component for the client side
 * Features:
 * - Real-time message delivery (both directions)
 * - Real-time status updates appear in chat
 * - Connection status indicator
 * - Delivery confirmations
 * - Optimistic UI updates
 */

"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Wifi, WifiOff, RefreshCw, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRealtimeChat } from "@/lib/hooks/useRealtimeChat"

interface ClientChatProps {
  bookingId: string
  bookingCode?: string
  onBack?: () => void
}

export default function ClientChatRealtime({ bookingId, bookingCode, onBack }: ClientChatProps) {
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use the unified real-time chat hook
  const {
    messages,
    currentStatus,
    isLoading,
    isSending,
    error,
    connectionStatus,
    sendMessage,
    refreshMessages,
    clearError
  } = useRealtimeChat({
    bookingId,
    autoLoad: true,
    onStatusUpdate: (newStatus) => {
      console.log('🔄 Status updated in chat:', newStatus)
      // Status is automatically displayed in the chat messages
    }
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle send message
  const handleSend = async () => {
    if (!newMessage.trim() || isSending) {
      return
    }

    const messageText = newMessage.trim()
    setNewMessage('') // Clear immediately for better UX

    try {
      const success = await sendMessage(messageText)
      if (success) {
        console.log('✅ Message sent successfully')
      } else {
        // Restore message if failed
        setNewMessage(messageText)
      }
    } catch (err) {
      console.error('❌ Failed to send message:', err)
      setNewMessage(messageText) // Restore message
    }
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Format status for display
  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Get status color
  const getStatusColor = (status: string) => {
    const normalized = status.toLowerCase()
    const colors: { [key: string]: string } = {
      'pending': 'bg-yellow-500/20 text-yellow-400',
      'accepted': 'bg-blue-500/20 text-blue-400',
      'en_route': 'bg-purple-500/20 text-purple-400',
      'arrived': 'bg-green-500/20 text-green-400',
      'in_service': 'bg-green-500/20 text-green-400',
      'completed': 'bg-gray-500/20 text-gray-400',
      'cancelled': 'bg-red-500/20 text-red-400'
    }
    return colors[normalized] || 'bg-gray-500/20 text-gray-400'
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                onClick={onBack}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-white">
                Booking Chat
              </h1>
              <p className="text-xs text-gray-400">
                {bookingCode || bookingId}
              </p>
            </div>
          </div>

          {/* Connection & Status */}
          <div className="flex items-center gap-3">
            {/* Current Booking Status */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(currentStatus)}`}>
              {formatStatus(currentStatus)}
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <>
                  <Wifi className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-green-400">Connected</span>
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <RefreshCw className="h-4 w-4 text-yellow-400 animate-spin" />
                  <span className="text-xs text-yellow-400">Connecting...</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-red-400">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/20 border-b border-red-500/50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={clearError}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading messages...</span>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOperator = message.sender_type === 'operator'
              const isSystem = message.sender_type === 'system' || message.is_system_message

              return (
                <div
                  key={message.id}
                  className={`flex ${isOperator ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      isSystem
                        ? 'bg-blue-500/10 text-blue-200 border border-blue-500/30 text-center text-sm'
                        : isOperator
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    {/* Message sender (for non-system messages) */}
                    {!isSystem && message.sender && (
                      <div className="text-xs opacity-70 mb-1">
                        {message.sender.first_name} {message.sender.last_name}
                      </div>
                    )}

                    {/* Message content */}
                    <div className="whitespace-pre-wrap break-words">
                      {message.message}
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs opacity-60 mt-1">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-white/10 p-4 bg-black/20">
        {connectionStatus === 'disconnected' && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 mb-3 text-center">
            <p className="text-xs text-red-300">
              You are offline. Messages will be sent when connection is restored.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isSending}
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 disabled:opacity-50"
          >
            {isSending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * USAGE:
 * 
 * import ClientChatRealtime from '@/examples/client-chat-realtime'
 * 
 * <ClientChatRealtime 
 *   bookingId={booking.database_id || booking.id}
 *   bookingCode={booking.booking_code}
 *   onBack={() => router.back()}
 * />
 */

