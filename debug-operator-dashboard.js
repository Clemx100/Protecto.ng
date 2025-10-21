// Debug operator dashboard - check if bookings are being fetched
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugDashboard() {
  console.log('\n🔍 OPERATOR DASHBOARD DEBUG\n')
  console.log('='.repeat(70))

  try {
    // 1. Check latest bookings in database
    console.log('\n1️⃣ Checking latest bookings in database:\n')
    const { data: allBookings, error: allError } = await supabase
      .from('bookings')
      .select('id, booking_code, status, created_at, client_id')
      .order('created_at', { ascending: false })
      .limit(5)

    if (allError) {
      console.error('❌ Error fetching bookings:', allError.message)
      return
    }

    console.log(`   Found ${allBookings.length} recent bookings:`)
    allBookings.forEach((booking, i) => {
      const timeAgo = Math.floor((Date.now() - new Date(booking.created_at).getTime()) / 1000 / 60)
      console.log(`   ${i + 1}. ${booking.booking_code} - ${booking.status}`)
      console.log(`      Created: ${new Date(booking.created_at).toLocaleString()} (${timeAgo} mins ago)`)
    })

    // 2. Check what operator API would return
    console.log('\n2️⃣ Testing Operator API query:\n')
    const { data: operatorBookings, error: opError } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!bookings_client_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        service:services(
          id,
          name,
          description,
          base_price,
          price_per_hour
        )
      `)
      .order('created_at', { ascending: false })

    if (opError) {
      console.error('❌ Operator API query error:', opError.message)
      return
    }

    console.log(`   Operator API would return: ${operatorBookings.length} bookings`)
    console.log('\n   Latest 3 bookings:')
    operatorBookings.slice(0, 3).forEach((booking, i) => {
      const clientName = booking.client 
        ? `${booking.client.first_name} ${booking.client.last_name}`
        : 'No client data'
      const serviceName = booking.service?.name || 'No service data'
      
      console.log(`   ${i + 1}. ${booking.booking_code}`)
      console.log(`      Client: ${clientName}`)
      console.log(`      Service: ${serviceName}`)
      console.log(`      Status: ${booking.status}`)
      console.log(`      Created: ${new Date(booking.created_at).toLocaleString()}`)
    })

    // 3. Check if there are very recent bookings
    console.log('\n3️⃣ Checking for bookings created in last 10 minutes:\n')
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: recentBookings, error: recentError } = await supabase
      .from('bookings')
      .select('id, booking_code, status, created_at')
      .gte('created_at', tenMinsAgo)
      .order('created_at', { ascending: false })

    if (recentError) {
      console.error('❌ Error:', recentError.message)
    } else {
      if (recentBookings.length > 0) {
        console.log(`   ✅ Found ${recentBookings.length} booking(s) in last 10 minutes:`)
        recentBookings.forEach(b => {
          console.log(`      - ${b.booking_code} (${b.status}) - ${new Date(b.created_at).toLocaleString()}`)
        })
      } else {
        console.log('   ℹ️  No bookings created in the last 10 minutes')
      }
    }

    // 4. Test the actual API endpoint
    console.log('\n4️⃣ Testing actual API endpoint:\n')
    console.log('   Simulating: GET /api/operator/bookings')
    
    const apiUrl = 'http://localhost:3000/api/operator/bookings'
    console.log(`   URL: ${apiUrl}`)
    console.log('   Note: This requires the dev server to be running')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n💡 TROUBLESHOOTING TIPS:\n')
  console.log('   1. Check if the operator dashboard is auto-refreshing (every 3 seconds)')
  console.log('   2. Try manually refreshing the browser (Ctrl+Shift+R)')
  console.log('   3. Check browser console for errors')
  console.log('   4. Verify the dev server is running (npm run dev or npm run mobile)')
  console.log('   5. Check if there are any RLS policy issues')
  console.log('\n' + '='.repeat(70) + '\n')
}

debugDashboard().catch(console.error)

