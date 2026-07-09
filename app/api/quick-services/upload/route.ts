import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { ensurePublicImageBucket } from '@/lib/utils/admin-image-upload'

const BUCKET = 'quick-service-files'
const MAX_BYTES = 8 * 1024 * 1024

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const userSupabase = await createServerSupabaseClient()
    const {
      data: { user },
      error,
    } = await userSupabase.auth.getUser()
    if (error || !user) return null
    return user.id
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File must be under 8MB' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    await ensurePublicImageBucket(supabase, BUCKET)

    const ext = file.name.split('.').pop() || 'bin'
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { data, error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      fileName: file.name,
    })
  } catch (error) {
    console.error('Quick service upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
