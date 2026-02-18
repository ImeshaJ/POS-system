import { useCallback, useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import Loader from "@/components/common/Loader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ClipboardCheck,
  Download,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  PawPrint,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  FileText,
} from "lucide-react"
import { apiDelete, apiGet } from "@/lib/api"
import { useToast } from "@/components/common/Toast"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"

interface BoardingPackage {
  id: number
  name: string
  price: string
  description: string
  duration: string
  active: boolean
}

interface Service {
  id: number
  name: string
  price: string
}

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

type BoardingAppointment = {
  id: string
  date: string
  time: string
  client: string
  pet: string
  reason: string
  status: AppointmentStatus
  doctor: string
}

type StayHistoryEntry = {
  appointmentId: string
  appointment: BoardingAppointment
  detail: BoardingDetail
  checkInTimestamp: number | null
}

const BOARDING_KEYWORDS = ["board", "boarding", "stay", "overnight", "kennel", "daycare", "hotel"]
const BOARDING_STATUS_BADGES: Record<AppointmentStatus, string> = {
  Scheduled: "bg-purple-50 text-purple-700 border-purple-200",
  Completed: "bg-green-50 text-green-700 border-green-200",
  Cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  "No-Show": "bg-red-50 text-red-600 border-red-200",
}

type BoardingChecklistKey = "vaccinationComplete" | "dewormedComplete" | "hasLice" | "hasAllergy"

const BOARDING_BOOLEAN_CHECKS: Array<{ key: BoardingChecklistKey; label: string }> = [
  { key: "vaccinationComplete", label: "Vaccination complete" },
  { key: "dewormedComplete", label: "Dewormed" },
  { key: "hasLice", label: "Lice present" },
  { key: "hasAllergy", label: "Allergy noted" },
]

type BoardingDetail = {
  checkInDate: string
  checkInTime: string
  checkOutDate: string
  checkOutTime: string
  vaccinationComplete: boolean
  dewormedComplete: boolean
  hasLice: boolean
  hasAllergy: boolean
  stayItems: string
  allergyNotes: string
  healthConcerns: string
}

const createDefaultDetail = (): BoardingDetail => ({
  checkInDate: "",
  checkInTime: "",
  checkOutDate: "",
  checkOutTime: "",
  vaccinationComplete: false,
  dewormedComplete: false,
  hasLice: false,
  hasAllergy: false,
  stayItems: "",
  allergyNotes: "",
  healthConcerns: "",
})

const normalizeDateString = (value?: string | null) => {
  if (!value) return ""
  return value.length >= 10 ? value.slice(0, 10) : value
}

const isBoardingReason = (reason?: string | null) => {
  if (!reason) return false
  const target = reason.toLowerCase()
  return BOARDING_KEYWORDS.some((keyword) => target.includes(keyword))
}

const mapBoardingAppointment = (api: ApiAppointment): BoardingAppointment => ({
  id: String(api.id),
  date: normalizeDateString(api.date),
  time: api.time || "",
  client: api.client_name || api.client_code || "Walk-in",
  pet: api.pet_name || "Unassigned",
  reason: api.reason || "",
  status: (api.status || "Scheduled") as AppointmentStatus,
  doctor: api.doctor || "Unassigned",
})

const appointmentTimestamp = (appointment: BoardingAppointment) => {
  if (!appointment.date) return null
  const iso = `${appointment.date}T${appointment.time || "00:00"}`
  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? null : parsed
}

const formatNumber = (value: number) => value.toLocaleString("en-LK")

export default function CatBoarding() {
  const toast = useToast()
  const [deleteBoardingId, setDeleteBoardingId] = useState<string | null>(null)

  const [packages, setPackages] = useState<BoardingPackage[]>([
    {
      id: 1,
      name: "Standard Boarding (1-3 Days)",
      price: "Rs. 5,500 - Rs. 14,850",
      description: "Comfortable private suite with daily feeding and litter cleaning",
      duration: "1-3 days",
      active: true,
    },
    {
      id: 2,
      name: "Extended Boarding (4-7 Days)",
      price: "Rs. 18,150 - Rs. 33,000",
      description: "Private suite with daily playtime, grooming, and interactive activities",
      duration: "4-7 days",
      active: true,
    },
    {
      id: 3,
      name: "Premium Long-term Boarding (8+ Days)",
      price: "Rs. 39,600 - Rs. 82,500",
      description: "Premium suite with hourly monitoring, enrichment activities, and wellness checks",
      duration: "8+ days",
      active: true,
    },
    {
      id: 4,
      name: "VIP Deluxe Suite",
      price: "Rs. 24,750 - Rs. 49,500",
      description: "Luxury accommodation with window access, multiple levels, and premium bedding",
      duration: "Per night",
      active: true,
    },
  ])

  const [additionalServices, setAdditionalServices] = useState<Service[]>([
    { id: 1, name: "Medication Administration", price: "Rs. 1,650 per dose" },
    { id: 2, name: "Special Diet Handling", price: "Rs. 2,750" },
    { id: 3, name: "Daily Grooming & Brushing", price: "Rs. 5,500" },
    { id: 4, name: "Interactive Playtime (30 min)", price: "Rs. 3,300" },
    { id: 5, name: "Video Updates", price: "Rs. 2,200 per day" },
    { id: 6, name: "Birthday Celebration Package", price: "Rs. 8,250" },
  ])

  const [showPackageModal, setShowPackageModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<BoardingPackage | null>(null)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [appointmentRecords, setAppointmentRecords] = useState<BoardingAppointment[]>([])
  const [appointmentLoading, setAppointmentLoading] = useState(true)
  const [appointmentError, setAppointmentError] = useState("")
  const [stayDetails, setStayDetails] = useState<Record<string, BoardingDetail>>({})
  const [selectedAppointment, setSelectedAppointment] = useState<BoardingAppointment | null>(null)
  const [detailForm, setDetailForm] = useState<BoardingDetail>(createDefaultDetail())
  const [detailSaving, setDetailSaving] = useState(false)
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "All">("All")
  const [dateFilter, setDateFilter] = useState<"all" | "upcoming" | "past">("all")
  const [searchTerm, setSearchTerm] = useState("")

  const [formPackage, setFormPackage] = useState<BoardingPackage>({
    id: 0,
    name: "",
    price: "",
    description: "",
    duration: "",
    active: true,
  })

  const [formService, setFormService] = useState<Service>({
    id: 0,
    name: "",
    price: "",
  })

  const fetchAppointments = useCallback(async () => {
    setAppointmentLoading(true)
    setAppointmentError("")
    try {
      const res = await apiGet<ApiAppointment[]>("/api/appointments?page=1&limit=500")
      setAppointmentRecords(res.data.map(mapBoardingAppointment))
    } catch (err) {
      setAppointmentError(err instanceof Error ? err.message : "Failed to load appointments")
    } finally {
      setAppointmentLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const boardingAppointments = useMemo(() => {
    const filtered = appointmentRecords.filter((appt) => isBoardingReason(appt.reason))
    return filtered
      .slice()
      .sort((a, b) => {
        const aTime = appointmentTimestamp(a)
        const bTime = appointmentTimestamp(b)
        if (aTime === null && bTime === null) return 0
        if (aTime === null) return 1
        if (bTime === null) return -1
        return aTime - bTime
      })
  }, [appointmentRecords])

  const totalBoardingAppointments = boardingAppointments.length

  const upcomingBoardingCount = useMemo(() => {
    const now = Date.now()
    return boardingAppointments.filter((appt) => {
      const ts = appointmentTimestamp(appt)
      return ts !== null && ts >= now
    }).length
  }, [boardingAppointments])

  const completedBoardingLast7Days = useMemo(() => {
    const now = Date.now()
    const threshold = now - 7 * 24 * 60 * 60 * 1000
    return boardingAppointments.filter((appt) => {
      const ts = appointmentTimestamp(appt)
      return ts !== null && appt.status === "Completed" && ts >= threshold
    }).length
  }, [boardingAppointments])

  const filteredLedger = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const now = Date.now()

    return boardingAppointments
      .filter((appt) => {
        const matchesStatus = statusFilter === "All" || appt.status === statusFilter
        const matchesSearch =
          !normalizedSearch ||
          [appt.pet, appt.client, appt.reason, appt.doctor]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedSearch))
        const ts = appointmentTimestamp(appt)
        const matchesDate =
          dateFilter === "all" ||
          (dateFilter === "upcoming" ? ts !== null && ts >= now : ts !== null && ts < now)

        return matchesStatus && matchesSearch && matchesDate
      })
      .sort((a, b) => {
        const aTime = appointmentTimestamp(a)
        const bTime = appointmentTimestamp(b)
        if (aTime === bTime) return 0
        if (aTime === null) return 1
        if (bTime === null) return -1
        return aTime - bTime
      })
  }, [boardingAppointments, statusFilter, dateFilter, searchTerm])

  const resetFilters = () => {
    setStatusFilter("All")
    setDateFilter("all")
    setSearchTerm("")
  }

  const openStayDetail = (appointment: BoardingAppointment) => {
    setSelectedAppointment(appointment)
    setDetailForm(stayDetails[appointment.id] ?? createDefaultDetail())
  }

  const closeStayDetail = () => {
    setSelectedAppointment(null)
    setDetailForm(createDefaultDetail())
    setDetailSaving(false)
  }

  const updateDetailField = <K extends keyof BoardingDetail>(key: K, value: BoardingDetail[K]) => {
    setDetailForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveDetail = () => {
    if (!selectedAppointment) return
    setDetailSaving(true)
    setStayDetails((prev) => ({ ...prev, [selectedAppointment.id]: detailForm }))
    setTimeout(() => {
      setDetailSaving(false)
      closeStayDetail()
    }, 200)
  }

  const handleDeleteBoardingClick = (appointmentId: string) => {
    setDeleteBoardingId(appointmentId)
  }

  const handleDeleteBoardingConfirm = async () => {
    if (!deleteBoardingId) return
    try {
      setDeletePendingId(deleteBoardingId)
      await apiDelete(`/api/appointments/${deleteBoardingId}`)
      setAppointmentRecords((prev) => prev.filter((appt) => appt.id !== deleteBoardingId))
      setStayDetails((prev) => {
        if (!prev[deleteBoardingId]) return prev
        const updated = { ...prev }
        delete updated[deleteBoardingId]
        return updated
      })
      toast.success("Boarding appointment deleted successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete booking")
    } finally {
      setDeletePendingId(null)
      setDeleteBoardingId(null)
    }
  }

  const openAddPackage = () => {
    setEditingPackage(null)
    setFormPackage({
      id: Math.max(...packages.map((pkg) => pkg.id), 0) + 1,
      name: "",
      price: "",
      description: "",
      duration: "",
      active: true,
    })
    setShowPackageModal(true)
  }

  const openEditPackage = (pkg: BoardingPackage) => {
    setEditingPackage(pkg)
    setFormPackage(pkg)
    setShowPackageModal(true)
  }

  const savePackage = () => {
    if (!formPackage.name || !formPackage.price || !formPackage.description || !formPackage.duration) {
      toast.warning("Please fill all fields")
      return
    }

    if (editingPackage) {
      setPackages(packages.map((pkg) => (pkg.id === formPackage.id ? formPackage : pkg)))
    } else {
      setPackages([...packages, formPackage])
    }
    setShowPackageModal(false)
  }

  const openAddService = () => {
    setEditingService(null)
    setFormService({
      id: Math.max(...additionalServices.map((svc) => svc.id), 0) + 1,
      name: "",
      price: "",
    })
    setShowServiceModal(true)
  }

  const openEditService = (service: Service) => {
    setEditingService(service)
    setFormService(service)
    setShowServiceModal(true)
  }

  const saveService = () => {
    if (!formService.name || !formService.price) {
      toast.warning("Please fill all fields")
      return
    }

    if (editingService) {
      setAdditionalServices(additionalServices.map((svc) => (svc.id === formService.id ? formService : svc)))
    } else {
      setAdditionalServices([...additionalServices, formService])
    }
    setShowServiceModal(false)
  }

  const deleteService = (id: number) => {
    setAdditionalServices(additionalServices.filter((svc) => svc.id !== id))
  }

  const toggleActive = (id: number) => {
    setPackages(packages.map((pkg) => (pkg.id === id ? { ...pkg, active: !pkg.active } : pkg)))
  }

  const deletePackage = (id: number) => {
    setPackages(packages.filter((pkg) => pkg.id !== id))
  }

  const activeCount = packages.filter((pkg) => pkg.active).length
  const inactiveCount = packages.filter((pkg) => !pkg.active).length

  const stayHistoryEntries = useMemo<StayHistoryEntry[]>(() => {
    return Object.entries(stayDetails)
      .map(([appointmentId, detail]) => {
        const appointment = appointmentRecords.find((appt) => appt.id === appointmentId)
        if (!appointment) return null
        const parsedCheckIn = detail.checkInDate
          ? Date.parse(`${detail.checkInDate}T${detail.checkInTime || "00:00"}`)
          : Number.NaN
        const fallbackTimestamp = appointmentTimestamp(appointment)
        const normalizedTimestamp = Number.isNaN(parsedCheckIn) ? fallbackTimestamp : parsedCheckIn

        return {
          appointmentId,
          appointment,
          detail,
          checkInTimestamp: normalizedTimestamp ?? null,
        }
      })
      .filter((entry): entry is StayHistoryEntry => entry !== null)
      .sort((a, b) => (b.checkInTimestamp ?? 0) - (a.checkInTimestamp ?? 0))
  }, [stayDetails, appointmentRecords])

  const handleExportLedger = () => {
    if (!filteredLedger.length) return
    const csv = [
      ["Pet", "Client", "Date", "Time", "Status", "Reason", "Doctor"],
      ...filteredLedger.map((entry) => [
        entry.pet,
        entry.client,
        entry.date || "",
        entry.time || "",
        entry.status,
        entry.reason || "",
        entry.doctor,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const link = document.createElement("a")
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    link.download = `Cat_Boarding_Ledger_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const heroMetrics = [
    {
      label: "Boarding requests",
      value: formatNumber(totalBoardingAppointments),
      hint: `${formatNumber(upcomingBoardingCount)} upcoming`,
      gradient: "from-[#0f172a] via-[#4338ca] to-[#ec4899]",
      icon: Sparkles,
    },
    {
      label: "Active packages",
      value: formatNumber(activeCount),
      hint: `${formatNumber(packages.length)} total offerings`,
      gradient: "from-[#14532d] to-[#22d3ee]",
      icon: PawPrint,
    },
    {
      label: "Departures · 7 days",
      value: formatNumber(completedBoardingLast7Days),
      hint: `${formatNumber(filteredLedger.filter((appt) => appt.status === "Completed").length)} ledger entries`,
      gradient: "from-[#4c0519] to-[#fb7185]",
      icon: TrendingUp,
    },
    {
      label: "Console actions",
      value: `${filteredLedger.length || 0} rows`,
      hint: "Live filters & exports",
      gradient: "from-[#0f172a] to-[#38bdf8]",
      icon: ClipboardCheck,
    },
  ]

  const highlightStats = [
    { label: "Total packages", value: packages.length, accent: "text-sky-500" },
    { label: "Active packages", value: activeCount, accent: "text-emerald-500" },
    { label: "Inactive", value: inactiveCount, accent: "text-amber-500" },
  ]

  return (
    <div className="space-y-6">
      <PageTitle
        title="Manage Cat Boarding Services"
        subtitle="Neon control room covering packages, add-ons, and live boarding ledger data."
      />

      <Card className="brand-card brand-card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#0f172a] via-[#4338ca] to-[#ec4899] p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Boarding intelligence</p>
                <h2 className="text-3xl font-bold">Cat hotels dashboard</h2>
                <p className="text-sm text-white/80">
                  Hero tiles mirror the supplier console aesthetic and surface occupancy, departures, and packages in one pass.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <Badge className="brand-pill border border-white/30 bg-white/10 text-white">
                  {activeCount ? `${activeCount} active packages` : "No packages"}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    onClick={openAddPackage}
                    className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white"
                  >
                    <Plus className="mr-2 h-4 w-4" /> New package
                  </Button>
                  <Button variant="outline" onClick={openAddService} className="rounded-2xl border-white/60 text-white">
                    <Sparkles className="mr-2 h-4 w-4" /> Add-on
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            {heroMetrics.map(({ label, value, hint, gradient, icon: Icon }) => (
              <div key={label} className={`rounded-2xl border border-white/10 bg-linear-to-br ${gradient} p-4 text-white shadow-lg`}>
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
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-muted/60 p-2 text-primary">
              <Filter className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Console</p>
              <h2 className="text-2xl font-bold text-foreground">Filters & exports</h2>
              <p className="text-sm text-muted-foreground">
                Search boarding ledger rows, constrain by status/date, refresh live data, or trigger CSV drops inline.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Search</Label>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Pet, client, or reason"
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AppointmentStatus | "All")}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All statuses</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="No-Show">No-Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Timeline</Label>
              <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as "all" | "upcoming" | "past")}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ledger entries</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <Button variant="outline" onClick={resetFilters} className="h-11 rounded-2xl border-dashed">
                Reset filters
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchAppointments} className="flex-1 h-11 rounded-2xl">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button
                  onClick={handleExportLedger}
                  disabled={!filteredLedger.length}
                  className="flex-1 h-11 rounded-2xl bg-[#0f172a] text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {highlightStats.map((stat) => (
          <Card key={stat.label} className="brand-card">
            <CardContent className="space-y-2 p-5 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className={`text-4xl font-bold ${stat.accent}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">Live onboarding data</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">Boarding packages</CardTitle>
            <CardDescription>Tiered suites, pricing ranges, and quick toggles.</CardDescription>
          </div>
          <Button onClick={openAddPackage} className="rounded-2xl">
            <Plus className="mr-2 h-4 w-4" /> Add package
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                      <Badge className={`rounded-full px-2 py-0.5 text-xs ${pkg.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                        {pkg.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-purple-600">{pkg.price}</p>
                    <p className="text-sm text-muted-foreground">{pkg.description}</p>
                    <p className="text-xs text-muted-foreground">Duration · {pkg.duration}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => toggleActive(pkg.id)}
                      title={pkg.active ? "Deactivate" : "Activate"}
                      className="h-9 w-9 rounded-2xl"
                    >
                      {pkg.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => openEditPackage(pkg)} className="h-9 w-9 rounded-2xl">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => deletePackage(pkg.id)}
                      className="h-9 w-9 rounded-2xl text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="brand-card brand-card-hover">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Additional services</CardTitle>
              <CardDescription>Manage add-on services and pricing</CardDescription>
            </div>
            <Button onClick={openAddService} className="rounded-2xl">
              <Plus className="mr-2 h-4 w-4" /> Add service
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {additionalServices.map((service) => (
                    <TableRow key={service.id} className="transition hover:bg-muted/40">
                      <TableCell className="font-medium text-foreground">{service.name}</TableCell>
                      <TableCell className="font-semibold text-purple-600">{service.price}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="outline" onClick={() => openEditService(service)} className="h-9 w-9 rounded-2xl">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => deleteService(service.id)}
                            className="h-9 w-9 rounded-2xl text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="brand-card">
          <CardHeader>
            <CardTitle>Boarding statistics</CardTitle>
            <CardDescription>Service performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-purple-50 p-4">
                <p className="text-xs uppercase tracking-wide text-purple-700/80">Most popular package</p>
                <p className="text-base font-semibold text-purple-900">Extended Boarding (4-7 Days)</p>
                <p className="text-xs text-purple-700/70">38 bookings this month</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-xs uppercase tracking-wide text-sky-700/80">Average stay duration</p>
                <p className="text-base font-semibold text-sky-900">5.2 days</p>
                <p className="text-xs text-sky-700/70">Across all bookings</p>
              </div>
              <div className="rounded-2xl bg-pink-50 p-4">
                <p className="text-xs uppercase tracking-wide text-pink-700/80">Revenue (month)</p>
                <p className="text-base font-semibold text-pink-900">Rs. 1,155,000</p>
                <p className="text-xs text-pink-700/70">From boarding services</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700/80">Customer satisfaction</p>
                <p className="text-base font-semibold text-emerald-900">4.9 / 5.0</p>
                <p className="text-xs text-emerald-700/70">Based on 76 reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">Boarding ledger</CardTitle>
            <CardDescription>Automatically filtered from appointments for boarding-related visits.</CardDescription>
          </div>
          <Button onClick={handleExportLedger} disabled={!filteredLedger.length} className="rounded-2xl">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {appointmentError && <p className="px-6 pt-4 text-sm text-rose-600">{appointmentError}</p>}
          {appointmentLoading ? (
            <div className="flex justify-center py-12">
              <Loader />
            </div>
          ) : filteredLedger.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pet · Client</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLedger.map((appt) => (
                    <TableRow key={appt.id} className="transition hover:bg-muted/40">
                      <TableCell>
                        <p className="font-semibold text-foreground">{appt.pet}</p>
                        <p className="text-xs text-muted-foreground">{appt.client}</p>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        <div className="space-y-0.5">
                          <p>{appt.date || "Date TBD"}</p>
                          <p className="text-xs text-muted-foreground">{appt.time || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{appt.reason || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`${BOARDING_STATUS_BADGES[appt.status]} border`}>{appt.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{appt.doctor}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openStayDetail(appt)} className="rounded-2xl">
                            Manage
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-2xl text-rose-600 hover:text-rose-700"
                            disabled={deletePendingId === appt.id}
                            onClick={() => handleDeleteBoardingClick(appt.id)}
                          >
                            {deletePendingId === appt.id ? "Deleting…" : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No boarding-focused appointments found.</p>
          )}
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <CardTitle>Boarding stay history</CardTitle>
          <CardDescription>Saved stay checklists from this session</CardDescription>
        </CardHeader>
        <CardContent>
          {stayHistoryEntries.length ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {stayHistoryEntries.map(({ appointmentId, appointment, detail }) => {
                const activeChecks = BOARDING_BOOLEAN_CHECKS.filter(({ key }) => detail[key])
                return (
                  <div
                    key={appointmentId}
                    className="rounded-2xl border border-purple-100 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-foreground">{appointment.pet}</p>
                              <p className="text-sm text-muted-foreground">{appointment.client}</p>
                            </div>
                            <Badge className={`${BOARDING_STATUS_BADGES[appointment.status]} border`}>
                              {appointment.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(detail.checkInDate || appointment.date || "Date TBD")} · {detail.checkInTime || appointment.time || "Time TBD"} · {appointment.doctor}
                          </p>
                          {appointment.reason && <p className="text-xs text-muted-foreground">Reason: {appointment.reason}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                        <div>
                          <p className="uppercase tracking-wide text-gray-400">Check-in</p>
                          <p className="font-semibold text-foreground">{detail.checkInDate || appointment.date || "Pending"}</p>
                          <p>{detail.checkInTime || appointment.time || "-"}</p>
                        </div>
                        <div>
                          <p className="uppercase tracking-wide text-gray-400">Check-out</p>
                          <p className="font-semibold text-foreground">{detail.checkOutDate || "Pending"}</p>
                          <p>{detail.checkOutTime || "-"}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {activeChecks.length ? (
                          activeChecks.map(({ key, label }) => (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800"
                            >
                              ✓ {label}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No checklist updates yet.</span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm text-foreground">
                        <div>
                          <p className="text-xs uppercase text-gray-400">Items staying</p>
                          <p className={`mt-1 whitespace-pre-line ${detail.stayItems ? "text-foreground" : "text-muted-foreground"}`}>
                            {detail.stayItems || "No items recorded"}
                          </p>
                        </div>
                        {detail.hasAllergy && (
                          <div>
                            <p className="text-xs uppercase text-gray-400">Allergy notes</p>
                            <p className="mt-1 whitespace-pre-line text-foreground">{detail.allergyNotes || "Allergy noted"}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs uppercase text-gray-400">Health notes</p>
                          <p className={`mt-1 whitespace-pre-line ${detail.healthConcerns ? "text-foreground" : "text-muted-foreground"}`}>
                            {detail.healthConcerns || "No concerns added"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t bg-purple-50/60 px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openStayDetail(appointment)} className="rounded-2xl">
                        Update
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Save a boarding stay to see history cards here.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" className="rounded-2xl">
          Cancel
        </Button>
        <Button className="rounded-2xl bg-[#4338ca] text-white hover:bg-[#312e81]">Save changes</Button>
      </div>

      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Boarding stay checklist</CardTitle>
                <CardDescription>
                  {selectedAppointment.pet} · {selectedAppointment.client}
                </CardDescription>
              </div>
              <button className="text-2xl text-muted-foreground hover:text-foreground" onClick={closeStayDetail}>
                ✕
              </button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Check-in date</Label>
                  <Input
                    type="date"
                    value={detailForm.checkInDate}
                    onChange={(event) => updateDetailField("checkInDate", event.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <Label>Check-in time</Label>
                  <Input
                    type="time"
                    value={detailForm.checkInTime}
                    onChange={(event) => updateDetailField("checkInTime", event.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <Label>Check-out date</Label>
                  <Input
                    type="date"
                    value={detailForm.checkOutDate}
                    onChange={(event) => updateDetailField("checkOutDate", event.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <Label>Check-out time</Label>
                  <Input
                    type="time"
                    value={detailForm.checkOutTime}
                    onChange={(event) => updateDetailField("checkOutTime", event.target.value)}
                    className="rounded-2xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {BOARDING_BOOLEAN_CHECKS.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 rounded-2xl border border-gray-200 p-3 text-sm font-semibold text-foreground"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={detailForm[key] as boolean}
                      onChange={(event) => updateDetailField(key, event.target.checked as BoardingDetail[typeof key])}
                    />
                    {label}
                  </label>
                ))}
              </div>

              {detailForm.hasAllergy && (
                <div>
                  <Label>Allergy notes</Label>
                  <textarea
                    className="w-full rounded-2xl border border-gray-300 p-3 text-sm"
                    rows={3}
                    value={detailForm.allergyNotes}
                    onChange={(event) => updateDetailField("allergyNotes", event.target.value)}
                  />
                </div>
              )}

              <div>
                <Label>Items staying with pet</Label>
                <textarea
                  className="w-full rounded-2xl border border-gray-300 p-3 text-sm"
                  rows={3}
                  placeholder="Carrier, favorite blanket, medication, etc."
                  value={detailForm.stayItems}
                  onChange={(event) => updateDetailField("stayItems", event.target.value)}
                />
              </div>

              <div>
                <Label>Health issues / instructions</Label>
                <textarea
                  className="w-full rounded-2xl border border-gray-300 p-3 text-sm"
                  rows={4}
                  placeholder="Diet restrictions, medications, behavioral notes"
                  value={detailForm.healthConcerns}
                  onChange={(event) => updateDetailField("healthConcerns", event.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeStayDetail} className="rounded-2xl">
                  Cancel
                </Button>
                <Button onClick={handleSaveDetail} disabled={detailSaving} className="rounded-2xl bg-[#4338ca] text-white">
                  {detailSaving ? "Saving…" : "Save details"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/5 p-4 backdrop-blur-md">
          <Card className="w-full max-w-2xl rounded-3xl shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-linear-to-r from-purple-50 to-purple-100 pb-4">
              <div>
                <CardTitle className="text-2xl font-bold text-purple-900">
                  {editingPackage ? "✏️ Edit package" : "➕ Add new package"}
                </CardTitle>
                <CardDescription className="text-purple-700">
                  {editingPackage ? "Update package details" : "Create a new boarding package"}
                </CardDescription>
              </div>
              <button
                onClick={() => setShowPackageModal(false)}
                className="rounded-full p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-6 w-6" />
              </button>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Package name *</Label>
                  <Input
                    value={formPackage.name}
                    onChange={(event) => setFormPackage({ ...formPackage, name: event.target.value })}
                    placeholder="e.g., Standard Boarding"
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Price range *</Label>
                  <Input
                    value={formPackage.price}
                    onChange={(event) => setFormPackage({ ...formPackage, price: event.target.value })}
                    placeholder="e.g., Rs. 5,500 - Rs. 14,850"
                    className="rounded-2xl"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold text-gray-700">Description *</Label>
                <textarea
                  value={formPackage.description}
                  onChange={(event) => setFormPackage({ ...formPackage, description: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 p-3 text-sm"
                  rows={3}
                  placeholder="Describe what's included in this package..."
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Duration *</Label>
                  <Input
                    value={formPackage.duration}
                    onChange={(event) => setFormPackage({ ...formPackage, duration: event.target.value })}
                    placeholder="e.g., 1-3 days"
                    className="rounded-2xl"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex w-full items-center gap-2 rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={formPackage.active}
                      onChange={(event) => setFormPackage({ ...formPackage, active: event.target.checked })}
                      className="h-4 w-4"
                    />
                    Active package
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t pt-6">
                <Button variant="outline" onClick={() => setShowPackageModal(false)} className="rounded-2xl">
                  Cancel
                </Button>
                <Button className="rounded-2xl bg-linear-to-r from-purple-600 to-purple-700 text-white" onClick={savePackage}>
                  {editingPackage ? "Update package" : "Create package"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/5 p-4 backdrop-blur-md">
          <Card className="w-full max-w-md rounded-3xl shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-linear-to-r from-pink-50 to-pink-100 pb-4">
              <div>
                <CardTitle className="text-2xl font-bold text-pink-900">
                  {editingService ? "✏️ Edit service" : "➕ Add new service"}
                </CardTitle>
                <CardDescription className="text-pink-700">
                  {editingService ? "Update service details" : "Add an additional service"}
                </CardDescription>
              </div>
              <button
                onClick={() => setShowServiceModal(false)}
                className="rounded-full p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-6 w-6" />
              </button>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div>
                <Label className="mb-2 block text-sm font-semibold text-gray-700">Service name *</Label>
                <Input
                  value={formService.name}
                  onChange={(event) => setFormService({ ...formService, name: event.target.value })}
                  placeholder="e.g., Video Updates"
                  className="rounded-2xl"
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold text-gray-700">Price *</Label>
                <Input
                  value={formService.price}
                  onChange={(event) => setFormService({ ...formService, price: event.target.value })}
                  placeholder="e.g., Rs. 2,200 per day"
                  className="rounded-2xl"
                />
              </div>
              <div className="flex justify-end gap-3 border-t pt-6">
                <Button variant="outline" onClick={() => setShowServiceModal(false)} className="rounded-2xl">
                  Cancel
                </Button>
                <Button className="rounded-2xl bg-linear-to-r from-pink-600 to-pink-700 text-white" onClick={saveService}>
                  {editingService ? "Update service" : "Add service"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleteBoardingId !== null}
        onOpenChange={(open) => !open && setDeleteBoardingId(null)}
        title="Delete Boarding Appointment"
        description="Are you sure you want to delete this boarding appointment? This action cannot be undone."
        onConfirm={handleDeleteBoardingConfirm}
        variant="danger"
      />
    </div>
  )
}
