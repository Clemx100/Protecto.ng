import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, amount } = await request.json()

    // Validate input
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing payment intent ID' },
        { status: 400 }
      )
    }

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
    })

    // Update database
    const supabase = await createClient()

    // Update invoice status
    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({ 
        status: 'refunded',
        refund_id: refund.id,
        refunded_at: new Date().toISOString()
      })
      .eq('payment_intent_id', paymentIntentId)

    if (invoiceError) {
      console.error('Error updating invoice:', invoiceError)
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      message: 'Refund processed successfully'
    })
  } catch (error) {
    console.error('Error processing refund:', error)
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    )
  }
}


