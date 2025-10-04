"use client"

import { useState, useEffect } from 'react'

export default function TestAPIPage() {
  const [apiResult, setApiResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const testAPI = async () => {
    setLoading(true)
    setError('')
    try {
      console.log('Testing operator bookings API...')
      const response = await fetch('/api/operator/bookings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('API result:', result)
      setApiResult(result)
    } catch (err: any) {
      console.error('API test error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testAPI()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🧪 API Test Page</h1>
          <p className="text-gray-300 text-lg">Testing operator bookings API</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">API Test Results</h3>
            <button
              onClick={testAPI}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-semibold"
            >
              {loading ? 'Testing...' : 'Test Again'}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
              <p className="text-red-400 font-mono">Error: {error}</p>
            </div>
          )}

          {apiResult && (
            <div className="space-y-4">
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                <p className="text-green-400 font-semibold">✅ API Response Received</p>
                <p className="text-green-300">Success: {apiResult.success ? 'true' : 'false'}</p>
                <p className="text-green-300">Booking Count: {apiResult.count || 0}</p>
              </div>

              <div className="bg-black/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                <h4 className="text-white font-semibold mb-2">Raw Response:</h4>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(apiResult, null, 2)}
                </pre>
              </div>

              {apiResult.data && apiResult.data.length > 0 && (
                <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Recent Bookings:</h4>
                  <div className="space-y-2">
                    {apiResult.data.slice(0, 5).map((booking: any, index: number) => (
                      <div key={index} className="text-sm text-blue-300 bg-blue-500/10 rounded p-2">
                        <p><strong>ID:</strong> {booking.booking_code}</p>
                        <p><strong>Client:</strong> {booking.client?.first_name} {booking.client?.last_name}</p>
                        <p><strong>Status:</strong> {booking.status}</p>
                        <p><strong>Pickup:</strong> {booking.pickup_address}</p>
                        <p><strong>Created:</strong> {new Date(booking.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/operator"
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg text-center font-semibold"
          >
            🔧 Operator Dashboard
          </a>
          <a
            href="/test-realtime"
            className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg text-center font-semibold"
          >
            🧪 Real-time Test
          </a>
          <a
            href="/"
            className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg text-center font-semibold"
          >
            🏠 Home
          </a>
        </div>
      </div>
    </div>
  )
}
