"use client"

import { useState, useEffect } from 'react'
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

export default function OperatorDemoPage() {
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // Chat and messaging
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  
  // Bookings and data
  const [bookings, setBookings] = useState<any[]>([])
  const [filteredBookings, setFilteredBookings] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  
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
      const response = await fetch('/api/operator/bookings-demo', {
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
        const transformedBookings = result.data.map((booking: any) => ({
          ...booking,
          id: booking.booking_code,
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
      setError('Failed to load bookings. Please check the server connection.')
    }
  }

  const loadMessages = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/operator/messages?bookingId=${bookingId}`, {
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
      // Create some demo messages for testing
      const demoMessages = [
        {
          id: '1',
          booking_id: bookingId,
          sender_type: 'client',
          message: 'Hello, I need protection services for tomorrow.',
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '2',
          booking_id: bookingId,
          sender_type: 'operator',
          message: 'Thank you for your request. We are reviewing your booking details.',
          created_at: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: '3',
          booking_id: bookingId,
          sender_type: 'system',
          message: 'Booking status updated to: pending',
          created_at: new Date(Date.now() - 900000).toISOString(),
          is_system_message: true
        }
      ]
      setMessages(demoMessages)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedBooking) return

    try {
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

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
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
        }
      } else {
        // Fallback: add message locally
        const message = {
          id: `operator_${Date.now()}`,
          booking_id: selectedBooking.id,
          sender_type: 'operator',
          message: newMessage,
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, message])
        setNewMessage("")
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Fallback: add message locally
      const message = {
        id: `operator_${Date.now()}`,
        booking_id: selectedBooking.id,
        sender_type: 'operator',
        message: newMessage,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, message])
      setNewMessage("")
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
        case "deploy":
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

      // Update local state
      const updatedBookings = bookings.map(booking => 
        booking.id === selectedBooking.id 
          ? { ...booking, status: newStatus }
          : booking
      )
      setBookings(updatedBookings)
      setSelectedBooking({ ...selectedBooking, status: newStatus })

      // Add messages
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

      setSuccess(`Action completed: ${action}`)
    } catch (error) {
      setError(`Failed to ${action} booking`)
    }
  }

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_')
    
    switch (normalizedStatus) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300'
      case 'accepted':
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

  const getStatusActions = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_')
    
    switch (normalizedStatus) {
      case 'pending':
        return [
          { action: 'confirm', label: 'Confirm', color: 'bg-green-600 hover:bg-green-700' }
        ]
      case 'accepted':
        return [
          { action: 'deploy', label: 'Deploy Team', color: 'bg-purple-600 hover:bg-purple-700' }
        ]
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
      default:
        return [
          { action: 'confirm', label: 'Confirm', color: 'bg-green-600 hover:bg-green-700' }
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
              <h1 className="text-xl font-bold text-white">Protector.Ng Operator Demo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Bell className="h-6 w-6 text-white" />
              <span className="text-white">Demo Dashboard</span>
              <a
                href="/operator"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Real Dashboard
              </a>
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300">
                      <p>
                        {booking.client?.first_name} {booking.client?.last_name}
                      </p>
                      <p className="text-xs">
                        {booking.pickup_address || 'Location not specified'}
                      </p>
                      <p className="text-xs">
                        {new Date(booking.created_at).toLocaleString()}
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
                        #{selectedBooking.id} - {selectedBooking.client?.first_name} {selectedBooking.client?.last_name}
                      </h3>
                      <p className="text-sm text-gray-300">
                        {selectedBooking.pickup_address || 'Location not specified'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedBooking.status)}`}>
                        {selectedBooking.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operator Actions */}
                <div className="p-6 border-b border-white/10">
                  <h4 className="text-sm font-medium text-white mb-3">Operator Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    {getStatusActions(selectedBooking.status).map(({ action, label, color }) => (
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
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
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
    </div>
  )
}
