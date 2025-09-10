"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export default function TestDataSetup() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const supabase = createClient()

  const createTestOperator = async () => {
    setIsLoading(true)
    setMessage("Creating test operator...")
    
    try {
      // Create test operator user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'operator@test.com',
        password: 'testpassword123',
        options: {
          data: {
            first_name: 'Test',
            last_name: 'Operator',
            role: 'agent'
          }
        }
      })

      if (authError) {
        setMessage(`Error: ${authError.message}`)
        return
      }

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: 'operator@test.com',
            first_name: 'Test',
            last_name: 'Operator',
            role: 'agent',
            is_verified: true,
            is_active: true
          })

        if (profileError) {
          setMessage(`Profile error: ${profileError.message}`)
          return
        }

        // Create agent record
        const { error: agentError } = await supabase
          .from('agents')
          .insert({
            id: authData.user.id,
            agent_code: 'AGT001',
            license_number: 'LIC123456',
            qualifications: ['Armed Security', 'Executive Protection'],
            experience_years: 5,
            is_armed: true,
            background_check_status: 'approved',
            availability_status: 'available',
            rating: 4.8,
            total_jobs: 0
          })

        if (agentError) {
          setMessage(`Agent error: ${agentError.message}`)
          return
        }

        setMessage("✅ Test operator created successfully! Email: operator@test.com, Password: testpassword123")
      }
    } catch (error) {
      setMessage(`Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const createTestBookings = async () => {
    setIsLoading(true)
    setMessage("Creating test bookings...")
    
    try {
      // Create test bookings
      const testBookings = [
        {
          id: 'BK001',
          client_id: 'test-client-1',
          service_id: 'armed-protection',
          pickup_address: '123 Victoria Island, Lagos',
          destination_address: '456 Ikoyi, Lagos',
          scheduled_date: new Date().toISOString(),
          duration: '4 hours',
          status: 'pending',
          total_price: 50000,
          created_at: new Date().toISOString()
        },
        {
          id: 'BK002',
          client_id: 'test-client-2',
          service_id: 'vehicle-only',
          pickup_address: '789 Lekki Phase 1, Lagos',
          destination_address: '321 Surulere, Lagos',
          scheduled_date: new Date().toISOString(),
          duration: '2 hours',
          status: 'accepted',
          total_price: 25000,
          created_at: new Date().toISOString()
        }
      ]

      const { error } = await supabase
        .from('bookings')
        .insert(testBookings)

      if (error) {
        setMessage(`Booking error: ${error.message}`)
        return
      }

      setMessage("✅ Test bookings created successfully!")
    } catch (error) {
      setMessage(`Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const createTestMessages = async () => {
    setIsLoading(true)
    setMessage("Creating test messages...")
    
    try {
      const testMessages = [
        {
          booking_id: 'BK001',
          sender_id: 'system',
          sender_type: 'system',
          message: 'New protection request received',
          is_system_message: true,
          created_at: new Date().toISOString()
        },
        {
          booking_id: 'BK001',
          sender_id: 'test-client-1',
          sender_type: 'client',
          message: 'Hello, I need armed protection for my meeting today at 2 PM',
          is_system_message: false,
          created_at: new Date().toISOString()
        },
        {
          booking_id: 'BK001',
          sender_id: 'operator',
          sender_type: 'operator',
          message: 'Thank you for your request. We are reviewing your requirements and will respond shortly.',
          is_system_message: false,
          created_at: new Date().toISOString()
        }
      ]

      const { error } = await supabase
        .from('messages')
        .insert(testMessages)

      if (error) {
        setMessage(`Message error: ${error.message}`)
        return
      }

      setMessage("✅ Test messages created successfully!")
    } catch (error) {
      setMessage(`Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 rounded-xl p-8 border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-6">Test Data Setup</h1>
          <p className="text-gray-300 mb-8">
            Use these tools to create test data for the operator interface.
          </p>

          <div className="space-y-6">
            <div className="bg-white/5 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Create Test Operator</h2>
              <p className="text-gray-300 mb-4">
                Creates a test operator account with agent role for testing the operator interface.
              </p>
              <Button
                onClick={createTestOperator}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? "Creating..." : "Create Test Operator"}
              </Button>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Create Test Bookings</h2>
              <p className="text-gray-300 mb-4">
                Creates sample booking requests for testing the operator interface.
              </p>
              <Button
                onClick={createTestBookings}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? "Creating..." : "Create Test Bookings"}
              </Button>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Create Test Messages</h2>
              <p className="text-gray-300 mb-4">
                Creates sample chat messages for testing the chat functionality.
              </p>
              <Button
                onClick={createTestMessages}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoading ? "Creating..." : "Create Test Messages"}
              </Button>
            </div>

            {message && (
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                <p className="text-blue-200">{message}</p>
              </div>
            )}

            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
              <h3 className="text-yellow-200 font-semibold mb-2">Testing Instructions:</h3>
              <ol className="text-yellow-200 text-sm space-y-1 list-decimal list-inside">
                <li>Click "Create Test Operator" to create an operator account</li>
                <li>Click "Create Test Bookings" to create sample bookings</li>
                <li>Click "Create Test Messages" to create sample chat messages</li>
                <li>Go to <a href="/operator" className="underline">/operator</a> to test the interface</li>
                <li>Or login with: operator@test.com / testpassword123</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
