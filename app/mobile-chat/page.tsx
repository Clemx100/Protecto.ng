'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ChatMessage {
  id: string
  booking_id: string
  sender_type: 'client' | 'operator' | 'system'
  sender_id: string
  message: string
  created_at: string
  is_system_message?: boolean
  message_type?: string
}

export default function MobileChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  
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

  // Set up real-time subscription
  useEffect(() => {
    if (!bookingId) return

    console.log('🔗 Setting up seamless real-time subscription for:', bookingId)
    setConnectionStatus('connecting')

    const channel = supabase
      .channel(`seamless-mobile-chat-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          console.log('📨 New message received via real-time:', payload.new)
          
          const newMessage = payload.new as ChatMessage
          
          // Check if message already exists (avoid duplicates)
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) {
              console.log('Message already exists, skipping duplicate')
              return prev
            }
            
            console.log('Adding new message to chat')
            return [...prev, newMessage]
          })
          
          setConnectionStatus('connected')
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status)
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
          console.log('✅ Seamless real-time chat connected!')
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected')
          console.error('❌ Real-time connection failed')
        } else {
          setConnectionStatus('connecting')
        }
      })

    // Load initial messages
    loadMessages()

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
  }, [bookingId, loadMessages, supabase])

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4 text-center font-bold">
        📱 PROTECTOR.NG - Seamless Chat
      </div>
      
      {/* Connection Status */}
      <div className={`px-4 py-2 text-sm text-center ${
        connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
        connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        {connectionStatus === 'connected' ? '🟢 Connected' :
         connectionStatus === 'connecting' ? '🟡 Connecting...' :
         '🔴 Disconnected'}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {isLoading ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_type === 'client' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender_type === 'client'
                    ? 'bg-blue-500 text-white'
                    : message.sender_type === 'operator'
                    ? 'bg-white text-gray-800 border border-gray-200'
                    : 'bg-yellow-100 text-yellow-800 text-center'
                }`}
              >
                <div className="text-sm">{message.message}</div>
                <div className={`text-xs mt-1 ${
                  message.sender_type === 'client' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(message.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSending || connectionStatus === 'disconnected'}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending || connectionStatus === 'disconnected'}
            className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
