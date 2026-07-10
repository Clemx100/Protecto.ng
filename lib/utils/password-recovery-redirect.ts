"use client"

/**
 * Supabase recovery emails sometimes land on Site URL (e.g. protector.ng)
 * with tokens in the URL hash. Servers cannot read the hash, so we catch
 * it in the browser and send the user to the reset-password page.
 */
export function redirectIfPasswordRecoveryHash(): boolean {
  if (typeof window === "undefined") return false

  const hash = window.location.hash
  if (!hash || hash.length < 2) return false

  const params = new URLSearchParams(hash.substring(1))
  const type = params.get("type")
  const accessToken = params.get("access_token")
  const refreshToken = params.get("refresh_token")
  const errorCode = params.get("error_code") || params.get("error")

  // Ignore failed auth hashes
  if (errorCode) return false

  const looksLikeRecovery =
    type === "recovery" || (Boolean(accessToken) && Boolean(refreshToken))

  if (!looksLikeRecovery) return false

  const search = window.location.search || ""
  window.location.replace(`/auth/reset-password${search}${hash}`)
  return true
}
