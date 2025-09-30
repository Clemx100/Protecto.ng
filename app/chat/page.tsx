"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { chatService, ChatMessage } from "@/lib/services/chatService"
import { ArrowLeft, Send, Shield, Clock, MapPin, User, Phone, Calendar, Car } from "lucide-react"

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [requestStatus, setRequestStatus] = useState("Pending Deployment")
  const [bookingPayload, setBookingPayload] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isSending, setIsSending] = useState(false)
  const [statusSubscription, setStatusSubscription] = useState<any>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceData, setInvoiceData] = useState<any>(null)

  useEffect(() => {
    initializeChat()
  }, [searchParams])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (statusSubscription) {
        chatService.unsubscribe(statusSubscription)
      }
    }
  }, [statusSubscription])

  // Poll for status updates
  useEffect(() => {
    if (!bookingPayload) return

    const checkForStatusUpdates = () => {
      // Check if booking status has changed in localStorage
      const storedBookings = localStorage.getItem('user_bookings')
      const operatorBookings = localStorage.getItem('operator_bookings')
      
      if (storedBookings) {
        try {
          const bookings = JSON.parse(storedBookings)
          const currentBooking = bookings.find((b: any) => b.id === bookingPayload.id)
          if (currentBooking && currentBooking.status !== requestStatus) {
            const newStatus = currentBooking.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
            setRequestStatus(newStatus)
            console.log('Status updated from user_bookings:', newStatus)
          }
        } catch (error) {
          console.error('Error checking status updates:', error)
        }
      }
      
      // Also check operator bookings for real-time sync
      if (operatorBookings) {
        try {
          const bookings = JSON.parse(operatorBookings)
          const currentBooking = bookings.find((b: any) => b.id === bookingPayload.id)
          if (currentBooking && currentBooking.status !== requestStatus) {
            const newStatus = currentBooking.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
            setRequestStatus(newStatus)
            console.log('Status updated from operator_bookings:', newStatus)
            
            // Update current booking status
            const updatedCurrentBooking = { ...bookingPayload, status: currentBooking.status }
            setBookingPayload(updatedCurrentBooking)
            localStorage.setItem('currentBooking', JSON.stringify(updatedCurrentBooking))
          }
        } catch (error) {
          console.error('Error checking operator status updates:', error)
        }
      }
    }

    // Check immediately
    checkForStatusUpdates()

    // Set up polling every 2 seconds
    const interval = setInterval(checkForStatusUpdates, 2000)

    return () => clearInterval(interval)
  }, [bookingPayload, requestStatus])

  // Poll for new messages
  useEffect(() => {
    if (!bookingPayload) return

    const checkForNewMessages = () => {
      const storedMessages = localStorage.getItem(`chat_${bookingPayload.id}`)
      if (storedMessages) {
        try {
          const messages = JSON.parse(storedMessages)
          
          // Check if there are actually new messages by comparing IDs
          const currentMessageIds = new Set(chatMessages.map(msg => msg.id))
          const newMessages = messages.filter(msg => !currentMessageIds.has(msg.id))
          
          if (newMessages.length > 0) {
            console.log('New messages found, updating chat:', newMessages.length)
            
            // Check for invoice messages in new messages
            const invoiceMessage = newMessages.find((msg: any) => msg.has_invoice && msg.invoiceData)
            if (invoiceMessage) {
              setInvoiceData(invoiceMessage.invoiceData)
            }
            
            // Update with all messages (existing + new)
            setChatMessages(messages)
          }
        } catch (error) {
          console.error('Error checking for new messages:', error)
        }
      }
    }

    // Check for new messages every 3 seconds
    const messageInterval = setInterval(checkForNewMessages, 3000)

    return () => clearInterval(messageInterval)
  }, [bookingPayload, chatMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const initializeChat = async () => {
    try {
      setIsLoading(true)
      console.log('=== CHAT PAGE INITIALIZATION ===')
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      console.log('Current user from auth:', currentUser)
      
      if (!currentUser) {
        console.log('No user found, redirecting to home')
        router.push('/')
        return
      }
      setUser(currentUser)

      // Get booking data from URL params or localStorage
      const bookingId = searchParams.get('id')
      const storedBooking = localStorage.getItem('currentBooking')
      
      console.log('Chat page loaded with bookingId:', bookingId)
      console.log('Stored booking:', storedBooking)
      console.log('All localStorage keys:', Object.keys(localStorage))
      
      if (storedBooking) {
        try {
          const booking = JSON.parse(storedBooking)
          console.log('Parsed booking:', booking)
          setBookingPayload(booking)
          
          // Use database_id if available, otherwise use booking.id
          const messageBookingId = booking.database_id || booking.id
          console.log('Using booking ID for messages:', messageBookingId)
          
          // Load existing messages
          await loadMessages(messageBookingId)
          
          // Subscribe to real-time messages
          const subscription = chatService.subscribeToMessages(messageBookingId, (newMessage) => {
            console.log('New message received:', newMessage)
            setChatMessages(prev => [...prev, newMessage])
            
            // Check if this is a status update message
            if (newMessage.sender_type === 'system' && newMessage.message.includes('Status updated to:')) {
              const statusMatch = newMessage.message.match(/Status updated to: (\w+)/)
              if (statusMatch) {
                const newStatus = statusMatch[1].replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                setRequestStatus(newStatus)
                console.log('Status updated to:', newStatus)
              }
            }
          })
          
          setStatusSubscription(subscription)
        } catch (error) {
          console.error("Error parsing stored booking:", error)
          // If parsing fails, try to get booking from URL params
          if (bookingId) {
            console.log('Trying to find booking by ID:', bookingId)
            // Create a minimal booking object from the ID
            const fallbackBooking = {
              id: bookingId,
              status: 'pending',
              created_at: new Date().toISOString()
            }
            setBookingPayload(fallbackBooking)
            // Try to find the database ID for this booking code
            const messageBookingId = bookingId // Use the booking code as fallback
            await loadMessages(messageBookingId)
          }
        }
      } else {
        console.log('No stored booking found in localStorage')
        // If no stored booking but we have a booking ID, try to find it
        if (bookingId) {
          console.log('Trying to find booking by ID:', bookingId)
          // Create a minimal booking object from the ID
          const fallbackBooking = {
            id: bookingId,
            status: 'pending',
            created_at: new Date().toISOString()
          }
          setBookingPayload(fallbackBooking)
          // Try to find the database ID for this booking code
          const messageBookingId = bookingId // Use the booking code as fallback
          await loadMessages(messageBookingId)
        }
      }
    } catch (error) {
      console.error("Error initializing chat:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async (bookingId: string) => {
    try {
      console.log('=== LOADING MESSAGES ===')
      console.log('Loading messages for booking:', bookingId)
      
      // First check localStorage immediately
      const storedMessages = localStorage.getItem(`chat_${bookingId}`)
      console.log('Stored messages from localStorage:', storedMessages)
      
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages)
        console.log('Parsed messages from localStorage:', parsedMessages)
        
        // Check for invoice messages and set invoice data
        const invoiceMessage = parsedMessages.find((msg: any) => msg.has_invoice && msg.invoiceData)
        if (invoiceMessage) {
          setInvoiceData(invoiceMessage.invoiceData)
        }
        
        setChatMessages(parsedMessages)
        return // Use localStorage first for immediate display
      }
      
      // Then try database
      const messages = await chatService.getMessages(bookingId)
      console.log('Messages from database:', messages)
      
      if (messages.length > 0) {
        setChatMessages(messages)
      } else {
        console.log('No messages found in database or localStorage')
        setChatMessages([])
      }
    } catch (error) {
      console.error("Error loading messages:", error)
      // Final fallback: check localStorage for messages
      const storedMessages = localStorage.getItem(`chat_${bookingId}`)
      console.log('Error fallback - stored messages:', storedMessages)
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages)
        console.log('Error fallback - parsed messages:', parsedMessages)
        setChatMessages(parsedMessages)
      } else {
        setChatMessages([])
      }
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !bookingPayload || !user || isSending) return

    try {
      setIsSending(true)
      
      const messageText = newMessage.trim()
      
      // Check for duplicates before sending
      const existingMessages = JSON.parse(localStorage.getItem(`chat_${bookingPayload.id}`) || '[]')
      const isDuplicate = existingMessages.some((msg: any) => 
        msg.message === messageText && 
        msg.sender_type === 'client' && 
        msg.sender_id === user.id &&
        Math.abs(new Date(msg.created_at).getTime() - Date.now()) < 3000 // Within 3 seconds
      )
      
      if (isDuplicate) {
        console.log('Duplicate message detected, skipping')
        setNewMessage("")
        return
      }
      
      // Create client message
      const message = await chatService.createClientMessage(
        bookingPayload.id,
        messageText,
        user.id
      )
      
      // Clear input immediately to prevent double sending
      setNewMessage("")
      
      // Add to local state immediately
      setChatMessages(prev => {
        // Check if message already exists to prevent duplicates
        const exists = prev.some(msg => msg.id === message.id)
        if (exists) return prev
        return [...prev, message]
      })
      
      // Save to localStorage - the chatService already handles this, but we'll update it here too
      const currentMessages = JSON.parse(localStorage.getItem(`chat_${bookingPayload.id}`) || '[]')
      const updatedMessages = [...currentMessages, message]
      localStorage.setItem(`chat_${bookingPayload.id}`, JSON.stringify(updatedMessages))
      
    } catch (error) {
      console.error("Error sending message:", error)
      // Restore message if sending failed
      setNewMessage(messageText)
    } finally {
      setIsSending(false)
    }
  }

  const handleBackToBookings = () => {
    router.push('/')
  }

  const handleApprovePayment = async () => {
    if (!bookingPayload || !invoiceData) return

    try {
      setIsSending(true)
      
      // Create payment approval message
      const approvalMessage = {
        id: `approval_${Date.now()}`,
        booking_id: bookingPayload.id,
        sender_type: 'client',
        message: "✅ Payment approved! Please proceed with the service.",
        created_at: new Date().toISOString()
      }

      // Create status update message for operator
      const statusMessage = {
        id: `status_${Date.now()}`,
        booking_id: bookingPayload.id,
        sender_type: 'system',
        message: "🔄 Status updated: Payment approved → Ready for deployment",
        created_at: new Date().toISOString()
      }

      // Add to local state immediately
      setChatMessages(prev => [...prev, approvalMessage, statusMessage])
      
      // Save to localStorage
      const updatedMessages = [...chatMessages, approvalMessage, statusMessage]
      localStorage.setItem(`chat_${bookingPayload.id}`, JSON.stringify(updatedMessages))
      
      // Update booking status to accepted and add payment approval flag
      const storedBookings = JSON.parse(localStorage.getItem('operator_bookings') || '[]')
      const updatedBookings = storedBookings.map((booking: any) => 
        booking.id === bookingPayload.id 
          ? { 
              ...booking, 
              status: 'accepted',
              payment_approved: true,
              payment_approved_at: new Date().toISOString()
            }
          : booking
      )
      localStorage.setItem('operator_bookings', JSON.stringify(updatedBookings))
      
      // Update local booking payload
      setBookingPayload({ ...bookingPayload, status: 'accepted' })
      setRequestStatus('Accepted')
      
      setShowInvoiceModal(false)
      setInvoiceData(null)
      
    } catch (error) {
      console.error("Error approving payment:", error)
    } finally {
      setIsSending(false)
    }
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
          <div className="mb-4 text-xs text-gray-500">
            <p>Debug Info:</p>
            <p>Booking ID from URL: {searchParams.get('id') || 'None'}</p>
            <p>Stored booking: {localStorage.getItem('currentBooking') ? 'Found' : 'Not found'}</p>
          </div>
          <div className="space-y-2">
            <Button 
              onClick={handleBackToBookings} 
              className="bg-blue-600 hover:bg-blue-700 text-sm px-4 py-2 rounded-xl w-full"
            >
              Back to Bookings
            </Button>
            <Button 
              onClick={() => {
                console.log('Retrying chat initialization...')
                initializeChat()
              }} 
              className="bg-gray-600 hover:bg-gray-700 text-sm px-4 py-2 rounded-xl w-full"
            >
              Retry
            </Button>
          </div>
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
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              requestStatus === "Pending Deployment"
                ? "bg-yellow-600 text-yellow-100"
                : "bg-green-600 text-green-100"
            }`}
          >
            {requestStatus}
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
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <span className="font-semibold text-sm">Protection Request</span>
                  </div>
                  
                  {/* Display the formatted booking summary message */}
                  <div className="bg-gray-900 p-3 rounded-lg">
                    <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                      {msg.message}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-400 text-center">
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm leading-relaxed">{msg.message}</div>
                  {msg.has_invoice && msg.invoiceData && (
                    <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-xs text-gray-400 mb-2 font-semibold">Invoice Details</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Base Price:</span>
                          <span>{msg.invoiceData.currency === 'USD' ? '$' : '₦'}{msg.invoiceData.basePrice?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hourly Rate ({msg.invoiceData.duration}h):</span>
                          <span>{msg.invoiceData.currency === 'USD' ? '$' : '₦'}{((msg.invoiceData.hourlyRate || 0) * (msg.invoiceData.duration || 0)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Vehicle Fee:</span>
                          <span>{msg.invoiceData.currency === 'USD' ? '$' : '₦'}{msg.invoiceData.vehicleFee?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Personnel Fee:</span>
                          <span>{msg.invoiceData.currency === 'USD' ? '$' : '₦'}{msg.invoiceData.personnelFee?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-gray-600 pt-1 mt-2">
                          <span>Total Amount:</span>
                          <span>{msg.invoiceData.currency === 'USD' ? '$' : '₦'}{msg.invoiceData.totalAmount?.toLocaleString()}</span>
                        </div>
                      </div>
                      <Button
                        onClick={handleApprovePayment}
                        size="sm"
                        className="mt-3 bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 w-full"
                        disabled={isSending}
                      >
                        {isSending ? 'Processing...' : 'Approve & Pay'}
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
