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
import { apiGet } from "@/lib/api"
import { Activity, Calendar, Download, Filter, RefreshCw, Search, Sparkles, Target } from "lucide-react"

type Service = {
  id: string
  service: string
  category: string
  count: number
  pricePerUnit: number
  revenue: number
  date: string
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

type ServiceRow = {
  id: string
  name: string
  category: string
  bookings: number
  pricePerUnit: number
  revenue: number
  origin: "manual" | "appointment"
}

type OriginFilter = "all" | "manual" | "appointment"

const SERVICE_REVENUE_STORAGE_KEY = "service_revenue"
const SERVICE_TARIFF_STORAGE_KEY = "service_tariff_overrides"
const CATEGORY_ALL = "__all__"

const ORIGIN_OPTIONS: Array<{ label: string; value: OriginFilter }> = [
  { label: "All sources", value: "all" },
  { label: "Manual entries", value: "manual" },
  { label: "Appointments", value: "appointment" },
]

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

const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-LK")}`
const formatNumber = (value: number) => Number(value || 0).toLocaleString("en-LK")

const safeWindow = () => (typeof window === "undefined" ? undefined : window)

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
    date: "2026-02-03",
  },
  {
    id: "SRV002",
    service: "Consultation",
    category: "Medical",
    count: 65,
    pricePerUnit: 2000,
    revenue: 130000,
    date: "2026-02-03",
  },
  {
    id: "SRV003",
    service: "Surgery",
    category: "Surgical",
    count: 8,
    pricePerUnit: 30000,
    revenue: 240000,
    date: "2026-02-03",
  },
  {
    id: "SRV004",
    service: "Grooming",
    category: "Grooming",
    count: 30,
    pricePerUnit: 2000,
    revenue: 60000,
    date: "2026-02-03",
  },
  {
    id: "SRV005",
    service: "Boarding Stay",
    category: "Boarding",
    count: 18,
    pricePerUnit: 5500,
    revenue: 99000,
    date: "2026-02-03",
  },
  {
    id: "SRV006",
    service: "Physiotherapy Session",
    category: "Therapy",
    count: 14,
    pricePerUnit: 4200,
    revenue: 58800,
    date: "2026-02-03",
  },
]

const loadManualServices = (): Service[] => {
  const win = safeWindow()
  if (!win) return initialServices
  const saved = win.localStorage.getItem(SERVICE_REVENUE_STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved) as Service[]
    } catch (error) {
      console.error("Failed to parse saved service revenue", error)
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
    } catch (error) {
      console.error("Failed to parse tariff overrides", error)
    }
  }
  return {}
}

export default function ServicesReport() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>(CATEGORY_ALL)
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all")
  const [manualServices, setManualServices] = useState<Service[]>(() => loadManualServices())
  const [tariffOverrides, setTariffOverrides] = useState<TariffOverrides>(() => loadTariffOverrides())
  const [appointments, setAppointments] = useState<ApiAppointment[]>([])
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
      setAppointments(res.data)
    } catch (error) {
      setAppointmentError(error instanceof Error ? error.message : "Failed to sync appointments")
    } finally {
      setAppointmentLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const getTariffForRule = useCallback(
    (rule: ServiceRule) => {
      const override = tariffOverrides[rule.key]
      const price = override?.price && override.price > 0 ? override.price : rule.defaultPrice
      return price
    },
    [tariffOverrides]
  )

  const appointmentServiceRows = useMemo<ServiceRow[]>(() => {
    if (!appointments.length) return []
    const buckets = new Map<string, { rule: ServiceRule; count: number }>()

    appointments.forEach((appointment) => {
      if (!appointment.reason) return
      const status = (appointment.status || "Scheduled") as AppointmentStatus
      if (status === "Cancelled" || status === "No-Show") return
      const rule = matchServiceRule(appointment.reason)
      const bucket = buckets.get(rule.key)
      if (!bucket) {
        buckets.set(rule.key, { rule, count: 1 })
      } else {
        bucket.count += 1
      }
    })

    return Array.from(buckets.values()).map((bucket, index) => {
      const price = getTariffForRule(bucket.rule)
      const revenue = bucket.count * price
      return {
        id: `APPT-${bucket.rule.key}-${index}`,
        name: bucket.rule.label,
        category: bucket.rule.category,
        bookings: bucket.count,
        pricePerUnit: price,
        revenue,
        origin: "appointment" as const,
      }
    })
  }, [appointments, getTariffForRule])

  const manualServiceRows = useMemo<ServiceRow[]>(
    () =>
      manualServices.map((service) => ({
        id: service.id,
        name: service.service,
        category: service.category,
        bookings: service.count,
        pricePerUnit: service.pricePerUnit,
        revenue: service.revenue,
        origin: "manual" as const,
      })),
    [manualServices]
  )

  const combinedServices = useMemo<ServiceRow[]>(() => {
    const merged = [...manualServiceRows, ...appointmentServiceRows]
    return merged.sort((a, b) => b.revenue - a.revenue)
  }, [manualServiceRows, appointmentServiceRows])

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>()
    combinedServices.forEach((row) => unique.add(row.category))
    return Array.from(unique).sort()
  }, [combinedServices])

  const visibleServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return combinedServices.filter((row) => {
      if (originFilter !== "all" && row.origin !== originFilter) return false
      if (categoryFilter !== CATEGORY_ALL && row.category !== categoryFilter) return false
      if (!term) return true
      return row.name.toLowerCase().includes(term) || row.category.toLowerCase().includes(term)
    })
  }, [combinedServices, originFilter, categoryFilter, searchTerm])

  const visibleRevenue = useMemo(() => visibleServices.reduce((sum, row) => sum + row.revenue, 0), [visibleServices])
  const visibleBookings = useMemo(() => visibleServices.reduce((sum, row) => sum + row.bookings, 0), [visibleServices])
  const visibleAvgTicket = visibleBookings ? visibleRevenue / visibleBookings : 0

  const visibleManualRevenue = useMemo(
    () => visibleServices.filter((row) => row.origin === "manual").reduce((sum, row) => sum + row.revenue, 0),
    [visibleServices]
  )
  const visibleAppointmentRevenue = useMemo(
    () => visibleServices.filter((row) => row.origin === "appointment").reduce((sum, row) => sum + row.revenue, 0),
    [visibleServices]
  )
  const visibleManualBookings = useMemo(
    () => visibleServices.filter((row) => row.origin === "manual").reduce((sum, row) => sum + row.bookings, 0),
    [visibleServices]
  )
  const visibleAppointmentBookings = useMemo(
    () => visibleServices.filter((row) => row.origin === "appointment").reduce((sum, row) => sum + row.bookings, 0),
    [visibleServices]
  )

  const visibleCategoryStats = useMemo(() => {
    const stats = new Map<string, { bookings: number; revenue: number }>()
    visibleServices.forEach((row) => {
      const entry = stats.get(row.category)
      if (!entry) {
        stats.set(row.category, { bookings: row.bookings, revenue: row.revenue })
      } else {
        entry.bookings += row.bookings
        entry.revenue += row.revenue
      }
    })
    return Array.from(stats.entries())
      .map(([category, value]) => ({ category, ...value }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [visibleServices])

  const topVisibleServices = useMemo(() => visibleServices.slice(0, 5), [visibleServices])

  const visibleOriginBreakdown = useMemo(
    () => [
      {
        label: "Manual entries",
        revenue: visibleManualRevenue,
        bookings: visibleManualBookings,
        share: visibleRevenue ? (visibleManualRevenue / visibleRevenue) * 100 : 0,
      },
      {
        label: "Appointments",
        revenue: visibleAppointmentRevenue,
        bookings: visibleAppointmentBookings,
        share: visibleRevenue ? (visibleAppointmentRevenue / visibleRevenue) * 100 : 0,
      },
    ],
    [visibleManualRevenue, visibleManualBookings, visibleAppointmentRevenue, visibleAppointmentBookings, visibleRevenue]
  )

  const highlightStats = [
    {
      label: "Origin filter",
      value:
        originFilter === "all"
          ? "All sources"
          : originFilter === "manual"
          ? "Manual only"
          : "Appointments",
      accent: "text-emerald-400",
    },
    {
      label: "Category focus",
      value: categoryFilter === CATEGORY_ALL ? "All categories" : categoryFilter,
      accent: "text-sky-400",
    },
    {
      label: "Search scope",
      value: searchTerm ? `"${searchTerm}"` : "Full catalog",
      accent: "text-amber-400",
    },
    {
      label: "Visible revenue",
      value: formatCurrency(visibleRevenue),
      accent: "text-pink-400",
    },
  ]

  const heroMetrics = [
    {
      label: "Total bookings",
      value: formatNumber(visibleBookings),
      hint: `${formatNumber(visibleServices.length)} services`,
      gradient: "from-[#0f172a] via-[#3730a3] to-[#22d3ee]",
      icon: Activity,
    },
    {
      label: "Services revenue",
      value: formatCurrency(visibleRevenue),
      hint: `Avg ${formatCurrency(visibleAvgTicket || 0)}`,
      gradient: "from-[#14532d] to-[#22c55e]",
      icon: Sparkles,
    },
    {
      label: "Avg ticket",
      value: formatCurrency(visibleAvgTicket || 0),
      hint: "Per completed booking",
      gradient: "from-[#4c0519] to-[#fb7185]",
      icon: Target,
    },
    {
      label: "Appointment share",
      value: `${visibleRevenue ? ((visibleAppointmentRevenue / visibleRevenue) * 100).toFixed(1) : 0}%`,
      hint: `${formatNumber(visibleAppointmentBookings)} bookings`,
      gradient: "from-[#0f172a] to-[#38bdf8]",
      icon: Calendar,
    },
  ]

  const consoleFooter = (
    <div className="flex flex-wrap gap-3 text-sm">
      {appointmentLoading && <span className="text-muted-foreground">Syncing appointments...</span>}
      {!appointmentLoading && !appointmentError && <span className="text-muted-foreground">{appointments.length} appointments scanned</span>}
      {appointmentError && <span className="text-rose-500">{appointmentError}</span>}
      <Badge variant="secondary" className="rounded-2xl border-dashed text-xs">
        {formatNumber(visibleServices.length)} services visible
      </Badge>
    </div>
  )

  const downloadReport = () => {
    if (typeof window === "undefined" || !visibleServices.length) return
    const csvContent = [
      ["Services Report - " + new Date().toLocaleDateString()],
      [],
      ["Service", "Category", "Bookings", "Avg Tariff", "Revenue (Rs.)", "Origin"],
      ...visibleServices.map((row) => [
        row.name,
        row.category,
        row.bookings,
        row.pricePerUnit,
        row.revenue,
        row.origin,
      ]),
      [],
      ["Total Bookings", visibleBookings],
      ["Total Revenue", visibleRevenue],
      ["Average Ticket", Math.round(visibleAvgTicket)],
    ]
      .map((line) => line.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "Services-Report.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setCategoryFilter(CATEGORY_ALL)
    setOriginFilter("all")
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Services Report" subtitle="Neon command deck for bookings, tariffs, and clinical revenue." />

      <ReportHero
        kicker="Clinical services"
        title="Services runway"
        subtitle="Manual revenue, tariff overrides, and appointment-derived bookings unify here."
        badgeLabel={`${formatNumber(combinedServices.length)} tracked services`}
        metrics={heroMetrics}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadReport} disabled={!visibleServices.length} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={fetchAppointments} disabled={appointmentLoading} className="rounded-2xl border-white/60 text-white">
              <RefreshCw className={`mr-2 h-4 w-4 ${appointmentLoading ? "animate-spin" : ""}`} /> Sync appointments
            </Button>
          </div>
        }
      />

      <ReportConsole
        icon={Filter}
        title="Filters & overrides"
        description="Dial in categories, origin, or keywords; everything below follows suit."
        footer={consoleFooter}
      >
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Search services</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name or category"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-11 rounded-2xl border-0 bg-muted/30 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Category</Label>
              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CATEGORY_ALL}>All categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Origin</Label>
              <Select value={originFilter} onValueChange={(value) => setOriginFilter(value as OriginFilter)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All sources" />
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
              <Label className="text-sm font-semibold text-foreground">Quick actions</Label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetFilters} className="h-11 flex-1 rounded-2xl border-dashed">
                  Reset filters
                </Button>
                <Button onClick={fetchAppointments} disabled={appointmentLoading} className="h-11 flex-1 rounded-2xl bg-[#0f172a] text-white">
                  <RefreshCw className={`mr-2 h-4 w-4 ${appointmentLoading ? "animate-spin" : ""}`} />
                  Sync
                </Button>
              </div>
            </div>
          </div>
        </>
      </ReportConsole>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlightStats.map((stat) => (
          <Card key={stat.label} className="brand-card text-center">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">Live filter context</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Category mix</CardTitle>
            <CardDescription>Revenue distribution across service families.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleCategoryStats.length ? (
              visibleCategoryStats.map((stat) => (
                <div key={stat.category} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{stat.category}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(stat.bookings)} bookings</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{formatCurrency(stat.revenue)}</p>
                      <p className="text-xs text-muted-foreground">
                        Avg {formatCurrency(stat.revenue / (stat.bookings || 1))}
                      </p>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-linear-to-r from-sky-400 to-sky-600"
                      style={{ width: `${visibleRevenue ? Math.min(100, (stat.revenue / visibleRevenue) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No services match this filter set.</p>
            )}
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Source mix</CardTitle>
            <CardDescription>Manual entries vs. appointment-derived revenue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleOriginBreakdown.map((row) => (
              <div key={row.label} className="space-y-2 rounded-2xl border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{row.label}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(row.bookings)} bookings</p>
                  </div>
                  <p className="text-lg font-bold text-white">{formatCurrency(row.revenue)}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Revenue share</span>
                  <span>{row.share.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-linear-to-r from-emerald-400 to-emerald-600"
                    style={{ width: `${Math.min(100, Math.max(0, row.share))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Top services</CardTitle>
            <CardDescription>Highest earning services in view.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topVisibleServices.length ? (
              topVisibleServices.map((service, index) => (
                <div key={service.id} className="space-y-1 rounded-2xl border border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">
                      {index + 1}. {service.name}
                    </p>
                    <p className="text-emerald-300 font-bold">{formatCurrency(service.revenue)}</p>
                  </div>
                  <div className="w-full rounded-full bg-white/10 h-2">
                    <div
                      className="h-2 rounded-full bg-linear-to-r from-emerald-400 to-emerald-600"
                      style={{
                        width: `${
                          topVisibleServices.length && topVisibleServices[0].revenue
                            ? Math.min(100, (service.revenue / topVisibleServices[0].revenue) * 100)
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {service.bookings} bookings | {service.origin === "manual" ? "Manual" : "Appointment"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No visible services yet. Adjust filters or sync data.</p>
            )}
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Sync health</CardTitle>
            <CardDescription>Appointment ingestion status and tariff overrides.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Appointments</p>
              <p className="text-2xl font-bold text-white">{formatNumber(appointments.length)}</p>
              <p className="text-xs text-muted-foreground">
                {appointmentLoading ? "Sync in progress" : appointmentError ? appointmentError : "Records scanned from the calendar"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tariff overrides</p>
              <p className="text-2xl font-bold text-white">{formatNumber(Object.keys(tariffOverrides).length)}</p>
              <p className="text-xs text-muted-foreground">Local storage price overrides in effect.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Services ledger</CardTitle>
            <CardDescription>Filtered services with tariff, booking, and origin context.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={fetchAppointments} disabled={appointmentLoading} className="rounded-2xl border-white/30 text-white">
              <RefreshCw className={`mr-2 h-4 w-4 ${appointmentLoading ? "animate-spin" : ""}`} /> Sync appointments
            </Button>
            <Button onClick={downloadReport} disabled={!visibleServices.length} className="rounded-2xl bg-[#0f172a] text-white">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/20">
                <th className="py-2 px-3 text-left font-semibold">Service</th>
                <th className="py-2 px-3 text-left font-semibold">Category</th>
                <th className="py-2 px-3 text-right font-semibold">Bookings</th>
                <th className="py-2 px-3 text-right font-semibold">Avg Tariff</th>
                <th className="py-2 px-3 text-right font-semibold">Revenue</th>
                <th className="py-2 px-3 text-center font-semibold">Origin</th>
              </tr>
            </thead>
            <tbody>
              {visibleServices.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-2 px-3 font-semibold text-white">{row.name}</td>
                  <td className="py-2 px-3 text-sm text-muted-foreground">{row.category}</td>
                  <td className="py-2 px-3 text-right font-semibold text-white">{formatNumber(row.bookings)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{formatCurrency(row.pricePerUnit)}</td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-300">{formatCurrency(row.revenue)}</td>
                  <td className="py-2 px-3 text-center">
                    <Badge variant="outline" className={`border ${row.origin === "manual" ? "bg-amber-50/20 text-amber-300" : "bg-emerald-50/20 text-emerald-300"}`}>
                      {row.origin === "manual" ? "Manual" : "Appointment"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!visibleServices.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No services match these filters.
                  </td>
                </tr>
              )}
            </tbody>
            {visibleServices.length > 0 && (
              <tfoot>
                <tr className="bg-muted/20 font-semibold">
                  <td className="py-2 px-3 text-left">Totals</td>
                  <td></td>
                  <td className="py-2 px-3 text-right">{formatNumber(visibleBookings)}</td>
                  <td></td>
                  <td className="py-2 px-3 text-right">{formatCurrency(visibleRevenue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
