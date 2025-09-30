"use client"

import { useState } from 'react'

export default function TestRealtimePage() {
  const [createResult, setCreateResult] = useState<string[]>([])
  const [checkResult, setCheckResult] = useState<string[]>([])
  const [fullTestResult, setFullTestResult] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const logResult = (setter: React.Dispatch<React.SetStateAction<string[]>>, message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const className = type === 'error' ? 'text-red-400' : type === 'success' ? 'text-green-400' : 'text-blue-400'
    setter(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const clearResult = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter([])
  }

  const createTestBooking = async () => {
    setIsLoading(true)
    clearResult(setCreateResult)
    logResult(setCreateResult, '🚀 Creating test booking...')
    
    const bookingData = {
      id: `TEST_REALTIME_${Date.now()}`,
      serviceType: 'armed-protection',
      protectionType: 'armed',
      pickupDetails: {
        location: '15 ogushefumi street',
        date: '2025-02-22',
        time: '11:45',
        duration: '1 day',
        coordinates: { lat: 6.5244, lng: 3.3792 }
      },
      destinationDetails: {
        primary: 'Heyeh',
        coordinates: { lat: 6.4281, lng: 3.4216 }
      },
      personnel: {
        protectors: 1,
        protectee: 1,
        dressCode: 'Tactical Casual'
      },
      vehicles: {
        armoredSuv: 1
      },
      contact: {
        user: {
          firstName: 'Test',
          lastName: 'User'
        },
        phone: '08012345678'
      }
    }

    try {
      const response = await fetch('/api/bookings-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      })

      const result = await response.json()
      
      if (response.ok) {
        logResult(setCreateResult, `✅ Booking created successfully!`, 'success')
        logResult(setCreateResult, `Booking ID: ${result.data?.booking_code}`, 'success')
        logResult(setCreateResult, `Database ID: ${result.data?.id}`, 'success')
        logResult(setCreateResult, '📱 Check the operator dashboard to see if it appears!', 'info')
      } else {
        logResult(setCreateResult, `❌ Booking creation failed: ${result.error}`, 'error')
      }
    } catch (error: any) {
      logResult(setCreateResult, `❌ Network error: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const checkOperatorBookings = async () => {
    setIsLoading(true)
    clearResult(setCheckResult)
    logResult(setCheckResult, '🔍 Checking operator bookings...')
    
    try {
      const response = await fetch('/api/operator/bookings-demo')
      const result = await response.json()
      
      if (response.ok) {
        logResult(setCheckResult, `✅ Found ${result.count || 0} bookings in operator dashboard`, 'success')
        logResult(setCheckResult, 'Recent bookings:', 'info')
        result.data?.slice(0, 5).forEach((booking: any, index: number) => {
          logResult(setCheckResult, `${index + 1}. ${booking.booking_code} - ${booking.client?.first_name} ${booking.client?.last_name} (${booking.status})`, 'info')
        })
      } else {
        logResult(setCheckResult, `❌ Failed to fetch operator bookings: ${result.error}`, 'error')
      }
    } catch (error: any) {
      logResult(setCheckResult, `❌ Network error: ${error.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const runFullTest = async () => {
    setIsLoading(true)
    clearResult(setFullTestResult)
    logResult(setFullTestResult, '🧪 Starting Full Real-time Test...', 'info')
    
    // Step 1: Check current bookings
    logResult(setFullTestResult, '1. Checking current operator bookings...', 'info')
    try {
      const response1 = await fetch('/api/operator/bookings-demo')
      const result1 = await response1.json()
      if (response1.ok) {
        logResult(setFullTestResult, `   Found ${result1.count || 0} current bookings`, 'success')
      } else {
        logResult(setFullTestResult, `   Error: ${result1.error}`, 'error')
      }
    } catch (error: any) {
      logResult(setFullTestResult, `   Network error: ${error.message}`, 'error')
    }
    
    // Step 2: Create new booking
    logResult(setFullTestResult, '2. Creating new test booking...', 'info')
    const bookingData = {
      id: `FULL_TEST_${Date.now()}`,
      serviceType: 'armed-protection',
      protectionType: 'armed',
      pickupDetails: {
        location: 'Test Location for Full Test',
        date: '2025-02-22',
        time: '12:00',
        duration: '4 hours',
        coordinates: { lat: 6.5244, lng: 3.3792 }
      },
      destinationDetails: {
        primary: 'Test Destination',
        coordinates: { lat: 6.4281, lng: 3.4216 }
      },
      personnel: {
        protectors: 1,
        protectee: 1,
        dressCode: 'Tactical Casual'
      },
      vehicles: {
        armoredSuv: 1
      },
      contact: {
        user: {
          firstName: 'Full',
          lastName: 'Test'
        },
        phone: '08012345678'
      }
    }
    
    let newBooking = null
    try {
      const response2 = await fetch('/api/bookings-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })
      const result2 = await response2.json()
      if (response2.ok) {
        logResult(setFullTestResult, `   ✅ Booking created: ${result2.data?.booking_code}`, 'success')
        newBooking = result2.data
      } else {
        logResult(setFullTestResult, `   ❌ Error: ${result2.error}`, 'error')
      }
    } catch (error: any) {
      logResult(setFullTestResult, `   ❌ Network error: ${error.message}`, 'error')
    }
    
    // Step 3: Wait for real-time sync
    logResult(setFullTestResult, '3. Waiting 5 seconds for real-time sync...', 'info')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Step 4: Check again
    logResult(setFullTestResult, '4. Checking operator bookings again...', 'info')
    try {
      const response3 = await fetch('/api/operator/bookings-demo')
      const result3 = await response3.json()
      if (response3.ok) {
        logResult(setFullTestResult, `   Found ${result3.count || 0} bookings after test`, 'success')
        
        // Check if our new booking is there
        const foundBooking = result3.data?.find((b: any) => b.booking_code === newBooking?.booking_code)
        if (foundBooking) {
          logResult(setFullTestResult, `   ✅ SUCCESS! New booking found in operator dashboard!`, 'success')
          logResult(setFullTestResult, `   Real-time sync is working! 🎉`, 'success')
        } else {
          logResult(setFullTestResult, `   ⚠️ New booking not found in operator dashboard`, 'error')
          logResult(setFullTestResult, `   Real-time sync may not be working properly`, 'error')
        }
      } else {
        logResult(setFullTestResult, `   Error: ${result3.error}`, 'error')
      }
    } catch (error: any) {
      logResult(setFullTestResult, `   Network error: ${error.message}`, 'error')
    }
    
    logResult(setFullTestResult, '✅ Full test completed!', 'info')
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🧪 Real-time Booking Test</h1>
          <p className="text-gray-300 text-lg">Test if bookings created from the client app appear in the operator dashboard in real-time.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Test Booking */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">📱 Create Test Booking</h3>
            <p className="text-gray-300 mb-4">This will create a booking similar to what the mobile app creates:</p>
            <button
              onClick={createTestBooking}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 px-6 rounded-lg font-semibold"
            >
              🚀 Create Test Booking
            </button>
            <div className="mt-4 bg-black/30 rounded-lg p-4 max-h-48 overflow-y-auto">
              {createResult.length === 0 ? (
                <p className="text-gray-400">No results yet...</p>
              ) : (
                createResult.map((result, index) => (
                  <div key={index} className="text-sm font-mono mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Check Operator Bookings */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">🔍 Check Operator Bookings</h3>
            <p className="text-gray-300 mb-4">Check what bookings are currently in the operator dashboard:</p>
            <button
              onClick={checkOperatorBookings}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 px-6 rounded-lg font-semibold"
            >
              📊 Check Operator Bookings
            </button>
            <div className="mt-4 bg-black/30 rounded-lg p-4 max-h-48 overflow-y-auto">
              {checkResult.length === 0 ? (
                <p className="text-gray-400">No results yet...</p>
              ) : (
                checkResult.map((result, index) => (
                  <div key={index} className="text-sm font-mono mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Full Test */}
        <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4">🔄 Full Test</h3>
          <p className="text-gray-300 mb-4">Run the complete test: check current bookings, create new one, wait, check again:</p>
          <button
            onClick={runFullTest}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 px-8 rounded-lg font-semibold"
          >
            🧪 Run Full Test
          </button>
          <div className="mt-4 bg-black/30 rounded-lg p-4 max-h-64 overflow-y-auto">
            {fullTestResult.length === 0 ? (
              <p className="text-gray-400">No results yet...</p>
            ) : (
              fullTestResult.map((result, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Access Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <a
            href="/operator/demo"
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
            href="/test-operator"
            className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg text-center font-semibold"
          >
            🧪 API Test Page
          </a>
          <a
            href="/mobile-access.html"
            className="bg-orange-600 hover:bg-orange-700 text-white py-3 px-6 rounded-lg text-center font-semibold"
          >
            📲 Mobile Access
          </a>
        </div>
      </div>
    </div>
  )
}



