import { useCallback, useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { ReportHero } from "@/components/reports/ReportHero"
import { ReportConsole } from "@/components/reports/ReportConsole"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Download, Filter, Layers, RefreshCw, Search, TrendingUp, Wallet } from "lucide-react"
import { apiGet } from "@/lib/api"

type Service = {
  id: string
  service: string
  category: string
  count: number
  pricePerUnit: number
  revenue: number
  costPerUnit?: number
  profit?: number
  date?: string | null
}

type AppointmentStatus = "Scheduled" | "Completed" | "Cancelled" | "No-Show"

type ApiAppointment = {
  id: number
  date?: string | null
  time?: string | null
  reason?: string | null
  status?: AppointmentStatus | null
}

type ServiceRule = {
  key: string
  label: string
  category: string
  keywords: string[]
  defaultPrice: number
  defaultCost: number
}

type TariffOverrides = Record<string, { price: number; cost: number }>

type RevenueSource = {
  id: string
  source: string
  category: string
  amount: number
  count: number
  origin: "manual" | "appointment"
}

type RevenueRow = RevenueSource & { share: number }

type RevenueOriginFilter = "all" | "manual" | "appointment"

type RevenueFilters = {
  startDate: string
  endDate: string
}

const SERVICE_REVENUE_STORAGE_KEY = "service_revenue"
const SERVICE_TARIFF_STORAGE_KEY = "service_tariff_overrides"

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

const ORIGIN_OPTIONS: Array<{ label: string; value: RevenueOriginFilter }> = [
  { label: "All origins", value: "all" },
  { label: "Manual ledger", value: "manual" },
  { label: "Appointments", value: "appointment" },
]

const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`
const formatNumber = (value: number) => Number(value || 0).toLocaleString("en-LK")

const matchServiceRule = (reason?: string | null) => {
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

const safeWindow = () => (typeof window === "undefined" ? undefined : window)

const loadManualServices = (): Service[] => {
  const win = safeWindow()
  if (!win) return initialServices
  const saved = win.localStorage.getItem(SERVICE_REVENUE_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved) as Service[]
    } catch (err) {
      console.error("Failed to parse saved service revenue", err)
    }
  }
  return initialServices
}

const loadTariffOverrides = (): TariffOverrides => {
  const win = safeWindow()
  if (!win) return {}
  const saved = win.localStorage.getItem(SERVICE_TARIFF_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved) as TariffOverrides
    } catch (err) {
      console.error("Failed to parse tariff overrides", err)
    }
  }
  return {}
}

const originBadgeClass = (origin: RevenueSource["origin"]) => {
  if (origin === "manual") return "border-sky-500 text-sky-200 bg-sky-500/10"
  return "border-emerald-500 text-emerald-200 bg-emerald-500/10"
}

export default function RevenueReport() {
  const [filters, setFilters] = useState<RevenueFilters>({ startDate: "", endDate: "" })
  const [originFilter, setOriginFilter] = useState<RevenueOriginFilter>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [manualServices, setManualServices] = useState<Service[]>(() => loadManualServices())
  const [tariffOverrides, setTariffOverrides] = useState<TariffOverrides>(() => loadTariffOverrides())
  const [appointmentRecords, setAppointmentRecords] = useState<ApiAppointment[]>([])
  const [appointmentLoading, setAppointmentLoading] = useState(true)
  const [appointmentError, setAppointmentError] = useState("")

  useEffect(() => {
    const win = safeWindow()
    if (!win) return
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SERVICE_REVENUE_STORAGE_KEY) {
        setManualServices(loadManualServices())
      }
      if (event.key === SERVICE_TARIFF_STORAGE_KEY) {
        setTariffOverrides(loadTariffOverrides())
      }
    }
    win.addEventListener("storage", handleStorage)
    return () => win.removeEventListener("storage", handleStorage)
  }, [])

  const fetchAppointments = useCallback(async () => {
    setAppointmentLoading(true)
    setAppointmentError("")
    try {
      const res = await apiGet<ApiAppointment[]>("/api/appointments?page=1&limit=500")
      setAppointmentRecords(res.data)
    } catch (err) {
      setAppointmentError(err instanceof Error ? err.message : "Failed to sync appointments")
    } finally {
      setAppointmentLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const isWithinDateRange = useCallback(
    (dateStr?: string | null) => {
      if (!filters.startDate && !filters.endDate) return true
      if (!dateStr) return false
      const parsed = new Date(dateStr)
      if (Number.isNaN(parsed.valueOf())) return false
      if (filters.startDate && parsed < new Date(filters.startDate)) return false
      if (filters.endDate && parsed > new Date(filters.endDate)) return false
      return true
    },
    [filters]
  )

  const getTariffForRule = useCallback(
    (rule: ServiceRule) => {
      const override = tariffOverrides[rule.key]
      const price = override?.price && override.price > 0 ? override.price : rule.defaultPrice
      const cost = override?.cost && override.cost >= 0 ? override.cost : rule.defaultCost
      return { price, cost }
    },
    [tariffOverrides]
  )

  const appointmentRevenue = useMemo<RevenueSource[]>(() => {
    if (!appointmentRecords.length) return []
    const buckets = new Map<string, { label: string; category: string; count: number; pricePerUnit: number }>()

    appointmentRecords.forEach((appt) => {
      if (!appt.reason) return
      if (!isWithinDateRange(appt.date)) return
      const status = (appt.status || "Scheduled") as AppointmentStatus
      if (status === "Cancelled" || status === "No-Show") return
      const rule = matchServiceRule(appt.reason)
      const { price } = getTariffForRule(rule)
      const bucket = buckets.get(rule.key)
      if (!bucket) {
        buckets.set(rule.key, {
          label: rule.label,
          category: rule.category,
          count: 1,
          pricePerUnit: price,
        })
      } else {
        bucket.count += 1
      }
    })

    return Array.from(buckets.entries()).map(([key, bucket]) => ({
      id: `APPT-${key}`,
      source: bucket.label,
      category: bucket.category,
      amount: bucket.count * bucket.pricePerUnit,
      count: bucket.count,
      origin: "appointment" as const,
    }))
  }, [appointmentRecords, getTariffForRule, isWithinDateRange])

  const manualRevenue = useMemo<RevenueSource[]>(
    () =>
      manualServices
        .filter((service) => isWithinDateRange(service.date))
        .map((service) => ({
          id: service.id,
          source: service.service,
          category: service.category,
          amount: service.revenue,
          count: service.count,
          origin: "manual" as const,
        })),
    [manualServices, isWithinDateRange]
  )

  const combinedRevenue = useMemo<RevenueSource[]>(() => {
    const seeds = [...manualRevenue, ...appointmentRevenue]
    if (!seeds.length) {
      return [
        {
          id: "seed-vaccination",
          source: "Vaccination",
          category: "Medical",
          amount: 84000,
          count: 42,
          origin: "manual",
        },
        {
          id: "seed-consultation",
          source: "Consultation",
          category: "Medical",
          amount: 130000,
          count: 65,
          origin: "manual",
        },
      ]
    }
    return seeds.sort((a, b) => b.amount - a.amount)
  }, [manualRevenue, appointmentRevenue])

  const totalRevenue = useMemo(() => combinedRevenue.reduce((sum, row) => sum + row.amount, 0), [combinedRevenue])
  const avgRevenue = combinedRevenue.length ? totalRevenue / combinedRevenue.length : 0

  const revenueWithShare = useMemo<RevenueRow[]>(
    () =>
      combinedRevenue.map((row) => ({
        ...row,
        share: totalRevenue ? (row.amount / totalRevenue) * 100 : 0,
      })),
    [combinedRevenue, totalRevenue]
  )

  const visibleRevenue = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return revenueWithShare.filter((row) => {
      if (originFilter !== "all" && row.origin !== originFilter) return false
      if (!term) return true
      return row.source.toLowerCase().includes(term) || row.category.toLowerCase().includes(term)
    })
  }, [originFilter, revenueWithShare, searchTerm])

  const manualTotal = manualRevenue.reduce((sum, row) => sum + row.amount, 0)
  const appointmentTotal = appointmentRevenue.reduce((sum, row) => sum + row.amount, 0)

  const categoryBreakdown = useMemo(
    () => {
      if (!combinedRevenue.length) return []
      const map = new Map<string, { amount: number; count: number }>()
      combinedRevenue.forEach((row) => {
        const bucket = map.get(row.category) ?? { amount: 0, count: 0 }
        bucket.amount += row.amount
        bucket.count += row.count
        map.set(row.category, bucket)
      })
      return Array.from(map.entries())
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count,
          share: totalRevenue ? (data.amount / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
    },
    [combinedRevenue, totalRevenue]
  )

  const sourceMix = [
    {
      label: "Manual ledger",
      amount: manualTotal,
      share: totalRevenue ? (manualTotal / totalRevenue) * 100 : 0,
      tone: "from-sky-400 to-sky-600",
    },
    {
      label: "Appointments",
      amount: appointmentTotal,
      share: totalRevenue ? (appointmentTotal / totalRevenue) * 100 : 0,
      tone: "from-emerald-400 to-emerald-600",
    },
  ]

  const highlightStats = [
    {
      label: "Date window",
      value: filters.startDate || filters.endDate ? `${filters.startDate || "open"} to ${filters.endDate || "today"}` : "Full history",
      accent: "text-emerald-500",
    },
    {
      label: "Origin filter",
      value: originFilter === "all" ? "All sources" : originFilter === "manual" ? "Manual ledger" : "Appointments",
      accent: "text-sky-500",
    },
    {
      label: "Ledger search",
      value: searchTerm ? `"${searchTerm}"` : "All services",
      accent: "text-rose-500",
    },
    {
      label: "Sources visible",
      value: `${formatNumber(visibleRevenue.length)} / ${formatNumber(combinedRevenue.length || 0)}`,
      accent: "text-amber-500",
    },
  ]

  const heroMetrics = [
    {
      label: "Total revenue",
      value: formatCurrency(totalRevenue),
      hint: `${formatNumber(visibleRevenue.length)} visible streams`,
      gradient: "from-[#0f172a] via-[#312e81] to-[#22d3ee]",
      icon: Wallet,
    },
    {
      label: "Average source",
      value: formatCurrency(avgRevenue || 0),
      hint: `${formatNumber(combinedRevenue.length)} tracked entries`,
      gradient: "from-[#14532d] to-[#10b981]",
      icon: TrendingUp,
    },
    {
      label: "Appointments",
      value: formatCurrency(appointmentTotal),
      hint: `${formatNumber(appointmentRevenue.length)} active services`,
      gradient: "from-[#4c0519] to-[#fb7185]",
      icon: Calendar,
    },
    {
      label: "Manual ledger",
      value: formatCurrency(manualTotal),
      hint: `${formatNumber(manualRevenue.length)} manual services`,
      gradient: "from-[#0f172a] to-[#38bdf8]",
      icon: Layers,
    },
  ]

  const consoleFooter = (
    <div className="flex flex-wrap gap-3 text-sm">
      {appointmentLoading && <span className="text-muted-foreground">Syncing appointments</span>}
      {appointmentError && !appointmentLoading && <span className="text-rose-600">{appointmentError}</span>}
      {!appointmentLoading && !appointmentError && (
        <Badge variant="secondary" className="rounded-2xl border-dashed text-xs">
          {formatNumber(visibleRevenue.length)} sources visible
        </Badge>
      )}
    </div>
  )

  const topSources = visibleRevenue.slice(0, 6)

  const downloadReport = () => {
    if (typeof window === "undefined" || !visibleRevenue.length) return
    const csvContent = [
      ["Revenue Report - " + new Date().toLocaleDateString()],
      [],
      ["Source", "Category", "Amount (Rs.)", "Share", "Count", "Origin"],
      ...visibleRevenue.map((row) => [
        row.source,
        row.category,
        Math.round(row.amount).toLocaleString(),
        `${row.share.toFixed(1)}%`,
        row.count,
        row.origin,
      ]),
      [],
      ["Total Revenue", Math.round(totalRevenue).toLocaleString(), "100%"],
      ["Average Revenue", Math.round(avgRevenue).toLocaleString(), ""],
    ]
      .map((line) => line.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "Revenue-Report.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const resetFilters = () => {
    setFilters({ startDate: "", endDate: "" })
    setOriginFilter("all")
    setSearchTerm("")
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Revenue Report" subtitle="Neon revenue cockpit unifying manual services and appointments" />

      <ReportHero
        kicker="Revenue intelligence"
        title="Revenue assurance"
        subtitle="Gradient KPIs, filter-aware exports, and ledger parity with the rest of the neon cockpit."
        badgeLabel={combinedRevenue.length ? `${formatNumber(combinedRevenue.length)} streams` : "No streams"}
        metrics={heroMetrics}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadReport} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white" disabled={!visibleRevenue.length}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={fetchAppointments}
              disabled={appointmentLoading}
              className="rounded-2xl border-white/60 text-white"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${appointmentLoading ? "animate-spin" : ""}`} /> Refresh data
            </Button>
          </div>
        }
      />

      <ReportConsole
        icon={Filter}
        title="Filters & exports"
        description="Dial in the revenue window, origin, or keyword; exports honor these filters."
        footer={consoleFooter}
      >
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">From date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">To date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Origin</Label>
              <Select value={originFilter} onValueChange={(value) => setOriginFilter(value as RevenueOriginFilter)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All origins" />
                </SelectTrigger>
                <SelectContent>
                  {ORIGIN_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Ledger search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Service, category, origin"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-11 rounded-2xl border-0 bg-muted/30 pl-10"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[auto_auto_1fr]">
            <Button variant="outline" onClick={resetFilters} disabled={appointmentLoading} className="h-11 rounded-2xl border-dashed">
              Reset filters
            </Button>
            <Button onClick={fetchAppointments} disabled={appointmentLoading} className="h-11 rounded-2xl bg-[#0f172a] text-white">
              <RefreshCw className={`mr-2 h-4 w-4 ${appointmentLoading ? "animate-spin" : ""}`} /> Refresh data
            </Button>
            <div className="flex items-center text-xs text-muted-foreground">Filters cascade into KPIs, breakdowns, and exports.</div>
          </div>
        </>
      </ReportConsole>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlightStats.map((stat) => (
          <Card key={stat.label} className="brand-card text-center">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">Live revenue telemetry</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Category mix</CardTitle>
            <CardDescription>Where revenue is flowing.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/20">
                  <th className="py-2 px-3 text-left font-semibold">Category</th>
                  <th className="py-2 px-3 text-right font-semibold">Amount</th>
                  <th className="py-2 px-3 text-center font-semibold">Count</th>
                  <th className="py-2 px-3 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map((category) => (
                  <tr key={category.category} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium text-white">{category.category}</td>
                    <td className="py-2 px-3 text-right text-emerald-300">{formatCurrency(category.amount)}</td>
                    <td className="py-2 px-3 text-center text-muted-foreground">{formatNumber(category.count)}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{category.share.toFixed(1)}%</td>
                  </tr>
                ))}
                {!categoryBreakdown.length && (
                  <tr>
                    <td colSpan={4} className="py-4 px-3 text-center text-sm text-muted-foreground">
                      No category data captured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Origin health</CardTitle>
            <CardDescription>Manual vs appointment contributions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sourceMix.map((mix) => (
              <div key={mix.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{mix.label}</p>
                  <p className="text-base font-semibold text-white">{formatCurrency(mix.amount)}</p>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className={`h-2 rounded-full bg-linear-to-r ${mix.tone}`}
                    style={{ width: `${Math.min(100, Math.max(0, mix.share))}%` }}
                  ></div>
                </div>
                <p className="text-right text-xs text-muted-foreground">{mix.share.toFixed(1)}% of total revenue</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <CardTitle>Top revenue streams</CardTitle>
          <CardDescription>Respecting active filters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {topSources.map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
              <div>
                <p className="font-semibold text-white">{row.source}</p>
                <p className="text-xs text-muted-foreground">{row.category}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-emerald-300">{formatCurrency(row.amount)}</p>
                <p className="text-xs text-muted-foreground">{row.share.toFixed(1)}% share</p>
              </div>
            </div>
          ))}
          {!topSources.length && <p className="text-sm text-muted-foreground">No revenue streams match these filters.</p>}
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Revenue ledger</CardTitle>
            <CardDescription>Every stream in the filtered window.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search source or category"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-11 rounded-2xl border-0 bg-muted/30 pl-10"
              />
            </div>
            <Button type="button" onClick={downloadReport} className="rounded-2xl bg-[#0f172a] text-white" disabled={!visibleRevenue.length}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/20">
                <th className="py-2 px-3 text-left font-semibold">Source</th>
                <th className="py-2 px-3 text-left font-semibold">Category</th>
                <th className="py-2 px-3 text-center font-semibold">Count</th>
                <th className="py-2 px-3 text-right font-semibold">Amount</th>
                <th className="py-2 px-3 text-right font-semibold">Share</th>
                <th className="py-2 px-3 text-center font-semibold">Origin</th>
              </tr>
            </thead>
            <tbody>
              {visibleRevenue.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-2 px-3 font-semibold text-white">{row.source}</td>
                  <td className="py-2 px-3 text-sm text-muted-foreground">{row.category}</td>
                  <td className="py-2 px-3 text-center text-muted-foreground">{formatNumber(row.count)}</td>
                  <td className="py-2 px-3 text-right font-semibold text-white">{formatCurrency(row.amount)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{row.share.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-center">
                    <Badge variant="outline" className={`${originBadgeClass(row.origin)} border`}>
                      {row.origin}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!visibleRevenue.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No revenue sources match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
