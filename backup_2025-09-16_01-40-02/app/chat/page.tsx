"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [requestStatus, setRequestStatus] = useState("Pending Deployment")
  const [bookingPayload, setBookingPayload] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get booking data from URL params or localStorage
    const bookingId = searchParams.get('id')
    const storedBooking = localStorage.getItem('currentBooking')
    
    console.log('Chat page loaded with bookingId:', bookingId)
    console.log('Stored booking:', storedBooking)
    
    if (storedBooking) {
      try {
        const booking = JSON.parse(storedBooking)
        console.log('Parsed booking:', booking)
        setBookingPayload(booking)
        
        // Initialize with request summary message
        const requestSummary = {
          id: 1,
          sender: "system",
          message: "New Protection Request",
          timestamp: new Date().toISOString(),
          isRequestSummary: true,
          payload: booking
        }
        setChatMessages([requestSummary])
      } catch (error) {
        console.error("Error parsing stored booking:", error)
      }
    }
    
    setIsLoading(false)
  }, [searchParams])

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: chatMessages.length + 1,
        sender: "client",
        message: newMessage,
        timestamp: new Date().toISOString(),
      }
      setChatMessages([...chatMessages, message])
      setNewMessage("")

      // Simulate operator response after 2 seconds
      setTimeout(() => {
        const operatorResponse = {
          id: chatMessages.length + 2,
          sender: "operator",
          message: "Thank you for your message. Our team is reviewing your request and will respond shortly.",
          timestamp: new Date().toISOString(),
        }
        setChatMessages((prev) => [...prev, operatorResponse])
      }, 2000)
    }
  }

  const handleOperatorAction = (action: string) => {
    if (action === "confirm") {
      setRequestStatus("Confirmed & Deployed")
      const message = {
        id: chatMessages.length + 1,
        sender: "operator",
        message: "✅ Request confirmed and deployed! Your protection team is being dispatched.",
        timestamp: new Date().toISOString(),
        isSystemMessage: true,
      }
      setChatMessages([...chatMessages, message])
    } else if (action === "invoice") {
      const message = {
        id: chatMessages.length + 1,
        sender: "operator",
        message: "📄 Invoice sent. Please review and approve payment to proceed.",
        timestamp: new Date().toISOString(),
        isSystemMessage: true,
        hasInvoice: true,
      }
      setChatMessages([...chatMessages, message])
    }
  }

  const handleBackToBookings = () => {
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto bg-black min-h-screen flex items-center justify-center">
        <div className="text-white text-lg">Loading chat...</div>
      </div>
    )
  }

  if (!bookingPayload) {
    return (
      <div className="w-full max-w-md mx-auto bg-black min-h-screen flex items-center justify-center">
        <div className="text-center text-white p-4">
          <h1 className="text-xl font-semibold mb-4">No Booking Found</h1>
          <p className="mb-4 text-sm text-gray-400">No active booking request found.</p>
          <Button onClick={handleBackToBookings} className="bg-blue-600 hover:bg-blue-700 text-sm px-4 py-2 rounded-xl">
            Back to Bookings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 w-full max-w-md mx-auto bg-black text-white p-4 z-50 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleBackToBookings}
              variant="ghost"
              size="sm"
              className="text-white hover:text-gray-300 p-2"
            >
              ←
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-white">Request Chat</h1>
              <p className="text-xs text-gray-400">ID: {bookingPayload?.id}</p>
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
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
      <div className="flex-1 overflow-y-auto p-4 pt-20 space-y-4">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "client" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl p-3 ${
                msg.sender === "client"
                  ? "bg-blue-600 text-white"
                  : msg.sender === "system"
                    ? "bg-gray-800 text-gray-300 border border-gray-700"
                    : "bg-gray-700 text-white"
              }`}
            >
              {msg.isRequestSummary ? (
                <div className="space-y-3">
                  <div className="font-semibold text-base">{msg.message}</div>
                  <div className="text-xs space-y-2 bg-gray-900 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Service:</span>
                      <span className="text-white text-right">
                        {msg.payload.serviceType === "car-only"
                          ? "Car Transportation Only"
                          : `${msg.payload.protectionType || "Armed"} Protection Service`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pickup:</span>
                      <span className="text-white text-right text-xs">
                        {msg.payload.pickupDetails?.location || msg.payload.pickupLocation}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date & Time:</span>
                      <span className="text-white text-right text-xs">
                        {msg.payload.pickupDetails?.date || "N/A"} at{" "}
                        {msg.payload.pickupDetails?.time || msg.payload.startTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white text-right text-xs">
                        {msg.payload.pickupDetails?.duration || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Destination:</span>
                      <span className="text-white text-right text-xs">
                        {msg.payload.destinationDetails?.primary || msg.payload.destination || "N/A"}
                      </span>
                    </div>
                    {msg.payload.personnel && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Personnel:</span>
                        <span className="text-white text-right text-xs">
                          {msg.payload.personnel.protectors} protectors for{" "}
                          {msg.payload.personnel.protectee} protectee
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Contact:</span>
                      <span className="text-white text-right text-xs">
                        {msg.payload.contact?.phone || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pricing:</span>
                      <span className="text-white text-right text-xs">
                        To be provided by operator
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Submitted: {new Date(msg.timestamp).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm">{msg.message}</div>
                        {msg.hasInvoice && (
                          <div className="mt-2 p-2 bg-gray-800 rounded-lg border border-gray-700">
                            <div className="text-xs text-gray-400 mb-1">Invoice Details</div>
                            <div className="text-xs">Amount: To be provided by operator</div>
                            <Button
                              onClick={() => handleOperatorAction("approve-payment")}
                              size="sm"
                              className="mt-2 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                            >
                              Approve & Pay
                            </Button>
                          </div>
                        )}
                  <div className="text-xs text-gray-400 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>


      {/* Message Input */}
      <div className="p-4 border-t border-gray-800 bg-black">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm"
          />
          <Button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl">
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
