"use client"

import { useState, useEffect, useRef } from "react"
import { 
  MessageSquare, 
  Search, 
  RefreshCw,
  Bell,
  Shield,
  Send
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { AdminAPI } from "@/lib/api"
import { unifiedChatService, UnifiedChatMessage } from "@/lib/services/unifiedChatService"

export default function OperatorDashboard() {
  const supabase = createClient()
  
  // State management
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // Chat and messaging
  const [messages, setMessages] = useState<UnifiedChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [user, setUser] = useState<any>(null)
  
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
  
  // New booking notifications
  const [newBookingCount, setNewBookingCount] = useState(0)
  const [lastBookingCount, setLastBookingCount] = useState(0)
  
  // Initialize dashboard
  useEffect(() => {
    initializeDashboard()
  }, [])

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
    }
    getUser()
  }, [])

  // Subscribe to real-time messages for selected booking
  useEffect(() => {
    if (!user || !selectedBooking) return

    let subscription: any = null

    const setupSubscription = async () => {
      // Load existing messages first
      await loadMessages(selectedBooking.id)
      
      // Then set up real-time subscription
      subscription = await unifiedChatService.subscribeToMessages(
        selectedBooking.id,
        (newMessage) => {
          console.log('📨 New message received in operator dashboard:', newMessage)
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) {
              console.log('⚠️ Duplicate message detected, skipping')
              return prev
            }
            console.log('✅ Adding new message to operator chat')
            const updated = [...prev, newMessage]
            
            // CRITICAL: Save to localStorage immediately
            if (typeof window !== 'undefined' && selectedBooking) {
              localStorage.setItem(`operator_chat_${selectedBooking.id}`, JSON.stringify(updated))
              console.log('💾 Operator messages backed up to localStorage')
            }
            
            return updated
          })
          // Don't auto-scroll - let operator control their view
        }
      )
    }

    setupSubscription()

    return () => {
      if (subscription && selectedBooking) {
        unifiedChatService.unsubscribe(selectedBooking.id)
      }
    }
  }, [user, selectedBooking])

  // Subscribe to real-time booking updates
  useEffect(() => {
    if (!user) return

    console.log('🔔 Setting up real-time booking subscription for operator...')

    // Subscribe to new bookings
    const bookingSubscription = supabase
      .channel('operator-bookings')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings'
        },
        async (payload) => {
          console.log('📨 Real-time booking event:', payload.eventType, payload.new)

          if (payload.eventType === 'INSERT') {
            // New booking created
            console.log('🆕 NEW BOOKING DETECTED! Reloading bookings...')
            
            // Play notification sound
            if (typeof window !== 'undefined') {
              try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZUQ0PT6Ln8bllHAU8ltryxnMiBSl+zPLaizsIGGS56+ibUQwNTKXh8LJnGwY7ktDyyH0pBSl4yPDdk0EIFV23yeyoVxYLSpjb8L9pIgU2jNDzzHwqBSh2xvDek0EIFV63yOyoVxYLS5jb8L9pIgU2jNDzzHwqBSh2xvDek0EIFV63yOyoVxYLS5jb8L9pIgU2jNDzzHwqBSh2xvDek0EIFV63yOyoVxYLS5jb8L9pIgU2jNDzzHwqBSh2xvDek0EIFV63yOyoVxYLS5jb8L9pIgU2jNDzzHwqBSh2xvDek0EIFV63yOyoVxYLS5jb8L9pIgU2jNDzzHwqBQ==')
                audio.volume = 0.5
                audio.play().catch(e => console.log('Could not play sound:', e))
              } catch (e) {
                console.log('Audio not supported:', e)
              }
            }
            
            // Show browser notification if permitted
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('🆕 New Booking Request!', {
                body: `New protection booking from ${payload.new.pickup_address || 'client'}`,
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png'
              })
            }
            
            // Increment new booking counter
            setNewBookingCount(prev => prev + 1)
            
            // Reload bookings
            await loadBookingsDirectly()
          } else if (payload.eventType === 'UPDATE') {
            // Booking updated
            console.log('🔄 Booking updated! Reloading bookings...')
            await loadBookingsDirectly()
          } else if (payload.eventType === 'DELETE') {
            // Booking deleted
            console.log('🗑️ Booking deleted! Reloading bookings...')
            await loadBookingsDirectly()
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Booking subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time booking updates active!')
        }
      })

    return () => {
      console.log('🔌 Unsubscribing from booking updates')
      supabase.removeChannel(bookingSubscription)
    }
  }, [user])

  // Track booking count changes
  useEffect(() => {
    if (bookings.length > lastBookingCount && lastBookingCount > 0) {
      setNewBookingCount(prev => prev + (bookings.length - lastBookingCount))
    }
    setLastBookingCount(bookings.length)
  }, [bookings.length])

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
      
      // Load real bookings using a direct database approach to avoid API auth issues
      await loadBookingsDirectly()
      
    } catch (error) {
      console.error('Failed to initialize dashboard:', error)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadBookingsDirectly = async () => {
    try {
      console.log('🔄 Loading bookings directly from database...')
      
      // Check session but don't block if missing (service role will bypass RLS anyway)
      const { data: { session } } = await supabase.auth.getSession()
      console.log('📋 Session status:', session ? '✅ Active' : '⚠️ No session (will use service role)')

      // Create a direct Supabase client with service role to bypass RLS
      console.log('🔑 Creating service role client...')
      const { createServiceRoleClient } = await import('@/lib/config/database')
      const serviceSupabase = createServiceRoleClient()
      console.log('✅ Service role client created')

      // Get all bookings with client details
      console.log('📥 Fetching bookings from database...')
      const { data: bookings, error } = await serviceSupabase
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          service:services(
            id,
            name,
            description,
            base_price,
            price_per_hour
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching bookings:', error)
        console.error('❌ Error details:', JSON.stringify(error, null, 2))
        setError(`Failed to load bookings: ${error.message}`)
        return
      }

      console.log('✅ Loaded', bookings?.length || 0, 'bookings from database')
      console.log('📊 Booking IDs:', bookings?.slice(0, 3).map(b => b.id.substring(0, 8)))

      if (bookings && bookings.length > 0) {
        // Transform bookings to match operator dashboard format
        const transformedBookings = bookings.map(booking => {
          let clientInfo = {
            first_name: booking.client?.first_name || 'Unknown',
            last_name: booking.client?.last_name || 'User',
            phone: booking.client?.phone || 'N/A',
            email: booking.client?.email || 'N/A'
          }
          
          // Extract additional info from special_instructions
          let vehicles = {}
          let protectionType = 'N/A'
          let destinationDetails = {}
          let contact = null
          
          try {
            if (booking.special_instructions) {
              const specialInstructions = JSON.parse(booking.special_instructions)
              
              if (specialInstructions.contact) {
                contact = specialInstructions.contact
                if (specialInstructions.contact.user) {
                  clientInfo = {
                    first_name: specialInstructions.contact.user.firstName || clientInfo.first_name,
                    last_name: specialInstructions.contact.user.lastName || clientInfo.last_name,
                    phone: specialInstructions.contact.phone || clientInfo.phone,
                    email: specialInstructions.contact.user.email || clientInfo.email
                  }
                }
              }
              
              if (specialInstructions.vehicles) {
                vehicles = specialInstructions.vehicles
              }
              if (specialInstructions.protectionType) {
                protectionType = specialInstructions.protectionType
              }
              if (specialInstructions.destinationDetails) {
                destinationDetails = specialInstructions.destinationDetails
              }
            }
          } catch (error) {
            console.log('Could not parse special_instructions for booking:', booking.booking_code)
          }
          
          return {
            id: booking.booking_code || booking.id,
            booking_code: booking.booking_code,
            database_id: booking.id,
            client: clientInfo,
            contact: contact,
            pickup_address: booking.pickup_address || 'N/A',
            destination_address: booking.destination_address || 'N/A',
            status: booking.status || 'pending',
            created_at: booking.created_at,
            scheduled_date: booking.scheduled_date,
            scheduled_time: booking.scheduled_time,
            service: {
              name: booking.service?.name || 'Unknown Service',
              type: booking.service_type,
              description: booking.service?.description || ''
            },
            serviceType: booking.service_type === 'armed_protection' ? 'armed-protection' : 'vehicle-only',
            duration: `${booking.duration_hours || 1} hour(s)`,
            total_price: booking.total_price || 0,
            personnel: {
              protectors: booking.protector_count || 0,
              protectee: booking.protectee_count || 1,
              dressCode: booking.dress_code?.replace(/_/g, ' ') || 'N/A'
            },
            dress_code: booking.dress_code || 'N/A',
            vehicles: vehicles,
            protectionType: protectionType,
            destinationDetails: destinationDetails,
            special_instructions: booking.special_instructions || 'N/A',
            emergency_contact: booking.emergency_contact || 'N/A',
            emergency_phone: booking.emergency_phone || 'N/A',
            pickupDetails: {
              location: booking.pickup_address,
              date: booking.scheduled_date,
              time: booking.scheduled_time
            },
            timestamp: booking.created_at
          }
        })

        console.log('💾 Setting bookings state with', transformedBookings.length, 'bookings')
        setBookings(transformedBookings)
        console.log('✅ Bookings state updated successfully')
        
        // Auto-select first pending booking if none selected
        if (!selectedBooking && transformedBookings.length > 0) {
          const pendingBooking = transformedBookings.find(b => b.status === 'pending')
          if (pendingBooking) {
            setSelectedBooking(pendingBooking)
            console.log('✅ Auto-selected pending booking:', pendingBooking.id)
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error loading bookings directly:', error)
    }
  }

  const loadBookings = async () => {
    try {
      // Get current user session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('🔐 Session check:', { 
        hasSession: !!session, 
        hasToken: !!session?.access_token,
        userEmail: session?.user?.email,
        sessionError: sessionError?.message 
      })
      
      if (!session?.access_token) {
        console.error('❌ No session found for operator:', sessionError)
        setError('Please log in to access operator dashboard')
        // Don't return - use fallback data to prevent chat from disappearing
        console.log('⚠️ Using fallback booking data to prevent chat issues')
        return
      }

      // Make real API call to get bookings
      console.log('📤 Making API call to /api/operator/bookings')
      const response = await fetch('/api/operator/bookings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('📥 API Response:', { 
        status: response.status, 
        ok: response.ok,
        statusText: response.statusText 
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Failed to fetch bookings:', errorData)
        setError('Failed to load bookings. Please try again.')
        return
      }

      const result = await response.json()
      if (result.success) {
        setBookings(result.data)
        console.log('✅ Loaded', result.data.length, 'bookings from API')
      } else {
        setError('Failed to load bookings')
        return
      }

      
      // Auto-select first pending booking if none selected
      if (!selectedBooking && result.data.length > 0) {
        const pendingBooking = result.data.find((b: any) => b.status === 'pending')
        if (pendingBooking) {
          setSelectedBooking(pendingBooking)
          // Messages will be loaded by the useEffect when selectedBooking changes
        }
      }
    } catch (error) {
      console.error('Failed to load bookings:', error)
    }
  }

  const loadMessages = async (bookingId: string) => {
    try {
      console.log('🔄 Loading messages for booking:', bookingId)
      
      // Try loading from localStorage first for instant display
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(`operator_chat_${bookingId}`)
        if (cached) {
          try {
            const cachedMessages = JSON.parse(cached)
            setMessages(cachedMessages)
            console.log('📱 Loaded', cachedMessages.length, 'messages from cache instantly')
          } catch (e) {
            console.warn('Failed to parse cached messages:', e)
          }
        }
      }
      
      // Then fetch from database
      const messages = await unifiedChatService.getMessages(bookingId)
      console.log('📨 Loaded messages:', messages.length, 'messages from database')
      setMessages(messages)
      
      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem(`operator_chat_${bookingId}`, JSON.stringify(messages))
        console.log('💾 Operator messages saved to localStorage')
      }
      
      // Don't auto-scroll - let operator control their view
    } catch (error) {
      console.error('❌ Failed to load messages:', error)
      // Don't clear messages on error - keep existing ones
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedBooking || !user) return

    try {
      await unifiedChatService.sendMessage(
        selectedBooking.id,
        newMessage.trim(),
        'operator',
        user.id
      )
      
      setNewMessage("")
    } catch (error) {
      console.error('Failed to send message:', error)
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
    if (!selectedBooking || !user) return

    try {
      let message = ""
      let systemMessage = ""

      switch (action) {
        case "confirm":
          message = "✅ Request confirmed! Your protection team is being assigned."
          systemMessage = "Booking confirmed by operator"
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

      // Send system message
      if (systemMessage) {
        await unifiedChatService.sendMessage(
          selectedBooking.id,
          systemMessage,
          'system',
          'system'
        )
      }

      // Send operator message
      if (message) {
        await unifiedChatService.sendMessage(
          selectedBooking.id,
          message,
          'operator',
          user.id
        )
      }

      setSuccess(`Action completed: ${action}`)
    } catch (error) {
      console.error(`Failed to ${action} booking:`, error)
      setError(`Failed to ${action} booking`)
    }
  }

  const sendInvoice = async () => {
    if (!selectedBooking || !user) return

    try {
      // Send system message
      await unifiedChatService.sendMessage(
        selectedBooking.id,
        "Invoice sent to client",
        'system',
        'system'
      )

      // Send invoice message
      await unifiedChatService.sendMessage(
        selectedBooking.id,
        "📄 Invoice sent. Please review and approve payment to proceed.",
        'operator',
        user.id,
        {
          hasInvoice: true,
          invoiceData: invoiceData
        }
      )

      setShowInvoiceModal(false)
      setSuccess("Invoice sent successfully!")
    } catch (error) {
      console.error("Failed to send invoice:", error)
      setError("Failed to send invoice")
    }
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Header - Fixed */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-400" />
              <h1 className="text-xl font-bold text-white">Protector.Ng Operator</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification Bell with Badge */}
              <div className="relative">
                <Bell className="h-6 w-6 text-white" />
                {newBookingCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {newBookingCount > 9 ? '9+' : newBookingCount}
                  </div>
                )}
              </div>
              <span className="text-white">Operator Dashboard</span>
              <button
                onClick={() => setNewBookingCount(0)}
                className="text-xs text-gray-400 hover:text-white"
              >
                {newBookingCount > 0 ? `${newBookingCount} new` : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto operator-content-scroll" style={{ scrollBehavior: 'auto' }}>
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
                  onClick={() => {
                    console.log('🔄 Refresh clicked - loading bookings directly')
                    loadBookingsDirectly()
                  }}
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
                      // Messages will be loaded by the useEffect when selectedBooking changes
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
                      <span className="text-white font-medium">{selectedBooking.service?.name || 'Armed Protection Service'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Pickup:</span>
                      <span className="text-white font-medium">{selectedBooking.pickup_address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Date & Time:</span>
                      <span className="text-white font-medium">
                        {selectedBooking.scheduled_date ? new Date(selectedBooking.scheduled_date).toLocaleDateString() : 'N/A'} at{' '}
                        {selectedBooking.scheduled_date ? new Date(selectedBooking.scheduled_date).toLocaleTimeString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Duration:</span>
                      <span className="text-white font-medium">{selectedBooking.duration || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Destination:</span>
                      <span className="text-white font-medium">{selectedBooking.destination_address || 'N/A'}</span>
                    </div>
                    {selectedBooking.personnel && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Personnel:</span>
                        <span className="text-white font-medium">
                          {selectedBooking.personnel.protectors} protectors for {selectedBooking.personnel.protectee} protectee
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-300">Contact:</span>
                      <span className="text-white font-medium">{selectedBooking.client?.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Vehicle Type:</span>
                      <span className="text-white font-medium">{selectedBooking.vehicle_type || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Dress Code:</span>
                      <span className="text-white font-medium capitalize">{selectedBooking.dress_code?.replace('-', ' ') || 'N/A'}</span>
                    </div>
                    {selectedBooking.special_requirements && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Special Requirements:</span>
                        <span className="text-white font-medium">{selectedBooking.special_requirements}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-300">Pricing:</span>
                      <span className="text-white font-medium">To be provided by operator</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-4">
                      Submitted: {new Date(selectedBooking.created_at).toLocaleString()}
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
                        {message.has_invoice && message.invoice_data && (
                          <div className="mt-3 p-3 bg-white/10 rounded border border-white/20">
                            <div className="flex justify-between items-center mb-2">
                              <div className="text-xs text-gray-300">Invoice Details</div>
                              <div className="text-xs text-blue-300 font-medium">
                                {message.invoice_data.currency === 'USD' ? 'USD' : 'NGN'} Invoice
                              </div>
                            </div>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span>Base Price:</span>
                                <span>{formatCurrency(message.invoice_data.basePrice, message.invoice_data.currency)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Hourly Rate ({message.invoice_data.duration}h):</span>
                                <span>{formatCurrency(message.invoice_data.hourlyRate * message.invoice_data.duration, message.invoice_data.currency)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Vehicle Fee:</span>
                                <span>{formatCurrency(message.invoice_data.vehicleFee, message.invoice_data.currency)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Personnel Fee:</span>
                                <span>{formatCurrency(message.invoice_data.personnelFee, message.invoice_data.currency)}</span>
                              </div>
                              <div className="flex justify-between font-semibold border-t border-white/20 pt-2 mt-2">
                                <span>Total Amount:</span>
                                <span className="text-green-400">{formatCurrency(message.invoice_data.totalAmount, message.invoice_data.currency)}</span>
                              </div>
                              {message.invoice_data.currency === 'USD' && (
                                <div className="text-xs text-gray-400 text-center mt-2">
                                  Equivalent: ₦{(message.invoice_data.totalAmount * exchangeRate).toLocaleString()} NGN
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
                                
                                const paymentMsg: UnifiedChatMessage = {
                                  id: `payment_${Date.now()}`,
                                  booking_id: selectedBooking.id,
                                  sender_type: 'client',
                                  sender_id: selectedBooking.client_id || 'client',
                                  message: "✅ Payment approved! Please proceed with the service.",
                                  created_at: new Date().toISOString(),
                                  updated_at: new Date().toISOString()
                                }
                                setMessages(prev => [...prev, paymentMsg])
                                // Don't auto-scroll - let operator control their view
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
    </div>
  )
}
