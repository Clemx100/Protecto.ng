"use client"

import { useState, useEffect } from 'react'

export default function TestOperatorPage() {
  const [results, setResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const logResult = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString()
    const className = isError ? 'text-red-400' : 'text-green-400'
    setResults(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const clearResults = () => {
    setResults([])
  }

  const testOperatorBookings = async () => {
    logResult('Testing Operator Bookings API...')
    try {
      const response = await fetch('/api/operator/bookings')
      const data = await response.json()
      
      if (response.ok) {
        logResult(`✅ Operator Bookings API working! Found ${data.count || 0} bookings`)
      } else {
        logResult(`❌ Operator Bookings API failed: ${data.error}`, true)
      }
    } catch (error: any) {
      logResult(`❌ Network error: ${error.message}`, true)
    }
  }

  const testOperatorMessages = async () => {
    logResult('Testing Operator Messages API...')
    try {
      const response = await fetch('/api/operator/messages?bookingId=test')
      const data = await response.json()
      
      if (response.ok) {
        logResult(`✅ Operator Messages API working! Found ${data.data?.length || 0} messages`)
      } else {
        logResult(`❌ Operator Messages API failed: ${data.error}`, true)
      }
    } catch (error: any) {
      logResult(`❌ Network error: ${error.message}`, true)
    }
  }

  const testBookingStatus = async () => {
    logResult('Testing Booking Status API...')
    try {
      const response = await fetch('/api/bookings/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: 'test', status: 'pending' })
      })
      const data = await response.json()
      
      if (response.ok) {
        logResult(`✅ Booking Status API working!`)
      } else {
        logResult(`❌ Booking Status API failed: ${data.error}`, true)
      }
    } catch (error: any) {
      logResult(`❌ Network error: ${error.message}`, true)
    }
  }

  const testMobileApp = async () => {
    logResult('Testing Mobile App Connection...')
    try {
      const response = await fetch('/app')
      if (response.ok) {
        logResult('✅ Mobile app is accessible!')
      } else {
        logResult(`❌ Mobile app returned status: ${response.status}`, true)
      }
    } catch (error: any) {
      logResult(`❌ Mobile app connection failed: ${error.message}`, true)
    }
  }

  const testBookingCreation = async () => {
    logResult('Testing Booking Creation...')
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: 'armed_protection',
          pickupLocation: 'Test Location',
          destination: 'Test Destination',
          date: new Date().toISOString(),
          duration: 4,
          personnel: { protectors: 1, protectee: 1 }
        })
      })
      const data = await response.json()
      
      if (response.ok) {
        logResult(`✅ Booking creation working! Booking ID: ${data.booking?.id || 'N/A'}`)
      } else {
        logResult(`❌ Booking creation failed: ${data.error}`, true)
      }
    } catch (error: any) {
      logResult(`❌ Booking creation error: ${error.message}`, true)
    }
  }

  const runAllTests = async () => {
    setIsLoading(true)
    clearResults()
    logResult('🚀 Starting automated tests...')
    
    await testOperatorBookings()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testOperatorMessages()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testBookingStatus()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testMobileApp()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testBookingCreation()
    
    logResult('✅ All tests completed!')
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🛡️ Protector.Ng Operator Dashboard Test</h1>
          <p className="text-gray-300 text-lg">Testing real-time communication and API endpoints</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* API Tests */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">📡 API Endpoint Tests</h3>
            <div className="space-y-3">
              <button
                onClick={testOperatorBookings}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg"
              >
                Test Operator Bookings API
              </button>
              <button
                onClick={testOperatorMessages}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg"
              >
                Test Operator Messages API
              </button>
              <button
                onClick={testBookingStatus}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg"
              >
                Test Booking Status API
              </button>
            </div>
          </div>

          {/* Mobile Tests */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">📱 Mobile App Tests</h3>
            <div className="space-y-3">
              <button
                onClick={testMobileApp}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg"
              >
                Test Mobile App Connection
              </button>
              <button
                onClick={testBookingCreation}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg"
              >
                Test Booking Creation
              </button>
            </div>
          </div>
        </div>

        {/* Run All Tests */}
        <div className="mt-6 text-center">
          <button
            onClick={runAllTests}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 px-8 rounded-lg text-lg font-semibold"
          >
            {isLoading ? 'Running Tests...' : '🚀 Run All Tests'}
          </button>
          <button
            onClick={clearResults}
            className="ml-4 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg"
          >
            Clear Results
          </button>
        </div>

        {/* Results */}
        <div className="mt-8 bg-black/30 rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">📊 Test Results</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-400">No tests run yet. Click "Run All Tests" to start.</p>
            ) : (
              results.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Access Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/operator"
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg text-center font-semibold"
          >
            🔧 Operator Dashboard
          </a>
          <a
            href="/app"
            className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg text-center font-semibold"
          >
            📱 Mobile App
          </a>
          <a
            href="/mobile-access.html"
            className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg text-center font-semibold"
          >
            📲 Mobile Access
          </a>
        </div>
      </div>
    </div>
  )
}



