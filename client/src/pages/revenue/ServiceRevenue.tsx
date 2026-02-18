import { useState, useEffect, useMemo } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { apiGet } from "@/lib/api"
import { useToast } from "@/components/common/Toast"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import {
  Activity,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Wand2,
  Wallet,
} from "lucide-react"

type Service = {
  id: string
  service: string
  category: string
  count: number
  pricePerUnit: number
  revenue: number
  costPerUnit?: number
  profit?: number
  date: string
}

type ServiceForm = {
  service: string
  category: string
  count: number
  pricePerUnit: number
  costPerUnit: number
  date: string
}

const createDefaultServiceForm = (): ServiceForm => ({
  service: "",
  category: "Medical",
  count: 0,
  pricePerUnit: 0,
  costPerUnit: 0,
  date: new Date().toISOString().split("T")[0],
})

type AppointmentStatus = "Scheduled" | "Completed" | "Cancelled" | "No-Show"

type ApiAppointment = {
  id: number
  date?: string | null
  time?: string | null
  client_name?: string | null
  client_code?: string | null
  pet_name?: string | null
  reason?: string | null
  status?: AppointmentStatus | null
  doctor?: string | null
}

type RevenueRow = Service & { source: "manual" | "appointment" }
type TariffOverrides = Record<string, { price: number; cost: number }>

type ServiceRule = {
  key: string
  label: string
  category: string
  keywords: string[]
  defaultPrice: number
  defaultCost: number
}

const SERVICE_RULES: ServiceRule[] = [
  {
    key: "grooming",
    label: "Grooming Session",
    category: "Grooming",
    keywords: ["groom", "bath", "spa", "trim", "coat", "clip"],
    defaultPrice: 2500,
    defaultCost: 800,
  },
  {
    key: "boarding",
    label: "Boarding Stay",
    category: "Boarding",
    keywords: ["board", "boarding", "stay", "overnight", "kennel", "hotel", "daycare"],
    defaultPrice: 5500,
    defaultCost: 2000,
  },
  {
    key: "physiotherapy",
    label: "Physiotherapy Session",
    category: "Therapy",
    keywords: ["physio", "therapy", "rehab", "laser", "acupuncture", "massage"],
    defaultPrice: 4200,
    defaultCost: 1500,
  },
  {
    key: "consultation",
    label: "Consultation",
    category: "Medical",
    keywords: ["consult", "checkup", "review", "follow"],
    defaultPrice: 2000,
    defaultCost: 400,
  },
  {
    key: "vaccination",
    label: "Vaccination",
    category: "Medical",
    keywords: ["vacci", "booster", "immun", "shot"],
    defaultPrice: 2500,
    defaultCost: 800,
  },
  {
    key: "surgery",
    label: "Surgery",
    category: "Surgical",
    keywords: ["surg", "operation", "spay", "neuter"],
    defaultPrice: 32000,
    defaultCost: 12000,
  },
  {
    key: "dental",
    label: "Dental Cleaning",
    category: "Dental",
    keywords: ["dental", "teeth", "oral"],
    defaultPrice: 9000,
    defaultCost: 3000,
  },
]

const DEFAULT_SERVICE_RULE: ServiceRule = {
  key: "other",
  label: "Other Clinical Service",
  category: "Specialty",
  keywords: [],
  defaultPrice: 3500,
  defaultCost: 1000,
}

const VISIBLE_SERVICE_RULES = [...SERVICE_RULES, DEFAULT_SERVICE_RULE]

const SERVICE_TARIFF_STORAGE_KEY = "service_tariff_overrides"

const SERVICE_RULE_LOOKUP = SERVICE_RULES.reduce<Record<string, ServiceRule>>((acc, rule) => {
  acc[rule.key] = rule
  return acc
}, { [DEFAULT_SERVICE_RULE.key]: DEFAULT_SERVICE_RULE })

const normalizeDateString = (value?: string | null) => {
  if (!value) return ""
  return value.length >= 10 ? value.slice(0, 10) : value
}

const matchServiceRule = (reason?: string | null): ServiceRule => {
  if (!reason) return DEFAULT_SERVICE_RULE
  const lower = reason.toLowerCase()
  return SERVICE_RULES.find((rule) => rule.keywords.some((keyword) => lower.includes(keyword))) ?? DEFAULT_SERVICE_RULE
}

const initialServices: Service[] = [
  {
    id: "SRV001",
    service: "Vaccination",
    category: "Medical",
    count: 42,
    pricePerUnit: 2000,
    revenue: 84000,
    costPerUnit: 500,
    profit: 63000,
    date: "2026-02-03",
  },
  {
    id: "SRV002",
    service: "Consultation",
    category: "Medical",
    count: 65,
    pricePerUnit: 2000,
    revenue: 130000,
    costPerUnit: 300,
    profit: 110500,
    date: "2026-02-03",
  },
  {
    id: "SRV003",
    service: "Surgery",
    category: "Surgical",
    count: 8,
    pricePerUnit: 30000,
    revenue: 240000,
    costPerUnit: 10000,
    profit: 160000,
    date: "2026-02-03",
  },
  {
    id: "SRV004",
    service: "Grooming",
    category: "Grooming",
    count: 30,
    pricePerUnit: 2000,
    revenue: 60000,
    costPerUnit: 500,
    profit: 45000,
    date: "2026-02-03",
  },
  {
    id: "SRV005",
    service: "Boarding Stay",
    category: "Boarding",
    count: 18,
    pricePerUnit: 5500,
    revenue: 99000,
    costPerUnit: 1800,
    profit: 66600,
    date: "2026-02-03",
  },
  {
    id: "SRV006",
    service: "Physiotherapy Session",
    category: "Therapy",
    count: 14,
    pricePerUnit: 4200,
    revenue: 58800,
    costPerUnit: 1500,
    profit: 37800,
    date: "2026-02-03",
  },
]

export default function ServiceRevenue() {
  const toast = useToast()
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null)

  const [manualServices, setManualServices] = useState<Service[]>(() => {
    const saved = localStorage.getItem("service_revenue")
    if (saved) {
      try {
        return JSON.parse(saved) as Service[]
      } catch (e) {
        console.error("Failed to load services", e)
      }
    }
    return initialServices
  })
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("All")
  const [sortBy, setSortBy] = useState("revenue")
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)

  const [form, setForm] = useState<ServiceForm>(createDefaultServiceForm())
  const [appointmentRecords, setAppointmentRecords] = useState<ApiAppointment[]>([])
  const [appointmentLoading, setAppointmentLoading] = useState(true)
  const [appointmentError, setAppointmentError] = useState("")
  const [tariffOverrides, setTariffOverrides] = useState<TariffOverrides>(() => {
    const saved = localStorage.getItem(SERVICE_TARIFF_STORAGE_KEY)
    if (!saved) return {}
    try {
      return JSON.parse(saved) as TariffOverrides
    } catch (err) {
      console.error("Failed to parse service tariff overrides", err)
      return {}
    }
  })

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("service_revenue", JSON.stringify(manualServices))
  }, [manualServices])

  useEffect(() => {
    localStorage.setItem(SERVICE_TARIFF_STORAGE_KEY, JSON.stringify(tariffOverrides))
  }, [tariffOverrides])

  const getTariffForRule = (rule: ServiceRule) => {
    const override = tariffOverrides[rule.key]
    const price = override?.price && override.price > 0 ? override.price : rule.defaultPrice
    const cost = override?.cost && override.cost >= 0 ? override.cost : rule.defaultCost
    return { price, cost }
  }

  const handleTariffInput = (ruleKey: string, field: "price" | "cost", rawValue: string) => {
    const numeric = Number(rawValue)
    if (!Number.isFinite(numeric)) return
    const rule = SERVICE_RULE_LOOKUP[ruleKey] ?? DEFAULT_SERVICE_RULE
    const fallback = field === "price" ? rule.defaultPrice : rule.defaultCost
    const sanitized = Math.max(0, Math.round(numeric)) || fallback

    setTariffOverrides((prev) => {
      const next = { ...prev }
      const existing = next[ruleKey] ?? { price: rule.defaultPrice, cost: rule.defaultCost }
      const updated = {
        price: field === "price" ? sanitized : existing.price,
        cost: field === "cost" ? sanitized : existing.cost,
      }
      const matchesDefault = updated.price === rule.defaultPrice && updated.cost === rule.defaultCost
      if (matchesDefault) {
        delete next[ruleKey]
      } else {
        next[ruleKey] = updated
      }
      return next
    })
  }

  useEffect(() => {
    let ignore = false

    const fetchAppointments = async () => {
      setAppointmentLoading(true)
      setAppointmentError("")
      try {
        const res = await apiGet<ApiAppointment[]>("/api/appointments?page=1&limit=500")
        if (!ignore) {
          setAppointmentRecords(res.data)
        }
      } catch (err) {
        if (!ignore) {
          setAppointmentError(err instanceof Error ? err.message : "Failed to sync appointments")
        }
      } finally {
        if (!ignore) {
          setAppointmentLoading(false)
        }
      }
    }

    fetchAppointments()
    return () => {
      ignore = true
    }
  }, [])

  const appointmentServices = useMemo<RevenueRow[]>(() => {
    if (!appointmentRecords.length) return []
    const buckets = new Map<string, {
      key: string
      service: string
      category: string
      count: number
      pricePerUnit: number
      costPerUnit: number
      latestDate: string
    }>()

    appointmentRecords.forEach((appt) => {
      if (!appt.reason) return
      const status = (appt.status || "Scheduled") as AppointmentStatus
      if (status === "Cancelled" || status === "No-Show") return
      const rule = matchServiceRule(appt.reason)
      const bucketKey = rule.key
      const existing = buckets.get(bucketKey)
      const normalizedDate = normalizeDateString(appt.date) || new Date().toISOString().split("T")[0]
      const { price, cost } = getTariffForRule(rule)

      if (!existing) {
        buckets.set(bucketKey, {
          key: bucketKey,
          service: rule.label,
          category: rule.category,
          count: 1,
          pricePerUnit: price,
          costPerUnit: cost,
          latestDate: normalizedDate,
        })
      } else {
        existing.count += 1
        if (normalizedDate > existing.latestDate) {
          existing.latestDate = normalizedDate
        }
      }
    })

    return Array.from(buckets.values()).map((bucket) => ({
      id: `APPT-${bucket.key}`,
      service: bucket.service,
      category: bucket.category,
      count: bucket.count,
      pricePerUnit: bucket.pricePerUnit,
      revenue: bucket.count * bucket.pricePerUnit,
      costPerUnit: bucket.costPerUnit,
      profit: bucket.count * (bucket.pricePerUnit - bucket.costPerUnit),
      date: bucket.latestDate,
      source: "appointment" as const,
    }))
  }, [appointmentRecords])

  const combinedServices = useMemo<RevenueRow[]>(() => {
    const manualRows = manualServices.map((service) => ({ ...service, source: "manual" as const }))
    return [...appointmentServices, ...manualRows]
  }, [appointmentServices, manualServices])

  const categories = useMemo(
    () => ["All", ...new Set(combinedServices.map((s) => s.category))],
    [combinedServices]
  )

  const filtered = combinedServices.filter((s) => {
    const matchesSearch = s.service.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search)
    const matchesCategory = filterCategory === "All" || s.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "revenue":
        return b.revenue - a.revenue
      case "profit":
        return (b.profit || 0) - (a.profit || 0)
      case "count":
        return b.count - a.count
      case "name":
        return a.service.localeCompare(b.service)
      default:
        return 0
    }
  })

  function openAddModal() {
    setEditingService(null)
    setForm(createDefaultServiceForm())
    setShowModal(true)
  }

  function openEditModal(service: Service) {
    setEditingService(service)
    setForm({
      service: service.service,
      category: service.category,
      count: service.count,
      pricePerUnit: service.pricePerUnit,
      costPerUnit: service.costPerUnit || 0,
      date: service.date,
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingService(null)
  }

  function saveService() {
    if (!form.service || form.count <= 0 || form.pricePerUnit <= 0) {
      toast.warning("Please fill all required fields")
      return
    }

    const revenue = form.count * form.pricePerUnit
    const profit = form.costPerUnit ? revenue - form.count * form.costPerUnit : 0

    if (editingService) {
      setManualServices((prev) =>
        prev.map((s) =>
          s.id === editingService.id
            ? {
                ...form,
                id: editingService.id,
                revenue,
                profit,
              }
            : s
        )
      )
    } else {
      const newId = "SRV" + String(manualServices.length + 1).padStart(3, "0")
      setManualServices((prev) => [
        ...prev,
        {
          ...form,
          id: newId,
          revenue,
          profit,
        },
      ])
    }

    closeModal()
    toast.success(editingService ? "Service updated successfully" : "Service added successfully")
  }

  function handleDeleteServiceClick(id: string) {
    setDeleteServiceId(id)
  }

  function handleDeleteServiceConfirm() {
    if (!deleteServiceId) return
    setManualServices((prev) => prev.filter((s) => s.id !== deleteServiceId))
    toast.success("Service deleted successfully")
    setDeleteServiceId(null)
  }

  function exportToCSV() {
    const headers = ["Service", "Category", "Count", "Price/Unit", "Revenue", "Cost/Unit", "Profit", "Profit %"]
    const rows = sorted.map((s) => [
      s.service,
      s.category,
      s.count,
      s.pricePerUnit,
      s.revenue,
      s.costPerUnit || 0,
      s.profit || 0,
      s.costPerUnit ? (((s.profit || 0) / s.revenue) * 100).toFixed(2) : 0,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `service_revenue_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const totalRevenue = combinedServices.reduce((sum, s) => sum + s.revenue, 0)
  const totalProfit = combinedServices.reduce((sum, s) => sum + (s.profit || 0), 0)
  const totalCount = combinedServices.reduce((sum, s) => sum + s.count, 0)
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0
  const filteredTotals = filtered.reduce(
    (acc, s) => {
      acc.revenue += s.revenue
      acc.profit += s.profit || 0
      acc.count += s.count
      return acc
    },
    { revenue: 0, profit: 0, count: 0 }
  )
  const filtersActive = Boolean(search.trim()) || filterCategory !== "All" || sortBy !== "revenue"
  const manualCount = manualServices.length
  const liveCount = appointmentServices.length
  const heroMetrics = [
    {
      label: "Clinical revenue",
      value: `Rs. ${totalRevenue.toLocaleString()}`,
      hint: `${combinedServices.length} service rows`,
      gradient: "from-[#0f172a] to-[#1e3a8a]",
      icon: Wallet,
    },
    {
      label: "Gross profit",
      value: `Rs. ${totalProfit.toLocaleString()}`,
      hint: `${profitMargin}% blended margin`,
      gradient: "from-[#5b21b6] to-[#a855f7]",
      icon: TrendingUp,
    },
    {
      label: "Visits captured",
      value: totalCount.toLocaleString(),
      hint: `${liveCount} live · ${manualCount} manual`,
      gradient: "from-[#064e3b] to-[#22c55e]",
      icon: Activity,
    },
    {
      label: "Sync status",
      value: appointmentLoading ? "Syncing…" : `${liveCount} live rows`,
      hint: appointmentError ? "Needs attention" : "Connected to appointments",
      gradient: "from-[#9a3412] to-[#fb923c]",
      icon: RefreshCw,
    },
  ]
  const getMarginTone = (value: number) => {
    if (value >= 70) return "bg-emerald-50 text-emerald-700"
    if (value >= 50) return "bg-amber-50 text-amber-700"
    return "bg-rose-50 text-rose-700"
  }

  return (
    <>
      <div className="space-y-6">
        <PageTitle title="Service Revenue Management" />

        {appointmentError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {appointmentError}
          </div>
        )}

        <Card className="brand-card brand-card-hover overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-linear-to-r from-[#020617] via-[#0f172a] to-[#1d4ed8] p-6 text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">Clinical earning runway</p>
                  <h2 className="text-3xl font-bold">Service revenue command</h2>
                  <p className="text-sm text-white/80">
                    Blend manual fee schedules with live appointment telemetry—monitor utilization, margin tiers, and tariff overrides in one cockpit.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3 text-right">
                  <Badge className="brand-pill border border-white/40 bg-white/10 text-white">
                    {filtersActive ? "Filtered view" : "Full telemetry"}
                  </Badge>
                  <Button onClick={openAddModal} className="rounded-2xl bg-[#22d3ee] px-5 py-2 text-[#04121c] hover:bg-[#14b8a6]">
                    <Sparkles className="mr-2 h-4 w-4" /> Add service
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
                <span className="rounded-2xl bg-white/10 px-3 py-1">{manualCount} manual · {liveCount} live rows</span>
                <span className="rounded-2xl bg-white/10 px-3 py-1">Rs. {filteredTotals.revenue.toLocaleString()} in viewport</span>
                <span className="rounded-2xl bg-white/10 px-3 py-1">{categories.length - 1} service categories</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
              {heroMetrics.map(({ label, value, hint, gradient, icon: Icon }) => (
                <div
                  key={label}
                  className={`relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br ${gradient} p-4 text-white shadow-lg`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
                      <p className="mt-2 text-2xl font-bold">{value}</p>
                      <p className="text-xs text-white/80">{hint}</p>
                    </div>
                    <span className="rounded-2xl bg-white/20 p-2">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                  <Filter className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Search & filter</p>
                  <h2 className="text-2xl font-bold text-foreground">Revenue console</h2>
                  <p className="text-sm text-muted-foreground">
                    Narrow down modalities, tweak sort rules, and spotlight the precise stack for finance reviews.
                  </p>
                </div>
              </div>
              <div className="brand-soft-panel rounded-2xl px-4 py-3 text-right">
                <p className="text-xs font-semibold text-muted-foreground">In viewport</p>
                <p className="text-2xl font-bold text-[#4338ca]">Rs. {filteredTotals.revenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{filtered.length} services · {filteredTotals.count} visits</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2 xl:col-span-2">
                <Label className="text-sm font-semibold text-foreground">Search services</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Service, ID, or keyword"
                    className="h-12 rounded-2xl border border-border bg-background/70 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Category</Label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3 text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Sort by</Label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3 text-sm"
                >
                  <option value="revenue">Revenue</option>
                  <option value="profit">Profit</option>
                  <option value="count">Times Used</option>
                  <option value="name">Service Name</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Actions</Label>
                <Button onClick={exportToCSV} className="h-12 w-full rounded-2xl bg-[#1d4ed8] text-white hover:bg-[#1e3a8a]">
                  <ArrowUpRight className="mr-2 h-4 w-4" /> Export CSV
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Manual entry</Label>
                <Button variant="outline" onClick={openAddModal} className="h-12 w-full rounded-2xl border-border/60">
                  + Add service
                </Button>
              </div>
            </div>

            {appointmentLoading && (
              <p className="text-xs text-muted-foreground">Syncing appointments… stay tuned.</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>
                Showing {sorted.length} / {combinedServices.length} rows · Rs. {filteredTotals.revenue.toLocaleString()} total
              </p>
              <Button variant="outline" className="rounded-2xl border-border/60" onClick={exportToCSV}>
                <Sparkles className="mr-2 h-4 w-4" /> Export current view
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-6 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Tariff orchestration</p>
                <h2 className="text-2xl font-bold text-foreground">Service pricing grid</h2>
                <p className="text-sm text-muted-foreground">Override appointment-driven price & cost assumptions without touching the EMR.</p>
              </div>
              <span className="rounded-2xl bg-muted/40 p-3 text-primary">
                <Wand2 className="h-5 w-5" />
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {VISIBLE_SERVICE_RULES.map((rule) => {
                const currentTariff = getTariffForRule(rule)
                return (
                  <div key={rule.key} className="rounded-2xl border border-border/40 bg-muted/20 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{rule.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Keywords: {rule.keywords.length ? rule.keywords.join(", ") : "Automapped"}
                        </p>
                      </div>
                      <Badge className="brand-pill border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]">{rule.category}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Price / Unit (Rs.)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={currentTariff.price}
                          onChange={(e) => handleTariffInput(rule.key, "price", e.target.value)}
                          className="rounded-2xl"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">Default {rule.defaultPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Cost / Unit (Rs.)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={currentTariff.cost}
                          onChange={(e) => handleTariffInput(rule.key, "cost", e.target.value)}
                          className="rounded-2xl"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">Default {rule.defaultCost.toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Appointment revenue rows refresh instantly with these overrides.</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Service ledger</p>
                <h2 className="text-2xl font-bold text-foreground">Earned revenue breakdown</h2>
                <p className="text-sm text-muted-foreground">
                  {filtersActive ? "Filtered snapshot of procedures in focus" : "Complete mix of appointment + manual revenue"}
                </p>
              </div>
              <Badge className="brand-pill border border-[#4338ca]/30 bg-[#4338ca]/10 text-[#4338ca]">
                {sorted.length} entries · {filteredTotals.count} visits
              </Badge>
            </div>

            <div className="rounded-3xl border border-border/40 bg-card">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-linear-to-r from-[#eff6ff] to-[#eef2ff] text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-center">Visits</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Profit</th>
                      <th className="px-4 py-3 text-center">Margin</th>
                      <th className="px-4 py-3 text-center">Source</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                          No services match the current filters.
                        </td>
                      </tr>
                    ) : (
                      sorted.map((s, idx) => {
                        const margin = s.costPerUnit ? Number((((s.profit || 0) / s.revenue) * 100).toFixed(1)) : 0
                        const isManual = s.source === "manual"
                        return (
                          <tr
                            key={s.id}
                            className={`border-b border-border/70 ${idx % 2 === 0 ? "bg-card" : "bg-card/80"} transition hover:bg-muted/50`}
                          >
                            <td className="px-4 py-4 align-top">
                              <p className="font-semibold text-foreground">{s.service}</p>
                              <p className="text-xs text-muted-foreground">ID {s.id}</p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <Badge className="brand-pill border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]">{s.category}</Badge>
                            </td>
                            <td className="px-4 py-4 text-center font-semibold text-foreground">{s.count}</td>
                            <td className="px-4 py-4 text-right text-muted-foreground">Rs. {s.pricePerUnit.toLocaleString()}</td>
                            <td className="px-4 py-4 text-right font-semibold text-blue-600">Rs. {s.revenue.toLocaleString()}</td>
                            <td className="px-4 py-4 text-right font-semibold text-emerald-700">Rs. {(s.profit || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 text-center">
                              <span className={`rounded-2xl px-3 py-1 text-xs font-semibold ${getMarginTone(margin)}`}>
                                {margin}%
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              {isManual ? (
                                <Badge className="brand-pill border border-[#c084fc]/30 bg-[#f3e8ff] text-[#7c3aed]">Manual</Badge>
                              ) : (
                                <Badge className="brand-pill border border-[#bbf7d0] bg-[#dcfce7] text-[#047857]">Live</Badge>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {isManual ? (
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditModal(s)}
                                    className="rounded-2xl border-border px-4 text-xs"
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteServiceClick(s.id)}
                                    className="rounded-2xl px-4 text-xs"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              ) : (
                                <Badge className="brand-pill border border-[#bbf7d0] bg-[#dcfce7] text-[#047857]">Auto</Badge>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border/40 shadow-2xl">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <h3 className="text-lg font-bold">{editingService ? "Edit Service" : "Add New Service"}</h3>
                <button onClick={closeModal} className="text-2xl text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Service Name*</Label>
                  <Input
                    placeholder="Service name"
                    value={form.service}
                    onChange={(e) => setForm({ ...form, service: e.target.value })}
                    className="h-10 rounded-2xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Category*</Label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="h-10 w-full rounded-2xl border border-border px-3"
                  >
                    <option value="Medical">Medical</option>
                    <option value="Surgical">Surgical</option>
                    <option value="Grooming">Grooming</option>
                    <option value="Dental">Dental</option>
                    <option value="Boarding">Boarding</option>
                    <option value="Therapy">Therapy</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Times Used*</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.count || ""}
                      onChange={(e) => setForm({ ...form, count: Number(e.target.value) || 0 })}
                      className="h-10 rounded-2xl"
                      required
                      min={0}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Price/Unit*</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.pricePerUnit || ""}
                      onChange={(e) => setForm({ ...form, pricePerUnit: Number(e.target.value) || 0 })}
                      className="h-10 rounded-2xl"
                      required
                      min={0}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Cost/Unit</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.costPerUnit || ""}
                      onChange={(e) => setForm({ ...form, costPerUnit: Number(e.target.value) || 0 })}
                      className="h-10 rounded-2xl"
                      min={0}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Date</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="h-10 rounded-2xl"
                    />
                  </div>
                </div>

                {form.count > 0 && form.pricePerUnit > 0 && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Total Revenue:</span> Rs. {(form.count * form.pricePerUnit).toLocaleString()}
                    </p>
                    {form.costPerUnit > 0 && (
                      <p className="mt-1 text-sm text-gray-700">
                        <span className="font-semibold">Total Profit:</span> Rs. {((form.count * form.pricePerUnit) - (form.count * form.costPerUnit)).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
                <Button variant="outline" onClick={closeModal} className="rounded-2xl">
                  Cancel
                </Button>
                <Button onClick={saveService} className="rounded-2xl bg-[#1d4ed8] text-white hover:bg-[#1e3a8a]">
                  {editingService ? "✓ Update" : "+ Add"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleteServiceId !== null}
        onOpenChange={(open) => !open && setDeleteServiceId(null)}
        title="Delete Service"
        description="Are you sure you want to delete this service? This action cannot be undone."
        onConfirm={handleDeleteServiceConfirm}
        variant="danger"
      />
    </>
  )
}
