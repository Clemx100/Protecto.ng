import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/config/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    console.log('🔔 Paystack webhook received')

    // Verify webhook signature
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      console.error('❌ Paystack secret key not configured')
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }

    const hash = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      console.error('❌ Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    console.log('📥 Webhook event:', event.event, 'Reference:', event.data?.reference)

    // Handle successful payment
    if (event.event === 'charge.success') {
      const paymentData = event.data

      console.log('✅ Payment successful:', {
        reference: paymentData.reference,
        amount: paymentData.amount,
        status: paymentData.status
      })

      const supabase = createServiceRoleClient()

      // Extract booking ID from metadata
      const bookingId = paymentData.metadata?.booking_id

      if (!bookingId) {
        console.warn('⚠️ No booking ID in payment metadata')
        return NextResponse.json({ message: 'Received' }, { status: 200 })
      }

      console.log('💾 Updating booking status for:', bookingId)

      // Update booking status to 'paid'
      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update({ 
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Failed to update booking:', updateError)
      } else {
        console.log('✅ Booking updated to paid status')
      }

      // Try to create payment record
      try {
        await supabase.from('payments').insert({
          booking_id: bookingId,
          amount: paymentData.amount / 100,
          currency: paymentData.currency,
          reference: paymentData.reference,
          status: 'success',
          payment_method: 'paystack',
          paid_at: paymentData.paid_at,
          customer_email: paymentData.customer?.email,
          metadata: paymentData.metadata
        })
      } catch (paymentRecordError) {
        console.warn('⚠️ Payment record insert failed (table may not exist):', paymentRecordError)
      }

      // Send payment confirmation message
      try {
        await supabase.from('messages').insert({
          booking_id: bookingId,
          sender_type: 'system',
          sender_id: 'system',
          message: `✅ Payment Confirmed!\n\nAmount: ₦${(paymentData.amount / 100).toLocaleString()}\nReference: ${paymentData.reference}\nStatus: ${paymentData.status}\n\nThank you! Your protection service is being prepared.`,
          created_at: new Date().toISOString(),
          is_system_message: true
        })
        console.log('✅ Payment confirmation message sent to chat')
      } catch (msgError) {
        console.warn('⚠️ Failed to send message:', msgError)
      }

      return NextResponse.json({ message: 'Webhook processed' }, { status: 200 })
    }

    // Handle failed payment
    if (event.event === 'charge.failed') {
      console.log('❌ Payment failed:', event.data?.reference)
      // You can add logic here to notify the client
    }

    return NextResponse.json({ message: 'Event received' }, { status: 200 })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

