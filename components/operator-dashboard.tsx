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
          console.log('Real-time booking update:', payload)
          // Refresh bookings when any booking changes
          loadBookings()
        }
      )
      .subscribe()

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
          console.log('Real-time message update:', payload)
          // Refresh messages if a booking is selected
          if (selectedBooking) {
            loadMessages(selectedBooking.id)
          }
        }
      )
      .subscribe()

    // Fallback: Refresh every 10 seconds as backup
    const refreshInterval = setInterval(() => {
      loadBookings()
      if (selectedBooking) {
        loadMessages(selectedBooking.id)
      }
    }, 10000)

    return () => {
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
        
        // Auto-select first pending booking if none selected
        if (!selectedBooking && transformedBookings.length > 0) {
          const pendingBooking = transformedBookings.find((b: any) => b.status === 'pending')
          if (pendingBooking) {
            setSelectedBooking(pendingBooking)
            loadMessages(pendingBooking.id)
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

  const loadMessages = async (bookingId: string) => {
    try {
      // Find the database ID for this booking
      const booking = bookings.find(b => b.id === bookingId)
      const actualBookingId = booking?.database_id || bookingId
      
      // Use the new API endpoint
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
          const convertedMessages = dbMessages.map(msg => ({
            id: msg.id,
            booking_id: msg.booking_id,
            sender_type: msg.sender_type || 'client',
            sender_id: msg.sender_id,
            message: msg.content,
            created_at: msg.created_at,
            is_system_message: msg.sender_type === 'system' || msg.is_system_message
          }))
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
    if (!newMessage.trim() || !selectedBooking) return

    try {
      // Use the API to send message
      const response = await fetch('/api/operator/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: selectedBooking.database_id || selectedBooking.id,
          content: newMessage,
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
          message: newMessage,
          created_at: result.data.created_at
        }
        
        setMessages(prev => [...prev, message])
        setNewMessage("")
        scrollToBottom()
      } else {
        throw new Error(result.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Failed to send message via API:', error)
      
      // Fallback to localStorage
      try {
        const message = {
          id: `operator_${Date.now()}`,
          booking_id: selectedBooking.id,
          sender_type: 'operator',
          message: newMessage,
          created_at: new Date().toISOString()
        }

        // Add to local state
        setMessages(prev => [...prev, message])
        
        // Store in localStorage for real-time updates
        const currentStoredMessages = JSON.parse(localStorage.getItem(`chat_${selectedBooking.id}`) || '[]')
        const updatedMessages = [...currentStoredMessages, message]
        localStorage.setItem(`chat_${selectedBooking.id}`, JSON.stringify(updatedMessages))
        
        setNewMessage("")
        scrollToBottom()
      } catch (fallbackError) {
        console.error('Fallback message sending failed:', fallbackError)
        setError('Failed to send message')
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
    if (!selectedBooking) return

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
          newStatus = "deployed"
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

      // Update booking status
      if (newStatus !== selectedBooking.status) {
        const updatedBookings = bookings.map(booking => 
          booking.id === selectedBooking.id 
            ? { ...booking, status: newStatus }
            : booking
        )
        setBookings(updatedBookings)
        setSelectedBooking({ ...selectedBooking, status: newStatus })
        
        // Update localStorage
        const updatedBookingsForStorage = updatedBookings.map(booking => 
          booking.id === selectedBooking.id 
            ? { ...booking, status: newStatus }
            : booking
        )
        localStorage.setItem('operator_bookings', JSON.stringify(updatedBookingsForStorage))
        
        // Update Supabase
        try {
          const { error } = await supabase
            .from('bookings')
            .update({ 
              status: newStatus.toLowerCase().replace(/\s+/g, '_'),
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedBooking.database_id || selectedBooking.id)
          
          if (error) {
            console.error('Error updating booking status in Supabase:', error)
          } else {
            console.log('Booking status updated in Supabase')
          }
        } catch (error) {
          console.error('Failed to update booking status in Supabase:', error)
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
      setError(`Failed to ${action} booking`)
    }
  }

  const sendInvoice = () => {
    if (!selectedBooking) return

    const invoiceMessage = {
      id: `invoice_${Date.now()}`,
      booking_id: selectedBooking.id,
      sender_type: 'operator',
      message: `📄 Invoice sent. Please review and approve payment to proceed.`,
      created_at: new Date().toISOString(),
      has_invoice: true,
      invoiceData: invoiceData
    }

    const systemMessage = {
      id: `system_${Date.now()}`,
      booking_id: selectedBooking.id,
      sender_type: 'system',
      message: "Invoice sent to client",
      created_at: new Date().toISOString(),
      is_system_message: true
    }

    // Add to local state
    setMessages(prev => [...prev, systemMessage, invoiceMessage])
    
    // Store in localStorage for real-time updates
    const currentStoredMessages = JSON.parse(localStorage.getItem(`chat_${selectedBooking.id}`) || '[]')
    const allMessages = [...currentStoredMessages, systemMessage, invoiceMessage]
    localStorage.setItem(`chat_${selectedBooking.id}`, JSON.stringify(allMessages))
    
    setShowInvoiceModal(false)
    setSuccess("Invoice sent successfully!")
    scrollToBottom()
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
      case 'deployed':
        return [
          { action: 'en_route', label: 'Mark En Route', color: 'bg-blue-600 hover:bg-blue-700' }
        ]
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
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
            <p className="text-green-200">{success}</p>
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
                      loadMessages(booking.id)
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
                          selectedBooking.serviceType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Service' : 
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
                                .filter(([_, count]) => count > 0)
                                .map(([vehicleId, count]) => {
                                  // Map vehicle IDs to readable names
                                  const vehicleNames: { [key: string]: string } = {
                                    'armoredSedan': 'Armored Sedan',
                                    'suv': 'SUV',
                                    'motorcycle': 'Motorcycle',
                                    'van': 'Van'
                                  }
                                  const vehicleName = vehicleNames[vehicleId] || vehicleId
                                  return count > 1 ? `${vehicleName} (${count})` : vehicleName
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

                {/* Operator Actions */}
                <div className="p-6 border-b border-white/10">
                  <h4 className="text-sm font-medium text-white mb-3">Operator Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    {getStatusActions(selectedBooking.status, paymentApproved[selectedBooking.id]).map(({ action, label, color }) => (
                      <Button
                        key={action}
                        onClick={() => handleOperatorAction(action)}
                        className={`${color} text-white`}
                        size="sm"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Payment Status Indicator */}
                  {paymentApproved[selectedBooking.id] && (
                    <div className="mt-3 p-2 bg-green-500/20 border border-green-500/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-green-300 text-sm font-medium">Payment Approved</span>
                      </div>
                    </div>
                  )}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Create Invoice</h3>
            
            <div className="space-y-4">
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
