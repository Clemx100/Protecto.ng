"use client"

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'
import LoadingLogo from "@/components/loading-logo"

export default function PaymentCallbackPage() {
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const reference = searchParams.get('reference')
        const bookingId = searchParams.get('booking')

        if (!reference || !bookingId) {
          setPaymentStatus('error')
          setErrorMessage('Missing payment reference or booking ID')
          return
        }

        // Verify payment with backend
        const response = await fetch('/api/payments/paystack/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reference,
            bookingId,
          }),
        })

        const result = await response.json()

        if (result.success) {
          setPaymentStatus('success')
          setPaymentDetails(result.payment)
          
          // Redirect to client dashboard after 3 seconds
          setTimeout(() => {
            router.push('/client')
          }, 3000)
        } else {
          setPaymentStatus('error')
          setErrorMessage(result.message || 'Payment verification failed')
        }
      } catch (error) {
        console.error('Payment verification error:', error)
        setPaymentStatus('error')
        setErrorMessage('An error occurred while verifying payment')
      }
    }

    verifyPayment()
  }, [searchParams, router])

  const renderContent = () => {
    switch (paymentStatus) {
      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">Your protection service has been confirmed</p>
            
            {paymentDetails && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4 text-left">
                <h3 className="font-semibold mb-2">Payment Details:</h3>
                <p><strong>Reference:</strong> {paymentDetails.reference}</p>
                <p><strong>Amount:</strong> ₦{paymentDetails.amount?.toLocaleString()}</p>
                <p><strong>Method:</strong> {paymentDetails.channel}</p>
                <p><strong>Date:</strong> {new Date(paymentDetails.paid_at).toLocaleString()}</p>
              </div>
            )}
            
            <p className="text-sm text-gray-500 mb-4">
              You will be redirected to your dashboard in a few seconds...
            </p>
            
            <button
              onClick={() => router.push('/client')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Go to Dashboard
            </button>
          </div>
        )

      case 'error':
        return (
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            
            <div className="space-y-2">
              <button
                onClick={() => router.push('/client')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg mr-2"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (paymentStatus === 'loading') {
    return <LoadingLogo label="Verifying payment..." />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        {renderContent()}
      </div>
    </div>
  )
}
