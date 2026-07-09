"use client"

import { useMemo, useState } from "react"
import { CalendarRange, Home, Loader2, Minus, Paperclip, Plus, Send, Shield } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { HomeSecurityType } from "@/lib/types/quick-services"

type QuickServicesSectionProps = {
  isLoggedIn: boolean
  onRequireLogin?: () => void
  onSubmitted?: (booking: {
    booking_code: string
    id?: string
    special_instructions?: string | null
    pickup_address?: string | null
    destination_address?: string | null
  }) => void
}

type ActiveModal = "itinerary" | "home_security" | null

const SHEET_CLASS =
  "z-[60] flex h-auto max-h-[min(88dvh,calc(100dvh-1rem))] w-full max-w-md flex-col gap-0 rounded-t-2xl border-white/10 bg-[#12151d] p-0 text-white left-1/2 right-auto -translate-x-1/2"

function Counter({
  label,
  value,
  onChange,
  min = 1,
  max = 12,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#171b26] px-3 py-2.5">
      <span className="text-sm text-gray-300">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-6 text-center text-sm font-semibold text-white">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function QuickServicesSection({
  isLoggedIn,
  onRequireLogin,
  onSubmitted,
}: QuickServicesSectionProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [submitting, setSubmitting] = useState(false)

  const [itineraryFile, setItineraryFile] = useState<File | null>(null)
  const [itineraryDescription, setItineraryDescription] = useState("")

  const [securityType, setSecurityType] = useState<HomeSecurityType>("armed")
  const [address, setAddress] = useState("")
  const [protectorCount, setProtectorCount] = useState(1)
  const [protecteeCount, setProtecteeCount] = useState(1)
  const [protecteeNames, setProtecteeNames] = useState<string[]>([""])

  const protecteeFields = useMemo(() => {
    return Array.from({ length: protecteeCount }, (_, index) => protecteeNames[index] || "")
  }, [protecteeCount, protecteeNames])

  const openModal = (modal: ActiveModal) => {
    if (!isLoggedIn) {
      toast.error("Please log in first")
      onRequireLogin?.()
      return
    }
    setActiveModal(modal)
  }

  const resetItinerary = () => {
    setItineraryFile(null)
    setItineraryDescription("")
  }

  const resetHomeSecurity = () => {
    setSecurityType("armed")
    setAddress("")
    setProtectorCount(1)
    setProtecteeCount(1)
    setProtecteeNames([""])
  }

  const closeModal = () => {
    setActiveModal(null)
    setSubmitting(false)
  }

  const updateProtecteeName = (index: number, value: string) => {
    setProtecteeNames((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const submitItinerary = async () => {
    if (!itineraryDescription.trim()) {
      toast.error("Add a short description")
      return
    }

    setSubmitting(true)
    try {
      let itineraryFileUrl: string | null = null
      let itineraryFileName: string | null = null

      if (itineraryFile) {
        const formData = new FormData()
        formData.append("file", itineraryFile)
        const uploadRes = await fetch("/api/quick-services/upload", {
          method: "POST",
          body: formData,
        })
        const uploadJson = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploadJson.error || "Upload failed")
        itineraryFileUrl = uploadJson.url
        itineraryFileName = uploadJson.fileName
      }

      const response = await fetch("/api/quick-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "itinerary_planning",
          description: itineraryDescription.trim(),
          itineraryFileUrl,
          itineraryFileName,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Request failed")

      toast.success("Itinerary sent")
      closeModal()
      resetItinerary()
      onSubmitted?.({
        booking_code: result.booking_code,
        id: result.data?.id,
        special_instructions: result.data?.special_instructions,
        pickup_address: result.data?.pickup_address,
        destination_address: result.data?.destination_address,
      })
    } catch (error: any) {
      toast.error(error?.message || "Could not send request")
    } finally {
      setSubmitting(false)
    }
  }

  const submitHomeSecurity = async () => {
    if (!address.trim()) {
      toast.error("Add your address")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/quick-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "private_home_security",
          securityType,
          address: address.trim(),
          protectorCount,
          protecteeCount,
          protecteeNames: protecteeFields.map((name) => name.trim()).filter(Boolean),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Request failed")

      toast.success("Home security request sent")
      closeModal()
      resetHomeSecurity()
      onSubmitted?.({
        booking_code: result.booking_code,
        id: result.data?.id,
        special_instructions: result.data?.special_instructions,
        pickup_address: result.data?.pickup_address,
        destination_address: result.data?.destination_address,
      })
    } catch (error: any) {
      toast.error(error?.message || "Could not send request")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Quick Service</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => openModal("itinerary")}
            className="rounded-2xl border border-white/10 bg-[#171b26] p-4 text-left transition-colors active:bg-white/10"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
              <CalendarRange className="h-5 w-5" />
            </div>
            <p className="font-semibold text-white">Let&apos;s Plan Your Itinerary</p>
            <p className="mt-1 text-xs text-gray-400">Upload & send to operator</p>
          </button>

          <button
            type="button"
            onClick={() => openModal("home_security")}
            className="rounded-2xl border border-white/10 bg-[#171b26] p-4 text-left transition-colors active:bg-white/10"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <Home className="h-5 w-5" />
            </div>
            <p className="font-semibold text-white">Private Home Security</p>
            <p className="mt-1 text-xs text-gray-400">Armed or unarmed request</p>
          </button>
        </div>
      </section>

      <Sheet open={activeModal === "itinerary"} onOpenChange={(open) => !open && closeModal()}>
        <SheetContent side="bottom" className={SHEET_CLASS}>
          <SheetHeader className="shrink-0 border-b border-white/10 px-4 pb-3 pt-4 text-left">
            <SheetTitle className="text-white">Plan Your Itinerary</SheetTitle>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="itinerary-file" className="text-gray-300">
                Upload itinerary
              </Label>
              <label
                htmlFor="itinerary-file"
                className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-white/15 bg-[#171b26] px-4 py-3 text-sm text-gray-300"
              >
                <span className="truncate">{itineraryFile?.name || "PDF, image, or document"}</span>
                <Paperclip className="h-4 w-4 shrink-0" />
              </label>
              <input
                id="itinerary-file"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setItineraryFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="itinerary-description" className="text-gray-300">
                What do you need?
              </Label>
              <textarea
                id="itinerary-description"
                value={itineraryDescription}
                onChange={(e) => setItineraryDescription(e.target.value)}
                placeholder="Dates, locations, protectors, vehicles..."
                className="min-h-24 w-full rounded-xl border border-white/10 bg-[#171b26] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
              />
            </div>
          </div>

          <SheetFooter className="shrink-0 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void submitItinerary()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send request
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={activeModal === "home_security"} onOpenChange={(open) => !open && closeModal()}>
        <SheetContent side="bottom" className={SHEET_CLASS}>
          <SheetHeader className="shrink-0 border-b border-white/10 px-4 pb-3 pt-4 text-left">
            <SheetTitle className="text-white">Private Home Security</SheetTitle>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSecurityType("armed")}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                  securityType === "armed"
                    ? "border-blue-500/50 bg-blue-500/15 text-blue-100"
                    : "border-white/10 bg-[#171b26] text-gray-300"
                }`}
              >
                <Shield className="mx-auto mb-1 h-4 w-4" />
                Armed
              </button>
              <button
                type="button"
                onClick={() => setSecurityType("unarmed")}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                  securityType === "unarmed"
                    ? "border-blue-500/50 bg-blue-500/15 text-blue-100"
                    : "border-white/10 bg-[#171b26] text-gray-300"
                }`}
              >
                <Shield className="mx-auto mb-1 h-4 w-4" />
                Unarmed
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="home-address" className="text-gray-300">
                Address
              </Label>
              <Input
                id="home-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Home or estate address"
                className="border-white/10 bg-[#171b26] text-white"
              />
            </div>

            <Counter label="Security personnel" value={protectorCount} onChange={setProtectorCount} />
            <Counter label="Protectees" value={protecteeCount} onChange={setProtecteeCount} />

            <div className="space-y-2">
              <Label className="text-gray-300">Protectee names</Label>
              {protecteeFields.map((name, index) => (
                <Input
                  key={index}
                  value={name}
                  onChange={(e) => updateProtecteeName(index, e.target.value)}
                  placeholder={`Name ${index + 1}`}
                  className="border-white/10 bg-[#171b26] text-white"
                />
              ))}
            </div>
          </div>

          <SheetFooter className="shrink-0 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void submitHomeSecurity()}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send request
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
