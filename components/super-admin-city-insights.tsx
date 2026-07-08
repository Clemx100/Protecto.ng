"use client"

import { useCallback, useEffect, useState } from "react"
import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react"
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
import { formatCityPriceRange, type CityInsight } from "@/lib/utils/city-insights"

const EMPTY_FORM = {
  city_name: "",
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

export default function SuperAdminCityInsights({ onMessage }: SuperAdminCityInsightsProps) {
  const [items, setItems] = useState<CityInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [uploadingImage, setUploadingImage] = useState(false)

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const data = await SuperAdminAPI.getCityInsights()
      setItems(data)
    } catch (error: any) {
      onMessage({ error: error?.message || "Failed to load city cards" })
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
    setDialogOpen(true)
  }

  const openEdit = (item: CityInsight) => {
    setEditingId(item.id)
    setForm({
      city_name: item.city_name,
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
    setDialogOpen(true)
  }

  const handleImageUpload = async (file: File | null) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const { urls } = await SuperAdminAPI.uploadVehicleImages([file])
      if (urls[0]) {
        setForm((prev) => ({ ...prev, image_url: urls[0] }))
        onMessage({ success: "Image uploaded" })
      }
    } catch (error: any) {
      onMessage({ error: error?.message || "Image upload failed" })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!form.city_name.trim() || !form.image_url.trim()) {
      onMessage({ error: "City name and image are required" })
      return
    }

    setSaving(true)
    try {
      const payload = {
        city_name: form.city_name.trim(),
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
        onMessage({ success: "City card updated" })
      } else {
        await SuperAdminAPI.createCityInsight(payload)
        onMessage({ success: "City card created" })
      }

      setDialogOpen(false)
      await loadItems()
    } catch (error: any) {
      onMessage({ error: error?.message || "Failed to save city card" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, cityName: string) => {
    if (!window.confirm(`Delete city card for ${cityName}?`)) return
    try {
      await SuperAdminAPI.deleteCityInsight(id)
      onMessage({ success: "City card deleted" })
      await loadItems()
    } catch (error: any) {
      onMessage({ error: error?.message || "Failed to delete city card" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">City Home Cards</h2>
          <p className="text-sm text-slate-400">
            Manage the image, pricing, and response time shown on the app home promo card per city.
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
                  <span>Protector in {item.city_name}</span>
                  {item.is_default ? (
                    <span className="text-[10px] uppercase tracking-wide text-amber-400">Default</span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit City Card" : "Add City Card"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>City name</Label>
              <Input
                value={form.city_name}
                onChange={(e) => setForm((prev) => ({ ...prev, city_name: e.target.value }))}
                placeholder="Lagos"
                className="bg-slate-800 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label>Card image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                placeholder="/images/..."
                className="bg-slate-800 border-white/10"
              />
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
                  onChange={(e) => void handleImageUpload(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Response time</Label>
                <Input
                  value={form.response_time_label}
                  onChange={(e) => setForm((prev) => ({ ...prev, response_time_label: e.target.value }))}
                  className="bg-slate-800 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Metrics label</Label>
                <Input
                  value={form.metrics_label}
                  onChange={(e) => setForm((prev) => ({ ...prev, metrics_label: e.target.value }))}
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
                  onChange={(e) => setForm((prev) => ({ ...prev, price_min: e.target.value }))}
                  className="bg-slate-800 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Max price</Label>
                <Input
                  type="number"
                  value={form.price_max}
                  onChange={(e) => setForm((prev) => ({ ...prev, price_max: e.target.value }))}
                  className="bg-slate-800 border-white/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>CTA label</Label>
              <Input
                value={form.cta_label}
                onChange={(e) => setForm((prev) => ({ ...prev, cta_label: e.target.value }))}
                className="bg-slate-800 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label>CTA link (optional)</Label>
              <Input
                value={form.cta_url}
                onChange={(e) => setForm((prev) => ({ ...prev, cta_url: e.target.value }))}
                placeholder="https://..."
                className="bg-slate-800 border-white/10"
              />
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                Active
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                />
                Default fallback city
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/20 text-white">
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
              {saving ? "Saving..." : editingId ? "Save changes" : "Create card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
