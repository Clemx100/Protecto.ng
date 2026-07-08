"use client"

import { useState } from "react"

export default function ProviderListingsPage() {
  const [message, setMessage] = useState("")

  const submitVehicle = async () => {
    const response = await fetch("/api/listings/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Provider Vehicle Listing",
        make: "Toyota",
        model: "Prado",
        year: 2020,
        price_per_day: 180000,
        with_driver: true
      })
    })
    const result = await response.json()
    setMessage(result.success ? "Vehicle listing submitted for KYC review." : (result.error || "Submission failed"))
  }

  const submitProtector = async () => {
    const response = await fetch("/api/listings/protectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: "Professional Protector",
        qualifications: ["VIP Escort", "First Aid"],
        years_experience: 4,
        hourly_rate: 30000,
        daily_rate: 180000
      })
    })
    const result = await response.json()
    setMessage(result.success ? "Protector listing submitted for KYC review." : (result.error || "Submission failed"))
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <h1 className="text-2xl font-semibold mb-6">Provider Listings & KYC</h1>
      <div className="flex gap-3">
        <button className="px-4 py-2 rounded bg-blue-600" onClick={submitVehicle}>Submit Vehicle Listing</button>
        <button className="px-4 py-2 rounded bg-emerald-600" onClick={submitProtector}>Submit Protector Listing</button>
      </div>
      {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
    </div>
  )
}

