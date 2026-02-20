import { useCallback, useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import Loader from "@/components/common/Loader"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"
import { apiGet, apiPost, apiPut } from "@/lib/api"
import { useToast } from "@/components/common/Toast"

interface GroomingPackage {
  id: number
  name: string
  price: string
  description: string
  duration: string
  active: boolean
}

interface ApiServicePackage {
  id: number
  name: string
  price: string
  description: string | null
  duration_days: number
  duration_hours: number
  duration_minutes: number
  status: string
  service_type_code: string
}

interface ApiAddOnService {
  id: number
  name: string
  price: string
  description: string | null
  status: string
  service_type_code: string
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

type GroomingAppointment = {
  id: string
  date: string
  time: string
  client: string
  pet: string
  reason: string
  status: AppointmentStatus
  doctor: string
}

type GroomingDetail = {
  coatCondition: string
  skinIssues: string
  groomingType: string
  servicesPerformed: string
  productsUsed: string
  nextGroomingDate: string
  specialInstructions: string
  notes: string
}

type ApiGroomingSession = {
  id: number
  appointment_id: number
  coat_condition: string | null
  skin_issues: string | null
  grooming_type: string | null
  services_performed: string | null
  products_used: string | null
  next_grooming_date: string | null
  special_instructions: string | null
  notes: string | null
}

const createDefaultDetail = (): GroomingDetail => ({
  coatCondition: "",
  skinIssues: "",
  groomingType: "",
  servicesPerformed: "",
  productsUsed: "",
  nextGroomingDate: "",
  specialInstructions: "",
  notes: "",
})

const GROOMING_KEYWORDS = ["groom", "bath", "spa", "trim", "coat", "clip"]
const STATUS_BADGE_STYLES: Record<AppointmentStatus, string> = {
  Scheduled: "bg-amber-50 text-amber-700 border-amber-200",
  Completed: "bg-green-50 text-green-700 border-green-200",
  Cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  "No-Show": "bg-red-50 text-red-600 border-red-200",
}

const normalizeDateString = (value?: string | null) => {
  if (!value) return ""
  if (value.length >= 10) return value.slice(0, 10)
  return value
}

const isGroomingReason = (reason?: string | null) => {
  if (!reason) return false
  const target = reason.toLowerCase()
  return GROOMING_KEYWORDS.some((keyword) => target.includes(keyword))
}

const mapGroomingAppointment = (api: ApiAppointment): GroomingAppointment => {
  return {
    id: String(api.id),
    date: normalizeDateString(api.date),
    time: api.time || "",
    client: api.client_name || api.client_code || "Walk-in",
    pet: api.pet_name || "Unassigned",
    reason: api.reason || "",
    status: (api.status || "Scheduled") as AppointmentStatus,
    doctor: api.doctor || "Unassigned",
  }
}

const appointmentTimestamp = (appointment: GroomingAppointment) => {
  if (!appointment.date) return null
  const iso = `${appointment.date}T${appointment.time || "00:00"}`
  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? null : parsed
}

const formatNumber = (value: number) => value.toLocaleString("en-LK")

export default function PetGrooming() {
  const toast = useToast()

  const [packages, setPackages] = useState<GroomingPackage[]>([
    {
      id: 1,
      name: "Basic Bath Package",
      price: "Rs. 14,850 - Rs. 21,450",
      description: "Bath, blow-dry, and basic grooming",
      duration: "1-2 hours",
      active: true
    },
    {
      id: 2,
      name: "Deluxe Grooming Package",
      price: "Rs. 24,750 - Rs. 39,600",
      description: "Bath, haircut, nail trim, ear cleaning, and styling",
      duration: "2-3 hours",
      active: true
    },
    {
      id: 3,
      name: "Premium Spa Package",
      price: "Rs. 42,900 - Rs. 59,400",
      description: "Complete spa treatment with massage, conditioning, breed-specific styling, and paw care",
      duration: "3-4 hours",
      active: true
    },
    {
      id: 4,
      name: "Cat Grooming Specialist",
      price: "Rs. 16,500 - Rs. 33,000",
      description: "Gentle cat grooming, nail trim, and ear cleaning",
      duration: "1-2 hours",
      active: true
    }
  ])

  const [additionalServices, setAdditionalServices] = useState<Service[]>([
    { id: 1, name: "Aromatherapy & conditioning treatments", price: "Rs. 3,300 - Rs. 4,950" },
    { id: 2, name: "Nail polish application", price: "Rs. 1,650" },
    { id: 3, name: "Teeth cleaning", price: "Rs. 6,600" },
    { id: 4, name: "De-shedding treatment", price: "Rs. 8,250 - Rs. 11,550" },
    { id: 5, name: "Flea & tick shampoo treatment", price: "Rs. 4,950" },
    { id: 6, name: "Breed-specific styling consultation", price: "Included" }
  ])

  const [showPackageModal, setShowPackageModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<GroomingPackage | null>(null)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [appointmentRecords, setAppointmentRecords] = useState<GroomingAppointment[]>([])
  const [appointmentLoading, setAppointmentLoading] = useState(true)
  const [appointmentError, setAppointmentError] = useState("")
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "All">("All")
  const [dateFilter, setDateFilter] = useState<"all" | "upcoming" | "past">("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Grooming session detail management state
  const [selectedAppointment, setSelectedAppointment] = useState<GroomingAppointment | null>(null)
  const [detailForm, setDetailForm] = useState<GroomingDetail>(createDefaultDetail())
  const [groomingSessionId, setGroomingSessionId] = useState<number | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailSaving, setDetailSaving] = useState(false)

  const [formPackage, setFormPackage] = useState<GroomingPackage>({
    id: 0,
    name: "",
    price: "",
    description: "",
    duration: "",
    active: true
  })

  const [formService, setFormService] = useState<Service>({
    id: 0,
    name: "",
    price: ""
  })

  const fetchAppointments = useCallback(async () => {
    setAppointmentLoading(true)
    setAppointmentError("")
    try {
      const res = await apiGet<ApiAppointment[]>("/api/appointments?page=1&limit=500")
      setAppointmentRecords(res.data.map(mapGroomingAppointment))
    } catch (err) {
      setAppointmentError(err instanceof Error ? err.message : "Failed to load appointments")
    } finally {
      setAppointmentLoading(false)
    }
  }, [])

  // Fetch packages from database
  const fetchPackages = useCallback(async () => {
    try {
      const res = await apiGet<ApiServicePackage[]>("/api/service-types/packages/by-type/pet-grooming")
      if (res.data.length > 0) {
        setPackages(res.data.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          price: `Rs. ${parseFloat(pkg.price).toLocaleString()}`,
          description: pkg.description || "",
          duration: pkg.duration_hours ? `${pkg.duration_hours} hours` : pkg.duration_minutes ? `${pkg.duration_minutes} mins` : "",
          active: pkg.status === "active"
        })))
      }
    } catch {
      // Use default packages if API fails
    }
  }, [])

  // Fetch add-on services from database
  const fetchAddOnServices = useCallback(async () => {
    try {
      const res = await apiGet<ApiAddOnService[]>("/api/service-types/addons/by-type/pet-grooming")
      if (res.data.length > 0) {
        setAdditionalServices(res.data.map(addon => ({
          id: addon.id,
          name: addon.name,
          price: `Rs. ${parseFloat(addon.price).toLocaleString()}`
        })))
      }
    } catch {
      // Use default add-on services if API fails
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
    fetchPackages()
    fetchAddOnServices()
  }, [fetchAppointments, fetchPackages, fetchAddOnServices])

  const groomingAppointments = useMemo(() => {
    const filtered = appointmentRecords.filter((appt) => isGroomingReason(appt.reason))
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

  const totalGroomingAppointments = groomingAppointments.length

  const upcomingGroomingCount = useMemo(() => {
    const now = Date.now()
    return groomingAppointments.filter((appt) => {
      const ts = appointmentTimestamp(appt)
      return ts !== null && ts >= now
    }).length
  }, [groomingAppointments])

  const completedLast7Days = useMemo(() => {
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    return groomingAppointments.filter((appt) => {
      const ts = appointmentTimestamp(appt)
      return ts !== null && appt.status === "Completed" && ts >= sevenDaysAgo
    }).length
  }, [groomingAppointments])

  const recentGroomingAppointments = useMemo(() => groomingAppointments.slice(0, 12), [groomingAppointments])

  const openAddPackage = () => {
    setEditingPackage(null)
    setFormPackage({
      id: Math.max(...packages.map(p => p.id), 0) + 1,
      name: "",
      price: "",
      description: "",
      duration: "",
      active: true
    })
    setShowPackageModal(true)
  }

  const openEditPackage = (pkg: GroomingPackage) => {
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
      setPackages(packages.map(pkg => pkg.id === formPackage.id ? formPackage : pkg))
    } else {
      setPackages([...packages, formPackage])
    }
    setShowPackageModal(false)
  }

  const openAddService = () => {
    setEditingService(null)
    setFormService({
      id: Math.max(...additionalServices.map(s => s.id), 0) + 1,
      name: "",
      price: ""
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
      setAdditionalServices(additionalServices.map(s => s.id === formService.id ? formService : s))
    } else {
      setAdditionalServices([...additionalServices, formService])
    }
    setShowServiceModal(false)
  }

  const deleteService = (id: number) => {
    setAdditionalServices(additionalServices.filter(s => s.id !== id))
  }

  const toggleActive = (id: number) => {
    setPackages(packages.map(pkg => 
      pkg.id === id ? { ...pkg, active: !pkg.active } : pkg
    ))
  }

  const deletePackage = (id: number) => {
    setPackages(packages.filter(pkg => pkg.id !== id))
  }

  const activeCount = packages.filter(pkg => pkg.active).length
  const inactiveCount = packages.filter(pkg => !pkg.active).length

  const filteredLedger = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const now = Date.now()

    return groomingAppointments
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
  }, [groomingAppointments, statusFilter, dateFilter, searchTerm])

  const resetFilters = () => {
    setStatusFilter("All")
    setDateFilter("all")
    setSearchTerm("")
  }

  const openGroomingDetail = async (appointment: GroomingAppointment) => {
    setSelectedAppointment(appointment)
    setDetailLoading(true)
    setGroomingSessionId(null)
    setDetailForm(createDefaultDetail())
    try {
      const res = await apiGet<ApiGroomingSession>(`/api/services-extension/grooming-sessions/by-appointment/${appointment.id}`)
      const data = res.data
      setGroomingSessionId(data.id)
      setDetailForm({
        coatCondition: data.coat_condition || "",
        skinIssues: data.skin_issues || "",
        groomingType: data.grooming_type || "",
        servicesPerformed: data.services_performed || "",
        productsUsed: data.products_used || "",
        nextGroomingDate: data.next_grooming_date ? data.next_grooming_date.slice(0, 10) : "",
        specialInstructions: data.special_instructions || "",
        notes: data.notes || "",
      })
    } catch {
      // No existing record - use defaults
    } finally {
      setDetailLoading(false)
    }
  }

  const closeGroomingDetail = () => {
    setSelectedAppointment(null)
    setDetailForm(createDefaultDetail())
    setGroomingSessionId(null)
    setDetailSaving(false)
  }

  const updateDetailField = <K extends keyof GroomingDetail>(key: K, value: GroomingDetail[K]) => {
    setDetailForm((prev) => ({ ...prev, [key]: value }))
  }

  const saveGroomingDetail = async () => {
    if (!selectedAppointment) return
    setDetailSaving(true)
    try {
      const payload = {
        appointment_id: Number(selectedAppointment.id),
        coat_condition: detailForm.coatCondition,
        skin_issues: detailForm.skinIssues,
        grooming_type: detailForm.groomingType,
        services_performed: detailForm.servicesPerformed,
        products_used: detailForm.productsUsed,
        next_grooming_date: detailForm.nextGroomingDate || null,
        special_instructions: detailForm.specialInstructions,
        notes: detailForm.notes,
      }
      if (groomingSessionId) {
        await apiPut(`/api/services-extension/grooming-sessions/${groomingSessionId}`, payload)
        toast.success("Grooming details updated successfully")
      } else {
        const res = await apiPost<ApiGroomingSession>("/api/services-extension/grooming-sessions", payload)
        setGroomingSessionId(res.data.id)
        toast.success("Grooming details saved successfully")
      }
      closeGroomingDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save grooming details")
    } finally {
      setDetailSaving(false)
    }
  }

  const handleExportLedger = () => {
    if (!filteredLedger.length) return
    const csv = [
      ["Pet", "Client", "Date", "Time", "Status", "Reason", "Veterinarian"],
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
    link.download = `Grooming_Ledger_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const heroMetrics = [
    {
      label: "Grooming requests",
      value: formatNumber(totalGroomingAppointments),
      hint: `${formatNumber(upcomingGroomingCount)} upcoming`,
      gradient: "from-[#0f172a] via-[#312e81] to-[#f472b6]",
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
      label: "Completed · 7 days",
      value: formatNumber(completedLast7Days),
      hint: `${formatNumber(filteredLedger.filter((appt) => appt.status === "Completed").length)} ledger rows`,
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
    { label: "Inactive packages", value: inactiveCount, accent: "text-amber-500" },
  ]

  return (
    <div className="space-y-6">
      <PageTitle title="Grooming Service Console" subtitle="Curate packages, add-ons, and keep the appointment runway clean" />

      <Card className="brand-card brand-card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#0f172a] via-[#1f3270] to-[#ec4899] p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Pet spa command</p>
                <h2 className="text-3xl font-bold">Neon grooming console</h2>
                <p className="text-sm text-white/80">
                  Mirror the cat boarding cockpit with hero KPIs, curated actions, and ledger-ready exports in one glance.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <Badge className="brand-pill border border-white/30 bg-white/10 text-white">
                  {packages.length ? `${packages.length} packages` : "No packages"}
                </Badge>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={openAddPackage} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white">
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
                Search grooming ledger rows, tighten by status or timeline, refresh source data, or drop CSVs inline.
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
              <p className="text-xs text-muted-foreground">Live grooming catalog</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Grooming Packages</CardTitle>
            <CardDescription>Manage price tiers and runtime expectations.</CardDescription>
          </div>
          <Button className="rounded-2xl" onClick={openAddPackage}>
            <Plus className="h-4 w-4 mr-2" /> Add Package
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {packages.map((pkg) => (
            <div key={pkg.id} className={`rounded-2xl border p-4 ${!pkg.active ? "bg-muted/40" : "bg-background"}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">{pkg.name}</h3>
                    {!pkg.active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                  <p className="text-2xl font-bold text-primary my-1">{pkg.price}</p>
                  <p className="text-sm text-muted-foreground">{pkg.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Duration: {pkg.duration}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => toggleActive(pkg.id)}>
                    {pkg.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => openEditPackage(pkg)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-2xl text-rose-600" onClick={() => deletePackage(pkg.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">Grooming ledger</CardTitle>
            <CardDescription>Appointments filtered directly from the master schedule.</CardDescription>
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
                    <TableHead>Veterinarian</TableHead>
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
                      <TableCell>
                        <p className="text-sm text-foreground">{appt.date || "Date TBD"}</p>
                        <p className="text-xs text-muted-foreground">{appt.time || "—"}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{appt.reason || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_BADGE_STYLES[appt.status]} border`}>{appt.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{appt.doctor}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openGroomingDetail(appt)} className="rounded-2xl">
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No grooming appointments match the filters.</p>
          )}
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <CardTitle>Grooming Appointments</CardTitle>
          <CardDescription>Live data filtered from the appointment list</CardDescription>
        </CardHeader>
        <CardContent>
          {appointmentError && <p className="mb-3 text-sm text-red-600">{appointmentError}</p>}
          {appointmentLoading ? (
            <p className="text-sm text-gray-600">Loading appointment data...</p>
          ) : recentGroomingAppointments.length ? (
            <div className="space-y-3 max-h-105 overflow-y-auto pr-1">
              {recentGroomingAppointments.map((appt) => (
                <div key={appt.id} className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{appt.pet}</p>
                      <p className="text-sm text-gray-600">{appt.client}</p>
                    </div>
                    <Badge className={`${STATUS_BADGE_STYLES[appt.status]} border`}>{appt.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                    <span>{appt.date || "Date TBD"}</span>
                    {appt.time && <span>{appt.time}</span>}
                    <span>{appt.doctor}</span>
                  </div>
                  {appt.reason && (
                    <Badge
                      variant="secondary"
                      className={
                        isGroomingReason(appt.reason)
                          ? "bg-pink-50 text-pink-700 border-pink-200"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }
                    >
                      {appt.reason}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No grooming-specific appointments available yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Additional services</CardTitle>
            <CardDescription>Manage add-on services and pricing</CardDescription>
          </div>
          <Button onClick={openAddService} className="rounded-2xl">
            <Plus className="h-4 w-4 mr-2" /> Add Service
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {additionalServices.map((service) => (
                  <TableRow key={service.id} className="transition hover:bg-muted/40">
                    <TableCell className="font-medium text-foreground">{service.name}</TableCell>
                    <TableCell className="font-semibold text-primary">{service.price}</TableCell>
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
          <CardTitle>Grooming Statistics</CardTitle>
          <CardDescription>Service performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-gray-600 text-sm mb-1">Most Popular Package</p>
              <p className="text-lg font-semibold">Deluxe Grooming Package</p>
              <p className="text-sm text-gray-500 mt-2">45 bookings this month</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-gray-600 text-sm mb-1">Average Service Duration</p>
              <p className="text-lg font-semibold">2.5 hours</p>
              <p className="text-sm text-gray-500 mt-2">Across all packages</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-gray-600 text-sm mb-1">Customer Satisfaction</p>
              <p className="text-lg font-semibold">4.8 / 5.0</p>
              <p className="text-sm text-gray-500 mt-2">Based on 92 reviews</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button variant="outline" className="rounded-2xl">
          Cancel
        </Button>
        <Button className="rounded-2xl bg-[#1f3270] text-white hover:bg-[#0f172a]">
          Save Changes
        </Button>
      </div>

      {/* Package Modal */}
      {showPackageModal && (
        <div className="fixed inset-0 bg-white/5 backdrop-blur-md flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b-2 bg-linear-to-r from-blue-50 to-blue-100">
              <div>
                <CardTitle className="text-2xl font-bold text-blue-900">
                  {editingPackage ? "✏️ Edit Package" : "➕ Add New Package"}
                </CardTitle>
                <CardDescription className="text-blue-700 mt-1">
                  {editingPackage ? "Update package details" : "Create a new grooming package"}
                </CardDescription>
              </div>
              <button 
                onClick={() => setShowPackageModal(false)}
                className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full p-2 transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Package Name *</label>
                  <input
                    type="text"
                    value={formPackage.name}
                    onChange={(e) => setFormPackage({...formPackage, name: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="e.g., Basic Bath Package"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Price Range *</label>
                  <input
                    type="text"
                    value={formPackage.price}
                    onChange={(e) => setFormPackage({...formPackage, price: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="e.g., Rs. 14,850 - Rs. 21,450"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Description *</label>
                <textarea
                  value={formPackage.description}
                  onChange={(e) => setFormPackage({...formPackage, description: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  rows={3}
                  placeholder="Describe what's included in this package..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Duration *</label>
                  <input
                    type="text"
                    value={formPackage.duration}
                    onChange={(e) => setFormPackage({...formPackage, duration: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="e.g., 1-2 hours"
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-2.5 w-full hover:bg-blue-50 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPackage.active}
                      onChange={(e) => setFormPackage({...formPackage, active: e.target.checked})}
                      className="w-5 h-5 accent-blue-600 cursor-pointer"
                      id="active-check"
                    />
                    <label htmlFor="active-check" className="text-sm font-semibold text-gray-700 ml-2 cursor-pointer">
                      Active Package
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-6 border-t-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPackageModal(false)}
                  className="px-6 py-2.5 border-2 hover:bg-gray-100 font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 font-semibold shadow-lg" 
                  onClick={savePackage}
                >
                  {editingPackage ? "Update Package" : "Create Package"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-white/5 backdrop-blur-md flex items-center justify-center z-50">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b-2 bg-linear-to-r from-green-50 to-green-100">
              <div>
                <CardTitle className="text-2xl font-bold text-green-900">
                  {editingService ? "✏️ Edit Service" : "➕ Add New Service"}
                </CardTitle>
                <CardDescription className="text-green-700 mt-1">
                  {editingService ? "Update service details" : "Add an additional service"}
                </CardDescription>
              </div>
              <button
                onClick={() => setShowServiceModal(false)}
                className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full p-2 transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Service Name *</label>
                <input
                  type="text"
                  value={formService.name}
                  onChange={(e) => setFormService({...formService, name: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  placeholder="e.g., Aromatherapy treatment"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Price *</label>
                <input
                  type="text"
                  value={formService.price}
                  onChange={(e) => setFormService({...formService, price: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  placeholder="e.g., Rs. 3,300 - Rs. 4,950"
                />
              </div>
              <div className="flex gap-3 justify-end pt-6 border-t-2">
                <Button
                  variant="outline"
                  onClick={() => setShowServiceModal(false)}
                  className="px-6 py-2.5 border-2 hover:bg-gray-100 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2.5 font-semibold shadow-lg"
                  onClick={saveService}
                >
                  {editingService ? "Update Service" : "Add Service"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grooming Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Grooming session checklist</CardTitle>
                <CardDescription>
                  {selectedAppointment.pet} · {selectedAppointment.client}
                </CardDescription>
              </div>
              <button className="text-2xl text-muted-foreground hover:text-foreground" onClick={closeGroomingDetail}>
                ✕
              </button>
            </CardHeader>
            <CardContent className="space-y-6">
              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <Loader />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label>Coat condition</Label>
                      <Select
                        value={detailForm.coatCondition}
                        onValueChange={(value) => updateDetailField("coatCondition", value)}
                      >
                        <SelectTrigger className="mt-2 rounded-2xl">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Excellent">Excellent</SelectItem>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Fair">Fair</SelectItem>
                          <SelectItem value="Poor">Poor</SelectItem>
                          <SelectItem value="Matted">Matted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Grooming type</Label>
                      <Select
                        value={detailForm.groomingType}
                        onValueChange={(value) => updateDetailField("groomingType", value)}
                      >
                        <SelectTrigger className="mt-2 rounded-2xl">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Basic Bath">Basic Bath</SelectItem>
                          <SelectItem value="Full Grooming">Full Grooming</SelectItem>
                          <SelectItem value="De-shedding">De-shedding</SelectItem>
                          <SelectItem value="Breed Cut">Breed Cut</SelectItem>
                          <SelectItem value="Lion Cut">Lion Cut</SelectItem>
                          <SelectItem value="Puppy Cut">Puppy Cut</SelectItem>
                          <SelectItem value="Sanitary Trim">Sanitary Trim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Skin issues</Label>
                      <textarea
                        className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                        rows={3}
                        placeholder="Note any skin issues, allergies, or sensitivities"
                        value={detailForm.skinIssues}
                        onChange={(e) => updateDetailField("skinIssues", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Services performed</Label>
                      <textarea
                        className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                        rows={3}
                        placeholder="Bath, nail trim, ear cleaning, etc."
                        value={detailForm.servicesPerformed}
                        onChange={(e) => updateDetailField("servicesPerformed", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Products used</Label>
                      <textarea
                        className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                        rows={3}
                        placeholder="Shampoo, conditioner, flea treatment, etc."
                        value={detailForm.productsUsed}
                        onChange={(e) => updateDetailField("productsUsed", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Next grooming date</Label>
                      <Input
                        type="date"
                        value={detailForm.nextGroomingDate}
                        onChange={(e) => updateDetailField("nextGroomingDate", e.target.value)}
                        className="mt-2 rounded-2xl"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Special instructions</Label>
                    <textarea
                      className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                      rows={3}
                      placeholder="Handle with care, sensitive areas, preferences, etc."
                      value={detailForm.specialInstructions}
                      onChange={(e) => updateDetailField("specialInstructions", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <textarea
                      className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                      rows={3}
                      placeholder="Additional notes or observations"
                      value={detailForm.notes}
                      onChange={(e) => updateDetailField("notes", e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={closeGroomingDetail} className="rounded-2xl">
                      Cancel
                    </Button>
                    <Button onClick={saveGroomingDetail} disabled={detailSaving} className="rounded-2xl bg-[#0f172a] text-white">
                      {detailSaving ? "Saving…" : "Save details"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
