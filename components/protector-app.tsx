"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Shield, Calendar, User, ArrowLeft, MapPin, Car, CheckCircle, Search, Phone, MessageSquare, Mail, Loader2, Home, FileText, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useJsApiLoader } from "@react-google-maps/api"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { fallbackAuth } from "@/lib/services/fallbackAuth"
import { unifiedChatService } from "@/lib/services/unifiedChatService"
import ClientChatInterface from "@/components/client-chat-interface"
import {
  type OutgoingChatAttachment,
  attachmentMessageLabel,
  prepareAttachmentForUpload,
} from "@/lib/utils/chat-media"
import { loadUserProfile as loadProfileFromDB, syncUserProfile, clearProfileCache } from "@/lib/utils/profile-sync"
import LiveTrackingMapComponent from "@/components/live-tracking-map"
import ActivityPageLayout from "@/components/activity-page-layout"
import ProtectorListingPicker, { type ProtectorListing } from "@/components/protector-listing-picker"
import LoadingLogo from "@/components/loading-logo"
import { GeocodingService } from "@/lib/services/geocoding"
import {
  notifyRealtimeEvent,
  requestNotificationPermissionIfNeeded,
} from "@/lib/utils/realtime-notifications"
import { registerPushSubscription } from "@/lib/utils/push-subscriptions"
import {
  parseQuickServiceFromBooking,
  buildQuickServiceChatSummaryFromSpecial,
  buildQuickServiceMessageMetadataFromSpecial,
} from "@/lib/services/quick-service-bookings"
import ProtectorUberHome from "@/components/protector-uber-home"
import {
  getBookingRecommendations,
  logSuggestionEvent,
  type BookingSuggestion,
} from "@/lib/services/booking-recommendations"
import {
  mergePendingWithActive,
  removePendingBooking,
  savePendingBooking,
  type PendingBookingRecord,
} from "@/lib/utils/pending-bookings"
import {
  resolveBookingAvatarImage,
  resolveBookingDisplayName,
  resolveBookingEtaLabel,
  resolveVehicleDisplayName,
} from "@/lib/utils/booking-display"
import {
  getActivityMapMode,
  getQuickServiceFromBooking,
} from "@/lib/utils/activity-map"
import type { MapShellVariant } from "@/lib/utils/map-shell"

const GOOGLE_PLACES_LIBRARIES: ("places")[] = ["places"]

interface BookingDisplay {
  id: string
  booking_code?: string
  type: string
  protectorName?: string
  vehicleType?: string
  status: string
  estimatedArrival?: string
  pickupLocation: string
  destination?: string
  startTime?: string
  protectorImage?: string
  dressCode?: string
  currentLocation?: { lat: number; lng: number }
  cost: string
  date: string
  duration: string
  rating?: number
  // Raw data for modals
  service_type?: string
  scheduled_date?: string
  scheduled_time?: string
  total_price?: number
  special_instructions?: unknown
  booking_mode?: string
  protector_count?: number
}

function ProtectorAppInner({ isGooglePlacesLoaded }: { isGooglePlacesLoaded: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Check if we should use mock database
  const shouldUseMockDatabase = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    return url.includes('localhost') || url.includes('mock')
  }

  const [activeTab, setActiveTab] = useState("protector")
  const [userRole, setUserRole] = useState("client") // "client", "agent", "admin"
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  
  // Chat state - Enhanced unified chat
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newChatMessage, setNewChatMessage] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isLoadingChatMessages, setIsLoadingChatMessages] = useState(false)
  const [isCreatingBookingChat, setIsCreatingBookingChat] = useState(false)
  const [currentBooking, setCurrentBooking] = useState<any>(null)
  const [selectedChatBooking, setSelectedChatBooking] = useState<any>(null)
  const [chatSubscription, setChatSubscription] = useState<any>(null)
  const [showChatInvoice, setShowChatInvoice] = useState(false)
  const [chatInvoiceData, setChatInvoiceData] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isCreatingBooking, setIsCreatingBooking] = useState(false)
  const [selectedService, setSelectedService] = useState("")
  const [vehicleBookingFocus, setVehicleBookingFocus] = useState<"standard" | "bulletproof">("standard")
  const [protectorArmed, setProtectorArmed] = useState(true)
  const [unarmedNeedsCar, setUnarmedNeedsCar] = useState(true)
  const [bookingStep, setBookingStep] = useState(1)
  const [pickupLocation, setPickupLocation] = useState("")
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [detectedPickupCoordinates, setDetectedPickupCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [pickupDate, setPickupDate] = useState(() => {
    const today = new Date()
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`
  })
  const [pickupTime, setPickupTime] = useState("11:45am")
  const [duration, setDuration] = useState("1 day")
  const [selectedDressCode, setSelectedDressCode] = useState("tactical-casual")
  const [vehicleCount, setVehicleCount] = useState(1)
  const [protecteeCount, setProtecteeCount] = useState(1)
  const [protectorCount, setProtectorCount] = useState(1)
  const [passengerCount, setPassengerCount] = useState(1)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [showDurationPicker, setShowDurationPicker] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [selectedHour, setSelectedHour] = useState(11)
  
  // Sync calendar with pickup date when calendar opens or pickup date changes
  useEffect(() => {
    if (showCalendar) {
      // Try to parse pickup date first
      try {
        const pickupDateObj = new Date(pickupDate)
        if (!isNaN(pickupDateObj.getTime())) {
          setCalendarMonth(pickupDateObj.getMonth())
          setCalendarYear(pickupDateObj.getFullYear())
        } else {
          // If pickup date is invalid, fall back to current month/year
          const today = new Date()
          setCalendarMonth(today.getMonth())
          setCalendarYear(today.getFullYear())
        }
      } catch (error) {
        // If parsing fails, fall back to current month/year
        console.warn('Failed to parse pickupDate for calendar sync:', pickupDate)
        const today = new Date()
        setCalendarMonth(today.getMonth())
        setCalendarYear(today.getFullYear())
      }
    }
  }, [showCalendar, pickupDate])
  const [selectedMinute, setSelectedMinute] = useState(45)
  const [selectedPeriod, setSelectedPeriod] = useState("AM")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [showKeypad, setShowKeypad] = useState(false)
  const [selectedVehicles, setSelectedVehicles] = useState<{ [key: string]: number }>({})
  const [customDuration, setCustomDuration] = useState("")
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("")
  const [protectorListings, setProtectorListings] = useState<ProtectorListing[]>([])
  const [isLoadingProtectorListings, setIsLoadingProtectorListings] = useState(false)
  const [selectedProtectorListingId, setSelectedProtectorListingId] = useState<string | null>(null)
  const [selectedProtectorListing, setSelectedProtectorListing] = useState<ProtectorListing | null>(null)
  const [assignProtectorAutomatically, setAssignProtectorAutomatically] = useState(true)
  const [destinationLocation, setDestinationLocation] = useState("")
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([])
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false)
  const [detectedDestinationCoordinates, setDetectedDestinationCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [multipleDestinations, setMultipleDestinations] = useState<string[]>([])
  const [currentDestinationInput, setCurrentDestinationInput] = useState("")
  const [currentDestinationSuggestions, setCurrentDestinationSuggestions] = useState<string[]>([])
  const [showCurrentDestinationSuggestions, setShowCurrentDestinationSuggestions] = useState(false)
  const [customDurationUnit, setCustomDurationUnit] = useState("days")

  const [showLoginForm, setShowLoginForm] = useState(true)
  const [isLogin, setIsLogin] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authStep, setAuthStep] = useState("login") // "login", "register", "credentials", "email-verification", "profile-completion", "profile", "forgot-password"
  const authStepRef = useRef(authStep)
  const [user, setUser] = useState<any>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [authSuccess, setAuthSuccess] = useState("")
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [emailVerificationSent, setEmailVerificationSent] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState("")
  const verificationCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    authStepRef.current = authStep
  }, [authStep])

  useEffect(() => {
    const formatTime = () =>
      new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })

    setHeroTimeLabel(formatTime())
    const timerId = window.setInterval(() => {
      setHeroTimeLabel(formatTime())
    }, 30000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (pickupSuggestionTimeoutRef.current) clearTimeout(pickupSuggestionTimeoutRef.current)
      if (destinationSuggestionTimeoutRef.current) clearTimeout(destinationSuggestionTimeoutRef.current)
      if (extraStopSuggestionTimeoutRef.current) clearTimeout(extraStopSuggestionTimeoutRef.current)
    }
  }, [])

  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    firstName: "",
    lastName: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    bvnNumber: "",
  })

  const [userProfile, setUserProfile] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    avatarUrl: "",
  })

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [editProfileForm, setEditProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
  })

  const [isDataLoaded, setIsDataLoaded] = useState(true)

  const [selectedVehicle, setSelectedVehicle] = useState("")
  const [showChatThread, setShowChatThread] = useState(false)
  const [bookingPayload, setBookingPayload] = useState<any>(null)
  const [requestStatus, setRequestStatus] = useState("Pending Deployment")

  // Operator Dashboard State
  const [operatorBookings, setOperatorBookings] = useState([
    {
      id: "OP001",
      clientName: "John Smith",
      clientEmail: "john@example.com",
      clientPhone: "+234-800-000-0001",
      service: "Armed Protection Service",
      pickup: "123 Main St, Downtown",
      destination: "456 Oak Ave, Uptown",
      date: "2025-02-22",
      time: "2:30 PM",
      duration: "24 hours",
      status: "pending",
      pricing: "To be provided by operator",
      submittedAt: "2025-10-09 00:53:09"
    },
    {
      id: "OP002", 
      clientName: "Sarah Johnson",
      clientEmail: "sarah@example.com",
      clientPhone: "+234-800-000-0002",
      service: "Unarmed Protection Service",
      pickup: "789 Business District",
      destination: "321 Residential Area",
      date: "2025-02-23",
      time: "9:00 AM",
      duration: "8 hours",
      status: "accepted",
      pricing: "₦150,000",
      submittedAt: "2025-10-09 01:15:30"
    }
  ])

  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({
    basePrice: 100000,
    hourlyRate: 25000,
    vehicleFee: 100000,
    personnelFee: 40000,
    duration: 24,
    currency: "NGN" // "NGN" or "USD"
  })
  const [operatorChatMessage, setOperatorChatMessage] = useState("")

  const [activeBookings, setActiveBookings] = useState<BookingDisplay[]>([])
  const [bookingHistory, setBookingHistory] = useState<BookingDisplay[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)
  const [selectedTrackingBookingId, setSelectedTrackingBookingId] = useState<string | null>(null)
  // Location tracking state - maps booking_id to current location
  const [bookingLocations, setBookingLocations] = useState<Map<string, { lat: number; lng: number }>>(new Map())
  const [locationSubscriptions, setLocationSubscriptions] = useState<Map<string, any>>(new Map())
  // Location history - maps booking_id to array of location points with timestamps
  const [locationHistory, setLocationHistory] = useState<Map<string, { lat: number; lng: number; timestamp: number; speed?: number }[]>>(new Map())
  // Current speeds - maps booking_id to current speed in km/h
  const [bookingSpeeds, setBookingSpeeds] = useState<Map<string, number>>(new Map())
  const bookingsRequestInFlightRef = useRef(false)
  const latestBookingsRequestRef = useRef(0)
  const notifiedChatMessageIdsRef = useRef<Set<string>>(new Set())
  const pickupSuggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const destinationSuggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const extraStopSuggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const foregroundCityWatchRef = useRef<number | null>(null)
  const lastForegroundCityCheckRef = useRef(0)
  const cityEntryInFlightRef = useRef(false)
  const latestPickupQueryRef = useRef("")
  const latestDestinationQueryRef = useRef("")
  const latestExtraStopQueryRef = useRef("")
  const getInitialSessionInProgressRef = useRef(false)
  const loadUserProfileInProgressRef = useRef<string | null>(null)

  const [showCustomDurationInput, setShowCustomDurationInput] = useState(false)

  const [userLocation, setUserLocation] = useState("Lagos")
  const [heroTimeLabel, setHeroTimeLabel] = useState("")
  
  // Contact and Cancel booking states
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactBooking, setContactBooking] = useState<any>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState<any>(null)

  // Handle contact options
  const handleContact = (booking: any) => {
    setContactBooking(booking)
    setShowContactModal(true)
  }

  const buildDefaultBookViaMailMessage = (booking?: any) => {
    const profileName = `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
    const fallbackName = `${user?.user_metadata?.first_name || user?.user_metadata?.firstName || ""} ${user?.user_metadata?.last_name || user?.user_metadata?.lastName || ""}`.trim()
    const fullName = profileName || fallbackName || ""
    const email = userProfile.email || user?.email || ""

    return [
      "Hello Protector Team,",
      "",
      "I want to book protection service.",
      "",
      `Name: ${fullName}`,
      `Email: ${email}`,
      "Phone: ",
      "Service: ",
      "Pickup: ",
      "Destination: ",
      "Preferred Date: ",
      "Preferred Time: ",
      "Booking Reference: ",
      "Referral Code: ",
      "Referral Discount: 30% (applies with valid referral code)",
      "",
      "Please contact me to confirm pricing and deployment details.",
      "",
      "Thank you."
    ].join("\n")
  }

  const openBookViaMailClient = (booking?: any) => {
    const bookingReference = booking?.booking_code || booking?.id
    const subject = bookingReference
      ? `Book Protection Request (${bookingReference})`
      : "Book Protection Request"
    const recipients = "info@protector.ng,operator@gmail.com"
    const body = buildDefaultBookViaMailMessage(booking)
    const mailtoUrl = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    if (typeof window !== "undefined") {
      window.location.href = mailtoUrl
    }
  }

  // Handle cancel booking
  const handleCancelBooking = (booking: any) => {
    setBookingToCancel(booking)
    setShowCancelModal(true)
  }

  // Process booking cancellation
  const processBookingCancellation = async () => {
    if (!bookingToCancel || !user) return

    try {
      // Check if payment was made (you can add payment status check here)
      const hasPayment = bookingToCancel.total_price > 0 // Simple check, you can enhance this
      
      if (hasPayment) {
        // Show refund warning
        const confirmRefund = window.confirm(
          `⚠️ Payment Refund Notice\n\n` +
          `You have made a payment of ₦${bookingToCancel.total_price?.toLocaleString()} for this booking.\n\n` +
          `If you cancel now, 20% of the total amount (₦${Math.round(bookingToCancel.total_price * 0.2).toLocaleString()}) will be deducted as a cancellation fee.\n\n` +
          `The remaining amount will be refunded to your account within 3-5 business days.\n\n` +
          `Do you want to proceed with the cancellation?`
        )
        
        if (!confirmRefund) {
          setShowCancelModal(false)
          setBookingToCancel(null)
          return
        }
      }

      // Update booking status to cancelled
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingToCancel.id)

      if (error) {
        throw error
      }

      // Reload bookings to reflect the change
      await loadBookings()
      
      // Show success message
      alert(hasPayment 
        ? `✅ Booking cancelled successfully!\n\nYour refund will be processed within 3-5 business days.\nDeduction: ₦${Math.round(bookingToCancel.total_price * 0.2).toLocaleString()}\nRefund: ₦${Math.round(bookingToCancel.total_price * 0.8).toLocaleString()}`
        : `✅ Booking cancelled successfully!`
      )

      setShowCancelModal(false)
      setBookingToCancel(null)
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('❌ Failed to cancel booking. Please try again or contact support.')
    }
  }

  // Load bookings function with proper validation (cache-first for fast display)
  const loadBookings = async () => {
    const currentUserId = user?.id
    if (!currentUserId) {
      setIsLoadingBookings(false)
      return
    }

    if (bookingsRequestInFlightRef.current) {
      console.log('⏳ [Bookings] Request already in flight, skipping duplicate trigger')
      return
    }

    const requestId = ++latestBookingsRequestRef.current
    bookingsRequestInFlightRef.current = true

    const dataSync = await import('@/lib/utils/data-sync')
    const cachedActive = dataSync.getFromCache<any[]>('bookings_active', currentUserId)
    const cachedHistory = dataSync.getFromCache<any[]>('bookings_history', currentUserId)
    if (cachedActive && cachedActive.length > 0) {
      setActiveBookings((prev) =>
        mergePendingWithActive(currentUserId, transformBookings(cachedActive), prev),
      )
      setIsLoadingBookings(false)
    } else if (cachedHistory && cachedHistory.length > 0) {
      setBookingHistory(transformBookings(cachedHistory))
    } else {
      const pendingOnly = mergePendingWithActive<BookingDisplay>(currentUserId, [], [])
      if (pendingOnly.length > 0) {
        setActiveBookings(pendingOnly)
      }
      setIsLoadingBookings(true)
    }

    try {
      console.log('📥 Loading bookings for user:', currentUserId)
      const BOOKING_LOAD_TIMEOUT_MS = 12000

      const bookingsPromise = dataSync.loadBookingsWithValidation(currentUserId)
      const timeoutPromise = new Promise<{ active: any[]; history: any[]; error: string | null }>((resolve) => {
        setTimeout(() => {
          const cachedActive = dataSync.getFromCache<any[]>('bookings_active', currentUserId) || []
          const cachedHistory = dataSync.getFromCache<any[]>('bookings_history', currentUserId) || []
          resolve({
            active: cachedActive,
            history: cachedHistory,
            error: 'Booking load slow; showing cached data when available.',
          })
        }, BOOKING_LOAD_TIMEOUT_MS)
      })

      const { active, history, error } = await Promise.race([bookingsPromise, timeoutPromise])

      if (requestId !== latestBookingsRequestRef.current) {
        console.log('⏭️ [Bookings] Ignoring stale booking response')
        return
      }
      
      if (error) {
        console.warn('⚠️ Booking load warning:', error)
        // Show user-friendly error if it's a real error (not just cache fallback)
        if (!error.includes('cached data')) {
          setAuthError(`Unable to load bookings: ${error}. Please check your connection.`)
        }
      }

      const transformedActive = transformBookings(active)
      const transformedHistory = transformBookings(history)
      
      console.log('✅ Bookings loaded:', { active: transformedActive.length, history: transformedHistory.length })
      
      setActiveBookings((prev) =>
        mergePendingWithActive(currentUserId, transformedActive, prev),
      )
      setBookingHistory(transformedHistory)
      
      // Clear any previous errors if we succeeded
      if (!error || error.includes('cached data')) {
        setAuthError('')
      }
    } catch (error) {
      console.error('❌ Critical error loading bookings:', error)
      setAuthError('Failed to load bookings. Please refresh the page or contact support if the issue persists.')
      setActiveBookings((prev) => mergePendingWithActive(currentUserId, [], prev))
    } finally {
      bookingsRequestInFlightRef.current = false
      if (requestId === latestBookingsRequestRef.current) {
        setIsLoadingBookings(false)
      }
    }
  }

  // Transform bookings data
  const transformBookings = (bookings: any[]): BookingDisplay[] => {
    return bookings.map(booking => {
      let specialInstructions = booking.special_instructions
      if (typeof specialInstructions === 'string') {
        try {
          specialInstructions = JSON.parse(specialInstructions)
        } catch {
          // keep raw string
        }
      }

      const quick = getQuickServiceFromBooking({
        id: booking.id,
        booking_code: booking.booking_code,
        pickup_address: booking.pickup_address,
        destination_address: booking.destination_address,
        special_instructions: specialInstructions,
      })
      const resolvedSpecial = specialInstructions || quick || undefined
      const displayType = quick
        ? quick.quick_service_type === "itinerary_planning"
          ? "itinerary_planning"
          : "home_security"
        : formatServiceType(booking.service_type)

      return {
      id: booking.id,
      booking_code: booking.booking_code,
      type: displayType,
      protectorName: resolveBookingDisplayName({ ...booking, special_instructions: resolvedSpecial }),
      vehicleType: resolveVehicleDisplayName(booking) || "Vehicle pending assignment",
      status: formatStatus(booking.status),
      estimatedArrival: resolveBookingEtaLabel(
        booking.status,
        booking.scheduled_time,
        formatTime,
      ),
      pickupLocation: booking.pickup_address || 'Not specified',
      destination: booking.destination_address || 'Not specified',
      startTime: formatTime(booking.scheduled_time),
      protectorImage: resolveBookingAvatarImage(booking),
      dressCode: booking.dress_code,
      special_instructions: resolvedSpecial,
      currentLocation: booking.pickup_coordinates ? {
        lat: booking.pickup_coordinates.lat || booking.pickup_coordinates.x,
        lng: booking.pickup_coordinates.lng || booking.pickup_coordinates.y
      } : undefined,
      cost: `₦${booking.total_price?.toLocaleString() || '0'}`,
      date: formatDate(booking.scheduled_date),
      duration: `${booking.duration_hours || 0}h`,
      rating: booking.assigned_agent?.rating || 5,
      // Include raw data for modals
      service_type: quick?.quick_service_type || booking.service_type,
      booking_mode: booking.booking_mode,
      protector_count: booking.protector_count,
      scheduled_date: booking.scheduled_date,
      scheduled_time: booking.scheduled_time,
      total_price: booking.total_price
    }
    })
  }

  // Helper functions
  const formatServiceType = (serviceType: string): string => {
    if (!serviceType) return 'Unknown Service'
    
    const serviceMap: { [key: string]: string } = {
      'armed-protection': 'Armed Protection',
      'car-only': 'Car Only',
      'armed_protection': 'Armed Protection',
      'armored_vehicle': 'Car Only',
      'car_only': 'Car Only'
    }
    
    return serviceMap[serviceType] || serviceType.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pending',
      'accepted': 'Accepted',
      'en_route': 'En Route',
      'arrived': 'Arrived',
      'in_service': 'In Service',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    }
    return statusMap[status] || 'Unknown'
  }

  const normalizeBookingStatus = (status?: string): string => {
    return (status || "").toLowerCase().trim().replace(/[\s-]+/g, "_")
  }

  const rememberNotifiedMessageIds = (messages: any[] = []) => {
    if (!Array.isArray(messages) || messages.length === 0) return

    messages.forEach((message) => {
      if (message?.id) {
        notifiedChatMessageIdsRef.current.add(String(message.id))
      }
    })

    if (notifiedChatMessageIdsRef.current.size > 1200) {
      const latestMessageIds = Array.from(notifiedChatMessageIdsRef.current).slice(-600)
      notifiedChatMessageIdsRef.current = new Set(latestMessageIds)
    }
  }

  const truncateNotificationText = (value: string, maxLength = 120) => {
    if (value.length <= maxLength) return value
    return `${value.slice(0, maxLength - 3)}...`
  }

  const notifyIncomingChatMessage = (message: any, booking: any) => {
    if (!message?.id) return

    const messageId = String(message.id)
    if (notifiedChatMessageIdsRef.current.has(messageId)) return
    notifiedChatMessageIdsRef.current.add(messageId)

    const senderId = message?.sender_id ? String(message.sender_id) : ""
    const isOwnMessage = !!user?.id && senderId === String(user.id)
    if (isOwnMessage) return

    const bookingLabel =
      booking?.booking_code ||
      booking?.id ||
      selectedChatBooking?.booking_code ||
      selectedChatBooking?.id ||
      "Booking"
    const messageBody = truncateNotificationText(
      String(message?.message || message?.content || "You have a new chat update."),
    )

    notifyRealtimeEvent({
      title: `New message (${bookingLabel})`,
      description: messageBody,
      tag: `app-message-${messageId}`,
    })
  }

  // Convert PostgreSQL POINT format to lat/lng
  // Supabase returns POINT as { x: longitude, y: latitude }
  const parsePostgresPoint = (point: any): { lat: number; lng: number } | null => {
    if (!point) return null
    
    try {
      // Handle different point formats
      if (typeof point === 'string') {
        // PostgreSQL POINT format: "POINT(lng lat)" or "(lng,lat)"
        const match = point.match(/\(([^,]+)[,\s]+([^)]+)\)/)
        if (match) {
          const lng = parseFloat(match[1].trim())
          const lat = parseFloat(match[2].trim())
          if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng }
          }
        }
      } else if (point && typeof point === 'object') {
        // Supabase typically returns POINT as { x: longitude, y: latitude }
        if (point.x !== undefined && point.y !== undefined) {
          const lng = typeof point.x === 'number' ? point.x : parseFloat(point.x)
          const lat = typeof point.y === 'number' ? point.y : parseFloat(point.y)
          if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng }
          }
        } else if (point.lat !== undefined && point.lng !== undefined) {
          // Already in lat/lng format
          const lat = typeof point.lat === 'number' ? point.lat : parseFloat(point.lat)
          const lng = typeof point.lng === 'number' ? point.lng : parseFloat(point.lng)
          if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error parsing location point:', error, point)
    }
    
    return null
  }

  // Subscribe to location updates for a booking
  const subscribeToLocationUpdates = (bookingId: string, databaseId?: string) => {
    // Clean up existing subscription if any
    setLocationSubscriptions(prev => {
      const existingSub = prev.get(bookingId)
      if (existingSub) {
        supabase.removeChannel(existingSub)
        const newMap = new Map(prev)
        newMap.delete(bookingId)
        return newMap
      }
      return prev
    })

    // Use database ID if available, otherwise use booking ID
    const trackingId = databaseId || bookingId

    console.log('📍 Setting up location tracking subscription for booking:', bookingId, 'database ID:', trackingId)

    const channel = supabase
      .channel(`location:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_tracking',
          filter: `booking_id=eq.${trackingId}`
        },
        (payload) => {
          console.log('📍 Location update received:', payload.new)
          const locationData = payload.new as any
          
          // Parse the location from PostgreSQL POINT format
          const location = parsePostgresPoint(locationData.location)
          if (location) {
            const timestamp = Date.now()
            const speed = locationData.speed ? Math.round(locationData.speed) : undefined
            
            // Update current location
            setBookingLocations(prev => {
              const newMap = new Map(prev)
              newMap.set(bookingId, location)
              return newMap
            })
            
            // Update speed
            if (speed !== undefined) {
              setBookingSpeeds(prev => {
                const newMap = new Map(prev)
                newMap.set(bookingId, speed)
                return newMap
              })
            }
            
            // Add to location history
            setLocationHistory(prev => {
              const newMap = new Map(prev)
              const history = newMap.get(bookingId) || []
              history.push({ lat: location.lat, lng: location.lng, timestamp, speed })
              // Keep only last 100 points to avoid memory issues
              if (history.length > 100) {
                history.shift()
              }
              newMap.set(bookingId, history)
              return newMap
            })

            // Also update the booking's currentLocation in activeBookings
            setActiveBookings(prev => prev.map(booking => {
              if (booking.id === bookingId || booking.booking_code === bookingId) {
                return { ...booking, currentLocation: location }
              }
              return booking
            }))
          }
        }
      )
      .subscribe((status) => {
        console.log(`📍 Location subscription status for ${bookingId}:`, status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Location tracking active for booking:', bookingId)
        }
      })

    // Store subscription
    setLocationSubscriptions(prev => {
      const newMap = new Map(prev)
      newMap.set(bookingId, channel)
      return newMap
    })

    return channel
  }

  // Load initial location data for active bookings
  const loadInitialLocations = async (bookings: BookingDisplay[]) => {
    if (!user?.id) return

    for (const booking of bookings) {
      try {
        // Get the database ID for the booking
        const bookingId = booking.id || booking.booking_code
        if (!bookingId) continue

        // Try to get latest location from API
        const { RealtimeAPI } = await import('@/lib/api/realtime')
        const result = await RealtimeAPI.getBookingLocationTracking(bookingId)
        
        if (result.data && result.data.length > 0) {
          // Get all locations and build history
          const locations = result.data.reverse() // Oldest first
          const history: { lat: number; lng: number; timestamp: number; speed?: number }[] = []
          
          locations.forEach((loc: any) => {
            const location = parsePostgresPoint(loc.location)
            if (location) {
              const timestamp = new Date(loc.timestamp).getTime()
              const speed = loc.speed ? Math.round(loc.speed) : undefined
              history.push({ lat: location.lat, lng: location.lng, timestamp, speed })
            }
          })
          
          if (history.length > 0) {
            // Get the most recent location
            const latestLocation = history[history.length - 1]
            
            setBookingLocations(prev => {
              const newMap = new Map(prev)
              newMap.set(bookingId, { lat: latestLocation.lat, lng: latestLocation.lng })
              return newMap
            })
            
            // Set speed if available
            if (latestLocation.speed !== undefined) {
              setBookingSpeeds(prev => {
                const newMap = new Map(prev)
                newMap.set(bookingId, latestLocation.speed!)
                return newMap
              })
            }
            
            // Set location history
            setLocationHistory(prev => {
              const newMap = new Map(prev)
              // Keep only last 100 points
              const limitedHistory = history.slice(-100)
              newMap.set(bookingId, limitedHistory)
              return newMap
            })

            // Update booking's currentLocation
            setActiveBookings(prev => prev.map(b => {
              if (b.id === bookingId || b.booking_code === bookingId) {
                return { ...b, currentLocation: { lat: latestLocation.lat, lng: latestLocation.lng } }
              }
              return b
            }))
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to load initial location for booking:', booking.id, error)
      }
    }
  }

  // Calculate map positions for visualization
  // This is a simplified version that shows relative positions
  // In a production app, you'd use a real map library (Google Maps, Mapbox, etc.)
  const calculateMapPosition = (
    coord: { lat: number; lng: number } | undefined,
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  ): { x: number; y: number } | null => {
    if (!coord) return null

    // Normalize coordinates to 0-1 range
    const normalizedX = (coord.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)
    const normalizedY = 1 - (coord.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat) // Invert Y axis

    // Convert to percentage (with padding)
    const padding = 0.15 // 15% padding on all sides
    const x = padding * 100 + normalizedX * (1 - 2 * padding) * 100
    const y = padding * 100 + normalizedY * (1 - 2 * padding) * 100

    return { x, y }
  }

  // Get map bounds from booking locations
  const getMapBounds = async (booking: BookingDisplay): Promise<{ minLat: number; maxLat: number; minLng: number; maxLng: number }> => {
    const locations: { lat: number; lng: number }[] = []
    
    // Add current location if available
    const bookingId = booking.id || booking.booking_code
    const currentLocation = bookingLocations.get(bookingId) || booking.currentLocation
    if (currentLocation) {
      locations.push(currentLocation)
    }
    
    // Try to geocode pickup and destination addresses if coordinates not available
    const { GeocodingService } = await import('@/lib/services/geocoding')
    
    if (!currentLocation && booking.pickupLocation && booking.pickupLocation !== 'TBD') {
      const pickupCoords = await GeocodingService.geocode(booking.pickupLocation)
      if (pickupCoords) {
        locations.push({ lat: pickupCoords.lat, lng: pickupCoords.lng })
      }
    }
    
    if (booking.destination && booking.destination !== 'TBD') {
      const destCoords = await GeocodingService.geocode(booking.destination)
      if (destCoords) {
        locations.push({ lat: destCoords.lat, lng: destCoords.lng })
      }
    }
    
    // Default bounds (Lagos area) if no coordinates
    const defaultBounds = {
      minLat: 6.4,
      maxLat: 6.6,
      minLng: 3.3,
      maxLng: 3.5
    }

    if (locations.length === 0) {
      return defaultBounds
    }

    // Calculate bounds from available locations
    const lats = locations.map(l => l.lat)
    const lngs = locations.map(l => l.lng)
    
    const padding = 0.01 // Add padding around points
    return {
      minLat: Math.min(...lats) - padding,
      maxLat: Math.max(...lats) + padding,
      minLng: Math.min(...lngs) - padding,
      maxLng: Math.max(...lngs) + padding
    }
  }

  // Render live tracking map component (wrapper function)
  const renderLiveTrackingMap = (booking: BookingDisplay, variant: MapShellVariant = "embedded") => {
    const bookingId = booking.id || booking.booking_code
    const history = locationHistory.get(bookingId || '') || []
    const currentSpeed = bookingSpeeds.get(bookingId || '')
    
    return (
      <LiveTrackingMapComponent 
        booking={booking} 
        bookingLocationsMap={bookingLocations}
        locationHistory={history}
        currentSpeed={currentSpeed}
        variant={variant}
      />
    )
  }

  const getBookingTrackingId = (booking: BookingDisplay): string => {
    return booking.id || booking.booking_code || ""
  }

  useEffect(() => {
    if (activeTab !== "bookings" || activeBookings.length === 0 || selectedTrackingBookingId) return
    const firstTrackingId = getBookingTrackingId(activeBookings[0])
    if (firstTrackingId) {
      setSelectedTrackingBookingId(firstTrackingId)
    }
  }, [activeTab, activeBookings, selectedTrackingBookingId])

  useEffect(() => {
    if (activeBookings.length === 0) {
      if (selectedTrackingBookingId !== null) {
        setSelectedTrackingBookingId(null)
      }
      return
    }

    if (!selectedTrackingBookingId) return

    const hasSelectedBooking = activeBookings.some(
      (booking) => getBookingTrackingId(booking) === selectedTrackingBookingId,
    )

    if (!hasSelectedBooking) {
      setSelectedTrackingBookingId(null)
    }
  }, [activeBookings, selectedTrackingBookingId])

  const calculateETA = (status: string, scheduledTime?: string) =>
    resolveBookingEtaLabel(status, scheduledTime, formatTime)

  const formatTime = (timeString: string): string => {
    try {
      const [hours, minutes] = timeString.split(':')
      const hour = parseInt(hours)
      const minute = parseInt(minutes)
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
    } catch {
      return timeString
    }
  }

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  // Load user and bookings on component mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)
        
        // If no user is logged in, show login form
        if (!currentUser) {
          setShowLoginForm(true)
          setIsLoggedIn(false)
        } else {
          setShowLoginForm(false)
          setIsLoggedIn(true)
        }
      } catch (error) {
        console.error('Error loading user:', error)
        setShowLoginForm(true)
        setIsLoggedIn(false)
      }
    }
    
    loadUser()
  }, [])

  // Load bookings and profile when user is available
  useEffect(() => {
    if (user?.id) {
      console.log('👤 User authenticated, loading bookings and profile...')
      setActiveBookings((prev) => mergePendingWithActive(user.id, [], prev))
      loadBookings()
      loadUserProfile(user.id, user)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    const setupNotifications = async () => {
      try {
        const permission = await requestNotificationPermissionIfNeeded()
        if (cancelled || permission !== "granted") return

        const registrationResult = await registerPushSubscription()
        if (!registrationResult.ok) {
          console.warn(
            "Push subscription setup skipped:",
            "reason" in registrationResult ? registrationResult.reason : "unknown_reason",
          )
        }
      } catch (error) {
        console.warn("Unable to setup notification permission/subscription:", error)
      }
    }

    void setupNotifications()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return

    const handlePosition = (position: GeolocationPosition) => {
      const latitude = Number(position?.coords?.latitude)
      const longitude = Number(position?.coords?.longitude)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return

      void maybeNotifyCityEntry({
        latitude,
        longitude,
        source: "foreground-geolocation-watch",
      })
    }

    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      (error) => {
        console.warn("Foreground city watcher geolocation error:", error?.message || error)
      },
      {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 180000,
      },
    )

    foregroundCityWatchRef.current = watchId

    return () => {
      if (foregroundCityWatchRef.current !== null) {
        navigator.geolocation.clearWatch(foregroundCityWatchRef.current)
        foregroundCityWatchRef.current = null
      }
    }
  }, [user?.id])
  
  // Refresh bookings when switching to bookings tab
  useEffect(() => {
    if (activeTab === 'bookings' && user?.id) {
      console.log('📑 Bookings tab opened, refreshing...')
      loadBookings()
    }
  }, [activeTab, user?.id])

  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`client-booking-status-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `client_id=eq.${user.id}`,
        },
        (payload: any) => {
          const previousStatus = normalizeBookingStatus(payload?.old?.status)
          const nextStatus = normalizeBookingStatus(payload?.new?.status)

          if (!nextStatus || previousStatus === nextStatus) return

          const bookingDatabaseId = payload?.new?.id
          const bookingCode = payload?.new?.booking_code
          const bookingLabel = bookingCode || bookingDatabaseId || "Booking"

          notifyRealtimeEvent({
            title: `Booking status updated (${bookingLabel})`,
            description: `New status: ${formatStatus(nextStatus)}`,
            tag: `booking-status-${bookingDatabaseId || bookingCode || nextStatus}`,
          })

          setSelectedChatBooking((prev: any) => {
            if (!prev) return prev
            const matchesBooking =
              prev.id === bookingDatabaseId ||
              prev.id === bookingCode ||
              prev.booking_code === bookingCode ||
              prev.booking_code === bookingDatabaseId

            if (!matchesBooking) return prev
            return { ...prev, status: nextStatus }
          })

          setActiveBookings((prev) =>
            prev.map((booking) => {
              const matchesBooking =
                booking.id === bookingDatabaseId ||
                booking.id === bookingCode ||
                booking.booking_code === bookingCode ||
                booking.booking_code === bookingDatabaseId

              if (!matchesBooking) return booking

              return {
                ...booking,
                status: formatStatus(nextStatus),
                estimatedArrival: calculateETA(nextStatus),
              }
            }),
          )

          setBookingHistory((prev) =>
            prev.map((booking) => {
              const matchesBooking =
                booking.id === bookingDatabaseId ||
                booking.id === bookingCode ||
                booking.booking_code === bookingCode ||
                booking.booking_code === bookingDatabaseId

              if (!matchesBooking) return booking

              return {
                ...booking,
                status: formatStatus(nextStatus),
                estimatedArrival: calculateETA(nextStatus),
              }
            }),
          )

          loadBookings()
        },
      )
      .subscribe((status) => {
        console.log("Client booking status subscription:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Set up location tracking subscriptions for active bookings
  useEffect(() => {
    const subscriptions = new Map<string, any>()

    if (!user?.id || activeBookings.length === 0) {
      // Clean up existing subscriptions if no active bookings
      setLocationSubscriptions(prev => {
        prev.forEach((channel, bookingId) => {
          console.log('🧹 Cleaning up location subscription for:', bookingId)
          supabase.removeChannel(channel)
        })
        return new Map()
      })
      return
    }

    console.log('📍 Setting up location tracking for', activeBookings.length, 'active bookings')

    // Load initial locations and set up subscriptions
    loadInitialLocations(activeBookings).then(() => {
      // Set up real-time subscriptions for each active booking
      activeBookings.forEach(booking => {
        const bookingId = booking.id || booking.booking_code
        const normalizedStatus = normalizeBookingStatus(booking.status)
        if (bookingId && normalizedStatus !== 'completed' && normalizedStatus !== 'cancelled') {
          // Only track bookings that are in progress
          if (['accepted', 'en_route', 'arrived', 'in_service'].includes(normalizedStatus)) {
            const channel = subscribeToLocationUpdates(bookingId, booking.id)
            if (channel) {
              subscriptions.set(bookingId, channel)
            }
          }
        }
      })
    })

    // Cleanup function
    return () => {
      setLocationSubscriptions(prev => {
        prev.forEach((channel, bookingId) => {
          console.log('🧹 Cleaning up location subscription for:', bookingId)
          supabase.removeChannel(channel)
        })
        return new Map()
      })
    }
  }, [activeBookings, user?.id])

  // Refresh history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history' && user?.id) {
      console.log('📚 History tab opened, refreshing...')
      loadBookings() // Same function loads both active bookings and history
    }
  }, [activeTab, user?.id])

  // Check for tab parameter in URL and switch tab reactively
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const tab = searchParams.get('tab')
    if (tab === 'account') {
      console.log('📱 Switching to Account tab from URL parameter')
      // Quickly check if user is authenticated before switching tabs to prevent login flash
      const checkAuthBeforeTabSwitch = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user?.email_confirmed_at) {
            // User is authenticated, hide login form and switch tab
            setUser(session.user)
            setIsLoggedIn(true)
            setShowLoginForm(false)
            setIsCheckingAuth(false)
            setActiveTab('account')
          } else {
            // User not authenticated, but still switch tab (will show login)
            setActiveTab('account')
          }
        } catch (error) {
          console.error('Error checking auth:', error)
          setActiveTab('account')
        }
      }
      checkAuthBeforeTabSwitch()
      // Clear the tab parameter from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('tab')
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''))
    }
  }, [searchParams, supabase])

  // Refresh profile when switching to account tab and prefetch account sub-pages
  useEffect(() => {
    if (activeTab === 'account' && user?.id && !isEditingProfile) {
      console.log('👤 Account tab opened, refreshing profile...')
      loadUserProfile(user.id, user).catch(err => {
        console.warn('Failed to refresh profile:', err)
      })
      
      // Prefetch all account sub-pages for instant navigation
      console.log('⚡ Prefetching account sub-pages...')
      router.prefetch('/account/help')
      router.prefetch('/account/support')
      router.prefetch('/account/privacy-policy')
      router.prefetch('/account/terms')
    }
  }, [activeTab, user?.id, isEditingProfile, router])

  // Load chat messages when switching to chat tab
  useEffect(() => {
    if (activeTab === 'chat' && user?.id) {
      if (isCreatingBookingChat) {
        console.log('⏳ Skipping default chat load while opening new booking chat')
        return
      }
      console.log('💬 Chat tab opened, loading messages...')
      loadChatMessages()
    }
  }, [activeTab, user?.id, isCreatingBookingChat])

  // Load chat messages from database (WhatsApp-style persistence)
  const loadChatMessages = async () => {
    try {
      console.log('📥 Loading chat messages from database...')
      
      // If we already have a selected booking, load its messages
      if (selectedChatBooking) {
        console.log('📋 Loading messages for selected booking:', selectedChatBooking.id)
        await loadMessagesForBooking(selectedChatBooking)
        return
      }
      
      // If no selected booking, try to load the most recent one
      if (activeBookings && activeBookings.length > 0) {
        console.log('📋 No selected booking, loading most recent...')
        const mostRecentBooking = activeBookings[0]
        await loadMessagesForBooking(mostRecentBooking)
      } else {
        console.log('⚠️ No bookings available to load messages from')
        // As fallback, try localStorage
        if (typeof window !== 'undefined') {
          const storedMessages = localStorage.getItem('chat_messages')
          if (storedMessages) {
            const messages = JSON.parse(storedMessages)
            setChatMessages(messages)
            rememberNotifiedMessageIds(messages)
            console.log('📱 Loaded chat messages from localStorage:', messages.length)
          }
        }
      }
    } catch (error) {
      console.error('Error loading chat messages:', error)
    }
  }

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  // Cleanup chat subscription on unmount or when chat booking changes
  useEffect(() => {
    return () => {
      if (chatSubscription) {
        console.log('🔴 Cleaning up chat subscription')
        if (typeof chatSubscription === 'number') {
          // It's a polling interval
          clearInterval(chatSubscription)
        } else if (chatSubscription.unsubscribe) {
          // It's a Supabase channel
          supabase.removeChannel(chatSubscription)
          console.log('✅ Supabase channel removed')
        }
      }
    }
  }, [chatSubscription, supabase])

  // Load messages for selected booking (cache-first for instant chat, then refresh in background)
  const loadMessagesForBooking = async (booking: any) => {
    if (!booking) return

    if (chatSubscription) {
      if (typeof chatSubscription === 'number') {
        clearInterval(chatSubscription)
      } else if (chatSubscription.unsubscribe) {
        supabase.removeChannel(chatSubscription)
      }
      setChatSubscription(null)
    }
    setSelectedChatBooking(booking)

    let hadCache = false
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`chat_messages_${booking.id}`)
      if (cached) {
        try {
          const cachedMessages = JSON.parse(cached)
          setChatMessages(cachedMessages)
          rememberNotifiedMessageIds(cachedMessages)
          hadCache = true
          console.log('📱 Loaded', cachedMessages.length, 'messages from cache instantly')
        } catch (e) {
          console.warn('Failed to parse cached messages:', e)
        }
      }
    }
    if (!hadCache) {
      setChatMessages([])
      setIsLoadingChatMessages(true)
    }

    try {
      console.log('📥 Loading messages for booking:', booking.id)
      // Load from API in background (cache already shown if present)
      const response = await fetch(`/api/messages?bookingId=${booking.id}`)
      const data = await response.json()
      
      let loadedMessages = []
      
      // Only update messages if we have database messages, otherwise preserve existing messages
      // This prevents clearing immediate summary messages during booking creation
      if (data.success && data.data && data.data.length > 0) {
        loadedMessages = data.data
        setChatMessages(loadedMessages)
        rememberNotifiedMessageIds(loadedMessages)
        console.log('📥 Loaded', loadedMessages.length, 'messages from database')
        
        // Save to localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem(`chat_messages_${booking.id}`, JSON.stringify(loadedMessages))
          console.log('💾 Messages saved to localStorage as backup')
        }
        
        // Check for invoice data
        const invoiceMessage = loadedMessages.find(msg => msg.has_invoice && msg.invoice_data)
        if (invoiceMessage) {
          setChatInvoiceData(invoiceMessage.invoice_data)
        }
      } else {
        console.log('📥 No database messages found, preserving existing messages')
        // Don't clear existing messages - they might be the immediate summary
      }
      
      // Setup direct Supabase real-time subscription
      try {
        console.log('🔗 Setting up real-time subscription for booking:', booking.id)
        
        const channel = supabase
          .channel(`chat-messages-${booking.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `booking_id=eq.${booking.id}`
            },
            (payload) => {
              console.log('📨 Real-time: New message received!', payload.new)
              
              const newMessage = payload.new
              let messageToNotify: any | null = null
              
              setChatMessages(prev => {
                const exists = prev.some(msg => msg.id === newMessage.id)
                if (exists) {
                  console.log('⚠️ Duplicate message detected, skipping')
                  return prev
                }
                
                // Transform the message to match expected format
                const formattedMessage = {
                  ...newMessage,
                  message: newMessage.content || newMessage.message,
                  sender_type: newMessage.sender_type || 'client'
                }
                messageToNotify = formattedMessage
                
                const updated = [...prev, formattedMessage]
                console.log('✅ Added new message via real-time, total:', updated.length)
                
                // CRITICAL: Save to localStorage immediately to prevent loss
                if (typeof window !== 'undefined') {
                  localStorage.setItem(`chat_messages_${booking.id}`, JSON.stringify(updated))
                  console.log('💾 Messages backed up to localStorage')
                }
                
                return updated
              })

              if (messageToNotify) {
                notifyIncomingChatMessage(messageToNotify, booking)
              }
              
              // Check for invoice in new message
              if (newMessage.message_type === 'invoice' && newMessage.metadata) {
                setChatInvoiceData(newMessage.metadata)
              }
            }
          )
          .subscribe((status) => {
            console.log('📡 Real-time subscription status:', status)
            if (status === 'SUBSCRIBED') {
              console.log('✅ Real-time chat subscription active!')
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error('❌ Real-time subscription failed:', status)
            }
          })
        
        setChatSubscription(channel)
        console.log('✅ Real-time subscription setup successfully')
      } catch (error) {
        console.warn('⚠️ Real-time subscription failed, using polling fallback:', error)
        
        // Fallback to polling every 3 seconds
        const pollInterval = setInterval(async () => {
          try {
            const updatedMessages = await unifiedChatService.getMessages(booking.id)
            let messagesToNotify: any[] = []
            
            // CRITICAL: MERGE messages instead of replacing to prevent disappearing
            setChatMessages(prev => {
              const messageMap = new Map(prev.map(m => [m.id, m]))
              messagesToNotify = updatedMessages.filter((message: any) => {
                if (!message?.id) return false
                return !messageMap.has(message.id)
              })
              updatedMessages.forEach(m => messageMap.set(m.id, m))
              const merged = Array.from(messageMap.values()).sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
              console.log('🔄 Polling: Merged', updatedMessages.length, 'new with', prev.length, 'existing =', merged.length, 'total')
              
              // Save merged messages to localStorage
              if (typeof window !== 'undefined') {
                localStorage.setItem(`chat_messages_${booking.id}`, JSON.stringify(merged))
                console.log('💾 Polling: Messages backed up to localStorage')
              }
              
              return merged
            })

            if (messagesToNotify.length > 0) {
              messagesToNotify.forEach((message) => notifyIncomingChatMessage(message, booking))
            }
            
            // Check for new invoice data
            const invoiceMessage = updatedMessages.find(msg => msg.has_invoice && msg.invoice_data)
            if (invoiceMessage) {
              setChatInvoiceData(invoiceMessage.invoice_data)
            }
          } catch (error) {
            console.error('Polling error:', error)
          }
        }, 3000)
        
        setChatSubscription(pollInterval)
        console.log('✅ Polling fallback setup (checking every 3 seconds)')
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoadingChatMessages(false)
    }
  }

  // Handle invoice approval - redirect to Paystack
  const handleApprovePayment = async (invoiceData?: any) => {
    // Use passed invoice data or fall back to state
    const invoice = invoiceData || chatInvoiceData
    
    console.log('💳 handleApprovePayment called with:', {
      hasInvoiceDataParam: !!invoiceData,
      hasChatInvoiceData: !!chatInvoiceData,
      hasSelectedBooking: !!selectedChatBooking,
      hasUser: !!user,
      invoiceAmount: invoice?.totalAmount,
      bookingId: selectedChatBooking?.id
    })
    
    if (!selectedChatBooking || !invoice || !user) {
      console.error('❌ Missing required data for payment:', {
        hasSelectedBooking: !!selectedChatBooking,
        hasInvoiceData: !!invoice,
        hasUser: !!user,
        selectedBookingId: selectedChatBooking?.id,
        invoiceAmount: invoice?.totalAmount
      })
      alert('Payment Error: Missing booking or invoice information. Please refresh and try again.')
      return
    }

    try {
      setIsSendingMessage(true)
      
      // Validate booking ID format
      if (!selectedChatBooking.id) {
        console.error('❌ Booking ID is missing')
        alert('Payment Error: Invalid booking. Please refresh and try again.')
        return
      }

      // Prepare payment data
      const paymentData = {
        amount: invoice.totalAmount,
        email: user.email || 'client@protector.ng',
        bookingId: selectedChatBooking.id,
        customerName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Protector Client',
        currency: 'NGN'
      }

      console.log('💳 Initiating Paystack payment:', paymentData)
      console.log('🔍 Selected chat booking details:', {
        id: selectedChatBooking.id,
        booking_code: selectedChatBooking.booking_code,
        status: selectedChatBooking.status,
        fullBooking: selectedChatBooking
      })

      // Create Paystack payment
      const response = await fetch('/api/payments/paystack/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      })

      console.log('📊 Payment API response status:', response.status)
      console.log('📊 Response OK?', response.ok)
      
      const result = await response.json()
      console.log('📊 Payment API response data:', JSON.stringify(result, null, 2))
      console.log('📊 Response success check:', {
        hasSuccess: !!result.success,
        successValue: result.success,
        hasAuthUrl: !!result.authorization_url,
        authUrl: result.authorization_url,
        hasError: !!result.error,
        errorMessage: result.error
      })

      if (result.success && result.authorization_url) {
        console.log('✅ Payment initialization successful! Opening Paystack...')
        console.log('🔗 Authorization URL:', result.authorization_url)
        
        // Redirect to Paystack FIRST (before sending message to avoid delays)
        if (typeof window !== 'undefined') {
          console.log('🌐 Opening payment window...')
          const paymentWindow = window.open(result.authorization_url, '_blank')
          if (!paymentWindow) {
            console.warn('⚠️ Popup blocked! Trying direct navigation...')
            window.location.href = result.authorization_url
          } else {
            console.log('✅ Payment window opened successfully')
          }
        }
        
        // Send message indicating payment is being processed (non-blocking)
        try {
          const paymentMessage = await unifiedChatService.sendMessage(
            selectedChatBooking.id,
            "💳 Redirecting to secure payment gateway...",
            'client',
            user.id
          )
          setChatMessages(prev => [...prev, paymentMessage])
        } catch (msgError) {
          console.warn('⚠️ Failed to send payment message (non-critical):', msgError)
        }
        
        setShowChatInvoice(false)
        setChatInvoiceData(null)
      } else {
        const errorDetails = result.details ? `\n\nDetails: ${result.details}` : ''
        const bookingInfo = result.bookingId ? `\n\nBooking ID: ${result.bookingId}` : ''
        throw new Error(`${result.error || 'Failed to initialize payment'}${errorDetails}${bookingInfo}`)
      }
      
    } catch (error: any) {
      console.error("❌ Error initiating payment:", error)
      console.error("❌ Full error object:", JSON.stringify(error, null, 2))
      console.error("❌ Error stack:", error.stack)
      
      // Show detailed error
      const errorMessage = error.message || 'Failed to process payment. Please try again.'
      console.log(`🚨 Showing error alert: ${errorMessage}`)
      alert(`Payment Error: ${errorMessage}`)
    } finally {
      setIsSendingMessage(false)
    }
  }

  // Create booking summary message for chat
  const createBookingSummaryMessage = (booking: any) => {
    const summaryMessage = {
      id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender_type: 'system',
      sender_id: 'system',
      message: `🛡️ **New Protection Request**\n\n📍 **Location:** ${booking.pickupDetails?.location || 'N/A'}\n🎯 **Destination:** ${booking.destinationDetails?.primary || 'N/A'}\n📅 **Date:** ${booking.pickupDetails?.date || 'N/A'}\n⏰ **Time:** ${booking.pickupDetails?.time || 'N/A'}\n⏱️ **Duration:** ${booking.pickupDetails?.duration || 'N/A'}\n🔫 **Service:** ${booking.serviceType === 'armed-protection' ? 'Armed Protection' : 'Car Only'}\n💰 **Status:** ${booking.status}\n\n**Request ID:** ${booking.id}\n**Submitted:** ${new Date(booking.timestamp).toLocaleString()}`,
      created_at: new Date().toISOString(),
      booking_id: booking.id,
      has_invoice: false,
      is_system_message: true,
      message_type: 'system'
    }

    // Store in localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          `chat_messages_${booking.id}`,
          JSON.stringify([summaryMessage]),
        )
      } catch (error) {
        console.error('Failed to store in localStorage:', error)
      }
    }

    console.log('📋 Created booking summary message:', summaryMessage.id)
    
    // Return the message object so it can be used
    return summaryMessage
  }


  const [selectedCity, setSelectedCity] = useState("Lagos")
  
  const cities = [
    { id: "lagos", name: "Lagos", coordinates: { lat: 6.5244, lng: 3.3792 } },
    { id: "ikeja", name: "Ikeja", coordinates: { lat: 6.6018, lng: 3.3515 } },
    { id: "abuja", name: "Abuja", coordinates: { lat: 9.0765, lng: 7.3986 } },
    { id: "port-harcourt", name: "Port Harcourt", coordinates: { lat: 4.8156, lng: 7.0498 } },
  ]

  const bulletproofVehicleIds = new Set(["armoredSedan", "armoredSuv", "escalade", "sedan"])

  const vehicleTypes = [
    {
      id: "escalade",
      name: "Toyota Land Cruiser 300 Armored",
      capacity: 5,
      image: "/images/PRADO/prado3.jpeg",
      description: "Premium armored bulletproof SUV",
    },
    {
      id: "sedan",
      name: "Armored Lexus LX 570",
      capacity: 4,
      image: "/images/PRADO/Lexus1.jpg",
      description: "Armored luxury SUV",
    },
    {
      id: "suv",
      name: "BMW X7",
      capacity: 6,
      image: "/black-bmw-x7-suv.png",
      description: "Spacious luxury SUV",
    },
    {
      id: "van",
      name: "Mercedes Sprinter",
      capacity: 12,
      image: "/black-mercedes-sprinter-van.png",
      description: "High-capacity transport van",
    },
    {
      id: "armoredSedan",
      name: "Armored Mercedes S-Class",
      capacity: 4,
      image: "/armored-black-sedan.png",
      description: "Bulletproof executive sedan (B6/B7 protection)",
    },
    {
      id: "armoredSuv",
      name: "Armored BMW X7",
      capacity: 5,
      image: "/armored-black-suv.png",
      description: "Bulletproof luxury SUV (B6/B7 protection)",
    },
  ]

  const dressCodeOptions = [
    {
      id: "tactical-casual",
      name: "Tactical Casual",
      image: "/images/tactical-casual-agent.png",
      available: true,
    },
    {
      id: "business-casual",
      name: "Business Casual",
      image: "/images/business-casual-agent.png",
      available: true,
    },
    {
      id: "business-formal",
      name: "Business Formal",
      image: "/images/business-formal-agent.png",
      available: true,
    },
    {
      id: "operator",
      name: "Operator",
      image: "/images/tactical-operator.png",
      available: true,
    },
  ]

  const durationOptions = ["1 day", "2 days", "3 days", "1 week", "2 weeks", "1 month"]

  useEffect(() => {
    // Check for email verification success and payment status in URL
    const checkURLParameters = () => {
      if (typeof window === 'undefined') return
      
      const urlParams = new URLSearchParams(window.location.search)
      const verified = urlParams.get('verified')
      const email = urlParams.get('email')
      const type = urlParams.get('type')
      const error = urlParams.get('error')
      const paymentStatus = urlParams.get('payment')
      const resetStatus = urlParams.get('reset')
      const bookingId = urlParams.get('booking')
      const tab = urlParams.get('tab')
      
      // Check for payment status first
      if (paymentStatus === 'success' && bookingId) {
        console.log('✅ Payment success detected in URL for booking:', bookingId)
        
        // Switch to messages tab immediately
        setActiveTab('messages')
        
        // Fetch the specific booking and open its chat
        setTimeout(async () => {
          try {
            console.log('🔍 Fetching booking directly:', bookingId)
            
            // Fetch the booking directly from database
            const { data: booking, error } = await supabase
              .from('bookings')
              .select('*')
              .eq('id', bookingId)
              .single()
            
            if (error) {
              console.error('❌ Error fetching booking:', error)
              throw error
            }
            
            if (booking) {
              console.log('📱 Auto-opening chat for paid booking:', booking.id)
              
              // Load all bookings to refresh the list
              await loadBookings()
              
              // Set the selected booking and load messages
              setSelectedChatBooking(booking)
              await loadMessagesForBooking(booking.id)
              
              // Show success message after chat is loaded
              setTimeout(() => {
                alert('🎉 Payment Successful!\n\nYour payment has been received and confirmed.\n\nYou can see the payment confirmation message in the chat below.')
              }, 800)
            } else {
              // Booking not found, still show success
              alert('🎉 Payment Successful!\n\nYour payment has been received and confirmed.\n\nYour protection service request is now being processed.')
            }
          } catch (error) {
            console.error('Error loading booking after payment:', error)
            // Still show success message
            alert('🎉 Payment Successful!\n\nYour payment has been received and confirmed.\n\nYour protection service request is now being processed.')
          }
        }, 300)
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }
      
      // Check for tab parameter to switch to specific tab
      // This is handled separately in a reactive useEffect below
      
      if (paymentStatus === 'failed') {
        console.log('❌ Payment failed detected in URL')
        alert('❌ Payment Failed\n\nYour payment could not be processed.\n\nPlease try again or contact support if the problem persists.')
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }
      
      if (paymentStatus === 'error') {
        console.log('❌ Payment error detected in URL')
        alert('⚠️ Payment Error\n\nThere was an error processing your payment.\n\nPlease try again or contact support.')
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }
      
      if (error === 'auth_callback_error') {
        setAuthError('Email verification failed. Please try again.')
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }

      if (resetStatus === 'success') {
        setShowLoginForm(true)
        setAuthStep("login")
        authStepRef.current = "login"
        setAuthSuccess("Your password has been updated. Please log in with your new password.")

        if (email) {
          setAuthForm((prev) => ({ ...prev, email: decodeURIComponent(email) }))
        }

        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }
      
      if (verified === 'true') {
        // Email was just verified - show login form with success message
        setShowLoginForm(true)
        setAuthStep("login")
        authStepRef.current = "login"
        setAuthSuccess("✅ Email verified successfully! Please log in with your credentials to continue.")
        
        // Pre-fill email if available
        if (email) {
          setAuthForm((prev) => ({ ...prev, email: decodeURIComponent(email) }))
        }
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }
      
      if (type === 'signup') {
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname)
        setAuthSuccess("✅ Email verified successfully! Please complete your profile.")
        // The auth state change listener will handle the rest
      }
    }
    
    checkURLParameters()

    
    // Get initial session
    const getInitialSession = async () => {
      if (getInitialSessionInProgressRef.current) return
      getInitialSessionInProgressRef.current = true
      let authTimeoutHandle: ReturnType<typeof setTimeout> | null = null
      let safetyHandle: ReturnType<typeof setTimeout> | null = null
      const SAFETY_MAX_MS = 20000 // Force stop loading after 20s so user never stays stuck (e.g. slow/hanging getSession in some browsers)
      try {
        setIsCheckingAuth(true)
        
        // Safety: in some browsers getSession() can hang; ensure we always stop showing loading
        safetyHandle = setTimeout(() => {
          setIsCheckingAuth(false)
          setShowLoginForm(true)
          setIsLoggedIn(false)
        }, SAFETY_MAX_MS)
        
        // Quick check: if we already have user state, don't show login form
        // This prevents flash when navigating back from sub-pages
        if (user && isLoggedIn) {
          getInitialSessionInProgressRef.current = false
          if (safetyHandle) clearTimeout(safetyHandle)
          setShowLoginForm(false)
          setIsCheckingAuth(false)
          return
        }
        
        const AUTH_CHECK_TIMEOUT_MS = 12000
        const RETRY_TIMEOUT_MS = 5000
        let session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] = null
        try {
          const sessionPromise = supabase.auth.getSession()
          const timeoutPromise = new Promise<never>((_, reject) => {
            authTimeoutHandle = setTimeout(() => reject(new Error("Authentication check timed out")), AUTH_CHECK_TIMEOUT_MS)
          })
          const result = (await Promise.race([sessionPromise, timeoutPromise])) as Awaited<typeof sessionPromise>
          if (authTimeoutHandle) {
            clearTimeout(authTimeoutHandle)
            authTimeoutHandle = null
          }
          session = result?.data?.session ?? null
        } catch (err) {
          if (authTimeoutHandle) {
            clearTimeout(authTimeoutHandle)
            authTimeoutHandle = null
          }
          // Retry with its own timeout so we never hang (e.g. Safari/strict storage)
          try {
            const retryPromise = supabase.auth.getSession()
            const retryTimeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Retry timed out")), RETRY_TIMEOUT_MS))
            const retryResult = (await Promise.race([retryPromise, retryTimeout])) as Awaited<ReturnType<typeof supabase.auth.getSession>>
            session = retryResult?.data?.session ?? null
          } catch {
            session = null
          }
        }
        if (session?.user) {
          // Check if email is verified
        if (session.user.email_confirmed_at) {
          setUser(session.user)
          setIsLoggedIn(true)
          setShowLoginForm(false) // Hide login form immediately if user is authenticated
          setIsCheckingAuth(false) // Stop showing loading state
          // Load user profile from database (pass session.user so fallback works before state updates)
          await loadUserProfile(session.user.id, session.user)
          // Check user role
          await checkUserRole(session.user.id)
          } else {
            // User exists but email not verified
            setVerificationEmail(session.user.email || "")
            setAuthStep("email-verification")
            authStepRef.current = "email-verification"
            setEmailVerificationSent(true)
            setAuthSuccess("Please verify your email to continue. Check your inbox for the verification link.")
            setIsCheckingAuth(false)
          }
        } else {
          // No session found, show login form
          setShowLoginForm(true)
          setIsLoggedIn(false)
          setIsCheckingAuth(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        // Continue with app even if auth fails
        setShowLoginForm(true)
        setIsLoggedIn(false)
        setIsCheckingAuth(false)
      } finally {
        getInitialSessionInProgressRef.current = false
        if (authTimeoutHandle) clearTimeout(authTimeoutHandle)
        if (safetyHandle) clearTimeout(safetyHandle)
        setIsCheckingAuth(false)
        setIsDataLoaded(true)
      }
    }

    // Check URL parameters first, then get session
    getInitialSession()

    // Listen for auth changes (single consolidated listener)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        console.log('Auth state change:', event, 'User:', session?.user?.email, 'Verified:', session?.user?.email_confirmed_at)
        
        // Explicitly handle SIGNED_OUT event to prevent re-authentication
        if (event === 'SIGNED_OUT') {
          console.log('🚪 [Auth] User signed out event received')
          setUser(null)
          setIsLoggedIn(false)
          setUserProfile({
            email: "",
            firstName: "",
            lastName: "",
            phone: "",
            address: "",
            emergencyContact: "",
            emergencyPhone: "",
            avatarUrl: "",
          })
          setAuthStep("login")
          authStepRef.current = "login"
          setShowLoginForm(true)
          setAuthSuccess("")
          setAuthError("")
          return // Don't process further
        }
        
        if (session?.user) {
          // Check for stored redirect path and navigate to it
          if (typeof window !== 'undefined') {
            const redirectPath = sessionStorage.getItem('redirectAfterAuth')
            if (redirectPath) {
              console.log('🔄 Redirecting to stored path:', redirectPath)
              sessionStorage.removeItem('redirectAfterAuth')
              router.push(redirectPath)
              // Don't return here - continue to set user state
            }
            
            // Fallback: Check for last visited location (only if no redirect path)
            if (!redirectPath) {
              const lastVisitedLocation = sessionStorage.getItem('lastVisitedLocation')
              if (lastVisitedLocation && lastVisitedLocation !== '/app') {
                console.log('🔄 Redirecting to last visited location:', lastVisitedLocation)
                sessionStorage.removeItem('lastVisitedLocation')
                router.push(lastVisitedLocation)
                // Don't return here - continue to set user state
              }
            }
          }
          
          // Check if email is verified
          if (session.user.email_confirmed_at) {
            console.log('Email is verified, setting user as logged in')
            setUser(session.user)
            setIsLoggedIn(true)
            setShowLoginForm(false) // Hide login form immediately when authenticated
            await loadUserProfile(session.user.id, session.user)
            
            // If we were on email verification step, move to profile completion
            if (authStepRef.current === "email-verification") {
              console.log('Moving from email verification to profile completion step')
              setAuthStep("profile-completion")
              authStepRef.current = "profile-completion"
              setAuthSuccess("🎉 Email verified successfully! Please complete your profile.")
              
              // Clear any verification check interval
              if (verificationCheckIntervalRef.current) {
                clearInterval(verificationCheckIntervalRef.current)
                verificationCheckIntervalRef.current = null
              }
            } else if (authStepRef.current === "login" || authStepRef.current === "register") {
              // User just logged in and email is verified, go to profile
              setAuthStep("profile")
              authStepRef.current = "profile"
              setShowLoginForm(false)
            }
          } else {
            console.log('Email not verified, showing verification step')
            // User exists but email not verified
            setVerificationEmail(session.user.email || "")
            setAuthStep("email-verification")
            authStepRef.current = "email-verification"
            setEmailVerificationSent(true)
            setAuthSuccess("Please verify your email to continue. Check your inbox for the verification link.")
          }
        } else {
          // No session - user is logged out
          console.log('🚪 [Auth] No session - user logged out')
          setUser(null)
          setIsLoggedIn(false)
          setUserProfile({
            email: "",
            firstName: "",
            lastName: "",
            phone: "",
            address: "",
            emergencyContact: "",
            emergencyPhone: "",
            avatarUrl: "",
          })
          setAuthStep("login")
          setShowLoginForm(true)
          setAuthSuccess("")
          setAuthError("")
        }
      } catch (error) {
        console.error('Auth state change handling error:', error)
        setShowLoginForm(true)
        setIsLoggedIn(false)
      } finally {
        setIsCheckingAuth(false)
      }
    })

    return () => {
      subscription.unsubscribe()
      // Clean up verification check interval
      if (verificationCheckIntervalRef.current) {
        clearInterval(verificationCheckIntervalRef.current)
      }
    }
  }, [])

  const loadUserProfile = async (userId: string, currentUserForFallback?: SupabaseUser | null) => {
    if (loadUserProfileInProgressRef.current === userId) return
    loadUserProfileInProgressRef.current = userId
    const fallbackUser = currentUserForFallback ?? user

    const applyAuthFallback = (source: SupabaseUser | null | undefined) => {
      if (!source) return
      const next = {
        email: source.email || "",
        firstName: source.user_metadata?.first_name || source.user_metadata?.firstName || "",
        lastName: source.user_metadata?.last_name || source.user_metadata?.lastName || "",
        phone: source.user_metadata?.phone || source.user_metadata?.phone_number || "",
        address: source.user_metadata?.address || "",
        emergencyContact: source.user_metadata?.emergency_contact || source.user_metadata?.emergencyContact || "",
        emergencyPhone: source.user_metadata?.emergency_phone || source.user_metadata?.emergencyPhone || "",
        avatarUrl: source.user_metadata?.avatar_url || "",
      }
      setUserProfile((prev) => ({
        email: prev.email || next.email,
        firstName: prev.firstName || next.firstName,
        lastName: prev.lastName || next.lastName,
        phone: prev.phone || next.phone,
        address: prev.address || next.address,
        emergencyContact: prev.emergencyContact || next.emergencyContact,
        emergencyPhone: prev.emergencyPhone || next.emergencyPhone,
        avatarUrl: prev.avatarUrl || next.avatarUrl,
      }))
    }

    // Seed immediately so Profile never stays blank while DB fetch hangs.
    applyAuthFallback(fallbackUser)

    try {
      console.log('👤 [App] Loading user profile for:', userId)
      
      // Use the new data sync utility for validated profile loading
      const { loadProfileWithValidation } = await import('@/lib/utils/data-sync')
      const PROFILE_FETCH_TIMEOUT_MS = 8000
      const { profile, error } = await Promise.race([
        loadProfileWithValidation(userId),
        new Promise<{ profile: null; error: string }>((resolve) =>
          setTimeout(
            () => resolve({ profile: null, error: `Profile fetch timed out after ${PROFILE_FETCH_TIMEOUT_MS}ms` }),
            PROFILE_FETCH_TIMEOUT_MS,
          ),
        ),
      ])
      
      // If profile is missing or incomplete, sync from auth
      if (!profile || !profile.first_name || profile.first_name === 'User') {
        console.log('🔄 [App] Profile incomplete or missing, syncing from auth...')
        const { data: { user: authUser } } = await supabase.auth.getUser()
        const userToSync = authUser ?? fallbackUser
        if (userToSync) {
          const syncedProfile = await Promise.race([
            syncUserProfile(userToSync),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), PROFILE_FETCH_TIMEOUT_MS)),
          ])
          if (syncedProfile) {
            setUserProfile({
              email: syncedProfile.email || userToSync.email || "",
              firstName: syncedProfile.first_name || "",
              lastName: syncedProfile.last_name || "",
              phone: syncedProfile.phone || "",
              address: syncedProfile.address || "",
              emergencyContact: syncedProfile.emergency_contact || "",
              emergencyPhone: syncedProfile.emergency_phone || "",
              avatarUrl: profile?.avatar_url || "",
            })
            return
          }
          applyAuthFallback(userToSync)
        }
      }
      
      if (profile) {
        console.log('✅ [App] Profile loaded successfully:', profile.first_name, profile.last_name)
        setUserProfile({
          email: profile.email || fallbackUser?.email || "",
          firstName: profile.first_name || "",
          lastName: profile.last_name || "",
          phone: profile.phone || "",
          address: profile.address || "",
          emergencyContact: profile.emergency_contact || "",
          emergencyPhone: profile.emergency_phone || "",
          avatarUrl: profile.avatar_url || "",
        })
        
        // Clear any previous errors
        if (!error || error.includes('cached data') || error.includes('timed out')) {
          setAuthError('')
        }
      } else {
        console.warn('⚠️ [App] Could not load profile')
        if (error && !String(error).includes('timed out')) {
          setAuthError('Unable to load profile. Please check your connection.')
        }
        applyAuthFallback(fallbackUser)
      }
    } catch (error) {
      console.error("❌ [App] Error loading user profile:", error)
      setAuthError('Failed to load profile data. Please refresh the page.')
      applyAuthFallback(fallbackUser)
    } finally {
      if (loadUserProfileInProgressRef.current === userId) loadUserProfileInProgressRef.current = null
    }
  }

  const checkUserRole = async (userId: string) => {
    try {
      console.log("Checking user role for userId:", userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', userId)
        .single()

      console.log("Role check result:", { data, error })

      if (error) {
        console.error("Error checking user role:", error)
        console.log("No profile found, user role remains as:", userRole)
        return
      }

      if (data) {
        const role = data.role || "client"
        setUserRole(role)
        console.log("User role set to:", role)
      } else {
        console.log("No role found in profile, user role remains as:", userRole)
      }
    } catch (error) {
      console.error("Error checking user role:", error)
    }
  }

  // Operator Dashboard Functions
  const handleAcceptBooking = (bookingId: string) => {
    setOperatorBookings(prev => 
      prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: "accepted" }
          : booking
      )
    )
  }

  const handleRejectBooking = (bookingId: string) => {
    setOperatorBookings(prev => 
      prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: "rejected" }
          : booking
      )
    )
  }

  const handleDeployBooking = (bookingId: string) => {
    setOperatorBookings(prev => 
      prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: "deployed" }
          : booking
      )
    )
  }

  const handleSendInvoice = (bookingId: string) => {
    setSelectedBooking(operatorBookings.find(b => b.id === bookingId))
    setShowInvoiceModal(true)
  }

  const calculateInvoiceTotal = () => {
    const { basePrice, hourlyRate, vehicleFee, personnelFee, duration, currency } = invoiceForm
    const total = basePrice + (hourlyRate * duration) + vehicleFee + personnelFee
    return { total, currency }
  }

  const handleCreateInvoice = () => {
    const { total, currency } = calculateInvoiceTotal()
    const currencySymbol = currency === "NGN" ? "₦" : "$"
    
    setOperatorBookings(prev => 
      prev.map(booking => 
        booking.id === selectedBooking?.id 
          ? { ...booking, pricing: `${currencySymbol}${total.toLocaleString()}` }
          : booking
      )
    )
    
    setShowInvoiceModal(false)
    setSelectedBooking(null)
  }

  const handleOperatorChatSend = () => {
    if (operatorChatMessage.trim()) {
      // Handle operator chat message
      console.log("Operator message:", operatorChatMessage)
      setOperatorChatMessage("")
    }
  }



  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string): boolean => {
    return password.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
  }

  const validatePhone = (phone: string): boolean => {
    // Enhanced Nigerian phone number validation
    const cleanPhone = phone.replace(/\s/g, "").replace(/-/g, "")
    const phoneRegex = /^(\+234|234|0)?[789][01]\d{8}$/
    return phoneRegex.test(cleanPhone)
  }

  const validateBVN = (bvn: string): boolean => {
    // Nigerian BVN validation - 11 digits
    const cleanBVN = bvn.replace(/\s/g, "").replace(/-/g, "")
    const bvnRegex = /^\d{11}$/
    return bvnRegex.test(cleanBVN)
  }

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for better UX
    const cleanPhone = phone.replace(/\D/g, "")
    if (cleanPhone.startsWith("234")) {
      return `+${cleanPhone}`
    } else if (cleanPhone.startsWith("0")) {
      return `+234${cleanPhone.substring(1)}`
    } else if (cleanPhone.length === 10) {
      return `+234${cleanPhone}`
    }
    return phone
  }

  const validateForm = (step: string): boolean => {
    const errors: { [key: string]: string } = {}

    if (step === "login") {
      if (!authForm.email) {
        errors.email = "Email is required"
      } else if (!validateEmail(authForm.email)) {
        errors.email = "Please enter a valid email address"
      }

      if (!authForm.password) {
        errors.password = "Password is required"
      }
    } else if (step === "register") {
      if (!authForm.email) {
        errors.email = "Email is required"
      } else if (!validateEmail(authForm.email)) {
        errors.email = "Please enter a valid email address"
      }

      if (!authForm.password) {
        errors.password = "Password is required"
      } else if (!validatePassword(authForm.password)) {
        errors.password = "Password must be at least 8 characters with uppercase, lowercase, and number"
      }

      if (!authForm.confirmPassword) {
        errors.confirmPassword = "Please confirm your password"
      } else if (authForm.password !== authForm.confirmPassword) {
        errors.confirmPassword = "Passwords do not match"
      }
    } else if (step === "forgot-password") {
      if (!authForm.email) {
        errors.email = "Email is required"
      } else if (!validateEmail(authForm.email)) {
        errors.email = "Please enter a valid email address"
      }
    } else if (step === "credentials") {
      if (!authForm.firstName.trim()) {
        errors.firstName = "First name is required"
      }
      if (!authForm.lastName.trim()) {
        errors.lastName = "Last name is required"
      }
      if (!authForm.phone.trim()) {
        errors.phone = "Phone number is required"
      } else if (!validatePhone(authForm.phone)) {
        errors.phone = "Please enter a valid Nigerian phone number (e.g., +234 801 234 5678 or 0801 234 5678)"
      }
      if (!authForm.bvnNumber.trim()) {
        errors.bvnNumber = "BVN number is required"
      } else if (!validateBVN(authForm.bvnNumber)) {
        errors.bvnNumber = "Please enter a valid 11-digit BVN number"
      }
    } else if (step === "profile" || step === "profile-completion") {
      if (!authForm.firstName.trim()) {
        errors.firstName = "First name is required"
      }

      if (!authForm.lastName.trim()) {
        errors.lastName = "Last name is required"
      }

      if (!authForm.phone) {
        errors.phone = "Phone number is required"
      } else if (!validatePhone(authForm.phone)) {
        errors.phone = "Please enter a valid Nigerian phone number (e.g., +234 801 234 5678 or 0801 234 5678)"
      }

      if (!authForm.address.trim()) {
        errors.address = "Address is required"
      }

      if (!authForm.emergencyContact.trim()) {
        errors.emergencyContact = "Emergency contact name is required"
      }

      if (!authForm.emergencyPhone) {
        errors.emergencyPhone = "Emergency contact phone is required"
      } else if (!validatePhone(authForm.emergencyPhone)) {
        errors.emergencyPhone = "Please enter a valid Nigerian phone number for emergency contact"
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const clearAuthMessages = () => {
    setAuthError("")
    setAuthSuccess("")
    setFormErrors({})
  }

  const resendVerificationEmail = async () => {
    if (!verificationEmail) return
    
    setAuthLoading(true)
    setAuthError("")
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback'
        }
      })
      
      if (error) {
        throw new Error(error.message)
      }
      
      setAuthSuccess("Verification email sent! Please check your inbox.")
    } catch (error: any) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const checkVerificationStatus = async () => {
    try {
      console.log('Checking verification status...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Session error:', error)
        return
      }
      
      console.log('Session:', session?.user?.email, 'Verified:', session?.user?.email_confirmed_at)
      
      if (session?.user?.email_confirmed_at) {
        console.log('Email verified! Progressing to profile step...')
        
        // Email verified! Clear interval and progress
        if (verificationCheckIntervalRef.current) {
          clearInterval(verificationCheckIntervalRef.current)
          verificationCheckIntervalRef.current = null
        }
        
        setUser(session.user)
        setIsLoggedIn(true)
        setShowLoginForm(false)
        setAuthStep("profile")
        setAuthSuccess("🎉 Email verified successfully! Please complete your profile.")
        
        // Load user profile (pass session.user for fallback)
        try {
          await loadUserProfile(session.user.id, session.user)
        } catch (profileError) {
          console.error('Error loading user profile:', profileError)
        }
        
        // Show success animation
        setTimeout(() => {
          setAuthSuccess("")
        }, 5000)
      } else {
        console.log('Email not yet verified')
        setAuthError('Email not yet verified. Please check your email and click the verification link.')
      }
    } catch (error) {
      console.error('Error checking verification status:', error)
    }
  }

  const simulateAuthDelay = () => {
    return new Promise((resolve) => setTimeout(resolve, 1500))
  }

  const handleEmergency = () => {
    alert("🚨 Emergency services contacted! Help is on the way.")
  }

  const handleBookService = () => {
    setSelectedService("armed-protection")
    setAssignProtectorAutomatically(true)
    setSelectedProtectorListingId(null)
    setSelectedProtectorListing(null)
    setActiveTab("booking")
    setBookingStep(1)
  }

  const handleBookVehicle = () => {
    setVehicleBookingFocus("standard")
    setSelectedService("car-only")
    setActiveTab("booking")
    setBookingStep(1)
  }

  const handleBookBulletproofVehicle = () => {
    setVehicleBookingFocus("bulletproof")
    setSelectedService("car-only")
    setActiveTab("booking")
    setBookingStep(1)
  }

  const handleCallOperator = () => {
    if (typeof window !== "undefined") {
      window.location.href = "tel:+2347120005328"
    }
  }

  const handleBookCarOnly = () => {
    // Initiate phone call to +234 712 000 5328
    if (typeof window !== 'undefined') {
      window.location.href = 'tel:+2347120005328'
    }
  }

  const handleBookViaMail = () => {
    setContactBooking(null)
    openBookViaMailClient()
  }

  const handleQuickServiceSubmitted = async (booking: {
    booking_code: string
    id?: string
    special_instructions?: string | null
    pickup_address?: string | null
    destination_address?: string | null
  }) => {
    const bookingCode = booking.booking_code
    const quick = parseQuickServiceFromBooking(booking)
    const chatKey = bookingCode

    const bookingDisplay = {
      id: chatKey,
      booking_code: bookingCode,
      database_id: booking.id,
      status: "pending",
      type: quick?.quick_service_type === "itinerary_planning" ? "itinerary_planning" : "home_security",
      service_type: quick?.quick_service_type || "quick_service",
      pickupLocation: booking.pickup_address || quick?.address || "Quick Service",
      destination: booking.destination_address || quick?.description || "Pending operator review",
      date: new Date().toLocaleDateString(),
      special_instructions: quick,
      protectorName: quick?.quick_service_label || "Quick Service",
    }

    if (quick) {
      const metadata = buildQuickServiceMessageMetadataFromSpecial(quick, bookingCode)
      const summaryMessage = {
        id: `summary_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        sender_type: "system",
        sender_id: "system",
        message: buildQuickServiceChatSummaryFromSpecial(quick, bookingCode),
        created_at: new Date().toISOString(),
        booking_id: chatKey,
        has_invoice: false,
        is_system_message: true,
        message_type: "system",
        metadata,
      }

      setChatMessages([summaryMessage])
      if (typeof window !== "undefined") {
        localStorage.setItem(`chat_messages_${chatKey}`, JSON.stringify([summaryMessage]))
      }
    } else {
      setChatMessages([])
    }

    setShowChatThread(true)
    setActiveTab("chat")
    setSelectedChatBooking(bookingDisplay)
    await loadBookings()
    await loadMessagesForBooking(bookingDisplay)
  }

  const homeSuggestions = useMemo(
    () =>
      getBookingRecommendations({
        isLoggedIn: Boolean(user?.id),
        userLocation,
        activeBookings,
        bookingHistory,
      }),
    [user?.id, userLocation, activeBookings, bookingHistory]
  )

  const accountStats = useMemo(() => {
    const isCompleted = (status: string) => {
      const normalized = status.toLowerCase()
      return normalized.includes('completed') || normalized === 'done'
    }
    const completedTrips = bookingHistory.filter((booking) => isCompleted(booking.status)).length
    const totalTrips = completedTrips + activeBookings.length
    const coinsEarned = completedTrips * 100
    return { totalTrips, coinsEarned }
  }, [bookingHistory, activeBookings])

  const userDisplayName = useMemo(() => {
    const fullName = `${userProfile.firstName} ${userProfile.lastName}`.trim()
    return fullName || userProfile.email?.split("@")[0] || "You"
  }, [userProfile.firstName, userProfile.lastName, userProfile.email])

  const applySuggestionPrefill = useCallback((prefill?: BookingSuggestion['prefill']) => {
    if (!prefill) return
    if (prefill.pickup) setPickupLocation(prefill.pickup)
    if (prefill.destination) setDestinationLocation(prefill.destination)
    if (prefill.duration) setDuration(prefill.duration)
  }, [])

  const handleSuggestionSelect = useCallback(
    (suggestion: BookingSuggestion) => {
      logSuggestionEvent('click', suggestion)

      if (suggestion.actionType === 'track_booking') {
        setActiveTab('bookings')
        return
      }

      if (suggestion.actionType === 'book_mail') {
        handleBookViaMail()
        return
      }

      const serviceType =
        suggestion.prefill?.serviceType ||
        (suggestion.actionType === 'book_vehicle' ? 'car-only' : 'armed-protection')

      setSelectedService(serviceType)
      applySuggestionPrefill(suggestion.prefill)
      setActiveTab('booking')
      setBookingStep(1)
    },
    [applySuggestionPrefill]
  )

  useEffect(() => {
    if (activeTab !== "booking" || selectedService !== "armed-protection") return

    let cancelled = false
    const loadProtectorListings = async () => {
      setIsLoadingProtectorListings(true)
      try {
        const response = await fetch("/api/listings/protectors")
        const result = await response.json()
        if (!cancelled) {
          setProtectorListings(result.data || [])
        }
      } catch (error) {
        console.warn("Failed to load protector listings:", error)
        if (!cancelled) setProtectorListings([])
      } finally {
        if (!cancelled) setIsLoadingProtectorListings(false)
      }
    }

    void loadProtectorListings()
    return () => {
      cancelled = true
    }
  }, [activeTab, selectedService])

  const estimateProtectorBookingTotal = () => {
    const parsedDuration = parseInt(String(duration), 10)
    const durationDays = Number.isNaN(parsedDuration)
      ? 1
      : String(duration).includes("day")
        ? parsedDuration
        : Math.max(1, Math.ceil(parsedDuration / 24))

    if (selectedProtectorListing?.daily_rate) {
      return Math.round(Number(selectedProtectorListing.daily_rate) * durationDays * protectorCount)
    }
    if (selectedProtectorListing?.hourly_rate) {
      const hours = String(duration).includes("day") ? durationDays * 8 : Math.max(parsedDuration || 8, 4)
      return Math.round(Number(selectedProtectorListing.hourly_rate) * hours * protectorCount)
    }
    return 450000 * protectorCount
  }

  const buildPendingBookingRecord = (payload: any): PendingBookingRecord => ({
    id: payload.id,
    booking_code: payload.id,
    type: payload.serviceType,
    status: "pending",
    booking_mode: payload.booking_mode,
    pickupLocation: payload.pickupDetails?.location || "N/A",
    destination: payload.destinationDetails?.primary || "N/A",
    date: payload.pickupDetails?.date || "N/A",
    startTime: payload.pickupDetails?.time,
    duration: payload.pickupDetails?.duration || "N/A",
    cost: "Pending",
    protectorName: resolveBookingDisplayName({
      service_type: payload.serviceType === "car-only" ? "armored_vehicle" : "armed_protection",
      booking_mode: payload.booking_mode,
      pickup_address: payload.pickupDetails?.location,
      destination_address: payload.destinationDetails?.primary,
      special_instructions: {
        mode: payload.booking_mode,
        with_driver: payload.with_driver,
        selectedProtectorName: payload.selectedProtectorName,
        selectedProtectorPhoto: payload.selectedProtectorPhoto,
        dressCodeId: payload.dressCodeId,
        protector_listing_id: payload.protector_listing_id,
        vehicles: payload.vehicles,
        personnel: payload.personnel,
      },
    }),
    service_type: payload.serviceType === "car-only" ? "armored_vehicle" : "armed_protection",
    protector_count: payload.serviceType === "car-only" ? 0 : (payload.personnel?.protectors || 1),
    protectorImage: resolveBookingAvatarImage({
      service_type: payload.serviceType === "car-only" ? "armored_vehicle" : "armed_protection",
      serviceType: payload.serviceType,
      booking_mode: payload.booking_mode,
      dress_code: payload.personnel?.dressCode,
      protector_count: payload.serviceType === "car-only" ? 0 : (payload.personnel?.protectors || 1),
      special_instructions: {
        mode: payload.booking_mode,
        with_driver: payload.with_driver,
        selectedProtectorPhoto: payload.selectedProtectorPhoto,
        dressCodeId: payload.dressCodeId,
        vehicles: payload.vehicles,
        personnel: payload.personnel,
      },
    }),
    vehicleType:
      payload.serviceType === "car-only"
        ? resolveVehicleDisplayName({ special_instructions: { vehicles: payload.vehicles } }) ||
          "Vehicle pending assignment"
        : undefined,
    dressCode: payload.personnel?.dressCode,
    special_instructions: {
      mode: payload.booking_mode,
      with_driver: payload.with_driver,
      selectedProtectorPhoto: payload.selectedProtectorPhoto,
      dressCodeId: payload.dressCodeId,
      vehicles: payload.vehicles,
      personnel: payload.personnel,
    },
    isPendingSync: true,
    savedAt: new Date().toISOString(),
  })

  const openBookingChatImmediately = (payload: any) => {
    const bookingDisplay = {
      id: payload.id,
      booking_code: payload.id,
      status: "pending",
      pickupLocation: payload.pickupDetails?.location || "N/A",
      destination: payload.destinationDetails?.primary || "N/A",
      date: payload.pickupDetails?.date || "N/A",
    }

    if (user?.id) {
      savePendingBooking(user.id, buildPendingBookingRecord(payload))
    }

    const immediateSummary = createBookingSummaryMessage(payload)
    setCurrentBooking(payload)
    setSelectedChatBooking(bookingDisplay)
    setNewChatMessage("")
    setChatInvoiceData(null)
    setChatMessages([immediateSummary])
    setIsCreatingBookingChat(true)
    setIsLoadingChatMessages(true)
    setShowChatThread(true)
    setActiveTab("chat")
    setActiveBookings((prev) =>
      mergePendingWithActive(
        user?.id || "",
        [],
        [...prev, buildPendingBookingRecord(payload) as unknown as BookingDisplay],
      ),
    )

    return bookingDisplay
  }

  const finalizeCreatedBooking = async (payload: any, bookingDisplay: any, createdBooking: any) => {
    if (!createdBooking?.id || String(createdBooking.id).startsWith("REQ")) {
      throw new Error(
        createdBooking?.details ||
          createdBooking?.error ||
          "Booking was not saved to the server",
      )
    }

    if (user?.id) {
      removePendingBooking(user.id, payload.id)
    }

    const updatedBookingDisplay = {
      ...bookingDisplay,
      id: createdBooking.id,
      booking_code: createdBooking.booking_code || payload.id,
      database_id: createdBooking.id,
    }

    const transformed = transformBookings([createdBooking])
    setActiveBookings((prev) => mergePendingWithActive(user?.id || "", transformed, prev))
    setSelectedChatBooking(updatedBookingDisplay)
    setShowChatThread(true)

    if (typeof window !== "undefined") {
      const reqCache = localStorage.getItem(`chat_messages_${payload.id}`)
      if (reqCache) {
        localStorage.setItem(`chat_messages_${createdBooking.id}`, reqCache)
      }
    }

    await loadMessagesForBooking(updatedBookingDisplay)
    setIsCreatingBookingChat(false)
    setIsLoadingChatMessages(false)
  }

  const handleSelectProtectorListing = (listing: ProtectorListing) => {
    setAssignProtectorAutomatically(false)
    setSelectedProtectorListingId(listing.id)
    setSelectedProtectorListing(listing)
  }

  const handleAssignProtectorAutomatically = () => {
    setAssignProtectorAutomatically(true)
    setSelectedProtectorListingId(null)
    setSelectedProtectorListing(null)
  }

  useEffect(() => {
    if (activeTab !== 'protector' || homeSuggestions.length === 0) return
    homeSuggestions.forEach((suggestion) => logSuggestionEvent('impression', suggestion))
  }, [activeTab, homeSuggestions])

  const storeBookingInSupabase = async (payload: any) => {
    try {
      console.log('🚀 Starting booking storage process...')
      console.log('📋 Booking Payload:', {
        bookingCode: payload.id,
        serviceType: payload.serviceType,
        pickup: payload.pickupDetails?.location,
        date: payload.pickupDetails?.date
      })
      
      // Ensure user is authenticated
      if (!user) {
        console.error('❌ User not authenticated!')
        throw new Error('User not authenticated')
      }

      console.log('👤 Creating booking for user:', {
        userId: user.id,
        email: user.email
      })

      // Get the user's session to include in the request
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error('❌ No active session found!')
        throw new Error('No active session. Please log in again.')
      }
      
      console.log('🔐 Session found, token available:', !!session.access_token)
      
      // Use the API endpoint instead of direct Supabase calls
      console.log('📤 Submitting booking via API with user:', user.id)

      // Add timeout to the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ API returned error:', result)
        throw new Error(result.details || result.error || 'Failed to create booking')
      }

      console.log('✅ Booking created successfully via API:', {
        bookingId: result.data?.id,
        bookingCode: result.data?.booking_code,
        clientId: result.data?.client_id,
        status: result.data?.status
      })
      
      // Verify the booking was created with the correct user
      if (result.data?.client_id !== user.id) {
        console.warn('⚠️ WARNING: Booking created with different user ID!', {
          expected: user.id,
          actual: result.data?.client_id
        })
      }
      
      return result.data
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Booking creation timed out after 10 seconds')
        throw new Error('Booking creation timed out. Please try again.')
      }
      console.error('❌ Failed to store booking via API:', error)
      throw error
    }
  }

  const createInitialBookingMessage = async (payload: any) => {
    console.log('Creating initial booking message for payload:', payload.id)
    
    // Use real user ID if available, otherwise fallback
    const userId = user?.id || 'anonymous-user'
    
    // Create a detailed booking summary message
    const bookingSummary = `🛡️ **New Protection Request Received** - #${payload.id}

**Service Details:**
• Service Type: ${payload.serviceType === 'armed-protection' ? 'Armed Protection Service' : 'Vehicle Only Service'}
• Protection Level: ${payload.protectionType || 'N/A'}

**Location & Timing:**
• Pickup Location: ${payload.pickupDetails?.location || 'N/A'}
• Date & Time: ${payload.pickupDetails?.date || 'N/A'} at ${payload.pickupDetails?.time || 'N/A'}
• Duration: ${payload.pickupDetails?.duration || 'N/A'}

**Destination:**
• Primary Destination: ${payload.destinationDetails?.primary || 'N/A'}
${payload.destinationDetails?.additional?.length > 0 ? `• Additional Stops: ${payload.destinationDetails.additional.join(', ')}` : ''}

**Protector Assignment:**
• ${payload.selectedProtectorName || (payload.protector_listing_id ? 'Selected Protector' : 'Best available Protector')}
${payload.protector_listing_id ? `• Listing ID: ${payload.protector_listing_id}` : '• Operator will assign a verified Protector'}

**Personnel Requirements:**
• Protectors: ${payload.personnel?.protectors || 0}
• Protectees: ${payload.personnel?.protectee || 0}
• Dress Code: ${payload.personnel?.dressCode || 'N/A'}

**Vehicle Requirements:**
${Object.entries(payload.vehicles || {}).map(([vehicle, count]) => `• ${vehicle}: ${count} unit(s)`).join('\n') || '• No specific vehicles requested'}

**Contact Information:**
• Phone: ${payload.contact?.phone || 'N/A'}
• Client: ${payload.contact?.user?.firstName || 'N/A'} ${payload.contact?.user?.lastName || 'N/A'}

**Status:** ${payload.status}
**Submitted:** ${new Date(payload.timestamp).toLocaleString()}

---
*This is an automated message. Please review the request details and respond accordingly.*`

    // Create system message
    const systemMessage = {
      id: `system_${Date.now()}`,
      booking_id: payload.id,
      sender_type: 'system',
      sender_id: userId,
      message: bookingSummary,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      has_invoice: false,
      is_system_message: true
    }

    try {
      // PRIMARY: Store booking in Supabase first
      console.log('🚀 Starting booking storage process...')
      const createdBooking = await storeBookingInSupabase(payload)
      console.log('✅ Booking stored in Supabase successfully:', createdBooking)

      try {
        await unifiedChatService.sendMessage(
          createdBooking.id,
          bookingSummary,
          'system',
          userId,
          { isSystemMessage: true }
        )
        console.log('System message stored in Supabase successfully')
      } catch (messageError) {
        console.warn('⚠️ Booking saved but system message failed:', messageError)
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          `chat_messages_${createdBooking.id}`,
          JSON.stringify([systemMessage]),
        )
      }

      return createdBooking

    } catch (error) {
      console.error('❌ Failed to store in Supabase:', error)
      throw error
    }
  }

  const handleNextStep = async () => {
    console.log('🔄 handleNextStep called - bookingStep:', bookingStep, 'selectedService:', selectedService)
    
    if (selectedService === "armed-protection") {
      if (bookingStep === 1) setBookingStep(2)
      else if (bookingStep === 2) setBookingStep(3)
      else if (bookingStep === 3) {
        if (!protectorArmed) setBookingStep(3.5)
        else setBookingStep(4)
      }
      else if (bookingStep === 3.5) setBookingStep(4)
      else if (bookingStep === 4) setBookingStep(5)
      else if (bookingStep === 5) setBookingStep(6)
      else if (bookingStep === 6) setBookingStep(8)
      else if (bookingStep === 8) {
        console.log('📋 Creating armed protection booking - user:', user?.id)
        // Check if user is authenticated before creating booking
        if (!user?.id) {
          console.log('❌ User not authenticated, showing login form')
          setAuthError('Please log in to create a booking')
          setShowLoginForm(true)
          return
        }
        
        setIsCreatingBooking(true)
        console.log('🚀 Starting booking creation process...')
        const resolvedCoordinates = await resolveBookingCoordinates()
        
        // Compile booking summary payload
        const payload = {
          id: `REQ${Date.now()}`,
          timestamp: new Date().toISOString(),
          serviceType: selectedService,
          booking_mode: 'protector_only',
          protector_listing_id: selectedProtectorListingId,
          vehicle_listing_id: null,
          protectionType: protectorArmed ? "Armed" : "Unarmed",
          selectedProtectorName: selectedProtectorListing?.display_name || (assignProtectorAutomatically ? "Best available Protector" : null),
          selectedProtectorPhoto: selectedProtectorListing?.photos?.[0] || null,
          dressCodeId: selectedDressCode,
          estimated_total: estimateProtectorBookingTotal(),
          total_price: estimateProtectorBookingTotal(),
          base_price: estimateProtectorBookingTotal(),
          pickupDetails: {
            location: pickupLocation,
            coordinates: resolvedCoordinates.pickupCoordinates,
            date: pickupDate,
            time: pickupTime,
            duration: duration,
          },
          destinationDetails: {
            primary: destinationLocation,
            coordinates: resolvedCoordinates.destinationCoordinates,
            additional: multipleDestinations,
          },
          personnel: {
            protectee: protecteeCount,
            protectors: protectorCount,
            dressCode: dressCodeOptions.find((option) => option.id === selectedDressCode)?.name,
          },
          vehicles: selectedVehicles,
          contact: {
            phone: `+234 ${phoneNumber}`,
            user: user,
          },
          status: "Pending Deployment",
        }

        setBookingPayload(payload)
        setIsCreatingBooking(false)
        const bookingDisplay = openBookingChatImmediately(payload)

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Booking creation timeout after 15 seconds')), 15000)
        })

        Promise.race([createInitialBookingMessage(payload), timeoutPromise])
          .then(async (createdBooking) => {
            await finalizeCreatedBooking(payload, bookingDisplay, createdBooking)
          })
          .catch((error) => {
            console.error('⚠️ Background booking storage failed:', error)
            setIsCreatingBookingChat(false)
            setIsLoadingChatMessages(false)
            setShowChatThread(true)
            const message =
              error instanceof Error ? error.message : 'Unable to save booking right now.'
            alert(
              `We couldn't save your booking to the server (${message}). Your chat preview is still here — please try sending the request again.`,
            )
          })
        return
      }
    } else if (selectedService === "car-only") {
      if (bookingStep === 1) setBookingStep(4)
      else if (bookingStep === 4) setBookingStep(5)
      else if (bookingStep === 5) setBookingStep(7)
      else if (bookingStep === 7) {
        console.log('📋 Creating car-only booking - user:', user?.id)
        // Check if user is authenticated before creating booking
        if (!user?.id) {
          console.log('❌ User not authenticated, showing login form')
          setAuthError('Please log in to create a booking')
          setShowLoginForm(true)
          return
        }
        
        setIsCreatingBooking(true)
        const resolvedCoordinates = await resolveBookingCoordinates()
        
        // Compile booking summary payload for car-only service
        const payload = {
          id: `REQ${Date.now()}`,
          timestamp: new Date().toISOString(),
          serviceType: selectedService,
          booking_mode: 'vehicle_only',
          vehicle_listing_id: null,
          protector_listing_id: null,
          with_driver: true,
          pickupDetails: {
            location: pickupLocation,
            coordinates: resolvedCoordinates.pickupCoordinates,
            date: pickupDate,
            time: pickupTime,
            duration: duration,
          },
          destinationDetails: {
            primary: destinationLocation,
            coordinates: resolvedCoordinates.destinationCoordinates,
            additional: multipleDestinations,
          },
          vehicles: selectedVehicles,
          contact: {
            phone: `+234 ${phoneNumber}`,
            user: user,
          },
          status: "Pending Deployment",
        }

        setBookingPayload(payload)
        setIsCreatingBooking(false)
        const bookingDisplay = openBookingChatImmediately(payload)

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Booking creation timeout after 15 seconds')), 15000)
        })

        Promise.race([createInitialBookingMessage(payload), timeoutPromise])
          .then(async (createdBooking) => {
            await finalizeCreatedBooking(payload, bookingDisplay, createdBooking)
          })
          .catch((error) => {
            console.error('⚠️ Background booking storage failed:', error)
            setIsCreatingBookingChat(false)
            setIsLoadingChatMessages(false)
            setShowChatThread(true)
            const message =
              error instanceof Error ? error.message : 'Unable to save booking right now.'
            alert(
              `We couldn't save your booking to the server (${message}). Your chat preview is still here — please try sending the request again.`,
            )
          })
        return
      }
    }
  }

  const handlePrevStep = () => {
    if (selectedService === "armed-protection") {
      if (bookingStep === 9) setBookingStep(8)
      else if (bookingStep === 8) setBookingStep(6)
      else if (bookingStep === 6) setBookingStep(5)
      else if (bookingStep === 5) setBookingStep(4)
      else if (bookingStep === 4) setBookingStep(protectorArmed ? 3 : 3.5)
      else if (bookingStep === 3.5) setBookingStep(3)
      else if (bookingStep === 3) setBookingStep(2)
      else if (bookingStep === 2) setBookingStep(1)
      else if (bookingStep === 1) {
        setActiveTab("protector")
        setSelectedService("")
      }
    } else if (selectedService === "car-only") {
      if (bookingStep === 9) setBookingStep(8)
      else if (bookingStep === 8) setBookingStep(7)
      else if (bookingStep === 7) setBookingStep(5)
      else if (bookingStep === 5) setBookingStep(4)
      else if (bookingStep === 4) setBookingStep(1)
      else if (bookingStep === 1) {
        setActiveTab("protector")
        setSelectedService("")
      }
    } else {
      // Fallback for when no service is selected
      setActiveTab("protector")
    }
  }

  const handleAuthInputChange = (field: string, value: string) => {
    setAuthForm((prev) => ({ ...prev, [field]: value }))
    // Clear field-specific error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleEditProfileChange = (field: string, value: string) => {
    setEditProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id || !file.type.startsWith("image/")) return

    setIsUploadingAvatar(true)
    clearAuthMessages()

    try {
      const ext = file.name.split(".").pop() || "jpg"
      const filePath = `${user.id}/avatar.${ext}`
      let avatarUrl = ""

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type })

      if (uploadError) {
        avatarUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ""))
          reader.onerror = () => reject(new Error("Failed to read image"))
          reader.readAsDataURL(file)
        })
      } else {
        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
        avatarUrl = `${data.publicUrl}?t=${Date.now()}`
      }

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id)

      if (error) throw new Error(error.message)

      setUserProfile((prev) => ({ ...prev, avatarUrl }))
      setAuthSuccess("Profile photo updated")
    } catch (error) {
      console.error("Avatar upload failed:", error)
      setAuthError("Failed to update profile photo")
    } finally {
      setIsUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  const startEditingProfile = () => {
    setEditProfileForm({
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      phone: userProfile.phone,
      address: userProfile.address,
      emergencyContact: userProfile.emergencyContact,
      emergencyPhone: userProfile.emergencyPhone,
    })
    setIsEditingProfile(true)
  }

  const saveProfileChanges = async () => {
    if (!user) return

    setAuthLoading(true)
    clearAuthMessages()

    try {
      // Update profile in database
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: editProfileForm.firstName.trim(),
          last_name: editProfileForm.lastName.trim(),
          phone: editProfileForm.phone.trim(),
          address: editProfileForm.address.trim(),
          emergency_contact: editProfileForm.emergencyContact.trim(),
          emergency_phone: editProfileForm.emergencyPhone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        throw new Error(error.message)
      }

      // Update profile using sync utility to update cache
      try {
        const { updateUserProfile } = await import('@/lib/utils/profile-sync')
        await updateUserProfile(user.id, {
          first_name: editProfileForm.firstName.trim(),
          last_name: editProfileForm.lastName.trim(),
          phone: editProfileForm.phone.trim(),
          address: editProfileForm.address.trim(),
          emergency_contact: editProfileForm.emergencyContact.trim(),
          emergency_phone: editProfileForm.emergencyPhone.trim(),
        })
      } catch (syncError) {
        console.warn('Profile cache sync warning:', syncError)
        // Don't fail the save if cache sync fails
      }

      // Update local state
      setUserProfile((prev) => ({
        ...prev,
        firstName: editProfileForm.firstName.trim(),
        lastName: editProfileForm.lastName.trim(),
        phone: editProfileForm.phone.trim(),
        address: editProfileForm.address.trim(),
        emergencyContact: editProfileForm.emergencyContact.trim(),
        emergencyPhone: editProfileForm.emergencyPhone.trim(),
      }))

      setIsEditingProfile(false)
      setAuthSuccess("Profile updated successfully!")

      // Clear success message after 3 seconds
      setTimeout(() => setAuthSuccess(""), 3000)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Failed to update profile. Please try again.")
      // Clear error message after 5 seconds
      setTimeout(() => setAuthError(""), 5000)
    } finally {
      setAuthLoading(false)
    }
  }

  const cancelEditingProfile = () => {
    setIsEditingProfile(false)
    setEditProfileForm({
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      emergencyContact: "",
      emergencyPhone: "",
    })
  }

  const handleLogout = async () => {
    try {
      console.log('🚪 [App] Logging out...')
      
      // Store user ID before clearing
      const userId = user?.id
      
      // Clear all cached data properly (force=true to bypass safeguards)
      if (userId) {
        try {
          const { clearUserCache } = await import('@/lib/utils/data-sync')
          clearUserCache(userId) // Defaults to force=false, prevent clearing active sessions
          console.log('✅ [App] User cache cleared')
        } catch (e) {
          console.warn('⚠️ [App] Error clearing user cache:', e)
        }
      }
      
      // Clear all cached profile data (force=true to bypass safeguards)
      try {
        clearProfileCache()
        console.log('✅ [App] Profile cache cleared')
      } catch (e) {
        console.warn('⚠️ [App] Error clearing profile cache:', e)
      }
      
      // Clear all localStorage related to user
      if (typeof window !== 'undefined') {
        try {
          // Clear all app-specific storage
          const keys = Object.keys(localStorage)
          keys.forEach(key => {
            if (key.includes('bookings') || 
                key.includes('profile') || 
                key.includes('chat') || 
                key.includes('supabase') ||
                key.includes('protector_ng_')) {
              localStorage.removeItem(key)
            }
          })
          console.log('✅ [App] localStorage cleared')
          
          // Clear sessionStorage
          sessionStorage.clear()
          console.log('✅ [App] sessionStorage cleared')
        } catch (e) {
          console.warn('⚠️ [App] Error clearing storage:', e)
        }
      }
      
      // Clear service worker cache
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready
          if (registration.active) {
            // Create a message channel for communication
            const messageChannel = new MessageChannel()
            
            // Wait for response from service worker
            const cacheCleared = new Promise((resolve) => {
              messageChannel.port1.onmessage = (event) => {
                if (event.data && event.data.success) {
                  console.log('✅ [App] Service worker cache cleared')
                } else {
                  console.warn('⚠️ [App] Service worker cache clear may have failed')
                }
                resolve(event.data)
              }
            })
            
            // Send clear cache message to service worker
            registration.active.postMessage(
              { type: 'CLEAR_CACHE' },
              [messageChannel.port2]
            )
            
            // Wait for cache clearing to complete (with timeout)
            await Promise.race([
              cacheCleared,
              new Promise(resolve => setTimeout(resolve, 1000)) // 1 second timeout
            ])
          }
        } catch (e) {
          console.warn('⚠️ [App] Error clearing service worker cache:', e)
        }
      }
      
      // Sign out from Supabase (this also clears session cookies)
      await supabase.auth.signOut()
      console.log('✅ [App] Supabase signed out')
      
      // Reset ALL state variables
      setIsLoggedIn(false)
      setUser(null)
      setUserProfile({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        address: "",
        emergencyContact: "",
        emergencyPhone: "",
        avatarUrl: "",
      })
      
      setAuthForm({
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        firstName: "",
        lastName: "",
        address: "",
        emergencyContact: "",
        emergencyPhone: "",
        bvnNumber: "",
      })
      
      // Clear booking data
      setActiveBookings([])
      setBookingHistory([])
      
      // Clear chat data
      setChatMessages([])
      setSelectedChatBooking(null)
      setCurrentBooking(null)
      setShowChatThread(false)
      notifiedChatMessageIdsRef.current.clear()
      
      // Reset UI state
      setShowLoginForm(true)
      setAuthStep("login")
      setActiveTab("protector")
      setIsEditingProfile(false)
      
      // Clear any messages/errors
      setAuthError("")
      setAuthSuccess("")
      
      console.log('✅ [App] All state reset')
      console.log('🗑️ [App] Logout complete - all cache and state cleared')
      
      // Small delay to ensure state updates propagate
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Force page reload to ensure clean state and clear any cached auth state
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
      
    } catch (error) {
      console.error("❌ [App] Error during logout:", error)
      setAuthError("Error signing out. Please try again.")
      
      // Even if there's an error, try to reset critical state and reload
      setIsLoggedIn(false)
      setUser(null)
      setShowLoginForm(true)
      setAuthStep("login")
      
      // Still try to reload to clear state
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/'
        }, 500)
      }
    }
  }

  const handleAccountAction = (action: string) => {
    switch (action) {
      case 'support':
        // Navigate to help center as default support page
        router.push('/account/help')
        break
      case 'help-center':
        router.push('/account/help')
        break
      case 'contact-support':
        router.push('/account/support')
        break
      case 'terms-of-service':
        router.push('/account/terms')
        break
      case 'privacy-policy':
        router.push('/account/privacy-policy')
        break
      default:
        console.log('Action not implemented:', action)
    }
  }

  const handleLoginSubmit = async () => {
    clearAuthMessages()

    if (!validateForm(authStep)) {
      return
    }

    setAuthLoading(true)

    try {
      if (authStep === "login") {
        // Use mock database if configured
        if (shouldUseMockDatabase()) {
          console.log('🔄 Using mock database for client authentication')
          const result = await fallbackAuth.signInWithPassword(
            authForm.email.trim().toLowerCase(),
            authForm.password
          )
          
          if (result.error) {
            throw new Error(result.error)
          }
          
          setAuthSuccess("Login successful! Welcome back.")
          setShowLoginForm(false)
          
          // Clear form
          setAuthForm({
            email: "",
            password: "",
            confirmPassword: "",
            phone: "",
            firstName: "",
            lastName: "",
            address: "",
            emergencyContact: "",
            emergencyPhone: "",
            bvnNumber: ""
          })
          
          return
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: authForm.email.trim().toLowerCase(), // Normalize email for consistency
          password: authForm.password,
        })


        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Invalid email or password. Please check your credentials or register if you're a new user.")
          } else if (error.message.includes("Email not confirmed")) {
            throw new Error("Please check your email and click the confirmation link to verify your account before logging in.")
          } else if (error.message.includes("Failed to fetch")) {
            throw new Error("Network error. Please check your internet connection and try again.")
          } else if (error.message.includes("Email address is invalid")) {
            throw new Error("Please enter a valid email address (e.g., yourname@gmail.com)")
          } else {
            throw new Error(error.message)
          }
        }

        setAuthSuccess("Login successful! Welcome back.")
        setShowLoginForm(false)

        // Clear form
        setAuthForm({
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
          firstName: "",
          lastName: "",
          address: "",
          emergencyContact: "",
          emergencyPhone: "",
          bvnNumber: "",
        })
      } else if (authStep === "register") {
        console.log('Moving to credentials step for user:', authForm.email)
        
        // Move to credentials step instead of directly signing up
        setAuthStep("credentials")
        setAuthSuccess("Please complete your credentials to continue with registration.")
        return
      } else if (authStep === "forgot-password") {
        const email = authForm.email.trim().toLowerCase()

        if (shouldUseMockDatabase()) {
          setAuthSuccess(`If an account exists for ${email}, a reset link has been sent.`)
          return
        }

        const siteOrigin =
          typeof window !== "undefined"
            ? window.location.origin
            : process.env.NEXT_PUBLIC_SITE_URL

        if (!siteOrigin) {
          throw new Error("Password reset is temporarily unavailable. Site URL not configured.")
        }

        const normalizedOrigin = siteOrigin.endsWith("/")
          ? siteOrigin.slice(0, -1)
          : siteOrigin

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${normalizedOrigin}/auth/callback?type=recovery`
        })

        if (error) {
          if (error.message.includes("Email rate limit exceeded")) {
            throw new Error("Too many reset attempts. Please check your inbox or try again later.")
          }
          throw new Error(error.message)
        }

        setAuthSuccess(`If an account exists for ${email}, a reset link has been sent.`)
        setAuthError("")
        return
      } else if (authStep === "credentials") {
        console.log('Processing credentials for user:', authForm.email)
        
        // Use mock database if configured
        if (shouldUseMockDatabase()) {
          console.log('🔄 Using mock database for client registration')
          const result = await fallbackAuth.signInWithPassword(
            authForm.email.trim().toLowerCase(),
            authForm.password
          )
          
          if (result.error) {
            throw new Error(result.error)
          }
          
          setAuthSuccess("Registration successful! Welcome to Protector.Ng")
          setShowLoginForm(false)
          
          // Clear form
          setAuthForm({
            email: "",
            password: "",
            confirmPassword: "",
            phone: "",
            firstName: "",
            lastName: "",
            address: "",
            emergencyContact: "",
            emergencyPhone: "",
            bvnNumber: ""
          })
          
          return
        }
        
        // Now actually create the user account with BVN
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email.trim().toLowerCase(),
          password: authForm.password,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?type=signup` : '/auth/callback?type=signup',
            data: {
              first_name: authForm.firstName,
              last_name: authForm.lastName,
              bvn_number: authForm.bvnNumber,
            },
          },
        })

        // For development: Auto-confirm users if email confirmation fails
        if (data.user && !data.user.email_confirmed_at) {
          console.log('Auto-confirming user for development...')
          // In production, you would set up proper email delivery
          // For now, we'll proceed as if email is confirmed
        }

        if (error) {
          console.error('Supabase auth error:', error)
          console.error('Full error details:', JSON.stringify(error, null, 2))
          if (error.message.includes("User already registered")) {
            throw new Error("An account with this email already exists. Please try logging in instead.")
          } else if (error.message.includes("Password should be")) {
            throw new Error("Password must be at least 8 characters with uppercase, lowercase, and number")
          } else if (error.message.includes("Failed to fetch")) {
            throw new Error("Network error. Please check your internet connection and try again.")
          } else if (error.message.includes("Email address is invalid")) {
            throw new Error("Email registration is currently unavailable. Please contact support at +234 712 000 5328 or try again later. Error: Email validation failed.")
          } else if (error.message.includes("Signup is disabled")) {
            throw new Error("Registration is temporarily disabled. Please contact support at +234 712 000 5328.")
          } else {
            throw new Error(`Registration failed: ${error.message}. Please contact support if this persists.`)
          }
        }

        // Create profile with BVN information
        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").insert({
            id: data.user.id,
            email: authForm.email.trim().toLowerCase(),
            first_name: authForm.firstName.trim(),
            last_name: authForm.lastName.trim(),
            phone: authForm.phone.trim(),
            bvn_number: authForm.bvnNumber.trim(),
            bvn_verified: false, // Will be verified later
            credentials_completed: true,
            role: 'client',
          })

          if (profileError) {
            console.error('Profile creation error:', profileError)
            // Continue anyway - profile can be updated later
          }
        }

        // Store the email for verification step - ALWAYS use email verification for real users
        setVerificationEmail(authForm.email.trim().toLowerCase())
        setAuthStep("email-verification")
        setEmailVerificationSent(true)
        setAuthSuccess("Account created! Please check your email and click the verification link to continue.")
        
        // Start checking for verification status every 3 seconds
        const interval = setInterval(checkVerificationStatus, 3000)
        verificationCheckIntervalRef.current = interval
      } else if (authStep === "profile") {
        // Save profile to database
        if (user) {
          const { error } = await supabase.from("profiles").upsert({
            id: user.id,
            email: authForm.email.trim().toLowerCase(), // Normalize email for consistency
            first_name: authForm.firstName.trim(),
            last_name: authForm.lastName.trim(),
            phone: authForm.phone.trim(),
            address: authForm.address.trim(),
            emergency_contact: authForm.emergencyContact.trim(),
            emergency_phone: authForm.emergencyPhone.trim(),
            updated_at: new Date().toISOString(),
          })

          if (error) {
            throw new Error(error.message)
          }

          setUserProfile({
            email: authForm.email.trim().toLowerCase(),
            firstName: authForm.firstName.trim(),
            lastName: authForm.lastName.trim(),
            phone: authForm.phone.trim(),
            address: authForm.address.trim(),
            emergencyContact: authForm.emergencyContact.trim(),
            emergencyPhone: authForm.emergencyPhone.trim(),
            avatarUrl: "",
          })
        }

        setIsLoggedIn(true)
        setShowLoginForm(false)
        setAuthStep("login") // Reset for next time
        setAuthSuccess("🎉 Welcome to Protector.ng! Your account has been created successfully.")
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setAuthSuccess("")
        }, 5000)

        // Clear form
        setAuthForm({
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
          firstName: "",
          lastName: "",
          address: "",
          emergencyContact: "",
          emergencyPhone: "",
          bvnNumber: "",
        })
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "An error occurred. Please try again.")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleProfileCompletion = async () => {
    clearAuthMessages()

    if (!validateForm(authStep)) {
      return
    }

    // Check if user exists and has a valid ID
    console.log('Profile completion - User object:', user)
    console.log('Profile completion - User ID:', user?.id)
    
    let currentUser = user
    
    // If user is not available, try to get it from the current session
    if (!currentUser || !currentUser.id) {
      console.log('User not available, fetching from session...')
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        currentUser = session.user
        setUser(session.user)
        console.log('User fetched from session:', currentUser)
      }
    }
    
    if (!currentUser || !currentUser.id) {
      setAuthError("User not found. Please log in again.")
      return
    }

    setAuthLoading(true)

    try {
      // First, check if profile exists, if not create it
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUser.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(fetchError.message)
      }

      let error
      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: authForm.firstName.trim(),
            last_name: authForm.lastName.trim(),
            phone: authForm.phone.trim(),
            address: authForm.address.trim(),
            emergency_contact: authForm.emergencyContact.trim(),
            emergency_phone: authForm.emergencyPhone.trim(),
            profile_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentUser.id)
        error = updateError
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            email: currentUser.email || '',
            first_name: authForm.firstName.trim(),
            last_name: authForm.lastName.trim(),
            phone: authForm.phone.trim(),
            address: authForm.address.trim(),
            emergency_contact: authForm.emergencyContact.trim(),
            emergency_phone: authForm.emergencyPhone.trim(),
            role: 'client',
            profile_completed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        error = insertError
      }

      if (error) {
        console.error('Profile save error:', error)
        throw new Error(`Failed to save profile: ${error.message}`)
      }

      // Update local state
      setUserProfile({
        email: currentUser?.email || "",
        firstName: authForm.firstName.trim(),
        lastName: authForm.lastName.trim(),
        phone: authForm.phone.trim(),
        address: authForm.address.trim(),
        emergencyContact: authForm.emergencyContact.trim(),
        emergencyPhone: authForm.emergencyPhone.trim(),
        avatarUrl: "",
      })

      // Check if email is verified
      const isEmailVerified = currentUser?.email_confirmed_at
      
      if (isEmailVerified) {
        setAuthSuccess("Profile completed successfully! Welcome to Protector.Ng")
      } else {
        setAuthSuccess("Profile completed! Please verify your email to access all features.")
      }
      
      setAuthStep("profile")
      setShowLoginForm(false)

      // Clear form
      setAuthForm({
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        firstName: "",
        lastName: "",
        address: "",
        emergencyContact: "",
        emergencyPhone: "",
        bvnNumber: "",
      })
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Failed to complete profile. Please try again.")
    } finally {
      setAuthLoading(false)
    }
  }

  const renderLoginForm = () => (
    <div className="w-full max-w-md mx-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen flex flex-col text-white">
      <div className="flex flex-col h-full p-4 pt-8">
        <div className="flex-1 flex flex-col justify-center w-full space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setShowLoginForm(false)
                setAuthStep("login")
                clearAuthMessages()
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-8 w-8 text-blue-400" />
                <h1 className="text-2xl font-bold text-white">Protector.Ng</h1>
              </div>
              <h2 className="text-lg font-medium text-gray-300">
                {authStep === "login"
                  ? "Welcome Back"
                  : authStep === "register"
                    ? "Create Your Account"
                    : authStep === "forgot-password"
                      ? "Reset Your Password"
                      : authStep === "credentials"
                        ? "Complete Your Credentials"
                        : authStep === "email-verification"
                          ? "Verify Your Email"
                          : authStep === "profile-completion"
                            ? "Complete Your Profile"
                            : "Edit Profile"}
              </h2>
              {(authStep === "register" || authStep === "credentials" || authStep === "email-verification" || authStep === "profile-completion") && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <div className={`w-3 h-3 rounded-full transition-colors ${authStep === "register" ? "bg-blue-500" : "bg-gray-600"}`}></div>
                  <div className={`w-3 h-3 rounded-full transition-colors ${authStep === "credentials" ? "bg-blue-500" : "bg-gray-600"}`}></div>
                  <div className={`w-3 h-3 rounded-full transition-colors ${authStep === "email-verification" ? "bg-blue-500" : "bg-gray-600"}`}></div>
                  <div className={`w-3 h-3 rounded-full transition-colors ${authStep === "profile-completion" ? "bg-blue-500" : "bg-gray-600"}`}></div>
                </div>
              )}
            </div>
            <div className="w-6" />
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <p className="text-red-400 text-sm font-medium">{authError}</p>
              </div>
              {authError.includes("Email not confirmed") && (
                <div className="mt-2 text-xs text-red-300">
                  💡 Check your email inbox for a verification link from Protector.Ng
                </div>
              )}
              {authError.includes("Invalid email or password") && (
                <div className="mt-2 text-xs text-red-300">
                  💡 Make sure you're using the correct email and password, or register if you're new
                </div>
              )}
            </div>
          )}

          {authSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <p className="text-green-400 text-sm font-medium">{authSuccess}</p>
              </div>
            </div>
          )}

          {authStep === "login" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={authForm.email}
                  onChange={(e) => handleAuthInputChange("email", e.target.value)}
                  className={`w-full p-4 bg-gray-800/90 text-white rounded-xl border focus:outline-none backdrop-blur-sm transition-all duration-200 ${
                    formErrors.email ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                />
                {formErrors.email && <p className="text-red-400 text-xs flex items-center gap-1">
                  <span>⚠</span>
                  {formErrors.email}
                </p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={authForm.password}
                  onChange={(e) => handleAuthInputChange("password", e.target.value)}
                  className={`w-full p-4 bg-gray-800/90 text-white rounded-xl border focus:outline-none backdrop-blur-sm transition-all duration-200 ${
                    formErrors.password
                      ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                />
                {formErrors.password && <p className="text-red-400 text-xs flex items-center gap-1">
                  <span>⚠</span>
                  {formErrors.password}
                </p>}
              </div>
            </div>
          )}

          {authStep === "forgot-password" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter the email you used to sign up"
                  value={authForm.email}
                  onChange={(e) => handleAuthInputChange("email", e.target.value)}
                  className={`w-full p-4 bg-gray-800/90 text-white rounded-xl border focus:outline-none backdrop-blur-sm transition-all duration-200 ${
                    formErrors.email
                      ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                />
                {formErrors.email && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <span>⚠</span>
                    {formErrors.email}
                  </p>
                )}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
                <p className="text-sm text-blue-200 font-medium">We’ll send you a secure link to reset your password.</p>
                <p className="text-xs text-blue-200/80">
                  Check your inbox (and spam folder) for an email from Protector.Ng. The link expires after 1 hour.
                </p>
              </div>
            </div>
          )}

          {authStep === "register" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={authForm.email}
                  onChange={(e) => handleAuthInputChange("email", e.target.value)}
                  className={`w-full p-4 bg-gray-800/90 text-white rounded-xl border focus:outline-none backdrop-blur-sm transition-all duration-200 ${
                    formErrors.email ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                />
                {formErrors.email && <p className="text-red-400 text-xs flex items-center gap-1">
                  <span>⚠</span>
                  {formErrors.email}
                </p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Password</label>
                <input
                  type="password"
                  placeholder="Create a strong password"
                  value={authForm.password}
                  onChange={(e) => handleAuthInputChange("password", e.target.value)}
                  className={`w-full p-4 bg-gray-800/90 text-white rounded-xl border focus:outline-none backdrop-blur-sm transition-all duration-200 ${
                    formErrors.password
                      ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                />
                {formErrors.password && <p className="text-red-400 text-xs flex items-center gap-1">
                  <span>⚠</span>
                  {formErrors.password}
                </p>}
                {authStep === "register" && authForm.password && (
                  <div className="text-xs space-y-1">
                    <div className="text-gray-400">Password requirements:</div>
                    <div className={`flex items-center gap-1 ${authForm.password.length >= 8 ? 'text-green-400' : 'text-gray-500'}`}>
                      <span>{authForm.password.length >= 8 ? '✓' : '○'}</span>
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1 ${/[A-Z]/.test(authForm.password) ? 'text-green-400' : 'text-gray-500'}`}>
                      <span>{/[A-Z]/.test(authForm.password) ? '✓' : '○'}</span>
                      <span>One uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1 ${/[a-z]/.test(authForm.password) ? 'text-green-400' : 'text-gray-500'}`}>
                      <span>{/[a-z]/.test(authForm.password) ? '✓' : '○'}</span>
                      <span>One lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1 ${/\d/.test(authForm.password) ? 'text-green-400' : 'text-gray-500'}`}>
                      <span>{/\d/.test(authForm.password) ? '✓' : '○'}</span>
                      <span>One number</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={authForm.confirmPassword}
                  onChange={(e) => handleAuthInputChange("confirmPassword", e.target.value)}
                  className={`w-full p-4 bg-gray-800/90 text-white rounded-xl border focus:outline-none backdrop-blur-sm transition-all duration-200 ${
                    formErrors.confirmPassword
                      ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                />
                {formErrors.confirmPassword && <p className="text-red-400 text-xs flex items-center gap-1">
                  <span>⚠</span>
                  {formErrors.confirmPassword}
                </p>}
              </div>
            </div>
          )}

          {authStep === "credentials" && (
            <div className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <p className="text-blue-400 text-sm font-medium">Identity Verification Required</p>
                </div>
                <p className="text-blue-300 text-xs">
                  We need your BVN (Bank Verification Number) to verify your identity and ensure secure service delivery.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">First Name</label>
                  <input
                    type="text"
                    placeholder="Enter your first name"
                    value={authForm.firstName}
                    onChange={(e) => handleAuthInputChange("firstName", e.target.value)}
                    className={`w-full p-4 bg-gray-800/90 text-white rounded-xl border focus:outline-none backdrop-blur-sm transition-all duration-200 ${
                      formErrors.firstName ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                  />
                  {formErrors.firstName && <p className="text-red-400 text-xs flex items-center gap-1">
                    <span>⚠</span>
                    {formErrors.firstName}
                  </p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Last Name</label>
                  <input
                    type="text"
                    placeholder="Enter your last name"
                    value={authForm.lastName}
                    onChange={(e) => handleAuthInputChange("lastName", e.target.value)}
                    className={`w-full p-4 bg-gray-800/90 text-white rounded-xl border focus:outline-none backdrop-blur-sm transition-all duration-200 ${
                      formErrors.lastName ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                  />
                  {formErrors.lastName && <p className="text-red-400 text-xs flex items-center gap-1">
                    <span>⚠</span>
                    {formErrors.lastName}
                  </p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Phone Number</label>
                <input
                  type="tel"
                  placeholder="Enter your phone number (e.g., +234 801 234 5678)"
                  value={authForm.phone}
                  onChange={(e) => handleAuthInputChange("phone", e.target.value)}
                  className={`w-full p-4 bg-gray-800/90 text-white rounded-xl border focus:outline-none backdrop-blur-sm transition-all duration-200 ${
                    formErrors.phone ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                />
                {formErrors.phone && <p className="text-red-400 text-xs flex items-center gap-1">
                  <span>⚠</span>
                  {formErrors.phone}
                </p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">BVN Number</label>
                <input
                  type="text"
                  placeholder="Enter your 11-digit BVN"
                  value={authForm.bvnNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                    handleAuthInputChange("bvnNumber", value)
                  }}
                  className={`w-full p-4 bg-gray-800/90 text-white rounded-xl border focus:outline-none backdrop-blur-sm transition-all duration-200 ${
                    formErrors.bvnNumber ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                />
                {formErrors.bvnNumber && <p className="text-red-400 text-xs flex items-center gap-1">
                  <span>⚠</span>
                  {formErrors.bvnNumber}
                </p>}
                <div className="text-xs text-gray-400">
                  Your BVN is required for identity verification. We use bank-level security to protect your information.
                </div>
              </div>
            </div>
          )}

          {authStep === "email-verification" && (
            <div className="space-y-6 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Check Your Email</h3>
                  <p className="text-gray-400 text-sm">
                    We've sent a verification link to:
                  </p>
                  <p className="text-blue-400 font-medium mt-1">{verificationEmail}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 text-left">
                  <h4 className="text-white font-medium mb-2">Next Steps:</h4>
                  <ol className="text-gray-300 text-sm space-y-1">
                    <li>1. Check your email inbox (and spam folder)</li>
                    <li>2. Click the verification link in the email</li>
                    <li>3. This page will automatically update when verified ✨</li>
                  </ol>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Automatically checking for verification...</span>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      setAuthLoading(true)
                      setAuthError("")
                      await checkVerificationStatus()
                      setAuthLoading(false)
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                    disabled={authLoading}
                  >
                    {authLoading ? "Checking..." : "Check verification status manually"}
                  </button>
                  
                  {/* Proceed to Continue Signing Up Option */}
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-xs text-gray-400 mb-2">
                      Can't access your email right now?
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          // Ensure user is set before proceeding
                          const { data: { session } } = await supabase.auth.getSession()
                          if (session?.user) {
                            setUser(session.user)
                            setIsLoggedIn(true)
                            setShowLoginForm(false)
                            setAuthStep("profile-completion")
                            setAuthSuccess("You can complete your profile now. Email verification can be done later.")
                          } else {
                            setAuthError("Please log in first to complete your profile.")
                          }
                        } catch (error) {
                          console.error('Error proceeding to profile completion:', error)
                          setAuthError("Failed to proceed. Please try again.")
                        }
                      }}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                      disabled={authLoading}
                    >
                      Proceed to Continue Signing Up
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Didn't receive the email? Check your spam folder or resend it.
                  </div>
                </div>
              </div>
            </div>
          )}

          {(authStep === "profile" || authStep === "profile-completion") && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">First Name</label>
                  <input
                    type="text"
                    placeholder="First name"
                    value={authForm.firstName}
                    onChange={(e) => handleAuthInputChange("firstName", e.target.value)}
                    className={`w-full p-4 bg-gray-800/90 text-white rounded-lg border focus:outline-none backdrop-blur-sm ${
                      formErrors.firstName
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-700 focus:border-blue-500"
                    }`}
                  />
                  {formErrors.firstName && <p className="text-red-400 text-xs">{formErrors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Last Name</label>
                  <input
                    type="text"
                    placeholder="Last name"
                    value={authForm.lastName}
                    onChange={(e) => handleAuthInputChange("lastName", e.target.value)}
                    className={`w-full p-4 bg-gray-800/90 text-white rounded-lg border focus:outline-none backdrop-blur-sm ${
                      formErrors.lastName
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-700 focus:border-blue-500"
                    }`}
                  />
                  {formErrors.lastName && <p className="text-red-400 text-xs">{formErrors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+234 801 234 5678 or 0801 234 5678"
                  value={authForm.phone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value)
                    handleAuthInputChange("phone", formatted)
                  }}
                  className={`w-full p-4 bg-gray-800/90 text-white rounded-lg border focus:outline-none backdrop-blur-sm ${
                    formErrors.phone ? "border-red-500 focus:border-red-500" : "border-gray-700 focus:border-blue-500"
                  }`}
                />
                {formErrors.phone && <p className="text-red-400 text-xs">{formErrors.phone}</p>}
                <p className="text-xs text-gray-500">Enter your Nigerian phone number (e.g., +234 801 234 5678)</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Address</label>
                <input
                  type="text"
                  placeholder="Your address"
                  value={authForm.address}
                  onChange={(e) => handleAuthInputChange("address", e.target.value)}
                  className={`w-full p-4 bg-gray-800/90 text-white rounded-lg border focus:outline-none backdrop-blur-sm ${
                    formErrors.address
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-700 focus:border-blue-500"
                  }`}
                />
                {formErrors.address && <p className="text-red-400 text-xs">{formErrors.address}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Emergency Contact Name</label>
                <input
                  type="text"
                  placeholder="Emergency contact name"
                  value={authForm.emergencyContact}
                  onChange={(e) => handleAuthInputChange("emergencyContact", e.target.value)}
                  className={`w-full p-4 bg-gray-800/90 text-white rounded-lg border focus:outline-none backdrop-blur-sm ${
                    formErrors.emergencyContact
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-700 focus:border-blue-500"
                  }`}
                />
                {formErrors.emergencyContact && <p className="text-red-400 text-xs">{formErrors.emergencyContact}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Emergency Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+234 801 234 5678 or 0801 234 5678"
                  value={authForm.emergencyPhone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value)
                    handleAuthInputChange("emergencyPhone", formatted)
                  }}
                  className={`w-full p-4 bg-gray-800/90 text-white rounded-lg border focus:outline-none backdrop-blur-sm ${
                    formErrors.emergencyPhone
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-700 focus:border-blue-500"
                  }`}
                />
                {formErrors.emergencyPhone && <p className="text-red-400 text-xs">{formErrors.emergencyPhone}</p>}
                <p className="text-xs text-gray-500">Emergency contact's Nigerian phone number</p>
              </div>
            </div>
          )}

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 font-semibold py-4 rounded-xl disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            onClick={authStep === "email-verification" ? resendVerificationEmail : authStep === "profile-completion" ? handleProfileCompletion : handleLoginSubmit}
            disabled={authLoading}
          >
            {authLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {authStep === "login"
                  ? "Signing in..."
                  : authStep === "register"
                    ? "Creating account..."
                    : authStep === "forgot-password"
                      ? "Sending reset link..."
                    : authStep === "email-verification"
                      ? "Resending email..."
                      : authStep === "profile-completion"
                        ? "Completing profile..."
                        : "Completing registration..."}
              </div>
            ) : authStep === "login" ? (
              "Login"
            ) : authStep === "register" ? (
              "Continue"
            ) : authStep === "forgot-password" ? (
              "Send Reset Link"
            ) : authStep === "credentials" ? (
              "Complete Credentials"
            ) : authStep === "email-verification" ? (
              "Resend Verification Email"
            ) : authStep === "profile-completion" ? (
              "Complete Profile"
            ) : (
              "Complete Registration"
            )}
          </Button>

          {authStep !== "profile" && authStep !== "credentials" && authStep !== "email-verification" && authStep !== "profile-completion" && (
            <div className="text-center">
              {authStep === "forgot-password" ? (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setAuthStep("login")
                      authStepRef.current = "login"
                      clearAuthMessages()
                    }}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200 hover:underline"
                    disabled={authLoading}
                  >
                    Remembered your password? Log in
                  </button>
                  <button
                    onClick={() => {
                      setAuthStep("register")
                      authStepRef.current = "register"
                      clearAuthMessages()
                    }}
                    className="text-gray-400 hover:text-gray-200 text-xs transition-colors duration-200 hover:underline"
                    disabled={authLoading}
                  >
                    Need an account? Sign up
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (authStep === "login") {
                      setAuthStep("register")
                      authStepRef.current = "register"
                    } else {
                      setAuthStep("login")
                      authStepRef.current = "login"
                    }
                    clearAuthMessages()
                  }}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200 hover:underline"
                  disabled={authLoading}
                >
                  {authStep === "login" ? "Don't have an account? Sign up" : "Already have an account? Login"}
                </button>
              )}
            </div>
          )}

          {authStep === "email-verification" && (
            <div className="text-center">
              <button
                onClick={() => {
                  setAuthStep("login")
                  clearAuthMessages()
                }}
                className="text-blue-400 hover:text-blue-300 text-sm"
                disabled={authLoading}
              >
                Back to Login
              </button>
            </div>
          )}

          {authStep === "credentials" && (
            <div className="text-center">
              <button
                onClick={() => {
                  setAuthStep("register")
                  clearAuthMessages()
                }}
                className="text-blue-400 hover:text-blue-300 text-sm"
                disabled={authLoading}
              >
                Back to Registration
              </button>
            </div>
          )}

          {authStep === "login" && (
            <div className="text-center">
              <button
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200 hover:underline"
                disabled={authLoading}
                onClick={() => {
                  setAuthStep("forgot-password")
                  authStepRef.current = "forgot-password"
                  clearAuthMessages()
                }}
              >
                Forgot Password?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const returnTotalPrice = () => {
    return selectedService === "car-only" ? "₦180,000.00" : "₦450,000.00"
  }

  const searchGooglePlaceSuggestions = async (query: string, exclude: string[] = []) => {
    if (!isGooglePlacesLoaded || typeof window === "undefined" || !(window as any).google?.maps?.places) {
      return []
    }

    const normalizedQuery = query.trim()
    if (normalizedQuery.length < 2) return []

    const googleMaps = (window as any).google.maps
    const selectedCityConfig = cities.find((city) => city.name === selectedCity)
    const excludedSet = new Set(exclude.map((value) => value.trim().toLowerCase()))

    const request: any = {
      input: normalizedQuery,
      componentRestrictions: { country: "ng" },
      language: "en",
      region: "ng",
    }

    if (selectedCityConfig?.coordinates) {
      request.location = new googleMaps.LatLng(
        selectedCityConfig.coordinates.lat,
        selectedCityConfig.coordinates.lng,
      )
      request.radius = 70000
    }

    const predictions = await new Promise<any[]>((resolve) => {
      const service = new googleMaps.places.AutocompleteService()
      service.getPlacePredictions(request, (items: any[] | null, status: string) => {
        if (status !== googleMaps.places.PlacesServiceStatus.OK || !items) {
          if (status && status !== googleMaps.places.PlacesServiceStatus.ZERO_RESULTS) {
            console.warn("Google Places autocomplete returned non-OK status:", status)
          }
          resolve([])
          return
        }
        resolve(items)
      })
    })

    const unique: string[] = []
    predictions.forEach((prediction) => {
      const description = prediction?.description?.trim()
      if (!description) return

      const normalizedDescription = description.toLowerCase()
      if (excludedSet.has(normalizedDescription) || unique.includes(description)) {
        return
      }

      unique.push(description)
    })

    return unique.slice(0, 6)
  }

  const searchAddressSuggestions = async (query: string, exclude: string[] = []) => {
    const normalizedQuery = query.trim()
    if (normalizedQuery.length < 3) return []

    const googleSuggestions = await searchGooglePlaceSuggestions(normalizedQuery, exclude)
    if (googleSuggestions.length > 0) {
      return googleSuggestions
    }

    const suggestions = await GeocodingService.searchSuggestions(normalizedQuery, {
      city: selectedCity,
      countryCode: 'ng',
      limit: 6,
    })

    const excludedSet = new Set(exclude.map((value) => value.trim().toLowerCase()))
    const unique: string[] = []

    suggestions.forEach((suggestion) => {
      const displayName = suggestion.displayName.trim()
      const normalizedDisplayName = displayName.toLowerCase()
      if (!displayName || excludedSet.has(normalizedDisplayName) || unique.includes(displayName)) {
        return
      }
      unique.push(displayName)
    })

    return unique.slice(0, 6)
  }

  const queuePickupSuggestions = (query: string) => {
    if (pickupSuggestionTimeoutRef.current) clearTimeout(pickupSuggestionTimeoutRef.current)

    const normalizedQuery = query.trim()
    latestPickupQueryRef.current = normalizedQuery
    if (normalizedQuery.length < 3) {
      setLocationSuggestions([])
      setShowLocationSuggestions(false)
      return
    }

    pickupSuggestionTimeoutRef.current = setTimeout(async () => {
      const suggestions = await searchAddressSuggestions(normalizedQuery)
      if (latestPickupQueryRef.current !== normalizedQuery) return
      setLocationSuggestions(suggestions)
      setShowLocationSuggestions(suggestions.length > 0)
    }, 300)
  }

  const queueDestinationSuggestions = (query: string) => {
    if (destinationSuggestionTimeoutRef.current) clearTimeout(destinationSuggestionTimeoutRef.current)

    const normalizedQuery = query.trim()
    latestDestinationQueryRef.current = normalizedQuery
    if (normalizedQuery.length < 3) {
      setDestinationSuggestions([])
      setShowDestinationSuggestions(false)
      return
    }

    destinationSuggestionTimeoutRef.current = setTimeout(async () => {
      const suggestions = await searchAddressSuggestions(normalizedQuery)
      if (latestDestinationQueryRef.current !== normalizedQuery) return
      setDestinationSuggestions(suggestions)
      setShowDestinationSuggestions(suggestions.length > 0)
    }, 300)
  }

  const queueExtraStopSuggestions = (query: string) => {
    if (extraStopSuggestionTimeoutRef.current) clearTimeout(extraStopSuggestionTimeoutRef.current)

    const normalizedQuery = query.trim()
    latestExtraStopQueryRef.current = normalizedQuery
    if (normalizedQuery.length < 3) {
      setCurrentDestinationSuggestions([])
      setShowCurrentDestinationSuggestions(false)
      return
    }

    extraStopSuggestionTimeoutRef.current = setTimeout(async () => {
      const suggestions = await searchAddressSuggestions(normalizedQuery, [
        destinationLocation,
        ...multipleDestinations,
      ])
      if (latestExtraStopQueryRef.current !== normalizedQuery) return
      setCurrentDestinationSuggestions(suggestions)
      setShowCurrentDestinationSuggestions(suggestions.length > 0)
    }, 300)
  }

  const CITY_NOTIFICATION_COOLDOWN_MS = 6 * 60 * 60 * 1000
  const CITY_CHECK_MIN_INTERVAL_MS = 2 * 60 * 1000

  const getNearestSupportedCity = (latitude?: number | null, longitude?: number | null) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null
    }

    const toRadians = (value: number) => (value * Math.PI) / 180
    const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const earthRadiusKm = 6371
      const dLat = toRadians(lat2 - lat1)
      const dLng = toRadians(lng2 - lng1)
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
          Math.cos(toRadians(lat2)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return earthRadiusKm * c
    }

    let bestCity: string | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (const city of cities) {
      const distance = distanceKm(latitude as number, longitude as number, city.coordinates.lat, city.coordinates.lng)
      if (distance < bestDistance) {
        bestDistance = distance
        bestCity = city.name
      }
    }

    return bestDistance <= 120 ? bestCity : null
  }

  const resolveCityFromSignal = ({
    city,
    address,
    latitude,
    longitude,
  }: {
    city?: string | null
    address?: string | null
    latitude?: number | null
    longitude?: number | null
  }) => {
    const fromBody = city?.trim()
    if (fromBody) return fromBody

    const normalizedAddress = (address || "").toLowerCase()
    if (normalizedAddress.includes("port harcourt") || normalizedAddress.includes("port-harcourt")) {
      return "Port Harcourt"
    }
    if (normalizedAddress.includes("abuja")) {
      return "Abuja"
    }
    if (normalizedAddress.includes("ikeja")) {
      return "Ikeja"
    }
    if (normalizedAddress.includes("lagos")) {
      return "Lagos"
    }

    return getNearestSupportedCity(latitude, longitude)
  }

  const syncDisplayedCity = (candidateCity?: string | null) => {
    const normalizedCandidate = candidateCity?.trim().toLowerCase()
    if (!normalizedCandidate) return

    const matchedCity = cities.find((city) => city.name.toLowerCase() === normalizedCandidate)
    if (matchedCity) {
      setUserLocation((prev) => (prev === matchedCity.name ? prev : matchedCity.name))
      setSelectedCity((prev) => (prev === matchedCity.name ? prev : matchedCity.name))
      return
    }

    const displayName = candidateCity?.trim()
    if (displayName) {
      setUserLocation((prev) => (prev === displayName ? prev : displayName))
      setSelectedCity((prev) => (prev === displayName ? prev : displayName))
    }
  }

  const maybeNotifyCityEntry = async ({
    city,
    latitude,
    longitude,
    address,
    source,
    force = false,
  }: {
    city?: string | null
    latitude?: number | null
    longitude?: number | null
    address?: string | null
    source: string
    force?: boolean
  }) => {
    if (typeof window === "undefined") return

    const resolvedCity = resolveCityFromSignal({ city, address, latitude, longitude })
    if (!resolvedCity) return
    syncDisplayedCity(resolvedCity)

    if (!user?.id) return
    if (cityEntryInFlightRef.current) return

    const now = Date.now()
    if (!force && now - lastForegroundCityCheckRef.current < CITY_CHECK_MIN_INTERVAL_MS) {
      return
    }

    const localStorageKey = `protector-security-last-city-${user.id}`
    try {
      const cachedRaw = localStorage.getItem(localStorageKey)
      if (cachedRaw && !force) {
        const cached = JSON.parse(cachedRaw) as { city?: string; ts?: number } | null
        if (
          cached?.city &&
          cached.city.toLowerCase() === resolvedCity.toLowerCase() &&
          typeof cached.ts === "number" &&
          now - cached.ts < CITY_NOTIFICATION_COOLDOWN_MS
        ) {
          return
        }
      }
    } catch {
      // Ignore local storage parsing issues.
    }

    lastForegroundCityCheckRef.current = now
    cityEntryInFlightRef.current = true

    try {
      const response = await fetch("/api/notifications/security/city-entry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city: resolvedCity,
          latitude,
          longitude,
          address,
          source,
          force,
        }),
      })

      if (!response.ok) {
        return
      }

      const result = await response.json().catch(() => null)
      const shouldCache =
        result?.sent === true ||
        result?.reason === "duplicate_city_welcome" ||
        result?.reason === "city_welcome_disabled"
      if (shouldCache) {
        localStorage.setItem(localStorageKey, JSON.stringify({ city: resolvedCity, ts: now }))
      }

      if (!result?.sent) {
        return
      }

      const notificationTitle = result?.notification?.title || `Welcome to ${resolvedCity}`
      const notificationMessage =
        result?.notification?.message || "Security updates are available for your current city."
      notifyRealtimeEvent({
        title: notificationTitle,
        description: truncateNotificationText(notificationMessage),
        tag: `city-entry-${resolvedCity.toLowerCase().replace(/\s+/g, "-")}`,
      })

      const nearestPlace = Array.isArray(result?.nearbyPlaces) ? result.nearbyPlaces[0] : null
      if (nearestPlace?.name) {
        notifyRealtimeEvent({
          title: `Nearest police location in ${resolvedCity}`,
          description: truncateNotificationText(`${nearestPlace.name} - ${nearestPlace.address || "Address unavailable"}`),
          tag: `city-nearest-police-${resolvedCity.toLowerCase().replace(/\s+/g, "-")}`,
        })
      }
    } catch (error) {
      console.warn("City-entry fallback notification failed:", error)
    } finally {
      cityEntryInFlightRef.current = false
    }
  }

  const maybeRequestDailySecurityTip = async () => {
    if (!user?.id || typeof window === "undefined") return

    const todayKey = new Date().toISOString().split("T")[0]
    const localStorageKey = `protector-security-daily-tip-${user.id}`
    if (localStorage.getItem(localStorageKey) === todayKey) {
      return
    }

    try {
      const response = await fetch("/api/notifications/security/daily-tip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "foreground-daily-check",
        }),
      })

      if (!response.ok) {
        return
      }

      const result = await response.json().catch(() => null)
      localStorage.setItem(localStorageKey, todayKey)

      if (result?.sent && result?.notification) {
        notifyRealtimeEvent({
          title: result.notification.title || "Daily Security Tip",
          description: truncateNotificationText(
            result.notification.message || "Security awareness tip available.",
          ),
          tag: "daily-security-tip-foreground",
        })
      }
    } catch (error) {
      console.warn("Daily tip check failed:", error)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    void maybeRequestDailySecurityTip()
  }, [user?.id])

  const getCurrentLocation = async (isAutomatic = false) => {
    setIsLoadingLocation(true)

    const applyPickupFromCoordinates = async (
      latitude: number,
      longitude: number,
      source: string,
    ) => {
      setDetectedPickupCoordinates({ lat: latitude, lng: longitude })
      const reverseGeocodeResult = await GeocodingService.reverseGeocode(latitude, longitude)
      const resolvedAddress =
        (reverseGeocodeResult?.displayName?.trim() && reverseGeocodeResult.displayName.length > 3)
          ? reverseGeocodeResult.displayName
          : `Current location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`
      setPickupLocation(resolvedAddress)
      setShowLocationSuggestions(false)
      setLocationSuggestions([])

      void maybeNotifyCityEntry({
        city: reverseGeocodeResult?.address?.city || reverseGeocodeResult?.address?.state || null,
        latitude,
        longitude,
        address: resolvedAddress,
        source,
      })
    }

    const fallbackToSelectedCity = async () => {
      const selectedCityConfig = cities.find((city) => city.name === selectedCity)
      if (!selectedCityConfig?.coordinates) {
        return false
      }

      await applyPickupFromCoordinates(
        selectedCityConfig.coordinates.lat,
        selectedCityConfig.coordinates.lng,
        "selected-city-fallback",
      )
      return true
    }

    try {
      if (!navigator.geolocation) {
        const didFallback = await fallbackToSelectedCity()
        if (!didFallback && !isAutomatic) {
          alert("Geolocation is not supported by this browser.")
        }
        return
      }

      // Request a fresh position when user clicks (maximumAge: 0) to avoid wrong/cached location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0, // always get fresh position on click
        })
      })

      const { latitude, longitude } = position.coords
      const accuracy = position.coords.accuracy
      console.log("GPS coordinates:", latitude, longitude, "accuracy ~", accuracy, "m")
      await applyPickupFromCoordinates(
        latitude,
        longitude,
        isAutomatic ? "foreground-auto-geolocation" : "manual-current-location",
      )
    } catch (error) {
      console.error("Error getting location:", error)
      const didFallback = await fallbackToSelectedCity()
      if (!didFallback && !isAutomatic) {
        alert("Unable to get your location. Please enter your address manually.")
      }
    } finally {
      setIsLoadingLocation(false)
    }
  }

  const buildContextualAddress = (rawAddress: string) => {
    const address = rawAddress.trim()
    if (!address) return address

    const normalizedAddress = address.toLowerCase()
    const normalizedCity = selectedCity.toLowerCase()

    if (normalizedAddress.includes(normalizedCity) || normalizedAddress.includes("nigeria")) {
      return address
    }

    return `${address}, ${selectedCity}, Nigeria`
  }

  const resolveAddressCoordinates = async (rawAddress: string) => {
    const contextualAddress = buildContextualAddress(rawAddress)
    if (!contextualAddress) return undefined

    if (isGooglePlacesLoaded && typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
      try {
        const googleMaps = (window as any).google.maps
        const geocoder = new googleMaps.Geocoder()

        const googleResult = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
          geocoder.geocode(
            {
              address: contextualAddress,
              componentRestrictions: { country: "NG" },
            },
            (results: any[] | null, status: string) => {
              if (status !== "OK" || !results?.[0]?.geometry?.location) {
                resolve(null)
                return
              }

              const location = results[0].geometry.location
              resolve({ lat: location.lat(), lng: location.lng() })
            },
          )
        })

        if (googleResult) {
          return googleResult
        }
      } catch (error) {
        console.warn("Google geocoder failed; falling back to OpenStreetMap geocode", error)
      }
    }

    const geocodeResult = await GeocodingService.geocode(contextualAddress)
    if (geocodeResult) {
      return { lat: geocodeResult.lat, lng: geocodeResult.lng }
    }

    return undefined
  }

  const resolveBookingCoordinates = async () => {
    let pickupCoordinates = detectedPickupCoordinates || undefined
    let destinationCoordinates = detectedDestinationCoordinates || undefined

    if (!pickupCoordinates && pickupLocation.trim()) {
      const resolvedPickupCoordinates = await resolveAddressCoordinates(pickupLocation)
      if (resolvedPickupCoordinates) {
        pickupCoordinates = resolvedPickupCoordinates
      }
    }

    if (!destinationCoordinates && destinationLocation.trim()) {
      const resolvedDestinationCoordinates = await resolveAddressCoordinates(destinationLocation)
      if (resolvedDestinationCoordinates) {
        destinationCoordinates = resolvedDestinationCoordinates
      }
    }

    return { pickupCoordinates, destinationCoordinates }
  }

  // Location is only fetched when the user clicks the "Use current location" button (no automatic fetch).



  const renderCalendar = () => {
    const today = new Date()
    const displayMonth = calendarMonth
    const displayYear = calendarYear
    
    const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate()
    const firstDayOfMonth = new Date(displayYear, displayMonth, 1).getDay()
    
    const navigateMonth = (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
        if (calendarMonth === 0) {
          setCalendarMonth(11)
          setCalendarYear(calendarYear - 1)
        } else {
          setCalendarMonth(calendarMonth - 1)
        }
      } else {
        if (calendarMonth === 11) {
          setCalendarMonth(0)
          setCalendarYear(calendarYear + 1)
        } else {
          setCalendarMonth(calendarMonth + 1)
        }
      }
    }

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(displayYear, displayMonth, day)
      const isPast = date < today
      
      // Check if this day is the selected pickup date
      const selectedDate = new Date(pickupDate)
      const isSelected = !isNaN(selectedDate.getTime()) && 
                        selectedDate.getDate() === day &&
                        selectedDate.getMonth() === displayMonth &&
                        selectedDate.getFullYear() === displayYear

      days.push(
        <button
          key={day}
          onClick={() => {
            if (!isPast) {
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
              setPickupDate(`${months[displayMonth]} ${day}, ${displayYear}`)
              setShowCalendar(false)
            }
          }}
          disabled={isPast}
          className={`p-2 text-sm rounded ${
            isSelected
              ? "bg-blue-600 text-white font-semibold"
              : isPast
                ? "text-gray-600 cursor-not-allowed"
                : "text-white hover:bg-gray-700"
          }`}
        >
          {day}
        </button>,
      )
    }

    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigateMonth('prev')}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              ←
            </button>
            <h3 className="text-white font-medium">
              {new Date(displayYear, displayMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h3>
            <button 
              onClick={() => navigateMonth('next')}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              →
            </button>
          </div>
          <button onClick={() => setShowCalendar(false)} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-2 text-xs text-gray-400 text-center font-medium">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </div>
    )
  }

  const renderTimePicker = () => {
    //  Implemented functional time picker component instead of placeholder
    const hours = Array.from({ length: 12 }, (_, i) => i + 1)
    const minutes = [0, 15, 30, 45]

    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Select Time</h3>
          <button onClick={() => setShowTimePicker(false)} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Hours */}
          <div>
            <h4 className="text-gray-400 text-sm mb-2">Hour</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {hours.map((hour) => (
                <button
                  key={hour}
                  onClick={() => setSelectedHour(hour)}
                  className={`w-full p-2 text-sm rounded ${
                    selectedHour === hour ? "bg-blue-600 text-white" : "text-white hover:bg-gray-700"
                  }`}
                >
                  {hour}
                </button>
              ))}
            </div>
          </div>

          {/* Minutes */}
          <div>
            <h4 className="text-gray-400 text-sm mb-2">Minute</h4>
            <div className="space-y-1">
              {minutes.map((minute) => (
                <button
                  key={minute}
                  onClick={() => setSelectedMinute(minute)}
                  className={`w-full p-2 text-sm rounded ${
                    selectedMinute === minute ? "bg-blue-600 text-white" : "text-white hover:bg-gray-700"
                  }`}
                >
                  {minute.toString().padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>

          {/* AM/PM */}
          <div>
            <h4 className="text-gray-400 text-sm mb-2">Period</h4>
            <div className="space-y-1">
              {["AM", "PM"].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`w-full p-2 text-sm rounded ${
                    selectedPeriod === period ? "bg-blue-600 text-white" : "text-white hover:bg-gray-700"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setPickupTime(
              `${selectedHour}:${selectedMinute.toString().padStart(2, "0")}${selectedPeriod.toLowerCase()}`,
            )
            setShowTimePicker(false)
          }}
          className="w-full mt-4 p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Set Time
        </button>
      </div>
    )
  }

  const getFilteredVehicles = () => {
    return vehicleTypes.filter((vehicle) => {
      const matchesSearch = vehicle.name.toLowerCase().includes(vehicleSearchQuery.toLowerCase())
      if (!matchesSearch) return false
      const isBulletproof = bulletproofVehicleIds.has(vehicle.id)
      if (selectedService === "car-only" && vehicleBookingFocus === "bulletproof") return isBulletproof
      if (selectedService === "car-only" && vehicleBookingFocus === "standard") return !isBulletproof
      return true
    })
  }

  const updateVehicleCount = (vehicleId: string, change: number) => {
    setSelectedVehicles((prev) => {
      const currentCount = prev[vehicleId] || 0
      const newCount = Math.max(0, currentCount + change)
      return { ...prev, [vehicleId]: newCount }
    })
  }

  const getTotalVehicleCount = () => {
    return Object.values(selectedVehicles).reduce((sum, count) => sum + count, 0)
  }

  const getTotalCapacity = () => {
    return vehicleTypes.reduce((sum, vehicle) => {
      return sum + (selectedVehicles[vehicle.id] || 0) * vehicle.capacity
    }, 0)
  }

  const isCapacityValid = () => {
    const requiredCapacity = selectedService === "car-only" ? passengerCount : protectorCount + protecteeCount
    return getTotalCapacity() >= requiredCapacity
  }

  const renderKeypad = () => {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "*", 0, "#"].map((digit) => (
          <button
            key={digit}
            onClick={() => setPhoneNumber(phoneNumber + digit.toString())}
            className="p-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            {digit}
          </button>
        ))}
      </div>
    )
  }

  const handleChatNavigation = (booking: any) => {
    console.log('📱 Opening chat for booking:', booking.id)
    loadMessagesForBooking(booking)
    setShowChatThread(true)
    setActiveTab('chat')
  }

  const handleSelectChatBooking = (booking: BookingDisplay) => {
    loadMessagesForBooking(booking)
    setShowChatThread(true)
  }

  const handleBackToChatList = () => {
    setShowChatThread(false)
  }

  // Send chat message function
  const sendChatMessage = async () => {
    if (!newChatMessage.trim() || !user) return
    if (!selectedChatBooking) {
      console.warn('No booking selected for chat')
      return
    }

    const messageText = newChatMessage.trim()
    const tempId = `temp_${Date.now()}`
    
    // Add message to UI immediately (optimistic update)
    const optimisticMessage = {
      id: tempId,
      booking_id: selectedChatBooking.id,
      sender_type: 'client',
      sender_id: user.id,
      message: messageText,
      created_at: new Date().toISOString(),
      status: 'sending',
      is_system_message: false,
      message_type: 'text'
    }
    
    setChatMessages(prev => [...prev, optimisticMessage])
    setNewChatMessage("") // Clear input immediately
    
    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    // Send to server in background
    try {
      // Ensure we use the correct booking ID (UUID, not booking_code)
      const bookingUUID = selectedChatBooking.database_id || selectedChatBooking.id
      
      console.log('📤 Sending message:', {
        bookingId: bookingUUID,
        bookingCode: selectedChatBooking.booking_code,
        userId: user.id,
        messageText: messageText
      })
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: bookingUUID,
          content: messageText,
          senderType: 'client',
          senderId: user.id
        })
      })

      console.log('📡 Response status:', response.status, response.statusText)

      if (response.ok) {
        const result = await response.json()
        console.log('📦 Response data:', result)
        
        if (result.success) {
          // Replace temporary message with real one from server
          setChatMessages(prev => 
            prev.map(msg => 
              msg.id === tempId ? { ...result.data, status: 'sent' } : msg
            )
          )
          console.log('✅ Message sent successfully')
        } else {
          throw new Error(result.error || 'Failed to send message')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        console.error('❌ Server error:', errorData)
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

    } catch (error) {
      console.error('❌ Error sending message:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Mark message as failed instead of removing it
      setChatMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'failed' } : msg
        )
      )
      
      alert(`Failed to send message: ${errorMessage}`)
    }
  }

  const sendChatAttachment = async (attachment: OutgoingChatAttachment) => {
    if (!user || !selectedChatBooking) return

    const bookingUUID = selectedChatBooking.database_id || selectedChatBooking.id
    if (String(bookingUUID).startsWith("REQ")) {
      alert("Please wait until your booking finishes syncing before sending photos or files.")
      return
    }

    const tempId = `temp_${Date.now()}`
    const previewUrl =
      attachment.type === "image" ? URL.createObjectURL(attachment.file) : undefined

    const optimisticMessage = {
      id: tempId,
      booking_id: bookingUUID,
      sender_type: "client",
      sender_id: user.id,
      message: attachmentMessageLabel(attachment),
      created_at: new Date().toISOString(),
      status: "sending",
      is_system_message: false,
      message_type: attachment.type,
      metadata: {
        attachmentType: attachment.type,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        url: previewUrl,
        durationSeconds: attachment.durationSeconds,
      },
    }

    setChatMessages((prev) => [...prev, optimisticMessage])
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)

    try {
      const { file } = await prepareAttachmentForUpload(attachment)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("bookingId", bookingUUID)
      formData.append("attachmentType", attachment.type)
      if (attachment.durationSeconds) {
        formData.append("durationSeconds", String(attachment.durationSeconds))
      }

      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch("/api/messages/attachments", {
        method: "POST",
        credentials: "include",
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
        body: formData,
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || "Failed to send attachment")
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl)

      setChatMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? { ...result.data, status: "sent" } : msg)),
      )
    } catch (error) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setChatMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? { ...msg, status: "failed" } : msg)),
      )
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      alert(`Failed to send attachment: ${errorMessage}`)
    }
  }


  // Remove loading screen - show app immediately
  // Show loading state while checking authentication to prevent login form flash
  if (isCheckingAuth) {
    return <LoadingLogo />
  }

  if (!isLoggedIn) {
    return (
      <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white">
        <div className="flex flex-col h-full">
          {/* Welcome Screen */}
          <div className="flex-1 flex flex-col justify-center items-center p-6 space-y-8">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Shield className="h-8 w-8 text-white" />
                <h1 className="text-2xl font-bold">Protector.ng</h1>
              </div>

              <h2 className="text-xl font-semibold text-white">Professional Armed Protection Services</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Book armed protectors and secure transportation in Nigeria. Book your bulletproof vehicle for safe,
                smooth, worry-free journeys
              </p>
            </div>

            <div className="w-full space-y-4">
              <Button
                onClick={() => {
                  setAuthStep("login")
                  setShowLoginForm(true)
                  clearAuthMessages()
                }}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold py-3"
              >
                Login to Your Account
              </Button>

              <Button
                onClick={() => {
                  setAuthStep("register")
                  setShowLoginForm(true)
                  clearAuthMessages()
                }}
                className="w-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black font-semibold py-3"
              >
                Create New Account
              </Button>
            </div>
          </div>
        </div>

        {/* Login Form Overlay */}
        {showLoginForm && <div className="absolute inset-0 z-50">{renderLoginForm()}</div>}
      </div>
    )
  }

  // Show login form if user is not authenticated or if explicitly requested
  if (showLoginForm || !user || !isLoggedIn || !user.email_confirmed_at) {
    return (
      <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white">
        <div className="flex-1 flex items-center justify-center">
          {renderLoginForm()}
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full max-w-md mx-auto min-h-screen flex flex-col text-white ${activeTab === "protector" || activeTab === "bookings" || activeTab === "chat" ? "bg-[#12151d]" : "bg-black"}`}>
      {/* Header — hidden on home, activity, and chat tabs for full-bleed layouts */}
      {activeTab !== "protector" && activeTab !== "bookings" && activeTab !== "chat" && (
      <header className="fixed top-0 left-0 right-0 w-full max-w-md mx-auto bg-black text-white p-4 z-50 border-b border-gray-800">
        <div className="flex items-center justify-between">
          {activeTab === "booking" ? (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handlePrevStep} className="text-white hover:bg-gray-800">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="text-sm text-gray-400">
                {selectedService === "car-only" ? "Call Instead" : "Book a Protector"}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/PRADO/slideshow/logo.PNG" alt="Protector.Ng" className="h-6 w-6 object-contain" />
                <h1 className="text-xl font-bold">Protector.ng</h1>
              </div>
            </>
          )}
          <div className="text-right">
            <p className="text-[11px] text-blue-200/90 leading-none">
              {heroTimeLabel || "--:--"} {userLocation}
            </p>
          </div>
        </div>
      </header>
      )}

      <main className={`flex-1 pb-24 ${activeTab === "protector" || activeTab === "bookings" || activeTab === "chat" ? "pt-0" : "pt-20"}`}>
        {/* Home/Protector Tab */}
        {activeTab === "protector" && (
          <ProtectorUberHome
            userLocation={userLocation}
            clientName={
              userProfile.firstName ||
              user?.user_metadata?.first_name ||
              user?.user_metadata?.firstName ||
              user?.email?.split("@")[0] ||
              ""
            }
            timeLabel={heroTimeLabel}
            activeBookings={activeBookings}
            bookingHistory={bookingHistory}
            isLoggedIn={Boolean(user?.id)}
            onRequireLogin={() => {
              setAuthStep("login")
              setShowLoginForm(true)
              clearAuthMessages()
            }}
            onQuickServiceSubmitted={handleQuickServiceSubmitted}
            onAgentClick={handleBookService}
            onBookVehicleClick={handleBookVehicle}
            onContactCall={handleBookCarOnly}
            onContactMail={handleBookViaMail}
            onProtectorClick={handleBookService}
            onVehicleClick={handleBookVehicle}
            onBulletproofVehicleClick={handleBookBulletproofVehicle}
          />
        )}

        {/* Booking Flow */}
        {activeTab === "booking" && (
          <div className="p-4 space-y-6">
            {/* Login Prompt for Unauthenticated Users */}
            {!user?.id && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <div>
                    <p className="text-yellow-200 font-medium">Login Required</p>
                    <p className="text-yellow-300 text-sm">Please log in to create a booking. Your session will be saved.</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 1: Location and Time */}
            {bookingStep === 1 && (
              <div className="space-y-6">
                {selectedService === "armed-protection" ? (
                  <div className="overflow-hidden rounded-lg border border-white/10 bg-[#1c2331] p-5">
                    <div className="flex items-center gap-4">
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white/15 ring-2 ring-white/25">
                        <img
                          src={
                            dressCodeOptions.find((option) => option.id === selectedDressCode)?.image ||
                            "/images/tactical-casual-agent.png"
                          }
                          alt="Professional Protector"
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <h2 className="text-lg font-semibold leading-snug text-white">
                          Where do you need your Protector?
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                          Tell us where to meet you. We deploy veteran and former law enforcement Protectors.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-center">
                    <h2 className="text-xl font-semibold text-white">
                      Where should we have your motorcade meet you?
                    </h2>
                  </div>
                )}

                {/* City Selection Dropdown */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Select City</label>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <select
                      value={selectedCity}
                      onChange={(e) => {
                        setSelectedCity(e.target.value)
                        setUserLocation(e.target.value)
                        // Don't set default pickup location - let user enter manually or use auto-detect
                      }}
                      className="flex-1 p-4 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      {cities.map((city) => (
                        <option key={city.id} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium text-gray-400">Where should we pick you up?</label>
                    <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={pickupLocation}
                        onChange={(e) => {
                          const query = e.target.value
                          setPickupLocation(query)
                          setDetectedPickupCoordinates(null)
                          queuePickupSuggestions(query)
                        }}
                        placeholder="Enter your pickup address"
                        className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void getCurrentLocation()}
                        disabled={isLoadingLocation}
                        title="Use current location"
                        aria-label="Use current location"
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        {isLoadingLocation ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MapPin className="h-4 w-4 text-white" />
                        )}
                      </button>
                    </div>

                    {/* Location Suggestions */}
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 bg-gray-800 border border-gray-700 rounded-lg mt-1 max-h-48 overflow-y-auto">
                        {locationSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setPickupLocation(suggestion)
                              setShowLocationSuggestions(false)
                              void resolveAddressCoordinates(suggestion).then((coordinates) => {
                                if (coordinates) {
                                  setDetectedPickupCoordinates(coordinates)
                                }
                              })
                            }}
                            className="w-full text-left p-3 hover:bg-gray-700 text-white text-sm border-b border-gray-700 last:border-b-0"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span>{suggestion}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium text-gray-400">Where are you going?</label>
                    <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
                      <MapPin className="h-5 w-5 text-red-400" />
                      <input
                        type="text"
                        value={destinationLocation}
                        onChange={(e) => {
                          const query = e.target.value
                          setDestinationLocation(query)
                          setDetectedDestinationCoordinates(null)
                          queueDestinationSuggestions(query)
                        }}
                        placeholder="Enter your destination address"
                        className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                      />
                    </div>

                    {/* Destination Suggestions */}
                    {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 bg-gray-800 border border-gray-700 rounded-lg mt-1 max-h-48 overflow-y-auto">
                        {destinationSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setDestinationLocation(suggestion)
                              setShowDestinationSuggestions(false)
                              void resolveAddressCoordinates(suggestion).then((coordinates) => {
                                if (coordinates) {
                                  setDetectedDestinationCoordinates(coordinates)
                                }
                              })
                            }}
                            className="w-full text-left p-3 hover:bg-gray-700 text-white text-sm border-b border-gray-700 last:border-b-0"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-red-400 flex-shrink-0" />
                              <span>{suggestion}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Multiple destinations for all services */}
                  <div className="space-y-4">
                    <div className="space-y-4">
                      {/* Display added destinations */}
                      {multipleDestinations.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-400">Additional Stops</label>
                            <button
                              onClick={() => setMultipleDestinations([])}
                              className="text-xs text-red-400 hover:text-red-300 underline"
                            >
                              Clear All
                            </button>
                          </div>
                          {multipleDestinations.map((destination, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                              <MapPin className="h-4 w-4 text-blue-400 flex-shrink-0" />
                              <span className="flex-1 text-white text-sm">{destination}</span>
                              <button
                                onClick={() => {
                                  setMultipleDestinations((prev) => prev.filter((_, i) => i !== index))
                                }}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                    {/* Add new destination input */}
                    <div className="space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-400">Add Another Stop (Optional)</label>
                        <span className="text-xs text-gray-500">
                          {multipleDestinations.length}/10 stops
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
                        <MapPin className="h-5 w-5 text-blue-400" />
                        <input
                          type="text"
                          value={currentDestinationInput}
                          onChange={(e) => {
                            const query = e.target.value
                            setCurrentDestinationInput(query)
                            queueExtraStopSuggestions(query)
                          }}
                          placeholder="Enter additional stop address"
                          className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                          disabled={multipleDestinations.length >= 10}
                        />
                        {currentDestinationInput.trim() && multipleDestinations.length < 10 && (
                          <button
                            onClick={() => {
                              if (
                                currentDestinationInput.trim() &&
                                !multipleDestinations.includes(currentDestinationInput.trim()) &&
                                currentDestinationInput.trim() !== destinationLocation
                              ) {
                                setMultipleDestinations((prev) => [...prev, currentDestinationInput.trim()])
                                setCurrentDestinationInput("")
                                setShowCurrentDestinationSuggestions(false)
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                          >
                            Add
                          </button>
                        )}
                        {multipleDestinations.length >= 10 && (
                          <span className="text-xs text-gray-500 px-2">
                            Max reached
                          </span>
                        )}
                      </div>

                        {/* Current destination suggestions */}
                        {showCurrentDestinationSuggestions && currentDestinationSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-10 bg-gray-800 border border-gray-700 rounded-lg mt-1 max-h-48 overflow-y-auto">
                            {currentDestinationSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  if (
                                    !multipleDestinations.includes(suggestion) &&
                                    suggestion !== destinationLocation
                                  ) {
                                    setMultipleDestinations((prev) => [...prev, suggestion])
                                    setCurrentDestinationInput("")
                                    setShowCurrentDestinationSuggestions(false)
                                  }
                                }}
                                className="w-full text-left p-3 hover:bg-gray-700 text-white text-sm border-b border-gray-700 last:border-b-0"
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                  <span>{suggestion}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {multipleDestinations.length > 0 && (
                        <div className="text-center text-sm text-gray-400">
                          Total stops: {multipleDestinations.length + 1} (including main destination)
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg cursor-pointer"
                    onClick={() => setShowCalendar(!showCalendar)}
                  >
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-400">Pickup Date</p>
                      <p className="text-white font-medium">{pickupDate}</p>
                    </div>
                  </div>

                  {showCalendar && renderCalendar()}

                  <div
                    className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg cursor-pointer"
                    onClick={() => setShowTimePicker(!showTimePicker)}
                  >
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-400">Pickup Time</p>
                      <p className="text-white font-medium">{`${selectedHour}:${selectedMinute.toString().padStart(2, "0")} ${selectedPeriod}`}</p>
                    </div>
                  </div>

                  {showTimePicker && renderTimePicker()}

                  <div
                    className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg cursor-pointer"
                    onClick={() => setShowDurationPicker(!showDurationPicker)}
                  >
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-400">How many days do you need protection?</p>
                      <p className="text-white font-medium">{duration}</p>
                    </div>
                  </div>

                  {showDurationPicker && (
                    <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                      {durationOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setDuration(option)
                            setShowDurationPicker(false)
                          }}
                          className={`w-full text-left p-3 rounded ${
                            duration === option ? "bg-white text-black" : "text-white hover:bg-gray-700"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowCustomDurationInput(true)}
                        className="w-full text-left p-3 rounded text-blue-400 hover:bg-gray-700"
                      >
                        Custom Duration
                      </button>

                      {showCustomDurationInput && (
                        <div className="space-y-3 p-3 bg-gray-700 rounded">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={customDuration}
                              onChange={(e) => setCustomDuration(e.target.value)}
                              placeholder="Enter number"
                              min="1"
                              max="365"
                              className="flex-1 p-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                            />
                            <select
                              value={customDurationUnit}
                              onChange={(e) => setCustomDurationUnit(e.target.value)}
                              className="p-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                            >
                              <option value="days">Days</option>
                              <option value="weeks">Weeks</option>
                              <option value="months">Months</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const parsedDuration = Number.parseInt(customDuration)
                                if (customDuration && !isNaN(parsedDuration) && parsedDuration >= 1) {
                                  setDuration(`${customDuration} ${customDurationUnit}`)
                                  setShowCustomDurationInput(false)
                                  setShowDurationPicker(false)
                                  setCustomDuration("")
                                }
                              }}
                              className="flex-1 p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => {
                                setShowCustomDurationInput(false)
                                setCustomDuration("")
                              }}
                              className="flex-1 p-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleNextStep}
                  disabled={!pickupLocation.trim() || !destinationLocation.trim()}
                  className={`w-full font-semibold py-3 ${
                    !pickupLocation.trim() || !destinationLocation.trim()
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-white text-black hover:bg-gray-200"
                  }`}
                >
                  Next
                </Button>
              </div>
            )}

            {bookingStep === 2 && selectedService === "armed-protection" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">Choose your Protector</h2>
                  <p className="text-gray-400">
                    Select a verified operator or let us assign the best available Protector.
                  </p>
                </div>

                <ProtectorListingPicker
                  listings={protectorListings}
                  isLoading={isLoadingProtectorListings}
                  selectedListingId={selectedProtectorListingId}
                  assignAutomatically={assignProtectorAutomatically}
                  onSelectListing={handleSelectProtectorListing}
                  onAssignAutomatically={handleAssignProtectorAutomatically}
                />

                <Button
                  onClick={handleNextStep}
                  disabled={!assignProtectorAutomatically && !selectedProtectorListingId}
                  className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-3 disabled:bg-gray-600 disabled:text-gray-400"
                >
                  Next
                </Button>
              </div>
            )}

            {bookingStep === 3 && selectedService === "armed-protection" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">Protector Type</h2>
                  <p className="text-gray-400">Choose whether you need armed or unarmed protection.</p>
                </div>

                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      protectorArmed
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-600 bg-gray-800 hover:border-gray-500"
                    }`}
                    onClick={() => setProtectorArmed(true)}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-6 w-6 text-blue-400" />
                      <div>
                        <h3 className="text-white font-semibold">Armed Protector</h3>
                        <p className="text-gray-400 text-sm">
                          Licensed armed veteran or ex-law enforcement operator for high-threat movement
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      !protectorArmed
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-600 bg-gray-800 hover:border-gray-500"
                    }`}
                    onClick={() => setProtectorArmed(false)}
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-6 w-6 text-green-400" />
                      <div>
                        <h3 className="text-white font-semibold">Unarmed Protector</h3>
                        <p className="text-gray-400 text-sm">
                          Discreet veteran or former law enforcement security without visible weapons
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleNextStep}
                  className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-3"
                >
                  Next
                </Button>
              </div>
            )}

            {bookingStep === 3.5 && selectedService === "armed-protection" && !protectorArmed && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">Transportation Needed?</h2>
                  <p className="text-gray-400">Do you need a car along with your unarmed protectors?</p>
                </div>

                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      unarmedNeedsCar
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-600 bg-gray-800 hover:border-gray-500"
                    }`}
                    onClick={() => setUnarmedNeedsCar(true)}
                  >
                    <div className="flex items-center gap-3">
                      <Car className="h-6 w-6 text-blue-400" />
                      <div>
                        <h3 className="text-white font-semibold">Protectors + Car</h3>
                        <p className="text-gray-400 text-sm">Unarmed protectors with transportation included</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      !unarmedNeedsCar
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-600 bg-gray-800 hover:border-gray-500"
                    }`}
                    onClick={() => setUnarmedNeedsCar(false)}
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-6 w-6 text-green-400" />
                      <div>
                        <h3 className="text-white font-semibold">Protectors Only</h3>
                        <p className="text-gray-400 text-sm">Just the unarmed protectors, no transportation needed</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleNextStep}
                  className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-3"
                >
                  Next
                </Button>
              </div>
            )}

            {bookingStep === 4 && selectedService === "armed-protection" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">How many Protectee?</h2>
                  <p className="text-gray-400">
                    Let us know how many people need protection, whether you're solo or in a group.
                  </p>
                </div>

                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-4 bg-gray-800 rounded-full px-6 py-3">
                    <button
                      onClick={() => setProtecteeCount(Math.max(1, protecteeCount - 1))}
                      className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600"
                    >
                      -
                    </button>
                    <span className="text-white font-medium min-w-[100px] text-center">
                      {protecteeCount === 1 ? "Just Me" : `${protecteeCount} Protectee`}
                    </span>
                    <button
                      onClick={() => setProtecteeCount(protecteeCount + 1)}
                      className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">How many Protectors?</h2>
                  <p className="text-gray-400">
                    Based on the number of Protectee, we recommend assigning 1 Protector to oversee your detail.
                  </p>
                </div>

                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-4 bg-gray-800 rounded-full px-6 py-3">
                    <button
                      onClick={() => setProtectorCount(Math.max(1, protectorCount - 1))}
                      className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600"
                    >
                      -
                    </button>
                    <span className="text-white font-medium min-w-[100px] text-center">
                      {protectorCount} Protector{protectorCount > 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={() => setProtectorCount(protectorCount + 1)}
                      className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleNextStep}
                  className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-3"
                >
                  Next
                </Button>
              </div>
            )}

            {bookingStep === 5 && selectedService === "armed-protection" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">Pick Dress Code</h2>
                  <p className="text-gray-400">Protectors tailor their uniform for any occasion. Armed personnel will be in tactical gear.</p>
                </div>

                <div className="relative h-96 bg-gray-800 rounded-lg overflow-hidden">
                  {dressCodeOptions.map((option, index) => (
                    <div
                      key={option.id}
                      className={`absolute inset-0 transition-opacity duration-300 ${
                        selectedDressCode === option.id ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <img
                        src={option.image || "/placeholder.svg"}
                        alt={option.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}

                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center gap-4 bg-gray-800/90 rounded-full px-6 py-3">
                      <button
                        onClick={() => {
                          const currentIndex = dressCodeOptions.findIndex((option) => option.id === selectedDressCode)
                          const prevIndex = currentIndex > 0 ? currentIndex - 1 : dressCodeOptions.length - 1
                          setSelectedDressCode(dressCodeOptions[prevIndex].id)
                        }}
                        className="text-white hover:text-gray-300 transition-colors duration-200 p-2 rounded-full hover:bg-gray-700"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => {
                          const currentIndex = dressCodeOptions.findIndex((option) => option.id === selectedDressCode)
                          const nextIndex = currentIndex < dressCodeOptions.length - 1 ? currentIndex + 1 : 0
                          setSelectedDressCode(dressCodeOptions[nextIndex].id)
                        }}
                        className="text-white font-medium min-w-[120px] text-center hover:text-gray-300 transition-colors duration-200 p-2 rounded-lg hover:bg-gray-700"
                      >
                        {dressCodeOptions.find((option) => option.id === selectedDressCode)?.name}
                      </button>
                      <button
                        onClick={() => {
                          const currentIndex = dressCodeOptions.findIndex((option) => option.id === selectedDressCode)
                          const nextIndex = currentIndex < dressCodeOptions.length - 1 ? currentIndex + 1 : 0
                          setSelectedDressCode(dressCodeOptions[nextIndex].id)
                        }}
                        className="text-white hover:text-gray-300 transition-colors duration-200 p-2 rounded-full hover:bg-gray-700"
                      >
                        →
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleNextStep}
                  disabled={!dressCodeOptions.find((option) => option.id === selectedDressCode)?.available}
                  className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-3 disabled:bg-gray-600 disabled:text-gray-400"
                >
                  Next
                </Button>
              </div>
            )}

            {bookingStep === 4 && selectedService === "car-only" && (
              <div className="space-y-6">
                {selectedService === "car-only" && (
                  <div className="space-y-4">
                    <div className="space-y-4">
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-semibold text-white">How many passengers?</h3>
                        <p className="text-gray-400">
                          Let us know how many people will be traveling to ensure proper vehicle capacity.
                        </p>
                      </div>

                      <div className="flex items-center justify-center">
                        <div className="flex items-center gap-4 bg-gray-800 rounded-full px-6 py-3">
                          <button
                            onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                            className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600"
                          >
                            -
                          </button>
                          <span className="text-white font-medium min-w-[100px] text-center">
                            {passengerCount === 1 ? "Just Me" : `${passengerCount} Passengers`}
                          </span>
                          <button
                            onClick={() => setPassengerCount(passengerCount + 1)}
                            className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="text-white font-medium">Professional Driver Included</div>
                      <div className="text-gray-400 text-sm">
                        All vehicles come with experienced, trained professional drivers
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Select Vehicles</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search vehicles..."
                      value={vehicleSearchQuery}
                      onChange={(e) => setVehicleSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {getFilteredVehicles().map((vehicle) => (
                    <div key={vehicle.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-16 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                          <img
                            src={vehicle.image || "/placeholder.svg"}
                            alt={vehicle.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 max-w-[18rem] flex flex-col gap-0.5 text-left">
                          <h4 className="text-white font-semibold text-base leading-tight">{vehicle.name}</h4>
                          <p className="text-gray-400 text-sm leading-snug">{vehicle.description}</p>
                          <p className="text-gray-400 text-sm leading-snug">Capacity: {vehicle.capacity} people</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <button
                            onClick={() => updateVehicleCount(vehicle.id, -1)}
                            className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600"
                          >
                            -
                          </button>
                          <span className="text-white font-medium min-w-[20px] text-center">
                            {selectedVehicles[vehicle.id] || 0}
                          </span>
                          <button
                            onClick={() => updateVehicleCount(vehicle.id, 1)}
                            className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fleet Summary */}
                <div className="bg-gray-900 rounded-lg p-4 space-y-2">
                  <h4 className="text-white font-medium">Fleet Summary</h4>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Vehicles:</span>
                    <span className="text-white">{getTotalVehicleCount()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Capacity:</span>
                    <span className={`${isCapacityValid() ? "text-green-400" : "text-red-400"}`}>
                      {getTotalCapacity()} people
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Required Capacity:</span>
                    <span className="text-white">
                      {selectedService === "car-only"
                        ? `${passengerCount} people`
                        : `${(protectorCount || 0) + (protecteeCount || 0)} people`}
                    </span>
                  </div>
                  {!isCapacityValid() && (
                    <p className="text-red-400 text-sm">
                      ⚠️ Vehicle capacity insufficient for {selectedService === "car-only" ? "passenger" : "personnel"}{" "}
                      count
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleNextStep}
                  disabled={getTotalVehicleCount() === 0 || !isCapacityValid()}
                  className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-3 disabled:bg-gray-600 disabled:text-gray-400"
                >
                  Next
                </Button>
              </div>
            )}

            {((bookingStep === 6 && selectedService === "armed-protection") ||
              (bookingStep === 5 && selectedService === "car-only")) && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">What's your phone number?</h2>
                  <p className="text-gray-400">A verification code will be sent to this number.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
                    <span className="text-white font-medium">NG +234</span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Phone number"
                      className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                    />
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => setShowKeypad(!showKeypad)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      {showKeypad ? "Hide Keypad" : "Show Keypad"}
                    </button>
                  </div>

                  {showKeypad && renderKeypad()}
                </div>

                <Button
                  onClick={handleNextStep}
                  disabled={phoneNumber.length < 10}
                  className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-3 disabled:bg-gray-600 disabled:text-gray-400"
                >
                  Next
                </Button>
              </div>
            )}

            {/* Membership step removed - users can now proceed directly to summary */}

            {((bookingStep === 8 && selectedService === "armed-protection") ||
              (bookingStep === 7 && selectedService === "car-only")) && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">Booking Summary</h2>
                  <p className="text-gray-400">Review your booking details before proceeding to checkout.</p>
                </div>

                <div className="space-y-4">
                  {selectedService === "armed-protection" && (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-2">Protector Assignment</h3>
                      <div className="space-y-1">
                        <p className="text-gray-300">
                          {selectedProtectorListing?.display_name ||
                            (assignProtectorAutomatically
                              ? "Best available Protector (assigned by operations)"
                              : "Not selected")}
                        </p>
                        {selectedProtectorListing?.daily_rate ? (
                          <p className="text-gray-400 text-sm">
                            Est. ₦{estimateProtectorBookingTotal().toLocaleString()} for this mission
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Service Type */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2">Service Type</h3>
                    <p className="text-gray-300">
                      {selectedService === "car-only"
                        ? "Car Transportation Only"
                        : `${protectorArmed ? "Armed" : "Unarmed"} Protection Service`}
                    </p>
                  </div>

                  {/* Pickup Details */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2">Pickup Details</h3>
                    <div className="space-y-1">
                      <p className="text-gray-300">Location: {pickupLocation || "Not specified"}</p>
                      <p className="text-gray-300">Date: {pickupDate}</p>
                      <p className="text-gray-300">Time: {pickupTime}</p>
                      <p className="text-gray-300">Duration: {duration}</p>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2">Destination Details</h3>
                    <div className="space-y-1">
                      <p className="text-gray-300">Primary Destination: {destinationLocation || "Not specified"}</p>
                      {multipleDestinations && multipleDestinations.length > 0 && (
                        <div className="mt-2">
                          <p className="text-gray-400 text-sm">Additional Destinations:</p>
                          {multipleDestinations.map((dest, index) => (
                            <p key={index} className="text-gray-300 ml-2">
                              • {dest}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Personnel Details - Only for armed protection */}
                  {selectedService === "armed-protection" && (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-2">Personnel Details</h3>
                      <div className="space-y-1">
                        <p className="text-gray-300">Protection Type: {protectorArmed ? "Armed" : "Unarmed"}</p>
                        {!protectorArmed && (
                          <p className="text-gray-300">Transportation: {unarmedNeedsCar ? "Included" : "Not needed"}</p>
                        )}
                        <p className="text-gray-300">Protectee: {protecteeCount}</p>
                        <p className="text-gray-300">Protectors: {protectorCount}</p>
                        <p className="text-gray-300">
                          Dress Code: {dressCodeOptions.find((option) => option.id === selectedDressCode)?.name}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Vehicle Details */}
                  {(selectedService === "car-only" ||
                    (selectedService === "armed-protection" && (protectorArmed || unarmedNeedsCar))) && (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-2">Vehicle Details</h3>
                      <div className="space-y-2">
                        <p className="text-gray-300">Driver: Professional Driver Included</p>
                        {vehicleTypes.map((vehicle) => {
                          const count = selectedVehicles[vehicle.id] || 0
                          if (count > 0) {
                            return (
                              <div key={vehicle.id} className="flex justify-between">
                                <span className="text-gray-300">{vehicle.name}</span>
                                <span className="text-white">{count}x</span>
                              </div>
                            )
                          }
                          return null
                        })}
                        <div className="border-t border-gray-700 pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Vehicles:</span>
                            <span className="text-white">{getTotalVehicleCount()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Capacity:</span>
                            <span className="text-white">{getTotalCapacity()} people</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Details */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2">Contact Details</h3>
                    <p className="text-gray-300">Phone: +234 {phoneNumber}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handlePrevStep}
                    variant="outline"
                    className="flex-1 border-gray-600 text-white hover:bg-gray-800 bg-transparent"
                  >
                    Edit Booking
                  </Button>
                    <Button
                      onClick={() => {
                        console.log('🚀 Send Request button clicked!')
                        console.log('Current state:', { bookingStep, selectedService, user: user?.id })
                        handleNextStep()
                      }}
                      disabled={isCreatingBooking}
                      className="flex-1 bg-white text-black hover:bg-gray-200 font-semibold py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ zIndex: 1000, position: 'relative' }}
                    >
                      {isCreatingBooking ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                          <span>Creating...</span>
                        </div>
                      ) : (
                        'Send Request'
                      )}
                  </Button>
                </div>
              </div>
            )}

            {((bookingStep === 9 && selectedService === "armed-protection") ||
              (bookingStep === 8 && selectedService === "car-only")) && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-white">Checkout</h2>
                  <p className="text-gray-400">Choose your preferred payment method to complete your booking.</p>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Payment Methods</h3>

                  <div className="space-y-3">
                    {/* Bank Transfer */}
                    <div className="bg-gray-800 rounded-lg p-4 border-2 border-gray-600 hover:border-blue-500 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">BANK</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">Bank Transfer</h4>
                          <p className="text-gray-400 text-sm">Direct bank transfer - Most secure</p>
                        </div>
                      </div>
                    </div>

                    {/* Card Payment */}
                    <div className="bg-gray-800 rounded-lg p-4 border-2 border-gray-600 hover:border-blue-500 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-green-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">CARD</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">Debit/Credit Card</h4>
                          <p className="text-gray-400 text-sm">Visa, Mastercard, Verve accepted</p>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Money */}
                    <div className="bg-gray-800 rounded-lg p-4 border-2 border-gray-600 hover:border-blue-500 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-orange-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">USSD</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">USSD Payment</h4>
                          <p className="text-gray-400 text-sm">Pay with your mobile banking USSD</p>
                        </div>
                      </div>
                    </div>

                    {/* Paystack */}
                    <div className="bg-gray-800 rounded-lg p-4 border-2 border-gray-600 hover:border-blue-500 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-purple-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">PAY</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">Paystack</h4>
                          <p className="text-gray-400 text-sm">Secure online payment gateway</p>
                        </div>
                      </div>
                    </div>

                    {/* Flutterwave */}
                    <div className="bg-gray-800 rounded-lg p-4 border-2 border-gray-600 hover:border-blue-500 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-yellow-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">FLW</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">Flutterwave</h4>
                          <p className="text-gray-400 text-sm">Fast and secure payments</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Total */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-center">
                    <span className="text-white font-semibold text-lg">Pricing</span>
                    <p className="text-gray-300 text-sm mt-2">
                      Final pricing will be provided by our team after reviewing your request.
                    </p>
                    <p className="text-blue-400 text-sm mt-1">
                      An invoice will be sent to you for approval before deployment.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handlePrevStep}
                    variant="outline"
                    className="flex-1 border-gray-600 text-white hover:bg-gray-800 bg-transparent"
                  >
                    Back to Summary
                  </Button>
                  <Button
                    onClick={() => {
                      alert("🎉 Booking confirmed! You will receive a confirmation SMS shortly.")
                      setActiveTab("bookings")
                      setBookingStep(1)
                    }}
                    className="flex-1 bg-green-600 text-white hover:bg-green-700 font-semibold py-3"
                  >
                    Complete Payment
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}


        {/* Bookings / Activity Tab */}
        {activeTab === "bookings" && !showChatThread && (
          <ActivityPageLayout
            isLoadingBookings={isLoadingBookings}
            mapContent={(() => {
              const trackingBooking = selectedTrackingBookingId
                ? activeBookings.find(
                    (booking) => getBookingTrackingId(booking) === selectedTrackingBookingId,
                  )
                : activeBookings[0]

              if (trackingBooking) {
                return renderLiveTrackingMap(trackingBooking, "hero")
              }

              return (
                <div className="flex h-full w-full items-center justify-center bg-gray-900">
                  <div className="space-y-2 px-4 text-center">
                    <div className="mx-auto h-4 w-4 animate-pulse rounded-full bg-blue-500" />
                    <p className="text-sm font-medium text-white">Trip tracking</p>
                    <p className="text-xs text-gray-400">
                      Book protection to see your live route map here.
                    </p>
                  </div>
                </div>
              )
            })()}
          >
            {activeBookings.length > 0 ? (
              <div className="space-y-4 p-4 pt-1">
                {activeBookings.map((booking) => {
                  const bookingTrackingId = getBookingTrackingId(booking)
                  const isTrackingSelected = selectedTrackingBookingId === bookingTrackingId
                  const quick = getQuickServiceFromBooking(booking)
                  const mapMode = getActivityMapMode(booking)
                  const isHomeSecurity = quick?.quick_service_type === "private_home_security"
                  const isItinerary = quick?.quick_service_type === "itinerary_planning"
                  const isSiteBooking = mapMode === "site"
                  const siteAddress =
                    quick?.address ||
                    booking.pickupLocation ||
                    "Location pending"

                  return (
                    <div key={booking.id} className="space-y-4 rounded-lg bg-gray-900 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
                          <span className="font-semibold capitalize text-green-400">
                            {booking.status.replace("-", " ")}
                          </span>
                        </div>
                        {isItinerary ? (
                          <span className="text-sm text-amber-300">Under review</span>
                        ) : isSiteBooking || isHomeSecurity ? (
                          <span className="font-semibold text-white">Awaiting review</span>
                        ) : (
                          <span className="font-semibold text-white">
                            ETA: {booking.estimatedArrival || "Pending"}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-white">
                        {isSiteBooking && !isHomeSecurity
                          ? `Protector | ${siteAddress.split(",")[0]?.trim() || siteAddress}`
                          : booking.protectorName}
                      </p>

                      {isHomeSecurity ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Type</span>
                            <span className="text-white capitalize">{quick?.security_type || "armed"}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Location</span>
                            <span className="text-right text-white">{quick?.address || booking.pickupLocation}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Team</span>
                            <span className="text-white">
                              {quick?.protector_count || booking.protector_count || 1} guard
                              {(quick?.protector_count || booking.protector_count || 1) > 1 ? "s" : ""} ·{" "}
                              {quick?.protectee_count || 1} protectee
                              {(quick?.protectee_count || 1) > 1 ? "s" : ""}
                            </span>
                          </div>
                          {quick?.protectee_names && quick.protectee_names.length > 0 ? (
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-400">Protectees</span>
                              <span className="text-right text-white">{quick.protectee_names.join(", ")}</span>
                            </div>
                          ) : null}
                        </div>
                      ) : isItinerary ? (
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-gray-400">Your request</p>
                            <p className="mt-1 text-white">{quick?.description || booking.destination}</p>
                          </div>
                          {quick?.itinerary_file_name ? (
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-400">File</span>
                              <span className="text-right text-white">{quick.itinerary_file_name}</span>
                            </div>
                          ) : null}
                          <p className="text-xs text-gray-400">
                            Operator is reviewing your itinerary before confirming stops.
                          </p>
                        </div>
                      ) : isSiteBooking ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start space-x-3">
                            <div className="mt-1 h-3 w-3 rounded-full bg-emerald-500" />
                            <div>
                              <p className="text-sm text-white">{siteAddress}</p>
                              <p className="text-xs text-gray-400">
                                Location{booking.startTime ? ` • ${booking.startTime}` : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-start space-x-3">
                            <div className="mt-1 h-3 w-3 rounded-full bg-green-500" />
                            <div>
                              <p className="text-sm text-white">{booking.pickupLocation}</p>
                              <p className="text-xs text-gray-400">Pickup • {booking.startTime}</p>
                            </div>
                          </div>
                          <div className="ml-1.5 h-4 w-0.5 bg-gray-600" />
                          <div className="flex items-start space-x-3">
                            <div className="mt-1 h-3 w-3 rounded-full bg-red-500" />
                            <div>
                              <p className="text-sm text-white">{booking.destination}</p>
                              <p className="text-xs text-gray-400">Destination</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {mapMode === "trip" ? (
                          <Button
                            onClick={() => setSelectedTrackingBookingId(bookingTrackingId || null)}
                            disabled={!bookingTrackingId}
                            className={`text-white ${
                              isTrackingSelected
                                ? "bg-blue-700 hover:bg-blue-800"
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                          >
                            {isTrackingSelected ? "Tracking on Map" : "Track Trip on Map"}
                          </Button>
                        ) : isSiteBooking || isHomeSecurity ? (
                          <Button
                            onClick={() => setSelectedTrackingBookingId(bookingTrackingId || null)}
                            disabled={!bookingTrackingId}
                            className={`text-white ${
                              isTrackingSelected
                                ? "bg-emerald-700 hover:bg-emerald-800"
                                : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                          >
                            {isTrackingSelected ? "Viewing Location" : "View Location"}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setSelectedTrackingBookingId(bookingTrackingId || null)}
                            disabled={!bookingTrackingId}
                            className={`text-white ${
                              isTrackingSelected
                                ? "bg-blue-700 hover:bg-blue-800"
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                          >
                            {isTrackingSelected ? "Viewing Request" : "View Request"}
                          </Button>
                        )}
                        <Button
                          onClick={() => handleChatNavigation(booking)}
                          className="bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          View Chat
                        </Button>
                        <Button
                          onClick={() => handleContact(booking)}
                          className="bg-gray-700 text-white hover:bg-gray-600"
                        >
                          Contact
                        </Button>
                        <Button
                          onClick={() => handleCancelBooking(booking)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4">
                <div className="space-y-4 rounded-lg bg-gray-900 p-6 text-center">
                  <h3 className="text-xl font-semibold text-white">No active bookings</h3>
                  <p className="text-gray-400">Easily book a Protector within minutes.</p>
                  <p className="text-gray-400">Gain peace of mind and ensure your safety.</p>

                  <Button
                    onClick={handleBookService}
                    className="!bg-gray-700 !text-white hover:!bg-gray-600 hover:!text-white px-6 py-3 font-semibold"
                    style={{ backgroundColor: "#374151", color: "white" }}
                  >
                    Book a Protector
                  </Button>
                </div>
              </div>
            )}
          </ActivityPageLayout>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-2xl font-semibold text-white">Booking History</h2>
              <p className="text-gray-400 text-sm">Your completed protection services</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingBookings ? (
                // Loading State
                <div className="p-4">
                  <div className="bg-gray-900 rounded-lg p-6">
                    <LoadingLogo fullscreen={false} label="Loading history..." />
                  </div>
                </div>
              ) : bookingHistory.length > 0 ? (
                <div className="p-4 space-y-4">
                  {bookingHistory.map((booking) => (
                  <div key={booking.id} className="bg-gray-900 rounded-lg p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <span className="text-gray-400 text-sm capitalize">{booking.type.replace("-", " ")}</span>
                      </div>
                      <span className="text-white font-semibold">{booking.cost}</span>
                    </div>

                    {/* Service Info */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-semibold">{booking.protectorName || booking.vehicleType}</h3>
                        <p className="text-gray-400 text-sm">
                          {booking.date} • {booking.duration}
                        </p>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${i < (booking.rating || 0) ? "text-yellow-400" : "text-gray-600"}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3 pt-2">
                      <Button 
                        onClick={() => handleChatNavigation(booking)}
                        className="flex-1 bg-blue-600 text-white hover:bg-blue-700 text-sm"
                      >
                        View Chat
                      </Button>
                      <Button className="flex-1 bg-gray-700 text-white hover:bg-gray-600 text-sm">Book Again</Button>
                      <Button className="flex-1 bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm">
                        Receipt
                      </Button>
                    </div>
                  </div>
                ))}
                </div>
              ) : (
                // No Booking History
                <div className="p-4">
                  <div className="bg-gray-900 rounded-lg p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto">
                      <Calendar className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">No Booking History</h3>
                    <p className="text-gray-400">You haven't completed any protection services yet.</p>
                    <Button 
                      onClick={() => setActiveTab("protector")}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                    >
                      Book Your First Service
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Tab — booking list → direct message thread */}
        {activeTab === "chat" && (
          <div className="flex h-full min-h-[calc(100vh-6rem)] flex-col">
            <ClientChatInterface
              activeBookings={activeBookings}
              selectedBooking={selectedChatBooking}
              chatMessages={chatMessages}
              isLoadingChatMessages={isLoadingChatMessages}
              isCreatingBookingChat={isCreatingBookingChat}
              newChatMessage={newChatMessage}
              onNewChatMessageChange={setNewChatMessage}
              onSendMessage={sendChatMessage}
              onSendAttachment={sendChatAttachment}
              onSelectBooking={handleSelectChatBooking}
              onBackToList={handleBackToChatList}
              onBookProtector={handleBookService}
              onCallOperator={handleCallOperator}
              onApprovePayment={handleApprovePayment}
              isSendingMessage={isSendingMessage}
              messagesEndRef={messagesEndRef}
              showThread={showChatThread}
              userInitials={userDisplayName}
              userAvatarUrl={userProfile.avatarUrl}
              onAccountClick={() => setActiveTab("account")}
            />
          </div>
        )}

        {/* Operator Dashboard Tab */}
        {activeTab === "operator" && userRole === "agent" && (
          <div className="flex flex-col h-full bg-gray-900">
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
              <h2 className="text-2xl font-semibold text-white">Operator Dashboard</h2>
              <p className="text-gray-400 text-sm">Manage protection requests and deployments</p>
            </div>

            {/* Bookings List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {operatorBookings.map((booking) => (
                <div key={booking.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  {/* Booking Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">New Protection Request</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      booking.status === "pending" ? "bg-yellow-600 text-yellow-100" :
                      booking.status === "accepted" ? "bg-green-600 text-green-100" :
                      booking.status === "deployed" ? "bg-blue-600 text-blue-100" :
                      "bg-red-600 text-red-100"
                    }`}>
                      {booking.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Booking Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Service:</span>
                      <span className="text-white">{booking.service}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Client:</span>
                      <span className="text-white">{booking.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pickup:</span>
                      <span className="text-white underline">{booking.pickup}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date & Time:</span>
                      <span className="text-white">{booking.date} at {booking.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white">{booking.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Destination:</span>
                      <span className="text-white underline">{booking.destination}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Contact:</span>
                      <span className="text-white">{booking.clientPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pricing:</span>
                      <span className="text-white">{booking.pricing}</span>
                    </div>
                  </div>

                  {/* Submitted Time */}
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <span className="text-xs text-gray-500">Submitted: {booking.submittedAt}</span>
                  </div>

                  {/* Action Buttons */}
                  {booking.status === "pending" && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        onClick={() => handleAcceptBooking(booking.id)}
                        className="flex-1 bg-green-600 text-white hover:bg-green-700"
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleRejectBooking(booking.id)}
                        className="flex-1 bg-red-600 text-white hover:bg-red-700"
                      >
                        Reject
                      </Button>
                    </div>
                  )}

                  {booking.status === "accepted" && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        onClick={() => handleSendInvoice(booking.id)}
                        className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Send Invoice
                      </Button>
                      <Button
                        onClick={() => handleDeployBooking(booking.id)}
                        className="flex-1 bg-green-600 text-white hover:bg-green-700"
                      >
                        Deploy
                      </Button>
                    </div>
                  )}

                  {booking.status === "deployed" && (
                    <div className="mt-4">
                      <div className="bg-green-600 text-green-100 px-3 py-2 rounded text-center">
                        ✅ Service Deployed
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  O
                </div>
                <input
                  type="text"
                  value={operatorChatMessage}
                  onChange={(e) => setOperatorChatMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
                />
                <Button
                  onClick={handleOperatorChatSend}
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2"
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === "account" && (
          <div className="p-4 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">My Profile</h2>
              <Button onClick={handleLogout} className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 text-sm">
                Logout
              </Button>
            </div>

            {/* User Welcome Card */}
            <div className="rounded-lg border border-white/10 bg-[#1c2331] p-6">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleAvatarUpload(file)
                }}
              />
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 backdrop-blur transition-opacity hover:opacity-90 disabled:cursor-wait"
                  aria-label="Change profile photo"
                >
                  {userProfile.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt={userDisplayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {userProfile.firstName?.charAt(0)?.toUpperCase() || userProfile.email?.charAt(0)?.toUpperCase() || 'U'}
                      {userProfile.lastName?.charAt(0)?.toUpperCase() || ''}
                    </span>
                  )}
                  {isUploadingAvatar && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </span>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold text-white">
                    Welcome, {userProfile.firstName || userProfile.email?.split('@')[0] || 'User'}!
                  </h3>
                  <p className="truncate text-sm text-gray-400">{userProfile.email || 'No email'}</p>
                  {user && user.email_confirmed_at && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-white/90">
                      <CheckCircle className="h-3 w-3" />
                      <span>Verified Account</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/15 px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Car className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium">Trips</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-white">{accountStats.totalTrips}</p>
                </div>
                <div className="rounded-lg bg-white/15 px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Coins className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium">Coins Earned</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-white">{accountStats.coinsEarned.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              {/* Profile Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Personal Information</h3>
                {!isEditingProfile && (
                  <Button
                    onClick={startEditingProfile}
                    className="bg-gray-700 text-white hover:bg-gray-600 px-4 py-2 text-sm"
                  >
                    Edit Profile
                  </Button>
                )}
              </div>

              {/* Profile Details */}
              {!isEditingProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Phone Number</h4>
                      <p className="text-white">{userProfile.phone || "Not provided"}</p>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Address</h4>
                      <p className="text-white">{userProfile.address || "Not provided"}</p>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-1">Emergency Contact</h4>
                      <p className="text-white">{userProfile.emergencyContact || "Not provided"}</p>
                      {userProfile.emergencyPhone && (
                        <p className="text-gray-400 text-sm">{userProfile.emergencyPhone}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Profile Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">First Name</label>
                      <input
                        type="text"
                        value={editProfileForm.firstName}
                        onChange={(e) => handleEditProfileChange("firstName", e.target.value)}
                        className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Last Name</label>
                      <input
                        type="text"
                        value={editProfileForm.lastName}
                        onChange={(e) => handleEditProfileChange("lastName", e.target.value)}
                        className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Phone Number</label>
                    <input
                      type="tel"
                      value={editProfileForm.phone}
                      onChange={(e) => handleEditProfileChange("phone", e.target.value)}
                      className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Address</label>
                    <input
                      type="text"
                      value={editProfileForm.address}
                      onChange={(e) => handleEditProfileChange("address", e.target.value)}
                      className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={editProfileForm.emergencyContact}
                      onChange={(e) => handleEditProfileChange("emergencyContact", e.target.value)}
                      className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      value={editProfileForm.emergencyPhone}
                      onChange={(e) => handleEditProfileChange("emergencyPhone", e.target.value)}
                      className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={cancelEditingProfile}
                      className="flex-1 bg-gray-700 text-white hover:bg-gray-600"
                      disabled={authLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={saveProfileChanges}
                      className="flex-1 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                      disabled={authLoading}
                    >
                      {authLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </div>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>

                  {authError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-4">
                      <p className="text-red-400 text-sm">{authError}</p>
                    </div>
                  )}

                  {authSuccess && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mt-4">
                      <p className="text-green-400 text-sm">{authSuccess}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Account Actions */}
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">
                  Support
                </h4>
                <div className="space-y-2">
                  <Link 
                    href="/account/help"
                    prefetch={true}
                    onClick={() => {
                      setNavigatingTo('/account/help')
                      setTimeout(() => setNavigatingTo(null), 1000)
                    }}
                    className="flex items-center justify-between w-full text-left p-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Help Center</span>
                    {navigatingTo === '/account/help' && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                  </Link>
                  <Link 
                    href="/account/support"
                    prefetch={true}
                    onClick={() => {
                      setNavigatingTo('/account/support')
                      setTimeout(() => setNavigatingTo(null), 1000)
                    }}
                    className="flex items-center justify-between w-full text-left p-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Contact Support</span>
                    {navigatingTo === '/account/support' && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                  </Link>
                  <Link 
                    href="/account/privacy-policy"
                    prefetch={true}
                    onClick={() => {
                      setNavigatingTo('/account/privacy-policy')
                      setTimeout(() => setNavigatingTo(null), 1000)
                    }}
                    className="flex items-center justify-between w-full text-left p-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Privacy Policy</span>
                    {navigatingTo === '/account/privacy-policy' && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                  </Link>
                  <Link 
                    href="/account/terms"
                    prefetch={true}
                    onClick={() => {
                      setNavigatingTo('/account/terms')
                      setTimeout(() => setNavigatingTo(null), 1000)
                    }}
                    className="flex items-center justify-between w-full text-left p-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Terms of Service</span>
                    {navigatingTo === '/account/terms' && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                  </Link>
                </div>
              </div>

              {/* Logout Section */}
              <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-4">
                <h4 className="text-red-400 font-medium mb-2">Danger Zone</h4>
                <p className="text-gray-400 text-sm mb-3">
                  Once you logout, you'll need to sign in again to access your account.
                </p>
                <Button 
                  onClick={handleLogout}
                  className="w-full bg-red-600 text-white hover:bg-red-700 font-semibold py-3"
                >
                  Logout from Account
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === "cars" && (
          <div className="p-4 space-y-6">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h3 className="text-lg font-semibold text-white mb-2">Professional Driver Included</h3>
              <p className="text-gray-300">
                All our vehicles come with experienced, trained professional drivers for your safety and convenience.
              </p>
            </div>
          </div>
        )}
      </main>


      {/* Footer — Uber-style bottom nav */}
      <footer className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-[#121212] text-white px-4 py-3 z-50 border-t border-[#2a2a2a]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveTab("protector")}
            className={`flex flex-col items-center justify-center gap-1 min-w-[4rem] ${
              activeTab === "protector" ? "text-white" : "text-gray-500"
            }`}
          >
            <Home className="h-5 w-5" strokeWidth={activeTab === "protector" ? 2.5 : 2} />
            <span className="text-[11px] font-medium">Home</span>
          </button>

          <button
            onClick={() => {
              setShowChatThread(false)
              setActiveTab("chat")
            }}
            className={`flex flex-col items-center justify-center gap-1 min-w-[4rem] ${
              activeTab === "chat" ? "text-white" : "text-gray-500"
            }`}
          >
            <MessageSquare className="h-5 w-5" strokeWidth={activeTab === "chat" ? 2.5 : 2} />
            <span className="text-[11px] font-medium">Chat</span>
          </button>

          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex flex-col items-center justify-center gap-1 min-w-[4rem] ${
              activeTab === "bookings" ? "text-white" : "text-gray-500"
            }`}
          >
            <FileText className="h-5 w-5" strokeWidth={activeTab === "bookings" ? 2.5 : 2} />
            <span className="text-[11px] font-medium">Activity</span>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`flex flex-col items-center justify-center gap-1 min-w-[4rem] ${
              activeTab === "account" ? "text-white" : "text-gray-500"
            }`}
          >
            <User className="h-5 w-5" strokeWidth={activeTab === "account" ? 2.5 : 2} />
            <span className="text-[11px] font-medium">Account</span>
          </button>

          {userRole === "agent" && (
            <button
              onClick={() => setActiveTab("operator")}
              className={`flex flex-col items-center justify-center gap-1 min-w-[4rem] ${
                activeTab === "operator" ? "text-white" : "text-gray-500"
              }`}
            >
              <Shield className="h-5 w-5" strokeWidth={activeTab === "operator" ? 2.5 : 2} />
              <span className="text-[11px] font-medium">Operator</span>
            </button>
          )}
        </div>
      </footer>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Create Invoice</h3>
            
            <div className="space-y-4">
              {/* Currency Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
                <select
                  value={invoiceForm.currency}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                >
                  <option value="NGN">Nigerian Naira (₦)</option>
                  <option value="USD">US Dollar ($)</option>
                </select>
              </div>

              {/* Base Price */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Base Price</label>
                <input
                  type="number"
                  value={invoiceForm.basePrice}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, basePrice: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Hourly Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Hourly Rate</label>
                <input
                  type="number"
                  value={invoiceForm.hourlyRate}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, hourlyRate: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Vehicle Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle Fee</label>
                <input
                  type="number"
                  value={invoiceForm.vehicleFee}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, vehicleFee: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Personnel Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Personnel Fee</label>
                <input
                  type="number"
                  value={invoiceForm.personnelFee}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, personnelFee: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Duration (hours)</label>
                <input
                  type="number"
                  value={invoiceForm.duration}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-3">Invoice Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Base Price:</span>
                  <span className="text-white">{invoiceForm.currency === "NGN" ? "₦" : "$"}{invoiceForm.basePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Hourly Rate ({invoiceForm.duration}h):</span>
                  <span className="text-white">{invoiceForm.currency === "NGN" ? "₦" : "$"}{(invoiceForm.hourlyRate * invoiceForm.duration).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Vehicle Fee:</span>
                  <span className="text-white">{invoiceForm.currency === "NGN" ? "₦" : "$"}{invoiceForm.vehicleFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Personnel Fee:</span>
                  <span className="text-white">{invoiceForm.currency === "NGN" ? "₦" : "$"}{invoiceForm.personnelFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-600">
                  <span className="text-white">Total Amount:</span>
                  <span className="text-white">{invoiceForm.currency === "NGN" ? "₦" : "$"}{calculateInvoiceTotal().total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowInvoiceModal(false)}
                className="flex-1 bg-gray-600 text-white hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateInvoice}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              >
                Send Invoice
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Contact Support</h3>
            <p className="text-gray-300 mb-6">How would you like to contact us?</p>
            
            <div className="space-y-3">
              <Button
                onClick={() => {
                  window.open('tel:+2347120005328', '_self')
                  setShowContactModal(false)
                  setContactBooking(null)
                }}
                className="w-full bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Phone className="h-4 w-4" />
                Call Us (+234 712 000 5328)
              </Button>
              
              <Button
                onClick={() => {
                  setShowContactModal(false)
                  openBookViaMailClient(contactBooking)
                }}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Book via Mail
              </Button>
              <p className="text-xs text-blue-200 text-center">
                Add your referral code in the email to get 30% discount.
              </p>
            </div>
            
            <Button
              onClick={() => {
                setShowContactModal(false)
                setContactBooking(null)
              }}
              className="w-full mt-4 bg-gray-700 text-white hover:bg-gray-600"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && bookingToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Cancel Booking</h3>
            <div className="mb-6">
              <p className="text-gray-300 mb-2">Booking ID: #{bookingToCancel.booking_code || bookingToCancel.id}</p>
              <p className="text-gray-300 mb-2">Service: {formatServiceType(bookingToCancel.service_type) || 'Protection Service'}</p>
              <p className="text-gray-300 mb-2">Date: {formatDate(bookingToCancel.scheduled_date)} at {formatTime(bookingToCancel.scheduled_time)}</p>
              <p className="text-gray-300">Amount: ₦{bookingToCancel.total_price?.toLocaleString() || '0'}</p>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={processBookingCancellation}
                className="w-full bg-red-600 text-white hover:bg-red-700"
              >
                Confirm Cancellation
              </Button>
              
              <Button
                onClick={() => {
                  setShowCancelModal(false)
                  setBookingToCancel(null)
                }}
                className="w-full bg-gray-700 text-white hover:bg-gray-600"
              >
                Keep Booking
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function ProtectorAppWithGoogleMaps() {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  const { isLoaded } = useJsApiLoader({
    id: "protector-google-map",
    googleMapsApiKey,
    libraries: GOOGLE_PLACES_LIBRARIES,
  })
  return <ProtectorAppInner isGooglePlacesLoaded={isLoaded} />
}

export default function ProtectorApp() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  if (!key) return <ProtectorAppInner isGooglePlacesLoaded={false} />
  return <ProtectorAppWithGoogleMaps />
}
