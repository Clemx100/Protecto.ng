'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { RealtimeChatManager, formatChatTimestamp, formatMessageTime } from '@/lib/utils/chat-realtime'
import { Send, Loader2, Wifi, WifiOff } from 'lucide-react'

interface ChatMessage {
  id: string
  booking_id: string
  sender_type: 'client' | 'operator' | 'system'
  sender_id: string
  message: string
  created_at: string
  is_system_message?: boolean
  message_type?: string
  _isUpdate?: boolean
  _fromPolling?: boolean
}

interface SeamlessChatProps {
  bookingId: string
  currentUserId: string
  onMessageSent?: (message: ChatMessage) => void
}

export default function SeamlessChat({ 
  bookingId, 
  currentUserId, 
  onMessageSent 
}: SeamlessChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatManagerRef = useRef<RealtimeChatManager | null>(null)
  const [typingIndicator, setTypingIndicator] = useState(false)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load messages from API
  const loadMessages = useCallback(async () => {
    if (!bookingId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/messages?bookingId=${bookingId}`)
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.data || [])
        console.log(`✅ Loaded ${data.data?.length || 0} messages`)
      } else {
        console.error('Failed to load messages:', data.error)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoading(false)
    }
  }, [bookingId])

  // Send message
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || !bookingId || isSending) return

    setIsSending(true)
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Optimistic update - add message immediately to UI
    const tempMessage: ChatMessage = {
      id: tempId,
      booking_id: bookingId,
      sender_type: 'client',
      sender_id: currentUserId,
      message: messageText,
      created_at: new Date().toISOString(),
      is_system_message: false,
      message_type: 'text'
    }

    setMessages(prev => [...prev, tempMessage])
    setNewMessage('')
    scrollToBottom()

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingId,
          content: messageText,
          senderType: 'client',
          senderId: currentUserId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Replace temp message with real message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId ? data.data : msg
          )
        )
        
        if (onMessageSent) {
          onMessageSent(data.data)
        }
        
        console.log('✅ Message sent successfully')
      } else {
        // Remove temp message on failure
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        console.error('Failed to send message:', data.error)
      }
    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }, [bookingId, currentUserId, isSending, onMessageSent, scrollToBottom])

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim()) {
      sendMessage(newMessage.trim())
    }
  }, [newMessage, sendMessage])

  // Set up enhanced real-time subscription with polling backup
  useEffect(() => {
    if (!bookingId) return

    console.log('🔗 Setting up enhanced real-time subscription for:', bookingId)

    // Load initial messages
    loadMessages()

    // Create real-time manager
    const chatManager = new RealtimeChatManager({
      bookingId,
      onMessage: (newMessage: ChatMessage) => {
        console.log('📨 New message received:', newMessage)
        
        // Show typing indicator briefly for incoming messages
        if (newMessage.sender_type !== 'client') {
          setTypingIndicator(true)
          setTimeout(() => setTypingIndicator(false), 500)
        }
        
        // Add or update message
        setMessages(prev => {
          if (newMessage._isUpdate) {
            // Update existing message
            return prev.map(msg => msg.id === newMessage.id ? newMessage : msg)
          } else {
            // Add new message if not exists
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) {
              console.log('Message already exists, skipping duplicate')
              return prev
            }
            console.log('Adding new message to chat')
            return [...prev, newMessage]
          }
        })
      },
      onConnectionChange: (status) => {
        setConnectionStatus(status)
      },
      pollingInterval: 3000 // Poll every 3 seconds as backup
    })

    chatManagerRef.current = chatManager
    chatManager.start()

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up real-time subscription')
      chatManager.stop()
      chatManagerRef.current = null
    }
  }, [bookingId, loadMessages])

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Connection Status - Compact and Modern */}
      <div className={`px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
        connectionStatus === 'connected' ? 'bg-green-50 text-green-700 border-b border-green-100' :
        connectionStatus === 'connecting' ? 'bg-amber-50 text-amber-700 border-b border-amber-100' :
        'bg-red-50 text-red-700 border-b border-red-100'
      }`}>
        {connectionStatus === 'connected' ? (
          <>
            <Wifi className="h-3 w-3" />
            <span>Real-time connected</span>
          </>
        ) : connectionStatus === 'connecting' ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Disconnected</span>
          </>
        )}
      </div>

      {/* Messages Container - Beautiful and Modern */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="bg-white rounded-full p-6 shadow-sm mb-4">
              <Send className="h-12 w-12 text-gray-300" />
            </div>
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isClient = message.sender_type === 'client'
              const isSystem = message.sender_type === 'system' || message.is_system_message
              const isOperator = message.sender_type === 'operator'
              
              // Check if this message is from the same sender as previous
              const prevMessage = index > 0 ? messages[index - 1] : null
              const isConsecutive = prevMessage && prevMessage.sender_type === message.sender_type
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isClient ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <div
                    className={`max-w-[75%] lg:max-w-md px-4 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md ${
                      isClient
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md'
                        : isOperator
                        ? 'bg-white text-gray-800 rounded-2xl rounded-bl-md border border-gray-200'
                        : 'bg-amber-50 text-amber-900 rounded-xl text-center border border-amber-200'
                    } ${isConsecutive ? 'mt-1' : 'mt-3'}`}
                  >
                    {/* Sender label for non-consecutive messages */}
                    {!isConsecutive && !isSystem && (
                      <div className={`text-[10px] font-semibold mb-1 ${
                        isClient ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {isClient ? 'You' : 'Operator'}
                      </div>
                    )}
                    
                    {/* Message content */}
                    <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                      {message.message}
                    </div>
                    
                    {/* Timestamp */}
                    <div className={`text-[10px] mt-1.5 flex items-center gap-1 ${
                      isClient ? 'text-blue-100 justify-end' : isSystem ? 'text-amber-700 justify-center' : 'text-gray-400'
                    }`}>
                      <span>{formatMessageTime(message.created_at)}</span>
                      <span className="opacity-50">•</span>
                      <span className="opacity-75">{formatChatTimestamp(message.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Typing indicator */}
            {typingIndicator && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-200">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input - Modern and Clean */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-200">
        <div className="flex space-x-2 items-end">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
              disabled={isSending || connectionStatus === 'disconnected'}
            />
            {newMessage.trim() && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {newMessage.length}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending || connectionStatus === 'disconnected'}
            className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 font-medium text-sm"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
