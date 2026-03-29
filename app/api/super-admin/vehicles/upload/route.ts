import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdminAuth } from '@/lib/auth/superAdminAuth'

const BUCKET = 'vehicle-images'

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

/**
 * POST: Upload one or more vehicle images. Returns array of public URLs.
 * Body: multipart/form-data with field "files" or "file" (single/multiple).
 */
export async function POST(request: NextRequest) {
  const authResult = await requireSuperAdminAuth(request)
  if (authResult.error) return authResult.response

  try {
    const formData = await request.formData()
    const files: File[] = []
    const fileList = formData.getAll('files')
    const single = formData.get('file')
    if (fileList?.length) {
      fileList.forEach((f) => {
        if (f instanceof File) files.push(f)
      })
    }
    if (single instanceof File) files.push(single)
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No file(s) provided. Use form field "file" or "files".' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const urls: string[] = []
    const prefix = `vehicles/${Date.now()}`

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${prefix}/${i}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(path, await file.arrayBuffer(), {
          contentType: file.type || 'image/jpeg',
          upsert: false
        })
      if (error) {
        return NextResponse.json(
          { error: `Upload failed: ${error.message}. Ensure bucket "${BUCKET}" exists and is public.` },
          { status: 500 }
        )
      }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
      urls.push(urlData.publicUrl)
    }

    return NextResponse.json({ urls })
  } catch (e) {
    console.error('Super admin vehicle upload error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
