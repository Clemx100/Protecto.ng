import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    console.log('🗑️  Starting to clear all bookings...')

    // First, get count of bookings
    const { count: bookingCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })

    console.log(`Found ${bookingCount} bookings to delete`)

    // Delete all related messages first (if they reference bookings)
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (messagesError && messagesError.code !== 'PGRST116') {
      console.log('⚠️  Error deleting messages:', messagesError.message)
    } else {
      console.log('✅ Cleared all messages')
    }

    // Delete all conversations
    const { error: conversationsError } = await supabase
      .from('conversations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (conversationsError && conversationsError.code !== 'PGRST116') {
      console.log('⚠️  Error deleting conversations:', conversationsError.message)
    } else {
      console.log('✅ Cleared all conversations')
    }

    // Delete all message_reads
    const { error: readsError } = await supabase
      .from('message_reads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (readsError && readsError.code !== 'PGRST116') {
      console.log('⚠️  Error deleting message reads:', readsError.message)
    } else {
      console.log('✅ Cleared all message reads')
    }

    // Finally, delete all bookings
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (bookingsError) {
      console.error('❌ Error deleting bookings:', bookingsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete bookings',
        details: bookingsError.message 
      }, { status: 500 })
    }

    console.log('✅ Successfully cleared all bookings')
    console.log('🎉 Database cleanup complete!')

    return NextResponse.json({ 
      success: true, 
      message: 'All bookings cleared successfully',
      deletedCount: bookingCount || 0
    })

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
