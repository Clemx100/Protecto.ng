import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { reference, bookingId } = await request.json()

    // Validate input
    if (!reference || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required fields: reference, bookingId' },
        { status: 400 }
      )
    }

    // Paystack API configuration
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: 'Paystack secret key not configured' },
        { status: 500 }
      )
    }

    // Verify payment with Paystack
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json()
      console.error('Paystack verification error:', errorData)
      return NextResponse.json(
        { error: 'Failed to verify payment with Paystack' },
        { status: 500 }
      )
    }

    const verifyData = await verifyResponse.json()

    if (!verifyData.status) {
      return NextResponse.json(
        { error: verifyData.message || 'Payment verification failed' },
        { status: 400 }
      )
    }

    const paymentData = verifyData.data

    // Check if payment was successful
    if (paymentData.status !== 'success') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Payment was not successful',
          status: paymentData.status 
        },
        { status: 400 }
      )
    }

    // Payment was successful - update database
    const supabase = await createClient()

    try {
      // Update booking with payment information
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          status: 'accepted',
          payment_status: 'paid',
          payment_reference: reference,
          payment_amount: paymentData.amount / 100, // Convert from kobo
          payment_currency: paymentData.currency,
          payment_method: paymentData.channel,
          payment_date: paymentData.paid_at || new Date().toISOString(),
          payment_approved: true,
          payment_approved_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (bookingError) {
        console.error('Error updating booking:', bookingError)
        return NextResponse.json(
          { error: 'Failed to update booking status' },
          { status: 500 }
        )
      }

      // Send success message to chat
      const { unifiedChatService } = await import('@/lib/services/unifiedChatService')
      await unifiedChatService.sendMessage(
        bookingId,
        "✅ Payment completed successfully! Your protection service is now confirmed.",
        'system',
        'system',
        { isSystemMessage: true }
      )

      // Send operator notification
      await unifiedChatService.sendMessage(
        bookingId,
        "💰 Payment received! Client has paid for the protection service. Ready for deployment.",
        'system',
        'system',
        { isSystemMessage: true }
      )

      return NextResponse.json({
        success: true,
        message: 'Payment verified and booking updated successfully',
        payment: {
          reference: paymentData.reference,
          amount: paymentData.amount / 100,
          currency: paymentData.currency,
          channel: paymentData.channel,
          paid_at: paymentData.paid_at,
        }
      })

    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Payment verified but failed to update booking' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error verifying Paystack payment:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
