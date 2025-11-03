'use client'

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { RealtimeChatManager, formatChatTimestamp, formatMessageTime } from '@/lib/utils/chat-realtime'
import { Send, Loader2, Wifi, WifiOff, MessageCircle } from 'lucide-react'

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

function MobileChatContent() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatManagerRef = useRef<RealtimeChatManager | null>(null)
  const [typingIndicator, setTypingIndicator] = useState(false)
  
  // Use the booking ID from the image
  const bookingId = '704ee613-c2d1-4c29-968f-0e5343c84580'
  const currentUserId = 'mobile-client'

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
        
        console.log('✅ Message sent successfully')
      } else {
        // Remove temp message on failure
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
        console.error('Failed to send message:', data.error)
        alert('Failed to send message: ' + data.error)
      }
    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }, [bookingId, currentUserId, isSending, scrollToBottom])

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

    console.log('🔗 Setting up enhanced mobile real-time subscription for:', bookingId)

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
      pollingInterval: 2000 // Poll every 2 seconds for mobile (faster refresh)
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header - Modern Mobile Style */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">PROTECTOR.NG</h1>
              <p className="text-xs text-blue-100">Support Chat</p>
            </div>
          </div>
          
          {/* Connection Status Badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
            connectionStatus === 'connected' ? 'bg-green-500/20 text-green-100' :
            connectionStatus === 'connecting' ? 'bg-amber-500/20 text-amber-100' :
            'bg-red-500/20 text-red-100'
          }`}>
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>Live</span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>Off</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container - Mobile Optimized */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 overscroll-contain">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Loader2 className="h-10 w-10 animate-spin mb-3" />
            <p className="text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="bg-white rounded-full p-8 shadow-sm mb-4">
              <Send className="h-16 w-16 text-gray-300" />
            </div>
            <p className="text-base font-medium">No messages yet</p>
            <p className="text-sm mt-1">Send a message to start!</p>
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
                  className={`flex ${isClient ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 shadow-md transition-all duration-200 active:scale-95 ${
                      isClient
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md'
                        : isOperator
                        ? 'bg-white text-gray-800 rounded-2xl rounded-bl-md border border-gray-200'
                        : 'bg-amber-50 text-amber-900 rounded-xl text-center border border-amber-200'
                    } ${isConsecutive ? 'mt-0.5' : 'mt-3'}`}
                  >
                    {/* Sender label for non-consecutive messages */}
                    {!isConsecutive && !isSystem && (
                      <div className={`text-[10px] font-bold mb-1 ${
                        isClient ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {isClient ? 'You' : 'Operator'}
                      </div>
                    )}
                    
                    {/* Message content */}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.message}
                    </div>
                    
                    {/* Timestamp */}
                    <div className={`text-[9px] mt-1.5 flex items-center gap-1 ${
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
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-md border border-gray-200">
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

      {/* Message Input - Mobile Optimized */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex space-x-2 items-end">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-4 py-3 pr-10 bg-gray-50 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
              disabled={isSending || connectionStatus === 'disconnected'}
            />
            {newMessage.trim() && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                {newMessage.length}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending || connectionStatus === 'disconnected'}
            className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md active:scale-95 flex items-center justify-center"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function MobileChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading chat...</p>
      </div>
    </div>}>
      <MobileChatContent />
    </Suspense>
  )
}
