import type { SupabaseClient } from '@supabase/supabase-js'

export const ADMIN_IMAGE_BUCKET = 'vehicle-images'
const MAX_INLINE_IMAGE_BYTES = 900_000

export async function ensurePublicImageBucket(supabase: SupabaseClient, bucket = ADMIN_IMAGE_BUCKET) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) {
    console.warn('Could not list storage buckets:', listError.message)
  } else if (buckets?.some((item) => item.name === bucket || item.id === bucket)) {
    return
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  })

  if (createError && !createError.message.toLowerCase().includes('already exists')) {
    throw createError
  }
}

export function isMissingBucketError(message?: string) {
  if (!message) return false
  const normalized = message.toLowerCase()
  return normalized.includes('bucket not found') || normalized.includes('does not exist')
}

export function toInlineImageDataUrl(file: File, buffer: ArrayBuffer): string | null {
  if (!file.type.startsWith('image/') || buffer.byteLength > MAX_INLINE_IMAGE_BYTES) {
    return null
  }
  const base64 = Buffer.from(buffer).toString('base64')
  return `data:${file.type || 'image/jpeg'};base64,${base64}`
}

export async function uploadAdminImage(
  supabase: SupabaseClient,
  file: File,
  pathPrefix: string,
  bucket = ADMIN_IMAGE_BUCKET,
): Promise<string> {
  const buffer = await file.arrayBuffer()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const attemptUpload = async () => {
    return supabase.storage.from(bucket).upload(path, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })
  }

  let { data, error } = await attemptUpload()

  if (error && isMissingBucketError(error.message)) {
    await ensurePublicImageBucket(supabase, bucket)
    ;({ data, error } = await attemptUpload())
  }

  if (!error && data?.path) {
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return urlData.publicUrl
  }

  const inlineUrl = toInlineImageDataUrl(file, buffer)
  if (inlineUrl) {
    console.warn('Admin image storage upload failed, using inline fallback:', error?.message)
    return inlineUrl
  }

  throw new Error(
    error?.message ||
      `Upload failed. Ensure bucket "${bucket}" exists and is public, or use a smaller image.`,
  )
}
