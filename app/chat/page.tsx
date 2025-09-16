"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { chatService, ChatMessage } from "@/lib/services/chatService"
import { ArrowLeft, Send, Shield, Clock, MapPin, User, Phone, Calendar, Car, RefreshCw } from "lucide-react"

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [requestStatus, setRequestStatus] = useState("Pending Deployment")
  const [bookingStatus, setBookingStatus] = useState("pending")
  const [bookingPayload, setBookingPayload] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    initializeChat()
  }, [searchParams])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  // Check for status updates and refresh messages periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkStatusUpdates()
      // Also refresh messages every 2 seconds as fallback
      if (bookingPayload?.id) {
        console.log('🔄 PERIODIC MESSAGE REFRESH for booking:', bookingPayload.id)
        loadMessages(bookingPayload.id)
      }
    }, 2000) // Check every 2 seconds
    return () => clearInterval(interval)
  }, [bookingPayload?.id, bookingStatus])

  // Force refresh when window regains focus (user switches back to chat)
  useEffect(() => {
    const handleFocus = () => {
      if (bookingPayload?.id) {
        console.log('🔄 WINDOW FOCUS - REFRESHING MESSAGES')
        loadMessages(bookingPayload.id)
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [bookingPayload?.id])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const checkStatusUpdates = () => {
    if (!bookingPayload?.id) return
    
    try {
      // Check for status updates in localStorage
      const operatorBookings = JSON.parse(localStorage.getItem('operator_bookings') || '[]')
      const currentBooking = operatorBookings.find((booking: any) => booking.id === bookingPayload.id)
      
      if (currentBooking && currentBooking.status !== bookingStatus) {
        console.log('Status update detected:', currentBooking.status)
        setBookingStatus(currentBooking.status)
        
        // Update request status display
        switch (currentBooking.status) {
          case 'confirmed':
            setRequestStatus('Confirmed')
            break
          case 'en_route':
            setRequestStatus('En Route')
            break
          case 'arrived':
            setRequestStatus('Arrived')
            break
          case 'in_service':
            setRequestStatus('In Service')
            break
          case 'completed':
            setRequestStatus('Completed')
            break
          default:
            setRequestStatus('Pending Deployment')
        }
      }
    } catch (error) {
      console.error('Error checking status updates:', error)
    }
  }

  const initializeChat = async () => {
    try {
      setIsLoading(true)
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/')
        return
      }
      setUser(currentUser)

      // Get booking data from URL params or localStorage
      const bookingId = searchParams.get('id')
      const storedBooking = localStorage.getItem('currentBooking')
      
      console.log('Chat page loaded with bookingId:', bookingId)
      console.log('Stored booking:', storedBooking)
      
      if (storedBooking) {
        try {
          const booking = JSON.parse(storedBooking)
          console.log('Parsed booking:', booking)
          setBookingPayload(booking)
          
          // Load existing messages
          await loadMessages(booking.id)
          
          // Check for status updates
          checkStatusUpdates()
          
          // Try to set up real-time subscription, but don't fail if it doesn't work
          console.log('🔗 SETTING UP REAL-TIME SUBSCRIPTION for booking:', booking.id)
          try {
            const subscription = chatService.subscribeToMessages(booking.id, (newMessage) => {
              console.log('🔔 NEW MESSAGE RECEIVED IN USER CHAT:', newMessage)
              console.log('Message sender_type:', newMessage.sender_type)
              console.log('Message sender_id:', newMessage.sender_id)
              console.log('Message content:', newMessage.message)
              console.log('Has invoice:', newMessage.has_invoice)
              console.log('Is system message:', newMessage.is_system_message)
              
              setChatMessages(prev => {
                // Check if message already exists to prevent duplicates
                const exists = prev.some(msg => msg.id === newMessage.id || (msg.message === newMessage.message && msg.is_system_message === newMessage.is_system_message))
                if (exists) {
                  console.log('❌ Duplicate message detected, skipping')
                  return prev
                }
                console.log('✅ Adding new message to chat')
                return [...prev, newMessage]
              })
              
              // Check for status updates when new messages arrive
              checkStatusUpdates()
            })
            
            // Cleanup subscription on unmount
            return () => {
              chatService.unsubscribe(subscription)
            }
          } catch (error) {
            console.log('❌ Real-time subscription failed, using fallback:', error)
            // Don't fail the entire chat if subscription fails
          }
        } catch (error) {
          console.error("Error parsing stored booking:", error)
        }
      } else {
        console.log('No stored booking found in localStorage')
      }
    } catch (error) {
      console.error("Error initializing chat:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async (bookingId: string) => {
    try {
      console.log('🔄 LOADING MESSAGES for booking:', bookingId)
      const messages = await chatService.getMessages(bookingId)
      console.log('📥 MESSAGES FROM DATABASE:', messages)
      console.log('📊 Total messages from database:', messages.length)
      
      // Always check both database and localStorage for messages
      const storedMessages = localStorage.getItem(`chat_${bookingId}`)
      const sharedMessages = localStorage.getItem(`shared_chat_${bookingId}`)
      
      console.log('📥 MESSAGES FROM DATABASE:', messages.length)
      console.log('📥 MESSAGES FROM LOCALSTORAGE:', storedMessages ? JSON.parse(storedMessages).length : 0)
      console.log('📥 MESSAGES FROM SHARED LOCALSTORAGE:', sharedMessages ? JSON.parse(sharedMessages).length : 0)
      
      // Combine all message sources
      let allMessages = [...messages]
      
      if (storedMessages) {
        const parsedStored = JSON.parse(storedMessages)
        allMessages = [...allMessages, ...parsedStored]
      }
      
      if (sharedMessages) {
        const parsedShared = JSON.parse(sharedMessages)
        allMessages = [...allMessages, ...parsedShared]
      }
      
      // Remove duplicates based on message content and ID
      const uniqueMessages = allMessages.filter((msg, index, self) => 
        index === self.findIndex(m => 
          m.id === msg.id || 
          (m.message === msg.message && m.is_system_message === msg.is_system_message && m.sender_type === msg.sender_type)
        )
      )
      
      console.log('📊 TOTAL UNIQUE MESSAGES:', uniqueMessages.length)
      console.log('📋 MESSAGE DETAILS:', uniqueMessages.map(m => ({
        id: m.id,
        sender_type: m.sender_type,
        message: m.message.substring(0, 50) + '...',
        has_invoice: m.has_invoice
      })))
      setChatMessages(uniqueMessages)
    } catch (error) {
      console.error("Error loading messages:", error)
      // Fallback: check localStorage for messages
      const storedMessages = localStorage.getItem(`chat_${bookingId}`)
      console.log('Error fallback - stored messages:', storedMessages)
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages)
        console.log('Error fallback - parsed messages:', parsedMessages)
        setChatMessages(parsedMessages)
      }
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !bookingPayload || !user || isSending) return

    try {
      setIsSending(true)
      
      // Create client message
      const message = await chatService.createClientMessage(
        bookingPayload.id,
        newMessage.trim(),
        user.id
      )
      
      // Add to local state immediately
      setChatMessages(prev => [...prev, message])
      
      // Save to localStorage as fallback
      const updatedMessages = [...chatMessages, message]
      localStorage.setItem(`chat_${bookingPayload.id}`, JSON.stringify(updatedMessages))
      
      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsSending(false)
    }
  }

  const handleBackToBookings = () => {
    router.push('/')
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-sm mx-auto bg-black min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-sm">Loading chat...</div>
          <div className="text-xs text-gray-400 mt-2">Check browser console for debug info</div>
        </div>
      </div>
    )
  }

  if (!bookingPayload) {
    return (
      <div className="w-full max-w-sm mx-auto bg-black min-h-screen flex items-center justify-center">
        <div className="text-center text-white p-4">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-lg font-semibold mb-2">No Booking Found</h1>
          <p className="mb-4 text-sm text-gray-400">No active booking request found.</p>
          <Button 
            onClick={handleBackToBookings} 
            className="bg-blue-600 hover:bg-blue-700 text-sm px-4 py-2 rounded-xl"
          >
            Back to Bookings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm mx-auto bg-black min-h-screen flex flex-col text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 w-full max-w-sm mx-auto bg-black text-white p-3 z-50 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleBackToBookings}
              variant="ghost"
              size="sm"
              className="text-white hover:text-gray-300 p-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-base font-semibold text-white">Request Chat</h1>
              <p className="text-xs text-gray-400">#{bookingPayload?.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (bookingPayload?.id) {
                  console.log('🔄 MANUAL REFRESH triggered')
                  loadMessages(bookingPayload.id)
                  // Force immediate re-render
                  setChatMessages(prev => [...prev])
                }
              }}
              className="text-white hover:bg-white/10 p-1"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                requestStatus === "Pending Deployment"
                  ? "bg-yellow-600 text-yellow-100"
                  : requestStatus === "Confirmed"
                  ? "bg-blue-600 text-blue-100"
                  : requestStatus === "En Route"
                  ? "bg-purple-600 text-purple-100"
                  : requestStatus === "Arrived"
                  ? "bg-orange-600 text-orange-100"
                  : requestStatus === "In Service"
                  ? "bg-indigo-600 text-indigo-100"
                  : requestStatus === "Completed"
                  ? "bg-green-600 text-green-100"
                  : "bg-yellow-600 text-yellow-100"
              }`}
            >
              {requestStatus}
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 pt-16 space-y-3">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_type === "client" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-3 ${
                msg.sender_type === "client"
                  ? "bg-blue-600 text-white"
                  : msg.sender_type === "system"
                    ? "bg-gray-800 text-gray-300 border border-gray-700"
                    : "bg-gray-700 text-white"
              }`}
            >
              {msg.is_system_message ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-5 w-5 text-blue-400" />
                    <span className="font-bold text-lg text-blue-400">New Protection Request</span>
                  </div>
                  
                  {/* Display the formatted booking summary message */}
                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <div className="space-y-2">
                      {msg.message.split('\n').map((line, index) => {
                        if (line.includes('**') && line.includes(':')) {
                          const [key, value] = line.split(':').map(s => s.replace(/\*\*/g, '').trim())
                          if (key && value) {
                            return (
                              <div key={index} className="flex justify-between items-center py-1">
                                <span className="text-gray-400 text-sm font-medium">{key}:</span>
                                <span className="text-white text-sm text-right">{value}</span>
                              </div>
                            )
                          }
                        }
                        return null
                      })}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-400 text-center">
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm leading-relaxed">{msg.message}</div>
                  {msg.has_invoice && msg.invoice_data && (
                    <div className="mt-3 p-4 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-blue-300 text-sm font-medium">Invoice Details</span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-300 text-sm">Base Price:</span>
                          <span className="text-white text-sm font-medium">₦{msg.invoice_data.basePrice?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-300 text-sm">Hourly Rate ({msg.invoice_data.hours}h):</span>
                          <span className="text-white text-sm font-medium">₦{msg.invoice_data.hourlyRate?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-300 text-sm">Vehicle Fee:</span>
                          <span className="text-white text-sm font-medium">₦{msg.invoice_data.vehicleFee?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-300 text-sm">Personnel Fee:</span>
                          <span className="text-white text-sm font-medium">₦{msg.invoice_data.personnelFee?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="border-t border-gray-600 pt-2 mt-2">
                          <div className="flex justify-between items-center py-1">
                            <span className="text-white text-sm font-bold">Total Amount:</span>
                            <span className="text-white text-lg font-bold">₦{msg.invoice_data.totalAmount?.toLocaleString() || '0'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handleOperatorAction("approve-payment")}
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2"
                      >
                        Approve & Pay
                      </Button>
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3 border-t border-gray-800 bg-black">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !isSending && sendMessage()}
            placeholder="Type your message..."
            disabled={isSending}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
          />
          <Button 
            onClick={sendMessage} 
            disabled={isSending || !newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl disabled:opacity-50"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
