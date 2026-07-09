"use client"

import { useCallback, useEffect, useState } from "react"
import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SuperAdminAPI } from "@/lib/api"
import LoadingLogo from "@/components/loading-logo"
import { formatCityPriceRange, normalizeCitySlug, type CityInsight } from "@/lib/utils/city-insights"

const EMPTY_FORM = {
  city_name: "",
  card_category: "protector" as "protector" | "vehicle",
  headline: "",
  description: "",
  image_url: "",
  response_time_label: "15–45 min",
  metrics_label: "Avg mission price",
  price_min: "250000",
  price_max: "700000",
  currency: "NGN",
  cta_label: "Get city insights →",
  cta_url: "",
  is_active: true,
  is_default: false,
  sort_order: "0",
}

type SuperAdminCityInsightsProps = {
  onMessage: (message: { error?: string; success?: string }) => void
}

function validateFormFields(form: typeof EMPTY_FORM) {
  const invalidFields: Array<"city_name" | "image_url"> = []
  if (!form.city_name.trim()) invalidFields.push("city_name")
  if (!form.image_url.trim()) invalidFields.push("image_url")
  return invalidFields
}

export default function SuperAdminCityInsights({ onMessage }: SuperAdminCityInsightsProps) {
  const [items, setItems] = useState<CityInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")
  const [showValidation, setShowValidation] = useState(false)
  const [duplicateExistingId, setDuplicateExistingId] = useState<string | null>(null)

  const clearFormMessages = () => {
    setFormError("")
    setFormSuccess("")
    setDuplicateExistingId(null)
  }

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const data = await SuperAdminAPI.getCityInsights()
      setItems(data)
    } catch (error: any) {
      const message = error?.message || "Failed to load city cards"
      onMessage({ error: message })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [onMessage])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowValidation(false)
    clearFormMessages()
    setDialogOpen(true)
  }

  const openEdit = (item: CityInsight) => {
    setEditingId(item.id)
    setForm({
      city_name: item.city_name,
      card_category: item.card_category === "vehicle" ? "vehicle" : "protector",
      headline: item.headline || "",
      description: item.description || "",
      image_url: item.image_url,
      response_time_label: item.response_time_label,
      metrics_label: item.metrics_label,
      price_min: String(item.price_min),
      price_max: String(item.price_max),
      currency: item.currency,
      cta_label: item.cta_label,
      cta_url: item.cta_url || "",
      is_active: item.is_active,
      is_default: item.is_default,
      sort_order: String(item.sort_order),
    })
    setShowValidation(false)
    clearFormMessages()
    setDialogOpen(true)
  }

  const updateForm = (patch: Partial<typeof EMPTY_FORM>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    clearFormMessages()
  }

  const handleImageUpload = async (file: File | null) => {
    if (!file) return
    setUploadingImage(true)
    clearFormMessages()
    try {
      const { urls } = await SuperAdminAPI.uploadVehicleImages([file])
      if (urls[0]) {
        updateForm({ image_url: urls[0] })
        const message = "Image uploaded"
        setFormSuccess(message)
        onMessage({ success: message })
        toast.success(message)
      } else {
        const message = "Upload completed but no image URL was returned"
        setFormError(message)
        onMessage({ error: message })
        toast.error(message)
      }
    } catch (error: any) {
      const message = error?.message || "Image upload failed"
      setFormError(message)
      onMessage({ error: message })
      toast.error(message)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    setShowValidation(true)
    const invalidFields = validateFormFields(form)
    if (invalidFields.length > 0) {
      const message = "City name and card image are required"
      setFormError(message)
      onMessage({ error: message })
      toast.error(message)
      return
    }

    const citySlug = normalizeCitySlug(form.city_name)
    const duplicate = items.find(
      (item) =>
        item.city_slug === citySlug &&
        item.card_category === form.card_category &&
        item.id !== editingId,
    )
    if (duplicate) {
      const message = `A ${form.card_category} card for "${duplicate.city_name}" already exists. Edit the existing card instead of creating a duplicate.`
      setFormError(message)
      setDuplicateExistingId(duplicate.id)
      onMessage({ error: message })
      toast.error(message)
      return
    }

    setSaving(true)
    clearFormMessages()
    try {
      const payload = {
        city_name: form.city_name.trim(),
        card_category: form.card_category,
        headline: form.headline.trim(),
        description: form.description.trim(),
        image_url: form.image_url.trim(),
        response_time_label: form.response_time_label.trim(),
        metrics_label: form.metrics_label.trim(),
        price_min: Number(form.price_min),
        price_max: Number(form.price_max),
        currency: form.currency.trim(),
        cta_label: form.cta_label.trim(),
        cta_url: form.cta_url.trim() || null,
        is_active: form.is_active,
        is_default: form.is_default,
        sort_order: Number(form.sort_order) || 0,
      }

      if (editingId) {
        await SuperAdminAPI.updateCityInsight({ id: editingId, ...payload })
        const message = "City card updated"
        onMessage({ success: message })
        toast.success(message)
      } else {
        await SuperAdminAPI.createCityInsight(payload)
        const message = "City card created"
        onMessage({ success: message })
        toast.success(message)
      }

      setDialogOpen(false)
      setShowValidation(false)
      await loadItems()
    } catch (error: any) {
      const message = error?.message || "Failed to save city card"
      setFormError(message)
      if (error?.existingId) {
        setDuplicateExistingId(error.existingId)
      }
      onMessage({ error: message })
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, cityName: string) => {
    if (!window.confirm(`Delete city card for ${cityName}?`)) return
    try {
      await SuperAdminAPI.deleteCityInsight(id)
      const message = "City card deleted"
      onMessage({ success: message })
      toast.success(message)
      await loadItems()
    } catch (error: any) {
      const message = error?.message || "Failed to delete city card"
      onMessage({ error: message })
      toast.error(message)
    }
  }

  const invalidFields = showValidation ? validateFormFields(form) : []
  const cityNameInvalid = invalidFields.includes("city_name")
  const imageUrlInvalid = invalidFields.includes("image_url")

  const openExistingDuplicate = () => {
    if (!duplicateExistingId) return
    const existing = items.find((item) => item.id === duplicateExistingId)
    if (existing) openEdit(existing)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">City Home Cards</h2>
          <p className="text-sm text-slate-400">
            Manage protector and vehicle promo cards per city. The app personalizes headlines using location and bookings.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 mr-2" />
          Add City Card
        </Button>
      </div>

      {loading ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-10">
            <LoadingLogo fullscreen={false} label="Loading city cards..." />
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-10 text-center text-slate-400">
            No city cards yet. Add Lagos, Abuja, Port Harcourt, and more.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="bg-white/5 border-white/10 overflow-hidden">
              <div className="h-36 bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_url} alt="" className="h-full w-full object-cover" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-white flex items-center justify-between gap-2">
                  <span className="truncate">
                    {item.headline || (item.card_category === "vehicle" ? `Vehicle in ${item.city_name}` : `Protector in ${item.city_name}`)}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">
                    {item.card_category === "vehicle" ? "Vehicle" : "Protector"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-300">{item.city_name}</p>
                <p className="text-sm text-slate-400 line-clamp-2">
                  {item.description || item.metrics_label}
                </p>
                <p className="text-sm text-slate-400">
                  Response: {item.response_time_label} • {formatCityPriceRange(item)}
                </p>
                <p className="text-xs text-slate-500 truncate">{item.cta_label}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                    onClick={() => void handleDelete(item.id, item.city_name)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setShowValidation(false)
            clearFormMessages()
          }
        }}
      >
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit City Card" : "Add City Card"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                City name <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.city_name}
                onChange={(e) => updateForm({ city_name: e.target.value })}
                placeholder="Lagos"
                className={`bg-slate-800 border-white/10 ${cityNameInvalid ? "border-red-500/60" : ""}`}
              />
              {cityNameInvalid ? (
                <p className="text-xs text-red-400">City name is required</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Card category</Label>
              <select
                value={form.card_category}
                onChange={(e) =>
                  updateForm({ card_category: e.target.value === "vehicle" ? "vehicle" : "protector" })
                }
                className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
              >
                <option value="protector">Protector</option>
                <option value="vehicle">Vehicle</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Headline</Label>
              <Input
                value={form.headline}
                onChange={(e) => updateForm({ headline: e.target.value })}
                placeholder={
                  form.card_category === "vehicle"
                    ? "Book a Vehicle in Lagos"
                    : "Protector in Lagos"
                }
                className="bg-slate-800 border-white/10"
              />
              <p className="text-xs text-slate-500">
                Default title from admin. The app may personalize this based on the user&apos;s bookings and time of day.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="Avg response 15–45 min • Trusted local protectors"
                className="bg-slate-800 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Card image URL <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.image_url}
                onChange={(e) => updateForm({ image_url: e.target.value })}
                placeholder="/images/..."
                className={`bg-slate-800 border-white/10 ${imageUrlInvalid ? "border-red-500/60" : ""}`}
              />
              {imageUrlInvalid ? (
                <p className="text-xs text-red-400">Add an image URL or upload an image</p>
              ) : null}
              <div className="flex items-center gap-2">
                <Label htmlFor="city-card-image" className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10">
                    <ImageIcon className="h-4 w-4" />
                    {uploadingImage ? "Uploading..." : "Upload image"}
                  </span>
                </Label>
                <input
                  id="city-card-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(e) => void handleImageUpload(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Response time</Label>
                <Input
                  value={form.response_time_label}
                  onChange={(e) => updateForm({ response_time_label: e.target.value })}
                  className="bg-slate-800 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Metrics label</Label>
                <Input
                  value={form.metrics_label}
                  onChange={(e) => updateForm({ metrics_label: e.target.value })}
                  className="bg-slate-800 border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min price</Label>
                <Input
                  type="number"
                  value={form.price_min}
                  onChange={(e) => updateForm({ price_min: e.target.value })}
                  className="bg-slate-800 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Max price</Label>
                <Input
                  type="number"
                  value={form.price_max}
                  onChange={(e) => updateForm({ price_max: e.target.value })}
                  className="bg-slate-800 border-white/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>CTA label</Label>
              <Input
                value={form.cta_label}
                onChange={(e) => updateForm({ cta_label: e.target.value })}
                className="bg-slate-800 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label>CTA link (optional)</Label>
              <Input
                value={form.cta_url}
                onChange={(e) => updateForm({ cta_url: e.target.value })}
                placeholder="https://..."
                className="bg-slate-800 border-white/10"
              />
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => updateForm({ is_active: e.target.checked })}
                />
                Active
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => updateForm({ is_default: e.target.checked })}
                />
                Default fallback city
              </label>
            </div>
          </div>

          {(formError || formSuccess) && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                formError
                  ? "border-red-500/30 bg-red-500/10 text-red-200"
                  : "border-green-500/30 bg-green-500/10 text-green-200"
              }`}
              role="alert"
            >
              {formError || formSuccess}
              {formError && duplicateExistingId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openExistingDuplicate}
                  className="mt-2 border-white/20 text-white"
                >
                  Edit existing card
                </Button>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-white/20 text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || uploadingImage}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Create card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
