"use client"

import { useState, useEffect } from "react"
import { Shield, Calendar, MapPin, Clock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface BookingHistoryProps {
  userId?: string
}

interface CompletedBooking {
  id: string
  booking_code: string
  service_type: string
  pickup_address: string
  destination_address: string
  scheduled_date: string
  scheduled_time: string
  duration_hours: number
  total_price: number
  status: string
  completed_at: string
  created_at: string
  service: {
    name: string
    description: string
  }
}

export default function BookingHistory({ userId }: BookingHistoryProps) {
  const supabase = createClient()
  const [completedBookings, setCompletedBookings] = useState<CompletedBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadCompletedBookings()
  }, [userId])

  const loadCompletedBookings = async () => {
    try {
      setIsLoading(true)
      
      // Get current user if no userId provided
      let currentUserId = userId
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser()
        currentUserId = user?.id
      }

      if (!currentUserId) {
        setError("User not authenticated")
        return
      }

      // Fetch completed bookings from the API
      const response = await fetch('/api/bookings')
      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to load bookings')
      }

      // Filter for completed bookings
      const completed = result.data.filter((booking: any) => 
        booking.status === 'completed'
      )

      setCompletedBookings(completed)
    } catch (error) {
      console.error('Error loading completed bookings:', error)
      setError(error instanceof Error ? error.message : 'Failed to load booking history')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading booking history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
            <p className="text-red-200 font-medium">{error}</p>
            <Button 
              onClick={loadCompletedBookings}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-400" />
              <h1 className="text-xl font-bold text-white">Booking History</h1>
            </div>
            <div className="text-white">
              {completedBookings.length} Completed Service{completedBookings.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {completedBookings.length === 0 ? (
          <div className="bg-white/10 rounded-xl p-12 border border-white/20 text-center">
            <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Completed Services</h3>
            <p className="text-gray-300 mb-6">
              You haven't completed any protection services yet. Your completed bookings will appear here.
            </p>
            <div className="text-sm text-gray-400">
              <p>To complete a service:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Submit a protection request</li>
                <li>Wait for operator acceptance and invoice</li>
                <li>Approve payment</li>
                <li>Operator deploys team</li>
                <li>Service is completed by operator</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-green-300 font-medium">
                  Great! You have completed {completedBookings.length} protection service{completedBookings.length !== 1 ? 's' : ''}.
                </span>
              </div>
            </div>

            {completedBookings.map((booking) => (
              <div key={booking.id} className="bg-white/10 rounded-xl p-6 border border-white/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        #{booking.booking_code}
                      </h3>
                      <p className="text-sm text-gray-300">
                        {booking.service?.name || 'Protection Service'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-green-400">
                      {formatCurrency(booking.total_price)}
                    </div>
                    <div className="text-xs text-gray-400">
                      Completed
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div className="text-sm">
                      <div className="text-gray-300">From:</div>
                      <div className="text-white">{booking.pickup_address}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div className="text-sm">
                      <div className="text-gray-300">To:</div>
                      <div className="text-white">{booking.destination_address || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div className="text-sm">
                      <div className="text-gray-300">Date:</div>
                      <div className="text-white">{formatDate(booking.scheduled_date)}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div className="text-sm">
                      <div className="text-gray-300">Time:</div>
                      <div className="text-white">{formatTime(booking.scheduled_time)}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div className="text-sm">
                      <div className="text-gray-300">Duration:</div>
                      <div className="text-white">{booking.duration_hours} hour{booking.duration_hours !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="text-xs text-gray-400">
                    Completed on {new Date(booking.completed_at).toLocaleString()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-green-300 font-medium">Completed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
