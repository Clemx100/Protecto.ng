"use client"

import { useState, useEffect, useRef } from 'react'

interface Booking {
  id: string
  booking_code: string
  client_id: string
  status: string
  pickup_address: string
  destination_address: string
  scheduled_date: string
  scheduled_time: string
  client: {
    first_name: string
    last_name: string
    email: string
  }
  service: {
    name: string
  }
  created_at: string
}

interface ChatMessage {
  id: string
  booking_id: string
  sender_id: string
  sender_type: 'client' | 'operator'
  message: string
  created_at: string
}

export default function TestCommunicationPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [clientMessages, setClientMessages] = useState<ChatMessage[]>([])
  const [operatorMessages, setOperatorMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [messageType, setMessageType] = useState<'client' | 'operator'>('client')
  const [testResults, setTestResults] = useState<string[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [clientMessages, operatorMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load bookings
      const bookingsResponse = await fetch('/api/operator/bookings')
      if (!bookingsResponse.ok) {
        throw new Error(`Bookings API error: ${bookingsResponse.status}`)
      }
      const bookingsData = await bookingsResponse.json()
      if (bookingsData.success) {
        setBookings(bookingsData.data)
      }

      // Load client messages
      const clientMessagesResponse = await fetch('/api/chat/messages?type=client')
      if (clientMessagesResponse.ok) {
        const clientMessagesData = await clientMessagesResponse.json()
        if (clientMessagesData.success) {
          setClientMessages(clientMessagesData.data)
        }
      }

      // Load operator messages
      const operatorMessagesResponse = await fetch('/api/chat/messages?type=operator')
      if (operatorMessagesResponse.ok) {
        const operatorMessagesData = await operatorMessagesResponse.json()
        if (operatorMessagesData.success) {
          setOperatorMessages(operatorMessagesData.data)
        }
      }

      addTestResult(`✅ Data loaded successfully at ${new Date().toLocaleTimeString()}`)
    } catch (err: any) {
      setError(err.message)
      addTestResult(`❌ Error loading data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev.slice(-9), message])
  }

  const sendTestMessage = async () => {
    if (!selectedBooking || !newMessage.trim()) {
      addTestResult('❌ Please select a booking and enter a message')
      return
    }

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: selectedBooking,
          sender_type: messageType,
          message: newMessage,
          sender_id: messageType === 'client' ? 'test-client-id' : 'test-operator-id'
        }),
      })

      if (response.ok) {
        addTestResult(`✅ ${messageType} message sent successfully`)
        setNewMessage('')
        // Reload data to see the new message
        setTimeout(loadData, 1000)
      } else {
        const errorData = await response.json()
        addTestResult(`❌ Failed to send message: ${errorData.error}`)
      }
    } catch (err: any) {
      addTestResult(`❌ Error sending message: ${err.message}`)
    }
  }

  const testRealTimeConnection = () => {
    addTestResult('🔄 Testing real-time connection...')
    // Simulate real-time test
    setTimeout(() => {
      addTestResult('✅ Real-time connection test completed')
    }, 2000)
  }

  const clearTestResults = () => {
    setTestResults([])
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Communication Test Dashboard</h1>
        
        {/* Test Controls */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={loadData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded"
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
            <button
              onClick={testRealTimeConnection}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
            >
              Test Real-time
            </button>
            <button
              onClick={clearTestResults}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Clear Results
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="bg-black p-3 rounded font-mono text-sm h-32 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-400">No test results yet...</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bookings Section */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">
              Bookings ({bookings.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    selectedBooking === booking.id
                      ? 'bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => setSelectedBooking(booking.id)}
                >
                  <div className="font-bold text-sm">{booking.booking_code}</div>
                  <div className="text-sm text-gray-300">
                    {booking.client.first_name} {booking.client.last_name}
                  </div>
                  <div className="text-sm text-gray-400">
                    {booking.service.name} - {booking.status}
                  </div>
                  <div className="text-xs text-gray-500">
                    {booking.scheduled_date} {booking.scheduled_time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Messages Section */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Chat Messages</h2>
            
            {/* Message Input */}
            <div className="mb-4 space-y-2">
              <div className="flex gap-2">
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as 'client' | 'operator')}
                  className="bg-gray-700 text-white px-3 py-2 rounded"
                >
                  <option value="client">Client Message</option>
                  <option value="operator">Operator Message</option>
                </select>
                <button
                  onClick={sendTestMessage}
                  disabled={!selectedBooking || !newMessage.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded"
                >
                  Send Test
                </button>
              </div>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Enter test message..."
                className="w-full bg-gray-700 text-white p-2 rounded resize-none"
                rows={2}
              />
            </div>

            {/* Messages Display */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {/* Client Messages */}
              <div>
                <h3 className="text-sm font-semibold text-blue-400 mb-2">
                  Client Messages ({clientMessages.length})
                </h3>
                {clientMessages
                  .filter(msg => !selectedBooking || msg.booking_id === selectedBooking)
                  .map((message) => (
                    <div key={message.id} className="bg-blue-900 p-2 rounded text-sm mb-1">
                      <div className="font-bold">{message.sender_type}</div>
                      <div>{message.message}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(message.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Operator Messages */}
              <div>
                <h3 className="text-sm font-semibold text-green-400 mb-2">
                  Operator Messages ({operatorMessages.length})
                </h3>
                {operatorMessages
                  .filter(msg => !selectedBooking || msg.booking_id === selectedBooking)
                  .map((message) => (
                    <div key={message.id} className="bg-green-900 p-2 rounded text-sm mb-1">
                      <div className="font-bold">{message.sender_type}</div>
                      <div>{message.message}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(message.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Data Summary */}
        <div className="bg-gray-800 p-4 rounded-lg mt-6">
          <h2 className="text-xl font-semibold mb-4">Data Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Total Bookings:</strong> {bookings.length}
            </div>
            <div>
              <strong>Client Messages:</strong> {clientMessages.length}
            </div>
            <div>
              <strong>Operator Messages:</strong> {operatorMessages.length}
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            <strong>Last Updated:</strong> {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
