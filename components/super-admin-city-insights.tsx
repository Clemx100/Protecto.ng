"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ImageIcon, Pencil, Plus, Search, Trash2 } from "lucide-react"
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
import { formatCityPriceRange, getCardCategoryLabel, normalizeCitySlug, normalizeCardCategory, PROMO_CARD_CATEGORY_LABELS, type CityInsight, type PromoCardCategory } from "@/lib/utils/city-insights"
import {
  CITY_INSIGHTS_SMART_FIELDS_MIGRATION,
  needsCityInsightsMigration,
} from "@/lib/utils/city-insights-schema"

const EMPTY_FORM = {
  city_name: "",
  card_category: "protector" as PromoCardCategory,
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

type CategoryFilter = "all" | PromoCardCategory

const CATEGORY_FILTERS: Array<{ id: CategoryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "protector", label: PROMO_CARD_CATEGORY_LABELS.protector },
  { id: "vehicle", label: PROMO_CARD_CATEGORY_LABELS.vehicle },
  { id: "bulletproof_vehicle", label: PROMO_CARD_CATEGORY_LABELS.bulletproof_vehicle },
]

function matchesSearch(item: CityInsight, query: string) {
  if (!query) return true
  const category = getCardCategoryLabel(normalizeCardCategory(item.card_category))
  const haystack = [
    item.city_name,
    item.city_slug,
    item.headline,
    item.description,
    item.metrics_label,
    item.cta_label,
    category,
  ]
    .join(" ")
    .toLowerCase()
  return haystack.includes(query)
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
  const [migrationRequired, setMigrationRequired] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: items.length,
      protector: 0,
      vehicle: 0,
      bulletproof_vehicle: 0,
    }
    for (const item of items) {
      counts[normalizeCardCategory(item.card_category)] += 1
    }
    return counts
  }, [items])

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return items.filter((item) => {
      const category = normalizeCardCategory(item.card_category)
      if (categoryFilter !== "all" && category !== categoryFilter) return false
      return matchesSearch(item, query)
    })
  }, [items, searchQuery, categoryFilter])

  const clearFormMessages = () => {
    setFormError("")
    setFormSuccess("")
  }

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const result = await SuperAdminAPI.getCityInsights()
      setItems(result.data)
      setMigrationRequired(result.migrationRequired)
    } catch (error: any) {
      const message = error?.message || "Failed to load city cards"
      if (needsCityInsightsMigration(message)) setMigrationRequired(true)
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
      card_category: normalizeCardCategory(item.card_category),
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
      const message = "City/state and card image are required"
      setFormError(message)
      onMessage({ error: message })
      toast.error(message)
      return
    }

    const citySlug = normalizeCitySlug(form.city_name)

    setSaving(true)
    clearFormMessages()
    try {
      const payload = {
        city_name: form.city_name.trim(),
        city_slug: citySlug,
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
      if (needsCityInsightsMigration(message)) setMigrationRequired(true)
      setFormError(message)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">City Home Cards</h2>
          <p className="text-sm text-slate-400">
            Create unlimited promo cards for any city or state. Use headline and sort order to differentiate multiple cards in the same location.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 mr-2" />
          Add City Card
        </Button>
      </div>

      {migrationRequired ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-100">
          <p className="font-semibold text-amber-50">Database update required before city cards can be saved</p>
          <p className="mt-2 text-sm text-amber-100/90">
            The <code className="rounded bg-black/20 px-1">card_category</code> column is missing from{" "}
            <code className="rounded bg-black/20 px-1">city_insights</code>.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            <li>Open your Supabase project dashboard</li>
            <li>Go to <strong>SQL Editor</strong> → <strong>New query</strong></li>
            <li>
              Copy all SQL from <code>{CITY_INSIGHTS_SMART_FIELDS_MIGRATION}</code> in this repo
            </li>
            <li>Paste into the editor and click <strong>Run</strong></li>
            <li>Refresh this page, then create the card again</li>
          </ol>
        </div>
      ) : null}

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
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search city, headline, description, CTA..."
                  className="bg-slate-900/80 border-white/10 pl-9 text-white"
                />
              </div>
              <p className="text-sm text-slate-400">
                Showing <span className="font-semibold text-white">{filteredItems.length}</span> of{" "}
                <span className="font-semibold text-white">{items.length}</span> cards
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map((filter) => {
                const active = categoryFilter === filter.id
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setCategoryFilter(filter.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "border-amber-500/50 bg-amber-500/20 text-amber-100"
                        : "border-white/10 bg-slate-900/50 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {filter.label}
                    <span className="ml-1.5 text-xs opacity-80">({categoryCounts[filter.id]})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-10 text-center text-slate-400 space-y-3">
                <p>No cards match your search or filter.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 text-white"
                  onClick={() => {
                    setSearchQuery("")
                    setCategoryFilter("all")
                  }}
                >
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredItems.map((item) => (
            <Card key={item.id} className="bg-white/5 border-white/10 overflow-hidden">
              <div className="h-36 bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_url} alt="" className="h-full w-full object-cover" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-white flex items-center justify-between gap-2">
                  <span className="truncate">
                    {item.headline ||
                      (normalizeCardCategory(item.card_category) === "bulletproof_vehicle"
                        ? `Bulletproof Vehicle in ${item.city_name}`
                        : normalizeCardCategory(item.card_category) === "vehicle"
                          ? `Vehicle in ${item.city_name}`
                          : `Protector in ${item.city_name}`)}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">
                    {getCardCategoryLabel(normalizeCardCategory(item.card_category))}
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
                City / State <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.city_name}
                onChange={(e) => updateForm({ city_name: e.target.value })}
                placeholder="Lagos, Ikeja, Lagos State, Abuja..."
                className={`bg-slate-800 border-white/10 ${cityNameInvalid ? "border-red-500/60" : ""}`}
              />
              {cityNameInvalid ? (
                <p className="text-xs text-red-400">City or state is required</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Card category</Label>
              <select
                value={form.card_category}
                onChange={(e) => updateForm({ card_category: normalizeCardCategory(e.target.value) })}
                className="w-full rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
              >
                <option value="protector">Protectors</option>
                <option value="vehicle">Vehicles</option>
                <option value="bulletproof_vehicle">Bulletproof Vehicles</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Headline</Label>
              <Input
                value={form.headline}
                onChange={(e) => updateForm({ headline: e.target.value })}
                placeholder={
                  form.card_category === "bulletproof_vehicle"
                    ? "Book a Bulletproof Vehicle in Lagos"
                    : form.card_category === "vehicle"
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
              {formError && needsCityInsightsMigration(formError) ? (
                <p className="mt-2 text-xs text-amber-200">
                  Run <code>{CITY_INSIGHTS_SMART_FIELDS_MIGRATION}</code> in Supabase SQL Editor, then try again.
                </p>
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
