import { useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import Loader from "@/components/common/Loader"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Building2, MapPin, Phone, Mail, FileText, Check, AlertTriangle, RefreshCw } from "lucide-react"
import { apiGet, apiPut } from "@/lib/api"

type ShopInfoPayload = {
  shopName: string
  address: string
  phone: string
  email: string
  vatNumber: string
}

const defaultData: ShopInfoPayload = {
  shopName: "",
  address: "",
  phone: "",
  email: "",
  vatNumber: "",
}

export default function ShopInfo() {
  const [formData, setFormData] = useState<ShopInfoPayload>(defaultData)
  const [baselineData, setBaselineData] = useState<ShopInfoPayload>(defaultData)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const fetchShopInfo = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiGet<ShopInfoPayload>("/api/settings/shop")
      const payload = { ...defaultData, ...response.data }
      setFormData(payload)
      setBaselineData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shop info")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShopInfo()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const response = await apiPut<ShopInfoPayload>("/api/settings/shop", formData)
      const payload = { ...formData, ...response.data }
      setFormData(payload)
      setBaselineData(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save shop info")
    } finally {
      setSaving(false)
    }
  }

  const isDirty = useMemo(() => JSON.stringify(formData) !== JSON.stringify(baselineData), [formData, baselineData])

  const highlightStats = [
    {
      label: "Primary contact",
      value: formData.phone || "Not provided",
      accent: formData.phone ? "text-emerald-400" : "text-muted-foreground",
    },
    {
      label: "Support inbox",
      value: formData.email || "Not provided",
      accent: formData.email ? "text-sky-400" : "text-muted-foreground",
    },
    {
      label: "VAT registration",
      value: formData.vatNumber || "Not provided",
      accent: formData.vatNumber ? "text-amber-400" : "text-muted-foreground",
    },
    {
      label: "Address length",
      value: formData.address ? `${formData.address.length} chars` : "Empty",
      accent: formData.address ? "text-pink-400" : "text-muted-foreground",
    },
  ]

  const previewItems = [
    { label: "Shop", value: formData.shopName || "—", icon: Building2 },
    { label: "Address", value: formData.address || "—", icon: MapPin },
    { label: "Phone", value: formData.phone || "—", icon: Phone },
    { label: "Email", value: formData.email || "—", icon: Mail },
    { label: "VAT", value: formData.vatNumber || "—", icon: FileText },
  ]

  return (
    <div className="space-y-6">
      <PageTitle title="Shop Information" subtitle="Centralize address data, tax IDs, and client-facing contact details." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlightStats.map((stat) => (
          <Card key={stat.label} className="brand-card text-center">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-semibold ${stat.accent}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">Auto-updates as you edit</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="brand-card brand-card-hover">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Building2 className="h-5 w-5 text-primary" />
                Business details
              </CardTitle>
              <CardDescription className="text-muted-foreground">Manage storefront identity and compliance info.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isDirty && (
                <Badge variant="outline" className="rounded-2xl border-amber-200/40 text-amber-200">
                  Unsaved changes
                </Badge>
              )}
              <Button variant="outline" onClick={fetchShopInfo} disabled={loading} className="rounded-2xl border-white/40 text-white">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Reload
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="py-12">
                <Loader label="Loading shop info" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Shop name</Label>
                  <Input name="shopName" value={formData.shopName} onChange={handleChange} placeholder="Enter shop name" className="rounded-2xl" />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MapPin className="h-4 w-4 text-primary" /> Physical address
                  </Label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Street, city, region"
                    className="h-28 w-full rounded-2xl border border-border/50 bg-background/80 px-4 py-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  ></textarea>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Phone className="h-4 w-4 text-primary" /> Phone number
                  </Label>
                  <Input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Enter phone number" className="rounded-2xl" />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Mail className="h-4 w-4 text-primary" /> Email
                  </Label>
                  <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="hello@clinic.lk" className="rounded-2xl" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-primary" /> VAT / Tax registration
                  </Label>
                  <Input name="vatNumber" value={formData.vatNumber} onChange={handleChange} placeholder="Enter VAT number" className="rounded-2xl" />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between border-t border-white/10 pt-6">
              {saved && !error && (
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <Check className="h-4 w-4" /> Changes saved
                </p>
              )}
              <div className="ml-auto flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setFormData({ ...baselineData })}
                  disabled={loading || saving || !isDirty}
                  className="rounded-2xl border-white/40 text-white"
                >
                  Revert
                </Button>
                <Button onClick={handleSave} disabled={loading || saving || !isDirty} className="rounded-2xl bg-[#0f172a] text-white">
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Client-facing preview</CardTitle>
            <CardDescription>How these details surface across invoices, receipts, and reminders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewItems.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <item.icon className="mt-1 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-white">{item.value || "—"}</p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-muted-foreground">
              Tip: keep address + VAT fields updated for compliance-ready receipts.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
