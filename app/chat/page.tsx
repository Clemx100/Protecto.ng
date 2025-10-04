"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { unifiedChatService, ChatMessage } from "@/lib/services/unifiedChatService"
import { ArrowLeft, Send, Shield, Clock, MapPin, User, Phone, Calendar, Car } from "lucide-react"

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [requestStatus, setRequestStatus] = useState("pending")
  const [bookingPayload, setBookingPayload] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isSending, setIsSending] = useState(false)
  const [statusSubscription, setStatusSubscription] = useState<any>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceData, setInvoiceData] = useState<any>(null)
  const [isStatusUpdating, setIsStatusUpdating] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentBookingIdRef = useRef<string | null>(null)
  
  // Setup real-time message subscription
  const setupMessageSubscription = (bookingId: string) => {
    console.log('🔴 Setting up real-time subscription for:', bookingId)
    
    const subscription = unifiedChatService.subscribeToMessages(bookingId, (newMessage) => {
      console.log('📨 New message received:', newMessage)
      
      setChatMessages(prev => {
        const exists = prev.some(msg => msg.id === newMessage.id)
        if (exists) return prev
        
        return [...prev, newMessage]
      })
      
      // Check for status updates
      if (newMessage.sender_type === 'system' && newMessage.message.includes('Status updated to:')) {
        const statusMatch = newMessage.message.match(/Status updated to: (\w+)/)
        if (statusMatch) {
          const newStatus = statusMatch[1]
          setRequestStatus(newStatus)
        }
      }
    })
    
    setStatusSubscription(subscription)
    return subscription
  }

  useEffect(() => {
    initializeChat()
  }, [searchParams])

  // Don't auto-scroll - let user control their view
  // useEffect(() => {
  //   scrollToBottom()
  // }, [chatMessages])

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (statusSubscription) {
        console.log('🔴 Cleaning up real-time subscription')
        unifiedChatService.unsubscribe(bookingPayload?.id || '')
      }
    }
  }, [statusSubscription, bookingPayload])

  // Simple status polling (reduced frequency)
  useEffect(() => {
    if (!bookingPayload) return

    const checkStatus = async () => {
      setIsStatusUpdating(true)
      
      // First check localStorage
      const storedBookings = localStorage.getItem('user_bookings')
      if (storedBookings) {
        try {
          const bookings = JSON.parse(storedBookings)
          const currentBooking = bookings.find((b: any) => 
            b.id === bookingPayload.id || b.id === bookingPayload.database_id
          )
          
          if (currentBooking && currentBooking.status !== requestStatus) {
            console.log('📊 Status changed from', requestStatus, 'to', currentBooking.status)
            setRequestStatus(currentBooking.status)
          }
        } catch (error) {
          console.error('Error checking status from localStorage:', error)
        }
      }

      // Also check API for real-time status
      try {
        const response = await fetch(`/api/bookings/${bookingPayload.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data && data.data.status !== requestStatus) {
            console.log('📊 API Status changed from', requestStatus, 'to', data.data.status)
            setRequestStatus(data.data.status)
          }
        }
      } catch (error) {
        console.error('Error checking status from API:', error)
      } finally {
        setIsStatusUpdating(false)
      }
    }

    // Check every 30 seconds instead of 5 to reduce API calls
    const interval = setInterval(checkStatus, 30000)
    checkStatus() // Check immediately

    return () => clearInterval(interval)
  }, [bookingPayload]) // Removed requestStatus from dependencies to prevent infinite loop

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const initializeChat = async () => {
    try {
      setIsLoading(true)
      console.log('=== CHAT PAGE INITIALIZATION ===')
      
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
      
      let booking = null
      if (storedBooking) {
        try {
          booking = JSON.parse(storedBooking)
        } catch (error) {
          console.error("Error parsing stored booking:", error)
        }
      }
      
      if (!booking && bookingId) {
        // Create fallback booking
        booking = {
          id: bookingId,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      }
      
      // If no booking found, try to get the most recent booking
      if (!booking) {
        console.log('No booking found, trying to get most recent booking...')
        try {
          const response = await fetch('/api/operator/bookings')
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data.length > 0) {
              // First, try to find a booking with operator messages
              let bookingWithOperatorMessages = null
              
              // Check each booking for operator messages (most recent first)
              const sortedBookings = data.data.sort((a: any, b: any) => b.booking_code.localeCompare(a.booking_code))
              
              for (const booking of sortedBookings.slice(0, 5)) { // Check first 5 most recent bookings
                try {
                  const messagesResponse = await fetch(`/api/simple-chat?bookingId=${booking.booking_code}`)
                  if (messagesResponse.ok) {
                    const messagesData = await messagesResponse.json()
                    const messages = messagesData.data || []
                    const operatorMessages = messages.filter(msg => msg.sender_type === 'operator')
                    
                    if (operatorMessages.length > 0) {
                      bookingWithOperatorMessages = booking
                      console.log(`✅ Found booking with operator messages: ${booking.booking_code} (${operatorMessages.length} messages)`)
                      break
                    }
                  }
                } catch (error) {
                  console.log(`Error checking messages for ${booking.booking_code}:`, error)
                }
              }
              
              // Use booking with operator messages, or fallback to most recent
              const selectedBooking = bookingWithOperatorMessages || sortedBookings[0]
              console.log(`Selected booking: ${selectedBooking.booking_code} (${bookingWithOperatorMessages ? 'has operator messages' : 'most recent'})`)
              
              booking = {
                id: selectedBooking.booking_code,
                status: selectedBooking.status,
                created_at: selectedBooking.created_at,
                client: selectedBooking.client,
                pickup_address: selectedBooking.pickup_address,
                destination_address: selectedBooking.destination_address,
                scheduled_date: selectedBooking.scheduled_date,
                scheduled_time: selectedBooking.scheduled_time,
                duration_hours: selectedBooking.duration_hours,
                service_type: selectedBooking.service_type,
                total_price: selectedBooking.total_price
              }
              
              console.log('✅ Loaded booking:', booking.id)
              
              // Store in localStorage for future use
              localStorage.setItem('currentBooking', JSON.stringify(booking))
            }
          }
        } catch (error) {
          console.error('Error fetching most recent booking:', error)
        }
      }
      
      if (!booking) {
        console.log('No booking found')
        setIsLoading(false)
        return
      }
      
      setBookingPayload(booking)
      
      // Set initial status
      setRequestStatus(booking.status || 'pending')
      
      // Load messages using unified service
      console.log('🔍 Loading messages for booking:', booking.id)
      try {
        const messages = await unifiedChatService.getMessages(booking.id)
        console.log('📨 Loaded messages:', messages.length, messages)
        
        // Check for operator messages specifically
        const operatorMessages = messages.filter(msg => msg.sender_type === 'operator')
        console.log('👨‍💼 Operator messages found:', operatorMessages.length)
        
        if (operatorMessages.length > 0) {
          console.log('✅ Operator messages that should be displayed:')
          operatorMessages.forEach((msg, index) => {
            console.log(`   ${index + 1}. [${msg.sender_type}] ${msg.message}`)
          })
        } else {
          console.log('❌ No operator messages found in loaded messages')
        }
        
        console.log('🔍 Setting chat messages state:', messages.length, 'messages')
        console.log('🔍 Messages to be displayed:', messages)
        setChatMessages(messages)
        
        // Check for invoice data
        const invoiceMessage = messages.find(msg => msg.has_invoice && msg.invoice_data)
        if (invoiceMessage) {
          setInvoiceData(invoiceMessage.invoice_data)
        }
      } catch (error) {
        console.error('❌ Error loading messages:', error)
        setChatMessages([])
      }
      
      // Setup real-time subscription
      setupMessageSubscription(booking.id)
      
    } catch (error) {
      console.error("Error initializing chat:", error)
    } finally {
      setIsLoading(false)
    }
  }


  const sendMessage = async () => {
    if (!newMessage.trim() || !bookingPayload || !user || isSending) return

    try {
      setIsSending(true)
      
      const messageText = newMessage.trim()
      setNewMessage("") // Clear input immediately
      
      // Send message using unified service
      const message = await unifiedChatService.sendMessage(
        bookingPayload.id,
        messageText,
        'client',
        user.id
      )
      
      // Add to local state
      setChatMessages(prev => {
        const exists = prev.some(msg => msg.id === message.id)
        if (exists) return prev
        return [...prev, message]
      })
      
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
    if (!bookingPayload || !invoiceData || !user) return

    try {
      setIsSending(true)
      
      // Send approval message
      const approvalMessage = await unifiedChatService.sendMessage(
        bookingPayload.id,
        "✅ Payment approved! Please proceed with the service.",
        'client',
        user.id
      )

      // Send status update message
      const statusMessage = await unifiedChatService.sendMessage(
        bookingPayload.id,
        "🔄 Status updated: Payment approved → Ready for deployment",
        'system',
        user.id,
        { isSystemMessage: true }
      )

      // Add to local state
      setChatMessages(prev => [...prev, approvalMessage, statusMessage])
      
      // Update booking status
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
      
      // Update local state
      setBookingPayload({ ...bookingPayload, status: 'accepted' })
      setRequestStatus('accepted')
      
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
            className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${
              requestStatus === "pending"
                ? "bg-yellow-500 text-white shadow-lg"
                : requestStatus === "accepted"
                ? "bg-blue-500 text-white shadow-lg"
                : requestStatus === "deployed"
                ? "bg-purple-500 text-white shadow-lg"
                : requestStatus === "en_route"
                ? "bg-purple-500 text-white shadow-lg"
                : requestStatus === "arrived"
                ? "bg-green-500 text-white shadow-lg"
                : requestStatus === "in_service"
                ? "bg-green-500 text-white shadow-lg"
                : requestStatus === "completed"
                ? "bg-gray-500 text-white shadow-lg"
                : requestStatus === "cancelled"
                ? "bg-red-500 text-white shadow-lg"
                : "bg-yellow-500 text-white shadow-lg"
            }`}
          >
            {isStatusUpdating && (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {requestStatus === "pending" ? "Pending Deployment" :
             requestStatus === "accepted" ? "Accepted" :
             requestStatus === "deployed" ? "Deployed" :
             requestStatus === "en_route" ? "En Route" :
             requestStatus === "arrived" ? "Arrived" :
             requestStatus === "in_service" ? "In Service" :
             requestStatus === "completed" ? "Completed" :
             requestStatus === "cancelled" ? "Cancelled" :
             requestStatus.charAt(0).toUpperCase() + requestStatus.slice(1)}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 pt-16 space-y-3">
        {console.log('🔍 Rendering messages:', chatMessages.length, chatMessages)}
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
                  {msg.has_invoice && msg.invoice_data && (
                    <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-xs text-gray-400 mb-2 font-semibold">Invoice Details</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Base Price:</span>
                          <span>{msg.invoice_data.currency === 'USD' ? '$' : '₦'}{msg.invoice_data.basePrice?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hourly Rate ({msg.invoice_data.duration}h):</span>
                          <span>{msg.invoice_data.currency === 'USD' ? '$' : '₦'}{((msg.invoice_data.hourlyRate || 0) * (msg.invoice_data.duration || 0)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Vehicle Fee:</span>
                          <span>{msg.invoice_data.currency === 'USD' ? '$' : '₦'}{msg.invoice_data.vehicleFee?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Personnel Fee:</span>
                          <span>{msg.invoice_data.currency === 'USD' ? '$' : '₦'}{msg.invoice_data.personnelFee?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-gray-600 pt-1 mt-2">
                          <span>Total Amount:</span>
                          <span>{msg.invoice_data.currency === 'USD' ? '$' : '₦'}{msg.invoice_data.totalAmount?.toLocaleString()}</span>
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
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs text-gray-400">
                      {formatTime(msg.created_at)}
                    </div>
                    {msg.sender_type === 'client' && (
                      <div className="text-xs text-gray-500">
                        {msg.status === 'sending' && '⏳ Sending...'}
                        {msg.status === 'sent' && '✓ Sent'}
                        {msg.status === 'delivered' && '✓✓ Delivered'}
                        {msg.status === 'read' && '✓✓ Read'}
                      </div>
                    )}
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
