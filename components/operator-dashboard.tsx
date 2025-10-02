"use client"

import { useState, useEffect, useRef } from "react"
import { 
  MessageSquare, 
  Search, 
  RefreshCw,
  Bell,
  Shield,
  Send,
  LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { AdminAPI } from "@/lib/api"

interface OperatorDashboardProps {
  onLogout?: () => void
}

export default function OperatorDashboard({ onLogout }: OperatorDashboardProps) {
  const supabase = createClient()
  
  // State management
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Chat and messaging
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Bookings and data
  const [bookings, setBookings] = useState<any[]>([])
  const [filteredBookings, setFilteredBookings] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  
  // Invoice and pricing
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN')
  const [exchangeRate] = useState(1500) // 1 USD = 1500 NGN (approximate)
  const [invoiceData, setInvoiceData] = useState({
    basePrice: 0,
    hourlyRate: 0,
    vehicleFee: 0,
    personnelFee: 0,
    duration: 0,
    totalAmount: 0,
    breakdown: ""
  })
  
  // Payment tracking
  const [paymentApproved, setPaymentApproved] = useState<{ [bookingId: string]: boolean }>({})
  
  // Initialize dashboard
  useEffect(() => {
    initializeDashboard()
  }, [])

  // Auto-dismiss error and success messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Filter bookings based on search and status
  useEffect(() => {
    let filtered = bookings
    
    if (searchQuery) {
      filtered = filtered.filter(booking => 
        booking.client?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.client?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.pickup_address?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    if (statusFilter) {
      filtered = filtered.filter(booking => booking.status === statusFilter)
    }
    
    setFilteredBookings(filtered)
  }, [bookings, searchQuery, statusFilter])

  // Real-time refresh for operator dashboard
  useEffect(() => {
    console.log('Setting up real-time subscriptions...')
    
    // Set up real-time subscription for bookings
    const bookingsChannel = supabase
      .channel('operator-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Real-time booking update received:', payload)
          console.log('Event type:', payload.eventType)
          console.log('New record:', payload.new)
          
          // Refresh bookings when any booking changes
          loadBookings()
          
          // Show notification for new bookings
          if (payload.eventType === 'INSERT') {
            setSuccess(`New booking received: ${payload.new?.booking_code || 'Unknown'}`)
          }
        }
      )
      .subscribe((status) => {
        console.log('Bookings channel subscription status:', status)
      })

    // Set up real-time subscription for messages
    const messagesChannel = supabase
      .channel('operator-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Real-time message update received:', payload)
          const newMessage = payload.new as any
          
          // Check if this message is for the currently selected booking
          // Match by database_id OR booking_code for compatibility
          const matchesBooking = selectedBooking && (
            newMessage.booking_id === selectedBooking.database_id ||
            newMessage.booking_id === selectedBooking.id ||
            newMessage.booking_id === selectedBooking.booking_code
          )
          
          if (matchesBooking) {
            const isInvoice = newMessage.message_type === 'invoice'
            const invoiceData = newMessage.metadata || newMessage.invoice_data || null
            
            const chatMessage = {
              id: newMessage.id,
              booking_id: newMessage.booking_id,
              sender_type: newMessage.sender_type || (newMessage.message_type === 'system' ? 'system' : 'client'),
              sender_id: newMessage.sender_id,
              message: newMessage.content,
              created_at: newMessage.created_at,
              is_system_message: newMessage.message_type === 'system',
              hasInvoice: isInvoice,
              invoiceData: invoiceData,
              message_type: newMessage.message_type
            }
            
            console.log('📨 Processing message:', { type: newMessage.message_type, hasInvoice: isInvoice, hasMetadata: !!invoiceData })
            
            // Add to local state
            setMessages(prev => [...prev, chatMessage])
            
            // Store in localStorage for both operator and client sync
            const currentStoredMessages = JSON.parse(localStorage.getItem(`chat_${selectedBooking.id}`) || '[]')
            const updatedMessages = [...currentStoredMessages, chatMessage]
            localStorage.setItem(`chat_${selectedBooking.id}`, JSON.stringify(updatedMessages))
            
            // Also update the client's localStorage for real-time sync
            const clientMessages = JSON.parse(localStorage.getItem(`chat_${selectedBooking.id}`) || '[]')
            const updatedClientMessages = [...clientMessages, chatMessage]
            localStorage.setItem(`chat_${selectedBooking.id}`, JSON.stringify(updatedClientMessages))
            
            scrollToBottom()
          }
        }
      )
      .subscribe((status) => {
        console.log('Messages channel subscription status:', status)
      })

    // More frequent refresh for testing - every 3 seconds
    const refreshInterval = setInterval(() => {
      console.log('Refreshing bookings...')
      loadBookings()
      if (selectedBooking) {
        // Use database_id if available, otherwise use the booking code
        const bookingIdToLoad = selectedBooking.database_id || selectedBooking.id
        console.log('Refreshing messages for booking:', bookingIdToLoad)
        loadMessages(bookingIdToLoad)
      }
    }, 3000)

    return () => {
      console.log('Cleaning up real-time subscriptions...')
      clearInterval(refreshInterval)
      supabase.removeChannel(bookingsChannel)
      supabase.removeChannel(messagesChannel)
    }
  }, [selectedBooking])

  const initializeDashboard = async () => {
    try {
      setIsLoading(true)
      await loadBookings()
    } catch (error) {
      console.error('Failed to initialize dashboard:', error)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadBookings = async () => {
    try {
      // Use the new API endpoint
      const response = await fetch('/api/operator/bookings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      console.log('API response:', result)
      
      if (result.success) {
        const transformedBookings = result.data.map((booking: any) => ({
          ...booking,
          // The API already provides id (booking_code) and database_id (UUID)
          // Don't overwrite database_id!
          // Add additional fields for compatibility
          payment_approved: booking.payment_approved || false,
          vehicles: booking.vehicles || {},
          protectionType: booking.protectionType || 'N/A',
          destinationDetails: booking.destinationDetails || {},
          personnel: booking.personnel || { protectors: 0, protectee: 1 },
          dress_code: booking.dress_code || 'N/A',
          vehicle_type: booking.vehicle_type || 'N/A',
          special_requirements: booking.special_requirements || 'N/A'
        }))
        
        setBookings(transformedBookings)
        
        // Update payment approval status
        const paymentStatus: { [bookingId: string]: boolean } = {}
        transformedBookings.forEach((booking: any) => {
          paymentStatus[booking.id] = booking.payment_approved || false
        })
          setPaymentApproved(paymentStatus)
          
          // Update selectedBooking if it exists to reflect current database status
          if (selectedBooking) {
            const updatedSelectedBooking = transformedBookings.find((b: any) => b.id === selectedBooking.id)
            if (updatedSelectedBooking) {
              console.log('Updating selected booking status from', selectedBooking.status, 'to', updatedSelectedBooking.status)
              setSelectedBooking(updatedSelectedBooking)
            }
          }
          
          // Auto-select first pending booking if none selected
        if (!selectedBooking && transformedBookings.length > 0) {
          const pendingBooking = transformedBookings.find((b: any) => b.status === 'pending')
          if (pendingBooking) {
            setSelectedBooking(pendingBooking)
            loadMessages(pendingBooking.database_id || pendingBooking.id)
          }
        }
      } else {
        throw new Error(result.error || 'Failed to load bookings')
      }
    } catch (error) {
      console.error('Failed to load bookings from API:', error)
      
      // Fallback to direct Supabase query
      try {
        const { data: dbBookings, error } = await supabase
          .from('bookings')
          .select(`
            *,
            client:profiles!bookings_client_id_fkey(first_name, last_name, phone, email)
          `)
          .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        // Transform Supabase bookings to match expected format
        const transformedBookings = (dbBookings || []).map(booking => ({
          id: booking.id,
          booking_code: booking.booking_code,
          client: {
            first_name: booking.client?.first_name || 'Unknown',
            last_name: booking.client?.last_name || 'User',
            phone: booking.client?.phone || 'N/A',
            email: booking.client?.email || 'N/A'
          },
          pickup_address: booking.pickup_address || 'N/A',
          destination_address: booking.destination_address || 'N/A',
          status: booking.status || 'pending',
          created_at: booking.created_at,
          service: {
            name: booking.service_type === 'armed_protection' ? 'Armed Protection Service' : 'Vehicle Only Service',
            type: booking.service_type
          },
          scheduled_date: booking.scheduled_date,
          duration: `${booking.duration_hours || 1} hour(s)`,
          total_price: booking.total_price || 0,
          personnel: booking.personnel || { protectors: 0, protectee: 1 },
          dress_code: booking.dress_code || 'N/A',
          vehicle_type: 'N/A',
          special_requirements: 'N/A',
          emergency_contact: booking.emergency_contact || 'N/A',
          payment_approved: false,
          vehicles: {},
          protectionType: 'N/A',
          destinationDetails: {}
        }))

        setBookings(transformedBookings)
      } catch (fallbackError) {
        console.error('Fallback Supabase query failed:', fallbackError)
        // Final fallback to localStorage
        const localBookings = JSON.parse(localStorage.getItem('operator_bookings') || '[]')
        setBookings(localBookings)
      }
    }
  }

  // Helper function to validate and get UUID
  const getBookingUUID = async (bookingIdOrCode: string): Promise<string | null> => {
    // UUID regex pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    
    // If it's already a UUID, return it
    if (uuidPattern.test(bookingIdOrCode)) {
      console.log('✅ Already a valid UUID:', bookingIdOrCode)
      return bookingIdOrCode
    }
    
    // If it's a booking code, try to find it in local bookings first
    if (bookingIdOrCode.startsWith('REQ')) {
      const booking = bookings.find(b => b.id === bookingIdOrCode)
      if (booking?.database_id && uuidPattern.test(booking.database_id)) {
        console.log('✅ Found UUID in local bookings:', booking.database_id)
        return booking.database_id
      }
      
      // Query the database as fallback
      console.log('⚠️ Querying database for UUID of booking code:', bookingIdOrCode)
      try {
        const { data: bookingData, error: fetchError } = await supabase
          .from('bookings')
          .select('id')
          .eq('booking_code', bookingIdOrCode)
          .single()
        
        if (bookingData && !fetchError) {
          console.log('✅ Found UUID from database:', bookingData.id)
          return bookingData.id
        } else {
          console.error('❌ Failed to find booking by code:', fetchError)
          return null
        }
      } catch (err) {
        console.error('❌ Error fetching booking UUID:', err)
        return null
      }
    }
    
    console.error('❌ Invalid booking identifier:', bookingIdOrCode)
    return null
  }

  const loadMessages = async (bookingId: string) => {
    console.log('📥 Loading messages for booking:', bookingId)
    
    // Get the actual UUID
    const actualBookingId = await getBookingUUID(bookingId)
    
    if (!actualBookingId) {
      console.error('❌ Could not resolve booking UUID for:', bookingId)
      setError('Failed to load messages: Invalid booking ID')
      return
    }
    
    console.log('📤 Using UUID for messages query:', actualBookingId)
    
    try {
      
      // Use the operator messages API endpoint
      const response = await fetch(`/api/operator/messages?bookingId=${actualBookingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        console.log('Messages loaded:', result.data.length)
        setMessages(result.data)
      } else {
        throw new Error(result.error || 'Failed to load messages')
      }
    } catch (error) {
      console.error('Failed to load messages from API:', error)
      
      // Fallback to direct Supabase query
      try {
        const { data: dbMessages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('booking_id', actualBookingId)
          .order('created_at', { ascending: true })

        if (error) {
          throw error
        }

        if (dbMessages && dbMessages.length > 0) {
          // Convert messages table format to expected format
          const convertedMessages = dbMessages.map(msg => {
            const isInvoice = msg.message_type === 'invoice'
            const invoiceData = msg.metadata || msg.invoice_data || null
            
            return {
              id: msg.id,
              booking_id: msg.booking_id,
              sender_type: msg.sender_type || 'client',
              sender_id: msg.sender_id,
              message: msg.content,
              created_at: msg.created_at,
              is_system_message: msg.sender_type === 'system' || msg.is_system_message,
              message_type: msg.message_type,
              hasInvoice: isInvoice,
              invoiceData: invoiceData
            }
          })
          setMessages(convertedMessages)
        } else {
          // If no messages in database, check localStorage
          const localMessages = JSON.parse(localStorage.getItem(`chat_${bookingId}`) || '[]')
          setMessages(localMessages)
        }
      } catch (fallbackError) {
        console.error('Fallback Supabase query failed:', fallbackError)
        // Final fallback to localStorage
        const localMessages = JSON.parse(localStorage.getItem(`chat_${bookingId}`) || '[]')
        setMessages(localMessages)
      }
    }
    
    scrollToBottom()
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedBooking) {
      console.log('Cannot send message:', { hasMessage: !!newMessage.trim(), hasBooking: !!selectedBooking })
      return
    }

    const messageText = newMessage.trim()
    setNewMessage("") // Clear input immediately for better UX

    console.log('📤 Sending message:', messageText, 'to booking:', selectedBooking.id)

    try {
      // Ensure we have the correct database UUID
      const databaseId = await getBookingUUID(selectedBooking.database_id || selectedBooking.id)
      
      if (!databaseId) {
        console.error('❌ Could not resolve booking UUID for sending message')
        setError('Failed to send message: Invalid booking ID')
        setNewMessage(messageText) // Restore message
        return
      }
      
      console.log('✅ Using UUID for sending message:', databaseId)
      
      // Use the operator messages API to send message
      const response = await fetch('/api/operator/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: databaseId,
          content: messageText,
          messageType: 'text'
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        // Add to local state
        const message = {
          id: result.data.id,
          booking_id: selectedBooking.id,
          sender_type: 'operator',
          sender_id: result.data.sender_id,
          message: messageText,
          created_at: result.data.created_at,
          is_system_message: false
        }
        
        setMessages(prev => [...prev, message])
        
        // Store in localStorage for persistence
        const currentStoredMessages = JSON.parse(localStorage.getItem(`chat_${selectedBooking.id}`) || '[]')
        const updatedMessages = [...currentStoredMessages, message]
        localStorage.setItem(`chat_${selectedBooking.id}`, JSON.stringify(updatedMessages))
        
        scrollToBottom()
        setSuccess('Message sent successfully!')
      } else {
        throw new Error(result.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Failed to send message via API:', error)
      
      // Fallback to localStorage
      try {
        const message = {
          id: `operator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          booking_id: selectedBooking.id,
          sender_type: 'operator',
          sender_id: 'operator',
          message: messageText,
          created_at: new Date().toISOString(),
          is_system_message: false
        }

        // Add to local state
        setMessages(prev => [...prev, message])
        
        // Store in localStorage for real-time updates
        const currentStoredMessages = JSON.parse(localStorage.getItem(`chat_${selectedBooking.id}`) || '[]')
        const updatedMessages = [...currentStoredMessages, message]
        localStorage.setItem(`chat_${selectedBooking.id}`, JSON.stringify(updatedMessages))
        
        scrollToBottom()
        setSuccess('Message sent (offline mode)')
      } catch (fallbackError) {
        console.error('Fallback message sending failed:', fallbackError)
        setError('Failed to send message')
        setNewMessage(messageText) // Restore message on failure
      }
    }
  }

  const formatCurrency = (amount: number, currency: 'NGN' | 'USD') => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString()}`
    }
    return `₦${amount.toLocaleString()}`
  }

  const convertToUSD = (ngnAmount: number) => {
    return Math.round(ngnAmount / exchangeRate)
  }

  const convertToNGN = (usdAmount: number) => {
    return Math.round(usdAmount * exchangeRate)
  }

  const calculateInvoice = (booking: any, selectedCurrency: 'NGN' | 'USD' = 'NGN') => {
    // Base prices in NGN
    const basePriceNGN = booking.service?.type === 'armed_protection' ? 100000 : 50000
    const hourlyRateNGN = booking.service?.type === 'armed_protection' ? 25000 : 15000
    const vehicleFeeNGN = booking.vehicle_type?.includes('Mercedes') ? 20000 : 15000
    const personnelFeeNGN = (booking.personnel?.protectors || 0) * 30000
    const duration = booking.duration?.includes('day') ? 24 : 
                    booking.duration?.includes('hour') ? parseInt(booking.duration) : 4
    
    const totalAmountNGN = basePriceNGN + (hourlyRateNGN * duration) + vehicleFeeNGN + personnelFeeNGN

    // Convert to selected currency
    const basePrice = selectedCurrency === 'USD' ? convertToUSD(basePriceNGN) : basePriceNGN
    const hourlyRate = selectedCurrency === 'USD' ? convertToUSD(hourlyRateNGN) : hourlyRateNGN
    const vehicleFee = selectedCurrency === 'USD' ? convertToUSD(vehicleFeeNGN) : vehicleFeeNGN
    const personnelFee = selectedCurrency === 'USD' ? convertToUSD(personnelFeeNGN) : personnelFeeNGN
    const totalAmount = selectedCurrency === 'USD' ? convertToUSD(totalAmountNGN) : totalAmountNGN

    const currencySymbol = selectedCurrency === 'USD' ? '$' : '₦'

    return {
      basePrice,
      hourlyRate,
      vehicleFee,
      personnelFee,
      duration,
      totalAmount,
      currency: selectedCurrency,
      breakdown: `Base Price: ${currencySymbol}${basePrice.toLocaleString()}\nHourly Rate (${duration}h): ${currencySymbol}${(hourlyRate * duration).toLocaleString()}\nVehicle Fee: ${currencySymbol}${vehicleFee.toLocaleString()}\nPersonnel Fee: ${currencySymbol}${personnelFee.toLocaleString()}\nTotal: ${currencySymbol}${totalAmount.toLocaleString()}`
    }
  }

  const handleOperatorAction = async (action: string) => {
    if (!selectedBooking) {
      console.error('No selected booking for action:', action)
      setError('No booking selected')
      return
    }

    console.log('Handling operator action:', action, 'for booking:', selectedBooking.id)
    setActionLoading(action)
    setError("")
    setSuccess("")

    try {
      let message = ""
      let systemMessage = ""
      let newStatus = selectedBooking.status

      switch (action) {
        case "confirm":
          message = "✅ Request confirmed! Your protection team is being assigned."
          systemMessage = "Booking confirmed by operator"
          newStatus = "accepted"
          break
        case "invoice":
          const invoice = calculateInvoice(selectedBooking, currency)
          setInvoiceData(invoice)
          setShowInvoiceModal(true)
          return // Don't send message yet, wait for invoice confirmation
        case "deploy":
          // Only allow deploy if payment is approved
          if (!paymentApproved[selectedBooking.id]) {
            setError("Payment must be approved before deploying team")
            return
          }
          message = "🚀 Protection team deployed! They are preparing for departure."
          systemMessage = "Protection team deployed"
          newStatus = "en_route"
          break
        case "en_route":
          message = "🚗 Protection team is en route to your location."
          systemMessage = "Protection team en route"
          newStatus = "en_route"
          break
        case "arrived":
          message = "📍 Your protection team has arrived at the pickup location."
          systemMessage = "Protection team arrived"
          newStatus = "arrived"
          break
        case "start_service":
          message = "🛡️ Protection service has begun. Your team is now active."
          systemMessage = "Protection service started"
          newStatus = "in_service"
          break
        case "complete":
          message = "✅ Service completed successfully. Thank you for choosing Protector.Ng!"
          systemMessage = "Service completed"
          newStatus = "completed"
          break
      }

      // Update booking status using the new API
      if (newStatus !== selectedBooking.status) {
        try {
          // Ensure we have the correct database UUID
          const databaseId = await getBookingUUID(selectedBooking.database_id || selectedBooking.id)
          
          if (!databaseId) {
            console.error('❌ Could not resolve booking UUID for status update')
            setError('Failed to update status: Invalid booking ID')
            return
          }
          
          console.log('🔍 Updating booking status:', {
            bookingCode: selectedBooking.id,
            databaseId: databaseId,
            currentStatus: selectedBooking.status,
            newStatus: newStatus
          })
          
          console.log('🚀 Sending status update request:', {
            bookingId: databaseId,
            bookingCode: selectedBooking.id,
            status: newStatus.toLowerCase().replace(/\s+/g, '_'),
            notes: systemMessage,
            requestUrl: '/api/bookings/status'
          })

          const response = await fetch('/api/bookings/status', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bookingId: databaseId,
              status: newStatus.toLowerCase().replace(/\s+/g, '_'),
              notes: systemMessage
            }),
          })

          console.log('Status update response:', response.status, response.statusText)

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Status update failed:', errorText)
            throw new Error(`HTTP ${response.status}: ${errorText}`)
          }

          const result = await response.json()
          console.log('Status update result:', result)

          if (result.success) {
            console.log('Status update successful, updating UI...')
            
            // Update local state
            const updatedBookings = bookings.map(booking => 
              booking.id === selectedBooking.id 
                ? { ...booking, status: newStatus }
                : booking
            )
            setBookings(updatedBookings)
            setSelectedBooking({ ...selectedBooking, status: newStatus })
            
            console.log('Updated selected booking status to:', newStatus)
            console.log('Updated bookings array:', updatedBookings.length, 'bookings')
            
            // Update localStorage
            const updatedBookingsForStorage = updatedBookings.map(booking => 
              booking.id === selectedBooking.id 
                ? { ...booking, status: newStatus }
                : booking
            )
            localStorage.setItem('operator_bookings', JSON.stringify(updatedBookingsForStorage))
            
            // Also update client bookings in localStorage for real-time sync
            const clientBookings = JSON.parse(localStorage.getItem('user_bookings') || '[]')
            const updatedClientBookings = clientBookings.map((booking: any) => 
              booking.id === selectedBooking.id 
                ? { ...booking, status: newStatus }
                : booking
            )
            localStorage.setItem('user_bookings', JSON.stringify(updatedClientBookings))
            
            // Update current booking in localStorage for client chat
            const currentBooking = JSON.parse(localStorage.getItem('currentBooking') || '{}')
            if (currentBooking.id === selectedBooking.id) {
              currentBooking.status = newStatus
              localStorage.setItem('currentBooking', JSON.stringify(currentBooking))
            }
            
            console.log('Booking status updated successfully')
            setSuccess(`Status updated to: ${newStatus}`)
            
            // Refresh messages to get the system message
            loadMessages(selectedBooking.id)
            
            // Force a re-render by updating the bookings list
            setTimeout(() => {
              loadBookings()
            }, 100)
          } else {
            throw new Error(result.error || 'Failed to update booking status')
          }
        } catch (error) {
          console.error('Failed to update booking status:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          setError(`Failed to update booking status: ${errorMessage}. Please try again.`)
          return
        }
      }

      // Create status update message
      const statusUpdateMessage = `Status updated to: ${newStatus}`
      
      // Add status update system message
      const statusMsg = {
        id: `status_${Date.now()}`,
        booking_id: selectedBooking.id,
        sender_type: 'system',
        message: statusUpdateMessage,
        created_at: new Date().toISOString(),
        is_system_message: true
      }

      // Add action system message
      if (systemMessage) {
        const systemMsg = {
          id: `system_${Date.now()}`,
          booking_id: selectedBooking.id,
          sender_type: 'system',
          message: systemMessage,
          created_at: new Date().toISOString(),
          is_system_message: true
        }
        setMessages(prev => [...prev, systemMsg])
      }

      // Add client message
      if (message) {
        const clientMsg = {
          id: `operator_${Date.now()}`,
          booking_id: selectedBooking.id,
          sender_type: 'operator',
          message: message,
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, clientMsg])
      }

      // Store messages in localStorage for real-time updates
      // Get current messages from localStorage first, then add new ones
      const currentStoredMessages = JSON.parse(localStorage.getItem(`chat_${selectedBooking.id}`) || '[]')
      const allMessages = [...currentStoredMessages, statusMsg]
      
      if (systemMessage) {
        allMessages.push({
          id: `system_${Date.now()}`,
          booking_id: selectedBooking.id,
          sender_type: 'system',
          message: systemMessage,
          created_at: new Date().toISOString(),
          is_system_message: true
        })
      }
      if (message) {
        allMessages.push({
          id: `operator_${Date.now()}`,
          booking_id: selectedBooking.id,
          sender_type: 'operator',
          message: message,
          created_at: new Date().toISOString()
        })
      }
      
      localStorage.setItem(`chat_${selectedBooking.id}`, JSON.stringify(allMessages))
      
      // Also update the client-side booking status in localStorage
      const clientBookings = JSON.parse(localStorage.getItem('user_bookings') || '[]')
      const updatedClientBookings = clientBookings.map((booking: any) => 
        booking.id === selectedBooking.id 
          ? { ...booking, status: newStatus }
          : booking
      )
      localStorage.setItem('user_bookings', JSON.stringify(updatedClientBookings))

      setSuccess(`Action completed: ${action}`)
      scrollToBottom()
    } catch (error) {
      console.error(`Failed to ${action} booking:`, error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setError(`Failed to ${action} booking: ${errorMessage}`)
    } finally {
      setActionLoading(null)
    }
  }

  const sendInvoice = async () => {
    if (!selectedBooking) return

    try {
      setActionLoading('invoice')
      
      // Get the database UUID
      const databaseId = await getBookingUUID(selectedBooking.database_id || selectedBooking.id)
      
      if (!databaseId) {
        setError('Failed to send invoice: Invalid booking ID')
        return
      }

      // Prepare invoice data with currency
      const invoiceWithCurrency = {
        ...invoiceData,
        currency: currency,
        totalAmount: invoiceData.basePrice + (invoiceData.hourlyRate * invoiceData.duration) + invoiceData.vehicleFee + invoiceData.personnelFee
      }

      // Create invoice message content
      const invoiceContent = `📄 **Invoice for Your Protection Service**

**Service Details:**
• Base Price: ${formatCurrency(invoiceWithCurrency.basePrice, currency)}
• Hourly Rate (${invoiceWithCurrency.duration}h): ${formatCurrency(invoiceWithCurrency.hourlyRate * invoiceWithCurrency.duration, currency)}
• Vehicle Fee: ${formatCurrency(invoiceWithCurrency.vehicleFee, currency)}
• Personnel Fee: ${formatCurrency(invoiceWithCurrency.personnelFee, currency)}

**Total Amount: ${formatCurrency(invoiceWithCurrency.totalAmount, currency)}**

${currency === 'USD' ? `(Equivalent: ₦${(invoiceWithCurrency.totalAmount * exchangeRate).toLocaleString()} NGN)` : ''}

Please review and approve the payment to proceed with your service.`

      console.log('📤 Sending invoice message to database...')

      // Send invoice message via API to persist it
      const response = await fetch('/api/operator/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: databaseId,
          content: invoiceContent,
          messageType: 'invoice',
          metadata: invoiceWithCurrency // Store invoice data in metadata
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send invoice: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Invoice message saved to database:', result.data.id)
        
        // Add to local state with full invoice data
        const invoiceMessage = {
          id: result.data.id,
          booking_id: databaseId,
          sender_type: 'operator',
          message: invoiceContent,
          created_at: result.data.created_at,
          hasInvoice: true,
          invoiceData: invoiceWithCurrency
        }
        
        setMessages(prev => [...prev, invoiceMessage])
        
        setShowInvoiceModal(false)
        setSuccess("Invoice sent successfully!")
        scrollToBottom()
        
        // Refresh messages to ensure sync
        setTimeout(() => {
          loadMessages(selectedBooking.id)
        }, 500)
      } else {
        throw new Error(result.error || 'Failed to send invoice')
      }
    } catch (error) {
      console.error('❌ Failed to send invoice:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invoice'
      setError(`Failed to send invoice: ${errorMessage}`)
    } finally {
      setActionLoading(null)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const getStatusColor = (status: string) => {
    // Normalize status to lowercase for comparison
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_')
    
    switch (normalizedStatus) {
      case 'pending':
      case 'pending_deployment':
        return 'bg-yellow-500/20 text-yellow-300'
      case 'accepted':
      case 'confirmed':
        return 'bg-blue-500/20 text-blue-300'
      case 'en_route':
        return 'bg-purple-500/20 text-purple-300'
      case 'arrived':
        return 'bg-green-500/20 text-green-300'
      case 'in_service':
        return 'bg-green-500/20 text-green-300'
      case 'completed':
        return 'bg-gray-500/20 text-gray-300'
      case 'cancelled':
        return 'bg-red-500/20 text-red-300'
      default: 
        return 'bg-yellow-500/20 text-yellow-300'
    }
  }

  const getStatusActions = (status: string, hasPaymentApproved: boolean = false) => {
    // Normalize status to lowercase for comparison
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_')
    
    switch (normalizedStatus) {
      case 'pending':
      case 'pending_deployment':
        return [
          { action: 'confirm', label: 'Confirm', color: 'bg-green-600 hover:bg-green-700' },
          { action: 'invoice', label: 'Send Invoice', color: 'bg-blue-600 hover:bg-blue-700' }
        ]
      case 'accepted':
      case 'confirmed':
        // Only show invoice if payment not approved, only show deploy if payment approved
        if (hasPaymentApproved) {
          return [
            { action: 'deploy', label: 'Deploy Team', color: 'bg-purple-600 hover:bg-purple-700' }
          ]
        } else {
          return [
            { action: 'invoice', label: 'Send Invoice', color: 'bg-blue-600 hover:bg-blue-700' }
          ]
        }
      case 'en_route':
        return [
          { action: 'arrived', label: 'Mark Arrived', color: 'bg-green-600 hover:bg-green-700' }
        ]
      case 'arrived':
        return [
          { action: 'start_service', label: 'Start Service', color: 'bg-green-600 hover:bg-green-700' }
        ]
      case 'in_service':
        return [
          { action: 'complete', label: 'Complete Service', color: 'bg-gray-600 hover:bg-gray-700' }
        ]
      case 'completed':
        return [] // No actions available for completed bookings
      default:
        return [
          { action: 'confirm', label: 'Confirm', color: 'bg-green-600 hover:bg-green-700' },
          { action: 'invoice', label: 'Send Invoice', color: 'bg-blue-600 hover:bg-blue-700' }
        ]
    }
  }

  if (isLoading && bookings.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading Operator Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-400" />
              <h1 className="text-xl font-bold text-white">Protector.Ng Operator</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Bell className="h-6 w-6 text-white" />
              <span className="text-white">Operator Dashboard</span>
              {onLogout && (
                <Button
                  onClick={onLogout}
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <p className="text-red-200 font-medium">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <p className="text-green-200 font-medium">{success}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Bookings List */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Active Bookings</h2>
                <Button
                  onClick={loadBookings}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Search and Filter */}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="en_route">En Route</option>
                  <option value="arrived">Arrived</option>
                  <option value="in_service">In Service</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Bookings List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    onClick={() => {
                      setSelectedBooking(booking)
                      loadMessages(booking.database_id || booking.id)
                    }}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedBooking?.id === booking.id
                        ? 'bg-blue-600/20 border border-blue-500/50'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">#{booking.id}</span>
                      <div className="flex items-center space-x-2">
                        {paymentApproved[booking.id] && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-xs text-green-300">Paid</span>
                          </div>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-300">
                      <p>
                        {(() => {
                          const email = booking.contact?.user?.email
                          const firstName = booking.client?.first_name
                          const lastName = booking.client?.last_name
                          
                          if (email) return email
                          if (firstName && lastName) return `${firstName} ${lastName}`
                          if (firstName) return firstName
                          return 'Client'
                        })()}
                      </p>
                      <p className="text-xs">
                        {booking.pickupDetails?.location || 
                         booking.pickup_address || 
                         'Location not specified'}
                      </p>
                      <p className="text-xs">
                        {booking.timestamp ? 
                          new Date(booking.timestamp).toLocaleString() :
                          booking.created_at ? 
                            new Date(booking.created_at).toLocaleString() :
                            'Invalid Date'
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Chat Interface */}
          <div className="lg:col-span-2">
            {selectedBooking ? (
              <div className="bg-white/10 rounded-xl border border-white/20 overflow-hidden">
                {/* Chat Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        #{selectedBooking.id} - {(() => {
                          const email = selectedBooking.contact?.user?.email
                          const firstName = selectedBooking.client?.first_name
                          const lastName = selectedBooking.client?.last_name
                          
                          if (email) return email
                          if (firstName && lastName) return `${firstName} ${lastName}`
                          if (firstName) return firstName
                          return 'Client'
                        })()}
                      </h3>
                      <p className="text-sm text-gray-300">
                        {selectedBooking.pickupDetails?.location || 
                         selectedBooking.pickup_address || 
                         'Location not specified'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedBooking.status)}`}>
                        {selectedBooking.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Request Summary - Detailed View */}
                <div className="p-6 border-b border-white/10 bg-white/5">
                  <h3 className="text-lg font-semibold text-white mb-4">New Protection Request - #{selectedBooking.id}</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Service:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.serviceType ? 
                          selectedBooking.serviceType.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) + ' Service' : 
                          'Armed Protection Service'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Pickup:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.pickupDetails?.location || selectedBooking.pickup_address || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Date & Time:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.pickupDetails?.date && selectedBooking.pickupDetails?.time ? 
                          `${selectedBooking.pickupDetails.date} at ${selectedBooking.pickupDetails.time}` :
                          selectedBooking.scheduled_date ? 
                            `${new Date(selectedBooking.scheduled_date).toLocaleDateString()} at ${new Date(selectedBooking.scheduled_date).toLocaleTimeString()}` :
                            'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Duration:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.pickupDetails?.duration || selectedBooking.duration || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Destination:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.destinationDetails?.primary || selectedBooking.destination_address || 'N/A'}
                        {selectedBooking.destinationDetails?.additional && selectedBooking.destinationDetails.additional.length > 0 && 
                          ` (${selectedBooking.destinationDetails.additional.join(', ')})`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Personnel:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.personnel ? 
                          `${selectedBooking.personnel.protectors} protectors for ${selectedBooking.personnel.protectee} protectee` :
                          'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Contact:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.contact?.phone || selectedBooking.client?.phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Vehicle Type:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.vehicles ? 
                          (() => {
                            if (Array.isArray(selectedBooking.vehicles)) {
                              return selectedBooking.vehicles.join(', ')
                            } else if (typeof selectedBooking.vehicles === 'object') {
                              // Handle object format: {vehicleId: count}
                              return Object.entries(selectedBooking.vehicles)
                                .filter(([_, count]) => (count as number) > 0)
                                .map(([vehicleId, count]) => {
                                  const vehicleCount = count as number
                                  // Map vehicle IDs to readable names
                                  const vehicleNames: { [key: string]: string } = {
                                    'armoredSedan': 'Armored Sedan',
                                    'suv': 'SUV',
                                    'motorcycle': 'Motorcycle',
                                    'van': 'Van'
                                  }
                                  const vehicleName = vehicleNames[vehicleId] || vehicleId
                                  return vehicleCount > 1 ? `${vehicleName} (${vehicleCount})` : vehicleName
                                })
                                .join(', ')
                            } else {
                              return String(selectedBooking.vehicles)
                            }
                          })() :
                          selectedBooking.vehicle_type || 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Dress Code:</span>
                      <span className="text-white font-medium capitalize">
                        {selectedBooking.personnel?.dressCode || selectedBooking.dress_code?.replace('-', ' ') || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Protection Level:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.protectionType || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Pricing:</span>
                      <span className="text-white font-medium">To be provided by operator</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-4">
                      Submitted: {selectedBooking.timestamp ? 
                        new Date(selectedBooking.timestamp).toLocaleString() :
                        selectedBooking.created_at ? 
                          new Date(selectedBooking.created_at).toLocaleString() :
                          'N/A'
                      }
                    </div>
                  </div>
                </div>

                {/* Operator Actions - Fixed Action Buttons */}
                <div className="p-6 border-b border-white/10">
                  <h4 className="text-lg font-semibold text-white mb-4">Operator Actions</h4>
                  <div className="flex flex-wrap gap-3">
                    {getStatusActions(selectedBooking.status, paymentApproved[selectedBooking.id]).map(({ action, label, color }) => (
                      <Button
                        key={action}
                        onClick={() => handleOperatorAction(action)}
                        disabled={actionLoading === action}
                        className={`${color} text-white px-4 py-2 text-sm font-medium ${
                          actionLoading === action ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        size="sm"
                      >
                        {actionLoading === action ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Processing...</span>
                          </div>
                        ) : (
                          label
                        )}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Payment Status Indicator */}
                  {paymentApproved[selectedBooking.id] && (
                    <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-green-300 text-sm font-medium">Payment Approved</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Status Information */}
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-sm text-blue-200">
                      <strong>Current Status:</strong> {selectedBooking.status.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-xs text-blue-300 mt-1">
                      Available actions depend on current status and payment approval
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="h-96 overflow-y-auto p-6 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_type === 'operator' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.sender_type === 'operator'
                            ? 'bg-blue-600 text-white'
                            : message.sender_type === 'system'
                            ? 'bg-gray-800 text-gray-300 border border-gray-700'
                            : 'bg-gray-700 text-white'
                        }`}
                      >
                        <div className="text-sm">{message.message}</div>
                        
                        {/* Invoice Details */}
                        {message.hasInvoice && message.invoiceData && (
                          <div className="mt-3 p-3 bg-white/10 rounded border border-white/20">
                            <div className="flex justify-between items-center mb-2">
                              <div className="text-xs text-gray-300">Invoice Details</div>
                              <div className="text-xs text-blue-300 font-medium">
                                {message.invoiceData.currency === 'USD' ? 'USD' : 'NGN'} Invoice
                              </div>
                            </div>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span>Base Price:</span>
                                <span>{formatCurrency(message.invoiceData.basePrice, message.invoiceData.currency)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Hourly Rate ({message.invoiceData.duration}h):</span>
                                <span>{formatCurrency(message.invoiceData.hourlyRate * message.invoiceData.duration, message.invoiceData.currency)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Vehicle Fee:</span>
                                <span>{formatCurrency(message.invoiceData.vehicleFee, message.invoiceData.currency)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Personnel Fee:</span>
                                <span>{formatCurrency(message.invoiceData.personnelFee, message.invoiceData.currency)}</span>
                              </div>
                              <div className="flex justify-between font-semibold border-t border-white/20 pt-2 mt-2">
                                <span>Total Amount:</span>
                                <span className="text-green-400">{formatCurrency(message.invoiceData.totalAmount, message.invoiceData.currency)}</span>
                              </div>
                              {message.invoiceData.currency === 'USD' && (
                                <div className="text-xs text-gray-400 text-center mt-2">
                                  Equivalent: ₦{(message.invoiceData.totalAmount * exchangeRate).toLocaleString()} NGN
                                </div>
                              )}
                            </div>
                            <Button
                              onClick={() => {
                                setSuccess("Payment approved! Service will proceed.")
                                
                                // Mark payment as approved for this booking
                                setPaymentApproved(prev => ({
                                  ...prev,
                                  [selectedBooking.id]: true
                                }))
                                
                                // Update booking status to accepted if it was pending
                                if (selectedBooking.status === 'pending') {
                                  const updatedBookings = bookings.map(booking => 
                                    booking.id === selectedBooking.id 
                                      ? { ...booking, status: 'accepted' }
                                      : booking
                                  )
                                  setBookings(updatedBookings)
                                  setSelectedBooking({ ...selectedBooking, status: 'accepted' })
                                }
                                
                                const paymentMsg = {
                                  id: messages.length + 1,
                                  booking_id: selectedBooking.id,
                                  sender_type: 'client',
                                  message: "✅ Payment approved! Please proceed with the service.",
                                  created_at: new Date().toISOString()
                                }
                                setMessages(prev => [...prev, paymentMsg])
                                scrollToBottom()
                              }}
                              size="sm"
                              className="mt-3 bg-green-600 hover:bg-green-700 text-white w-full"
                            >
                              Approve & Pay
                            </Button>
                          </div>
                        )}
                        
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-6 border-t border-white/10">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                    <Button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 rounded-xl p-12 border border-white/20 text-center">
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Booking Selected</h3>
                <p className="text-gray-300">Select a booking from the list to start chatting with the client.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 max-w-lg w-full max-h-[90vh] flex flex-col">
            {/* Header - Fixed */}
            <div className="p-6 pb-4 border-b border-white/10">
              <h3 className="text-xl font-semibold text-white">Create Invoice</h3>
            </div>
            
            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
              {/* Currency Selection */}
              <div className="flex items-center space-x-4 mb-4">
                <label className="text-sm text-gray-300">Currency:</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setCurrency('NGN')
                      const newInvoice = calculateInvoice(selectedBooking, 'NGN')
                      setInvoiceData(newInvoice)
                    }}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      currency === 'NGN' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    ₦ NGN
                  </button>
                  <button
                    onClick={() => {
                      setCurrency('USD')
                      const newInvoice = calculateInvoice(selectedBooking, 'USD')
                      setInvoiceData(newInvoice)
                    }}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      currency === 'USD' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
                {currency === 'USD' && (
                  <div className="text-xs text-gray-400">
                    Rate: 1 USD = ₦{exchangeRate.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Service Type Display */}
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-sm text-gray-300 mb-2">Service Details</div>
                <div className="text-white font-medium">{selectedBooking?.service?.name || 'Armed Protection Service'}</div>
                <div className="text-xs text-gray-400">
                  {selectedBooking?.personnel?.protectors || 0} protectors for {selectedBooking?.personnel?.protectee || 0} protectee
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300">Base Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      {currency === 'USD' ? '$' : '₦'}
                    </span>
                    <input
                      type="number"
                      value={invoiceData.basePrice}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, basePrice: parseInt(e.target.value) || 0 }))}
                      className="w-full pl-8 pr-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-300">Hourly Rate</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      {currency === 'USD' ? '$' : '₦'}
                    </span>
                    <input
                      type="number"
                      value={invoiceData.hourlyRate}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, hourlyRate: parseInt(e.target.value) || 0 }))}
                      className="w-full pl-8 pr-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300">Vehicle Fee</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      {currency === 'USD' ? '$' : '₦'}
                    </span>
                    <input
                      type="number"
                      value={invoiceData.vehicleFee}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, vehicleFee: parseInt(e.target.value) || 0 }))}
                      className="w-full pl-8 pr-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-300">Personnel Fee</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      {currency === 'USD' ? '$' : '₦'}
                    </span>
                    <input
                      type="number"
                      value={invoiceData.personnelFee}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, personnelFee: parseInt(e.target.value) || 0 }))}
                      className="w-full pl-8 pr-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300">Duration (hours)</label>
                <input
                  type="number"
                  value={invoiceData.duration}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                />
              </div>

              {/* Invoice Summary */}
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-sm font-medium text-white mb-3">Invoice Summary</div>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Base Price:</span>
                    <span className="text-white">{formatCurrency(invoiceData.basePrice, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Hourly Rate ({invoiceData.duration}h):</span>
                    <span className="text-white">{formatCurrency(invoiceData.hourlyRate * invoiceData.duration, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Vehicle Fee:</span>
                    <span className="text-white">{formatCurrency(invoiceData.vehicleFee, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Personnel Fee:</span>
                    <span className="text-white">{formatCurrency(invoiceData.personnelFee, currency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-white/20 pt-2 text-lg">
                    <span className="text-white">Total Amount:</span>
                    <span className="text-green-400">{formatCurrency(invoiceData.basePrice + (invoiceData.hourlyRate * invoiceData.duration) + invoiceData.vehicleFee + invoiceData.personnelFee, currency)}</span>
                  </div>
                  {currency === 'USD' && (
                    <div className="text-xs text-gray-400 text-center mt-2">
                      Equivalent: ₦{((invoiceData.basePrice + (invoiceData.hourlyRate * invoiceData.duration) + invoiceData.vehicleFee + invoiceData.personnelFee) * exchangeRate).toLocaleString()} NGN
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="p-6 pt-4 border-t border-white/10">
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={sendInvoice}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Send Invoice
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
