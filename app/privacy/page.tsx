"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PrivacyPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/account/privacy")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <p className="text-gray-400">Redirecting to privacy settings...</p>
    </div>
  )
}
