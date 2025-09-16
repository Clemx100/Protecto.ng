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
import { bookingService } from "@/lib/services/bookingService"
import { chatService } from "@/lib/services/chatService"
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
      console.log('Loading bookings from database and localStorage...')
      
      // Try to load from database first
      const dbBookings = await bookingService.getBookings()
      console.log('Database bookings:', dbBookings.length)
      
      // Load bookings from localStorage (where new bookings are stored)
      const localBookings = JSON.parse(localStorage.getItem('operator_bookings') || '[]')
      console.log('LocalStorage bookings:', localBookings.length)
      
      // Mock data with detailed request information (fallback)
      const mockBookings = [
        {
          id: "REQ1757448303416",
          client: { 
            first_name: "John", 
            last_name: "Doe",
            phone: "+234 2222222222",
            email: "john.doe@example.com"
          },
          pickup_address: "123 Victoria Island, Lagos",
          destination_address: "456 Ikoyi, Lagos",
          status: "pending",
          created_at: new Date().toISOString(),
          service: { 
            name: "Armed Protection Service",
            type: "armed_protection"
          },
          scheduled_date: "2025-02-22T11:45:00Z",
          duration: "1 day",
          total_price: 450000,
          personnel: {
            protectors: 1,
            protectee: 1
          },
          dress_code: "tactical-casual",
          vehicle_type: "Mercedes S-Class",
          special_requirements: "High-risk area protection",
          emergency_contact: "+234 3333333333"
        },
        {
          id: "REQ1757448303417", 
          client: { 
            first_name: "Jane", 
            last_name: "Smith",
            phone: "+234 4444444444",
            email: "jane.smith@example.com"
          },
          pickup_address: "789 Lekki Phase 1, Lagos",
          destination_address: "321 Surulere, Lagos",
          status: "accepted",
          created_at: new Date().toISOString(),
          service: { 
            name: "Vehicle Only Service",
            type: "vehicle_only"
          },
          scheduled_date: "2025-02-23T14:30:00Z",
          duration: "2 hours",
          total_price: 25000,
          personnel: {
            protectors: 0,
            protectee: 2
          },
          dress_code: "business-casual",
          vehicle_type: "BMW X7",
          special_requirements: "Airport pickup"
        }
      ]
      
      // Combine all sources: database, localStorage, and mock data
      const allBookings = [...dbBookings, ...localBookings, ...mockBookings.filter(mock => 
        !localBookings.some(local => local.id === mock.id) &&
        !dbBookings.some(db => db.id === mock.id)
      )]
      
      console.log('Total bookings loaded:', allBookings.length)
      setBookings(allBookings)
      
      // Auto-select first pending booking if none selected
      if (!selectedBooking && allBookings.length > 0) {
        const pendingBooking = allBookings.find(b => b.status === 'pending')
        if (pendingBooking) {
          setSelectedBooking(pendingBooking)
          loadMessages(pendingBooking.id)
        }
      }
    } catch (error) {
      console.error('Failed to load bookings:', error)
    }
  }

  const loadMessages = async (bookingId: string) => {
    try {
      // First try to load from database
      const { data: dbMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages from database:', error)
        // Fallback to localStorage
        const localMessages = JSON.parse(localStorage.getItem(`chat_${bookingId}`) || '[]')
        setMessages(localMessages)
      } else if (dbMessages && dbMessages.length > 0) {
        // Convert messages table format to expected format
        const convertedMessages = dbMessages.map(msg => ({
          id: msg.id,
          booking_id: msg.booking_id,
          sender_type: 'client', // Default to client
          message: msg.content,
          created_at: msg.created_at
        }))
        setMessages(convertedMessages)
      } else {
        // If no messages in database, check localStorage
        const localMessages = JSON.parse(localStorage.getItem(`chat_${bookingId}`) || '[]')
        setMessages(localMessages)
      }
      
      scrollToBottom()
    } catch (error) {
      console.error('Failed to load messages:', error)
      // Final fallback to empty array
      setMessages([])
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedBooking) return

    try {
      const message = {
        id: messages.length + 1,
        booking_id: selectedBooking.id,
        sender_type: 'operator',
        message: newMessage,
        created_at: new Date().toISOString()
      }

      setMessages([...messages, message])
      setNewMessage("")
      scrollToBottom()
    } catch (error) {
      setError('Failed to send message')
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

      switch (action) {
        case "confirm":
          message = "✅ Request confirmed! Your protection team is being assigned."
          systemMessage = "Booking confirmed by operator"
          break
        case "invoice":
        case "send_invoice":
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
          message = "🚀 Protection team deployed! They are en route to your location."
          systemMessage = "Protection team deployed"
          // Update booking status to en_route
          const updatedBookings = bookings.map(booking => 
            booking.id === selectedBooking.id 
              ? { ...booking, status: 'en_route' }
              : booking
          )
          setBookings(updatedBookings)
          setSelectedBooking({ ...selectedBooking, status: 'en_route' })
          break
        case "arrived":
          message = "📍 Your protection team has arrived at the pickup location."
          systemMessage = "Protection team arrived"
          break
        case "start_service":
          message = "🛡️ Protection service has begun. Your team is now active."
          systemMessage = "Protection service started"
          break
        case "complete":
          message = "✅ Service completed successfully. Thank you for choosing Protector.Ng!"
          systemMessage = "Service completed"
          break
      }

      // Send messages through chat service for real-time synchronization
      if (systemMessage) {
        console.log('📤 OPERATOR SENDING SYSTEM MESSAGE:', systemMessage)
        const systemMsg = await chatService.sendMessage({
          booking_id: selectedBooking.id,
          sender_type: 'system',
          sender_id: 'operator', // Use 'operator' as sender ID for system messages
          message: systemMessage,
          is_system_message: true
        })
        console.log('✅ System message sent successfully:', systemMsg)
        setMessages(prev => [...prev, systemMsg])
        
        // Also store in shared localStorage for user chat fallback
        const sharedKey = `shared_chat_${selectedBooking.id}`
        const userKey = `chat_${selectedBooking.id}`
        const existingShared = JSON.parse(localStorage.getItem(sharedKey) || '[]')
        const existingUser = JSON.parse(localStorage.getItem(userKey) || '[]')
        
        const updatedShared = [...existingShared, systemMsg]
        const updatedUser = [...existingUser, systemMsg]
        
        localStorage.setItem(sharedKey, JSON.stringify(updatedShared))
        localStorage.setItem(userKey, JSON.stringify(updatedUser))
        console.log('💾 System message stored in BOTH localStorage keys')
      }

      // Send operator message
      if (message) {
        console.log('📤 OPERATOR SENDING MESSAGE:', message)
        const operatorMsg = await chatService.sendMessage({
          booking_id: selectedBooking.id,
          sender_type: 'operator',
          sender_id: 'operator',
          message: message,
          is_system_message: false
        })
        console.log('✅ Operator message sent successfully:', operatorMsg)
        setMessages(prev => [...prev, operatorMsg])
        
        // Also store in shared localStorage for user chat fallback
        const sharedKey = `shared_chat_${selectedBooking.id}`
        const userKey = `chat_${selectedBooking.id}`
        const existingShared = JSON.parse(localStorage.getItem(sharedKey) || '[]')
        const existingUser = JSON.parse(localStorage.getItem(userKey) || '[]')
        
        const updatedShared = [...existingShared, operatorMsg]
        const updatedUser = [...existingUser, operatorMsg]
        
        localStorage.setItem(sharedKey, JSON.stringify(updatedShared))
        localStorage.setItem(userKey, JSON.stringify(updatedUser))
        console.log('💾 Operator message stored in BOTH localStorage keys')
      }

      // Update booking status in localStorage for user to see
      if (action === 'confirm') {
        const updatedBookings = bookings.map(booking => 
          booking.id === selectedBooking.id 
            ? { ...booking, status: 'confirmed' }
            : booking
        )
        setBookings(updatedBookings)
        setSelectedBooking({ ...selectedBooking, status: 'confirmed' })
        
        // Update localStorage
        localStorage.setItem('operator_bookings', JSON.stringify(updatedBookings))
        console.log('Booking status updated to confirmed')
      }

      setSuccess(`Action completed: ${action}`)
      scrollToBottom()
    } catch (error) {
      setError(`Failed to ${action} booking`)
    }
  }

  const sendInvoice = async () => {
    if (!selectedBooking) return

    try {
      console.log('Sending invoice to user...')
      
      // Send system message
      console.log('📤 OPERATOR SENDING INVOICE SYSTEM MESSAGE')
      const systemMsg = await chatService.sendMessage({
        booking_id: selectedBooking.id,
        sender_type: 'system',
        sender_id: 'operator',
        message: "Invoice sent to client",
        is_system_message: true
      })
      console.log('✅ Invoice system message sent:', systemMsg)
      setMessages(prev => [...prev, systemMsg])
      
      // Store in shared localStorage
      const sharedKey = `shared_chat_${selectedBooking.id}`
      const userKey = `chat_${selectedBooking.id}`
      const existingShared = JSON.parse(localStorage.getItem(sharedKey) || '[]')
      const existingUser = JSON.parse(localStorage.getItem(userKey) || '[]')
      
      const updatedShared1 = [...existingShared, systemMsg]
      const updatedUser1 = [...existingUser, systemMsg]
      
      localStorage.setItem(sharedKey, JSON.stringify(updatedShared1))
      localStorage.setItem(userKey, JSON.stringify(updatedUser1))
      console.log('💾 Invoice system message stored in BOTH localStorage keys')

      // Send invoice message with invoice data
      console.log('📤 OPERATOR SENDING INVOICE MESSAGE WITH DATA:', invoiceData)
      const invoiceMsg = await chatService.sendMessage({
        booking_id: selectedBooking.id,
        sender_type: 'operator',
        sender_id: 'operator',
        message: `📄 Invoice sent. Please review and approve payment to proceed.`,
        is_system_message: false,
        has_invoice: true,
        invoice_data: invoiceData
      })
      console.log('✅ Invoice message sent successfully:', invoiceMsg)
      setMessages(prev => [...prev, invoiceMsg])
      
      // Store in shared localStorage
      const updatedShared2 = [...updatedShared1, invoiceMsg]
      const updatedUser2 = [...updatedUser1, invoiceMsg]
      
      localStorage.setItem(sharedKey, JSON.stringify(updatedShared2))
      localStorage.setItem(userKey, JSON.stringify(updatedUser2))
      console.log('💾 Invoice message stored in BOTH localStorage keys')

      setShowInvoiceModal(false)
      setSuccess("Invoice sent successfully!")
      scrollToBottom()
    } catch (error) {
      console.error('Failed to send invoice:', error)
      setError('Failed to send invoice')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300'
      case 'accepted': return 'bg-blue-500/20 text-blue-300'
      case 'en_route': return 'bg-purple-500/20 text-purple-300'
      case 'arrived': return 'bg-green-500/20 text-green-300'
      case 'in_service': return 'bg-green-500/20 text-green-300'
      case 'completed': return 'bg-gray-500/20 text-gray-300'
      case 'cancelled': return 'bg-red-500/20 text-red-300'
      default: return 'bg-gray-500/20 text-gray-300'
    }
  }

  const getStatusActions = (status: string, hasPaymentApproved: boolean = false) => {
    switch (status) {
      case 'pending':
        return [
          { action: 'confirm', label: 'Confirm', color: 'bg-green-600 hover:bg-green-700' },
          { action: 'invoice', label: 'Send Invoice', color: 'bg-blue-600 hover:bg-blue-700' }
        ]
      case 'accepted':
        return [
          { action: 'invoice', label: 'Send Invoice', color: 'bg-blue-600 hover:bg-blue-700' },
          ...(hasPaymentApproved ? [{ action: 'deploy', label: 'Deploy Team', color: 'bg-purple-600 hover:bg-purple-700' }] : [])
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
      default:
        return []
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
                      <p>{booking.client?.first_name} {booking.client?.last_name}</p>
                      <p className="text-xs">{booking.pickup_address}</p>
                      <p className="text-xs">{new Date(booking.created_at).toLocaleString()}</p>
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
                        #{selectedBooking.id} - {selectedBooking.client?.first_name} {selectedBooking.client?.last_name}
                      </h3>
                      <p className="text-sm text-gray-300">{selectedBooking.pickup_address}</p>
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
                        {selectedBooking.service?.name || 
                         (selectedBooking.serviceType === 'armed-protection' ? 'Armed Protection Service' : 
                          selectedBooking.serviceType === 'car-only' ? 'Vehicle Only Service' : 
                          'Armed Protection Service')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Pickup:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.pickup_address || selectedBooking.pickupDetails?.location || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Date & Time:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.scheduled_date ? 
                          `${new Date(selectedBooking.scheduled_date).toLocaleDateString()} at ${new Date(selectedBooking.scheduled_date).toLocaleTimeString()}` :
                          selectedBooking.pickupDetails?.date && selectedBooking.pickupDetails?.time ?
                          `${selectedBooking.pickupDetails.date} at ${selectedBooking.pickupDetails.time}` :
                          'N/A at N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Duration:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.duration || selectedBooking.pickupDetails?.duration || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Destination:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.destination_address || selectedBooking.destinationDetails?.primary || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Personnel:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.personnel ? 
                          `${selectedBooking.personnel.protectors} protectors for ${selectedBooking.personnel.protectee} protectee` :
                          selectedBooking.protector_count !== undefined && selectedBooking.protectee_count !== undefined ?
                          `${selectedBooking.protector_count} protectors for ${selectedBooking.protectee_count} protectee` :
                          'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Contact:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.client?.phone || selectedBooking.contact?.phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Vehicle Type:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.vehicle_type || 
                         (selectedBooking.vehicles ? Object.entries(selectedBooking.vehicles).map(([vehicle, count]) => `${vehicle} (${count})`).join(', ') : null) ||
                         'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Dress Code:</span>
                      <span className="text-white font-medium capitalize">
                        {selectedBooking.dress_code?.replace('-', ' ') || selectedBooking.personnel?.dressCode || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Special Requirements:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.special_requirements || selectedBooking.protectionType || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Pricing:</span>
                      <span className="text-white font-medium">To be provided by operator</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-4">
                      Submitted: {new Date(selectedBooking.created_at || selectedBooking.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Operator Actions */}
                <div className="p-6 border-b border-white/10">
                  <h4 className="text-sm font-medium text-white mb-3">Operator Actions</h4>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleOperatorAction('confirm')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                    >
                      Confirm
                    </Button>
                    <Button
                      onClick={() => handleOperatorAction('send_invoice')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                    >
                      Send Invoice
                    </Button>
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
