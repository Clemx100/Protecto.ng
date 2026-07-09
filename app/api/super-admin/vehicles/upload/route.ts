import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdminAuth } from '@/lib/auth/superAdminAuth'
import { ADMIN_IMAGE_BUCKET, uploadAdminImage } from '@/lib/utils/admin-image-upload'

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

/**
 * POST: Upload one or more admin images (vehicles, city cards, etc.). Returns public URLs.
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
    const prefix = `uploads/${Date.now()}`

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const url = await uploadAdminImage(supabase, file, `${prefix}/${i}`, ADMIN_IMAGE_BUCKET)
      urls.push(url)
    }

    return NextResponse.json({ urls })
  } catch (e: any) {
    console.error('Super admin image upload error:', e)
    return NextResponse.json(
      { error: e?.message || 'Upload failed. Try a smaller image or create the storage bucket in Supabase.' },
      { status: 500 }
    )
  }
}
