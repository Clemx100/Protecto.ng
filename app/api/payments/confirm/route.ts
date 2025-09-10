import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, bookingId } = await request.json()

    // Validate input
    if (!paymentIntentId || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not successful' },
        { status: 400 }
      )
    }

    // Update database
    const supabase = createClient()

    // Update invoice status
    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({ 
        status: 'paid',
        payment_intent_id: paymentIntentId,
        paid_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)

    if (invoiceError) {
      console.error('Error updating invoice:', invoiceError)
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      )
    }

    // Update booking status
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ 
        status: 'accepted',
        payment_status: 'paid'
      })
      .eq('id', bookingId)

    if (bookingError) {
      console.error('Error updating booking:', bookingError)
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed successfully'
    })
  } catch (error) {
    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}


