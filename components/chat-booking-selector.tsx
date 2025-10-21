"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, MessageSquare, Clock, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Booking {
  id: string
  pickupLocation: string
  destination?: string
  date: string
  status: string
  protectorName?: string
}

interface ChatBookingSelectorProps {
  selectedBooking: Booking | null
  activeBookings: Booking[]
  bookingHistory: Booking[]
  onBookingSelect: (booking: Booking) => void
  className?: string
}

export default function ChatBookingSelector({
  selectedBooking,
  activeBookings,
  bookingHistory,
  onBookingSelect,
  className
}: ChatBookingSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'accepted': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'deployed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'completed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const truncateText = (text: string, maxLength: number = 25) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const allBookings = [...activeBookings, ...bookingHistory]

  return (
    <div ref={dropdownRef} className={cn("relative w-full", className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 sm:py-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:bg-gray-800/70 active:bg-gray-800/80"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {selectedBooking ? (
                <>
                  <div className="flex items-center space-x-2">
                    <p className="text-white font-medium text-sm truncate">
                      {truncateText(`${selectedBooking.pickupLocation} → ${selectedBooking.destination || 'N/A'}`)}
                    </p>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium border",
                      getStatusColor(selectedBooking.status)
                    )}>
                      {selectedBooking.status?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(selectedBooking.date)}</span>
                    {selectedBooking.protectorName && (
                      <>
                        <span className="text-gray-500">•</span>
                        <span>{selectedBooking.protectorName}</span>
                      </>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-white font-medium text-sm">Select a booking to chat</p>
                  <p className="text-gray-400 text-xs">
                    {allBookings.length} booking{allBookings.length !== 1 ? 's' : ''} available
                  </p>
                </>
              )}
            </div>
          </div>
          <ChevronDown 
            className={cn(
              "w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl z-50 max-h-80 sm:max-h-96 overflow-hidden">
          <div className="overflow-y-auto max-h-80 sm:max-h-96">
            {/* Active Bookings Section */}
            {activeBookings.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700/50 mb-2">
                  Active Bookings ({activeBookings.length})
                </div>
                <div className="space-y-1">
                  {activeBookings.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => {
                        onBookingSelect(booking)
                        setIsOpen(false)
                      }}
                      className={cn(
                        "w-full p-3 sm:p-4 rounded-lg transition-all duration-200 text-left group active:scale-95",
                        selectedBooking?.id === booking.id
                          ? "bg-blue-600/20 border border-blue-500/30"
                          : "hover:bg-gray-800/50 active:bg-gray-700/50 border border-transparent"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center",
                              selectedBooking?.id === booking.id
                                ? "bg-blue-500"
                                : "bg-gray-700 group-hover:bg-gray-600"
                            )}>
                              <MessageSquare className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-white font-medium text-sm truncate">
                                {truncateText(`${booking.pickupLocation} → ${booking.destination || 'N/A'}`)}
                              </p>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0",
                                getStatusColor(booking.status)
                              )}>
                                {booking.status?.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-gray-400 text-xs flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(booking.date)}</span>
                              {booking.protectorName && (
                                <>
                                  <span className="text-gray-500">•</span>
                                  <span>{booking.protectorName}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        {selectedBooking?.id === booking.id && (
                          <Check className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Past Bookings Section */}
            {bookingHistory.length > 0 && (
              <div className="p-2 border-t border-gray-700/50">
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700/50 mb-2">
                  Past Bookings ({bookingHistory.length})
                </div>
                <div className="space-y-1">
                  {bookingHistory.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => {
                        onBookingSelect(booking)
                        setIsOpen(false)
                      }}
                      className={cn(
                        "w-full p-3 sm:p-4 rounded-lg transition-all duration-200 text-left group active:scale-95",
                        selectedBooking?.id === booking.id
                          ? "bg-blue-600/20 border border-blue-500/30"
                          : "hover:bg-gray-800/50 active:bg-gray-700/50 border border-transparent"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center",
                              selectedBooking?.id === booking.id
                                ? "bg-blue-500"
                                : "bg-gray-700 group-hover:bg-gray-600"
                            )}>
                              <MessageSquare className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-white font-medium text-sm truncate">
                                {truncateText(`${booking.pickupLocation} → ${booking.destination || 'N/A'}`)}
                              </p>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0",
                                getStatusColor(booking.status)
                              )}>
                                {booking.status?.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-gray-400 text-xs flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(booking.date)}</span>
                              {booking.protectorName && (
                                <>
                                  <span className="text-gray-500">•</span>
                                  <span>{booking.protectorName}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        {selectedBooking?.id === booking.id && (
                          <Check className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Bookings Message */}
            {allBookings.length === 0 && (
              <div className="p-6 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No bookings available</p>
                <p className="text-gray-500 text-xs mt-1">Create a booking to start chatting</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
