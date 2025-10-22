import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, email, bookingId, customerName, currency = 'NGN' } = body

    console.log('💳 Payment request received:', { amount, email, bookingId, customerName, currency })

    // Validate input
    if (!amount || !email || !bookingId || !customerName) {
      console.error('❌ Missing required fields:', { amount: !!amount, email: !!email, bookingId: !!bookingId, customerName: !!customerName })
      return NextResponse.json(
        { error: 'Missing required fields: amount, email, bookingId, customerName' },
        { status: 400 }
      )
    }

    // Convert amount to kobo (Paystack uses kobo for NGN)
    const amountInKobo = Math.round(amount * 100)

    // Resolve booking (accept UUID or booking_code like REQ...)
    let actualBookingId = bookingId

    const { createClient } = await import('@supabase/supabase-js')
    
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL not configured')
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // If not UUID, look up by booking_code
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)
    console.log('🔍 Payment API - Booking lookup:', { bookingId, isUUID })
    
    if (!isUUID) {
      console.log('🔍 Looking up by booking_code:', bookingId)
      const { data: byCode, error: codeError } = await supabase
        .from('bookings')
        .select('id, booking_code, status')
        .eq('booking_code', bookingId)
        .single()
      
      console.log('🔍 Booking code lookup result:', { byCode, codeError })
      
      if (codeError || !byCode) {
        console.log('❌ Booking not found by code:', bookingId, codeError?.message)
        return NextResponse.json({ 
          error: 'Booking not found', 
          details: codeError?.message || 'No booking with this code',
          bookingId 
        }, { status: 404 })
      }
      actualBookingId = byCode.id
    } else {
      console.log('🔍 Looking up by UUID:', bookingId)
      const { data: byId, error: idError } = await supabase
        .from('bookings')
        .select('id, booking_code, status')
        .eq('id', bookingId)
        .single()
      
      console.log('🔍 Booking UUID lookup result:', { byId, idError })
      
      if (idError || !byId) {
        console.log('❌ Booking not found by UUID:', bookingId, idError?.message)
        return NextResponse.json({ 
          error: 'Booking not found', 
          details: idError?.message || 'No booking with this ID',
          bookingId 
        }, { status: 404 })
      }
    }
    
    console.log('✅ Booking found, actualBookingId:', actualBookingId)

    // Paystack API configuration
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      console.error('❌ Paystack secret key not configured')
      console.error('🔧 FIX: Add PAYSTACK_SECRET_KEY to your environment variables')
      console.error('📚 Guide: See PAYSTACK_PRODUCTION_FIX.md for setup instructions')
      return NextResponse.json(
        { 
          error: 'Payment system not configured',
          details: 'Paystack API key is missing. Please contact support.',
          code: 'MISSING_PAYSTACK_KEY'
        },
        { status: 500 }
      )
    }

    // Validate key format
    if (!paystackSecretKey.startsWith('sk_')) {
      console.error('❌ Invalid Paystack secret key format')
      console.error('💡 Expected format: sk_test_... or sk_live_...')
      return NextResponse.json(
        { 
          error: 'Payment system misconfigured',
          details: 'Invalid payment gateway credentials',
          code: 'INVALID_PAYSTACK_KEY'
        },
        { status: 500 }
      )
    }

    // Warn if using test key in production
    if (process.env.NODE_ENV === 'production' && paystackSecretKey.startsWith('sk_test_')) {
      console.warn('⚠️ WARNING: Using TEST Paystack key in PRODUCTION environment!')
      console.warn('🔧 FIX: Replace with LIVE key (sk_live_...)')
    }

    console.log('💰 Paystack secret key present:', paystackSecretKey.substring(0, 10) + '...')
    console.log('🔐 Key type:', paystackSecretKey.startsWith('sk_live_') ? 'LIVE' : 'TEST')

    // Create Paystack transaction
    const paymentReference = `protector_${actualBookingId}_${Date.now()}`
    
    // Determine the correct callback URL based on environment
    const getCallbackUrl = () => {
      // Priority 1: Explicitly set APP_URL
      if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL
      }
      
      // Priority 2: Vercel deployment URL
      if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`
      }
      
      // Priority 3: Production domain
      if (process.env.NODE_ENV === 'production') {
        return 'https://www.protector.ng'
      }
      
      // Fallback: localhost for development
      return 'http://localhost:3000'
    }
    
    const baseUrl = getCallbackUrl()
    const callbackUrl = `${baseUrl}/api/payments/paystack/callback?reference=${paymentReference}&booking=${actualBookingId}`
    
    console.log('🔗 Callback URL:', callbackUrl)
    
    const paystackPayload = {
      amount: amountInKobo,
      email: email,
      currency: currency,
      reference: paymentReference,
      metadata: {
        booking_id: actualBookingId,
        customer_name: customerName,
        service_type: 'Executive Protection Service',
      },
      callback_url: callbackUrl,
      channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
    }

    console.log('📤 Calling Paystack API with payload:', JSON.stringify(paystackPayload, null, 2))

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackPayload),
    })

    console.log('📊 Paystack response status:', paystackResponse.status, paystackResponse.statusText)

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json()
      console.error('❌ Paystack API error:', JSON.stringify(errorData, null, 2))
      return NextResponse.json(
        { error: 'Failed to initialize payment with Paystack', details: errorData.message },
        { status: 500 }
      )
    }

    const paystackData = await paystackResponse.json()
    console.log('📥 Paystack response data:', JSON.stringify(paystackData, null, 2))

    if (!paystackData.status) {
      console.error('❌ Paystack returned status false:', paystackData.message)
      return NextResponse.json(
        { error: paystackData.message || 'Payment initialization failed' },
        { status: 400 }
      )
    }

    console.log('✅ Payment initialized successfully!')
    console.log('   Authorization URL:', paystackData.data.authorization_url)
    console.log('   Reference:', paystackData.data.reference)

    const successResponse = {
      success: true,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
      amount: amount,
      currency: currency,
    }

    console.log('📤 Sending success response to client:', JSON.stringify(successResponse, null, 2))

    return NextResponse.json(successResponse)

  } catch (error) {
    console.error('Error creating Paystack payment:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
