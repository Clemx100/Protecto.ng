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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading chat...</div>
      </div>
    )
  }

  if (!bookingPayload) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-semibold mb-4">No Booking Found</h1>
          <p className="mb-4">No active booking request found.</p>
          <Button onClick={handleBackToBookings} className="bg-blue-600 hover:bg-blue-700">
            Back to Bookings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Request Chat</h1>
            <p className="text-sm text-gray-400">ID: {bookingPayload?.id}</p>
          </div>
          <div className="text-right">
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                requestStatus === "Pending Deployment"
                  ? "bg-yellow-600 text-yellow-100"
                  : "bg-green-600 text-green-100"
              }`}
            >
              {requestStatus}
            </div>
            <Button
              onClick={handleBackToBookings}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white mt-1"
            >
              ← Back to Bookings
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "client" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.sender === "client"
                  ? "bg-blue-600 text-white"
                  : msg.sender === "system"
                    ? "bg-gray-800 text-gray-300 border border-gray-700"
                    : "bg-gray-700 text-white"
              }`}
            >
              {msg.isRequestSummary ? (
                <div className="space-y-3">
                  <div className="font-semibold text-lg">{msg.message}</div>
                  <div className="text-sm space-y-2 bg-gray-900 p-3 rounded">
                    <div>
                      <strong>Service:</strong>{" "}
                      {msg.payload.serviceType === "car-only"
                        ? "Car Transportation Only"
                        : `${msg.payload.protectionType || "Armed"} Protection Service`}
                    </div>
                    <div>
                      <strong>Pickup:</strong> {msg.payload.pickupDetails?.location || msg.payload.pickupLocation}
                    </div>
                    <div>
                      <strong>Date & Time:</strong> {msg.payload.pickupDetails?.date || "N/A"} at{" "}
                      {msg.payload.pickupDetails?.time || msg.payload.startTime}
                    </div>
                    <div>
                      <strong>Duration:</strong> {msg.payload.pickupDetails?.duration || "N/A"}
                    </div>
                    <div>
                      <strong>Destination:</strong> {msg.payload.destinationDetails?.primary || msg.payload.destination || "N/A"}
                    </div>
                    {msg.payload.personnel && (
                      <div>
                        <strong>Personnel:</strong> {msg.payload.personnel.protectors} protectors for{" "}
                        {msg.payload.personnel.protectees} protectees
                      </div>
                    )}
                    <div>
                      <strong>Contact:</strong> {msg.payload.contact?.phone || "N/A"}
                    </div>
                    <div>
                      <strong>Pricing:</strong> To be provided by operator
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
                          <div className="mt-2 p-2 bg-gray-800 rounded border">
                            <div className="text-xs text-gray-400 mb-1">Invoice Details</div>
                            <div className="text-sm">Amount: To be provided by operator</div>
                            <Button
                              onClick={() => handleOperatorAction("approve-payment")}
                              size="sm"
                              className="mt-2 bg-green-600 hover:bg-green-700 text-white"
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

      {/* Operator Actions (Demo - would be hidden for clients in production) */}
      <div className="p-3 border-t border-gray-800 bg-gray-900">
        <div className="text-xs text-gray-500 mb-2">Operator Actions (Demo)</div>
        <div className="flex gap-2 mb-3">
          <Button
            onClick={() => handleOperatorAction("confirm")}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Confirm & Deploy
          </Button>
          <Button
            onClick={() => handleOperatorAction("invoice")}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Send Invoice
          </Button>
        </div>
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <Button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700 text-white">
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
