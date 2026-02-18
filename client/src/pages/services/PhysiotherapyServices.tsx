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
  Activity,
  ClipboardCheck,
  Download,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  FileText,
  Plus,
  RefreshCcw,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react"
import { apiDelete, apiGet } from "@/lib/api"
import { useToast } from "@/components/common/Toast"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"

interface TherapyPackage {
  id: number
  name: string
  price: string
  description: string
  duration: string
  focus: string
  active: boolean
}

interface AddonSupport {
  id: number
  name: string
  price: string
  description: string
}

type AppointmentStatus = "Scheduled" | "Completed" | "Cancelled" | "No-Show"

interface ApiAppointment {
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

interface TherapySession {
  id: string
  date: string
  time: string
  client: string
  pet: string
  reason: string
  doctor: string
  status: AppointmentStatus
}

type SessionDetail = {
  assessmentSummary: string
  modalitiesApplied: string
  homeExercisePlan: string
  followUpDate: string
  precautions: string
  goalsProgress: string
  assessmentComplete: boolean
  painScaleCaptured: boolean
  rangeRecorded: boolean
  ownerTrained: boolean
}

type SessionChecklistKey = keyof Pick<
  SessionDetail,
  "assessmentComplete" | "painScaleCaptured" | "rangeRecorded" | "ownerTrained"
>

interface SessionHistoryEntry {
  sessionId: string
  session: TherapySession
  detail: SessionDetail
  updatedAt: number
}

const THERAPY_KEYWORDS = ["physio", "therapy", "rehab", "mobility", "hydro", "laser", "treadmill", "range"]

const SESSION_STATUS_BADGE: Record<AppointmentStatus, string> = {
  Scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  "No-Show": "bg-rose-50 text-rose-600 border-rose-200",
}

const SESSION_CHECKS: Array<{ key: SessionChecklistKey; label: string }> = [
  { key: "assessmentComplete", label: "Assessment logged" },
  { key: "painScaleCaptured", label: "Pain scale documented" },
  { key: "rangeRecorded", label: "ROM recorded" },
  { key: "ownerTrained", label: "Home care trained" },
]

const normalizeDate = (value?: string | null) => {
  if (!value) return ""
  return value.length >= 10 ? value.slice(0, 10) : value
}

const formatNumber = (value: number) => value.toLocaleString("en-LK")

const mapSession = (api: ApiAppointment): TherapySession => ({
  id: String(api.id),
  date: normalizeDate(api.date),
  time: api.time || "",
  client: api.client_name || api.client_code || "Walk-in",
  pet: api.pet_name || "Unassigned",
  reason: api.reason || "",
  doctor: api.doctor || "Unassigned",
  status: (api.status || "Scheduled") as AppointmentStatus,
})

const sessionTimestamp = (session: TherapySession) => {
  if (!session.date) return null
  const iso = `${session.date}T${session.time || "00:00"}`
  const value = Date.parse(iso)
  return Number.isNaN(value) ? null : value
}

const createDefaultDetail = (): SessionDetail => ({
  assessmentSummary: "",
  modalitiesApplied: "",
  homeExercisePlan: "",
  followUpDate: "",
  precautions: "",
  goalsProgress: "",
  assessmentComplete: false,
  painScaleCaptured: false,
  rangeRecorded: false,
  ownerTrained: false,
})

export default function PhysiotherapyServices() {
  const toast = useToast()
  const [deletePackageId, setDeletePackageId] = useState<number | null>(null)
  const [deleteServiceId, setDeleteServiceId] = useState<number | null>(null)
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)

  const [packages, setPackages] = useState<TherapyPackage[]>([
    {
      id: 1,
      name: "Mobility Reset",
      price: "Rs. 32,000",
      description: "6-session plan for orthopedic recoveries with laser and assisted ROM",
      duration: "3 weeks",
      focus: "Post-op rehab",
      active: true,
    },
    {
      id: 2,
      name: "Hydro Performance",
      price: "Rs. 44,500",
      description: "Underwater treadmill conditioning plus core strengthening",
      duration: "4 weeks",
      focus: "Sports medicine",
      active: true,
    },
    {
      id: 3,
      name: "Senior Comfort",
      price: "Rs. 27,500",
      description: "Pain modulation, massage, and joint support for geriatric pets",
      duration: "Monthly retainer",
      focus: "Chronic care",
      active: true,
    },
  ])

  const [supportServices, setSupportServices] = useState<AddonSupport[]>([
    { id: 1, name: "Laser therapy boost", price: "Rs. 6,800", description: "Add 12W laser pass to any visit" },
    { id: 2, name: "Custom home kit", price: "Rs. 9,900", description: "Thera-band set, wobble board, ice packs" },
    { id: 3, name: "Tele-coaching", price: "Rs. 4,200", description: "Weekly video check-in with therapist" },
  ])

  const [showPackageModal, setShowPackageModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<TherapyPackage | null>(null)
  const [editingService, setEditingService] = useState<AddonSupport | null>(null)
  const [packageForm, setPackageForm] = useState<TherapyPackage>({
    id: 0,
    name: "",
    price: "",
    description: "",
    duration: "",
    focus: "",
    active: true,
  })
  const [serviceForm, setServiceForm] = useState<AddonSupport>({ id: 0, name: "", price: "", description: "" })

  const [sessions, setSessions] = useState<TherapySession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState("")
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "All">("All")
  const [dateFilter, setDateFilter] = useState<"all" | "upcoming" | "past">("all")

  const [selectedSession, setSelectedSession] = useState<TherapySession | null>(null)
  const [detailForm, setDetailForm] = useState<SessionDetail>(createDefaultDetail())
  const [detailSaving, setDetailSaving] = useState(false)
  const [sessionDetails, setSessionDetails] = useState<Record<string, SessionDetail>>({})
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryEntry[]>([])

  const therapyKeywords = useMemo(() => THERAPY_KEYWORDS.map((keyword) => keyword.toLowerCase()), [])

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true)
    setSessionsError("")
    try {
      const response = await apiGet<ApiAppointment[]>("/api/appointments?page=1&limit=500")
      const mapped = response.data.map(mapSession)
      const filtered = mapped.filter((session) => {
        const reason = session.reason.toLowerCase()
        return therapyKeywords.some((keyword) => reason.includes(keyword))
      })
      setSessions(filtered)
    } catch (error) {
      setSessionsError(error instanceof Error ? error.message : "Failed to load physiotherapy sessions")
    } finally {
      setSessionsLoading(false)
    }
  }, [therapyKeywords])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const totalSessions = sessions.length

  const upcomingSessions = useMemo(() => {
    const now = Date.now()
    return sessions.filter((session) => {
      const ts = sessionTimestamp(session)
      return ts !== null && ts >= now
    }).length
  }, [sessions])

  const completedThisWeek = useMemo(() => {
    const now = Date.now()
    const threshold = now - 7 * 24 * 60 * 60 * 1000
    return sessions.filter((session) => {
      const ts = sessionTimestamp(session)
      return ts !== null && session.status === "Completed" && ts >= threshold
    }).length
  }, [sessions])

  const activeProtocols = useMemo(() => packages.filter((pkg) => pkg.active).length, [packages])

  const filteredSessions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const now = Date.now()

    return sessions
      .filter((session) => {
        const matchesStatus = statusFilter === "All" || session.status === statusFilter
        const matchesSearch =
          !normalizedSearch ||
          [session.pet, session.client, session.reason, session.doctor]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedSearch))
        const ts = sessionTimestamp(session)
        const matchesDate =
          dateFilter === "all" ||
          (dateFilter === "upcoming" ? ts !== null && ts >= now : ts !== null && ts < now)

        return matchesStatus && matchesSearch && matchesDate
      })
      .sort((a, b) => {
        const aTime = sessionTimestamp(a)
        const bTime = sessionTimestamp(b)
        if (aTime === bTime) return 0
        if (aTime === null) return 1
        if (bTime === null) return -1
        return aTime - bTime
      })
  }, [sessions, searchTerm, statusFilter, dateFilter])

  const heroMetrics = [
    {
      label: "Active care plans",
      value: formatNumber(totalSessions),
      hint: `${upcomingSessions} scheduled next`,
      accent: "from-[#0f172a] to-[#2563eb]",
      icon: Activity,
    },
    {
      label: "Completed (7d)",
      value: formatNumber(completedThisWeek),
      hint: "Discharges this week",
      accent: "from-[#065f46] to-[#10b981]",
      icon: ClipboardCheck,
    },
    {
      label: "Protocols live",
      value: formatNumber(activeProtocols),
      hint: "Bundled offerings",
      accent: "from-[#7c2d12] to-[#f97316]",
      icon: Stethoscope,
    },
  ]

  const highlightStats = [
    { label: "Avg weekly caseload", value: "22 pets", accent: "text-indigo-600" },
    { label: "Plan adherence", value: "93%", accent: "text-emerald-600" },
    { label: "Hydro treadmill hours", value: "48 h", accent: "text-sky-600" },
  ]

  const rehabPlaybooks = [
    {
      title: "Neurologic reboot",
      steps: ["Assisted standing", "Bicycle ROM", "Balance disc"],
      signal: "text-purple-600",
    },
    {
      title: "Shoulder stabilization",
      steps: ["Cavaletti", "Thera-band rows", "Stretch & ice"],
      signal: "text-amber-600",
    },
    {
      title: "Weight loss boost",
      steps: ["Hydro walk", "Core ladder", "Owner homework"],
      signal: "text-rose-600",
    },
  ]

  const openPackageModal = (pkg?: TherapyPackage) => {
    if (pkg) {
      setEditingPackage(pkg)
      setPackageForm(pkg)
    } else {
      setEditingPackage(null)
      setPackageForm({
        id: Math.max(0, ...packages.map((packageItem) => packageItem.id)) + 1,
        name: "",
        price: "",
        description: "",
        duration: "",
        focus: "",
        active: true,
      })
    }
    setShowPackageModal(true)
  }

  const openServiceModal = (service?: AddonSupport) => {
    if (service) {
      setEditingService(service)
      setServiceForm(service)
    } else {
      setEditingService(null)
      setServiceForm({
        id: Math.max(0, ...supportServices.map((support) => support.id)) + 1,
        name: "",
        price: "",
        description: "",
      })
    }
    setShowServiceModal(true)
  }

  const savePackage = () => {
    if (!packageForm.name || !packageForm.price || !packageForm.description || !packageForm.duration || !packageForm.focus) {
      toast.warning("Please complete every package field")
      return
    }
    if (editingPackage) {
      setPackages((prev) => prev.map((pkg) => (pkg.id === packageForm.id ? packageForm : pkg)))
    } else {
      setPackages((prev) => [...prev, packageForm])
    }
    setShowPackageModal(false)
  }

  const saveService = () => {
    if (!serviceForm.name || !serviceForm.price || !serviceForm.description) {
      toast.warning("Please complete every add-on field")
      return
    }
    if (editingService) {
      setSupportServices((prev) => prev.map((svc) => (svc.id === serviceForm.id ? serviceForm : svc)))
    } else {
      setSupportServices((prev) => [...prev, serviceForm])
    }
    setShowServiceModal(false)
  }

  const togglePackageActive = (id: number) => {
    setPackages((prev) => prev.map((pkg) => (pkg.id === id ? { ...pkg, active: !pkg.active } : pkg)))
  }

  const handleDeletePackageClick = (id: number) => {
    setDeletePackageId(id)
  }

  const handleDeletePackageConfirm = () => {
    if (deletePackageId === null) return
    setPackages((prev) => prev.filter((pkg) => pkg.id !== deletePackageId))
    toast.success("Protocol deleted successfully")
    setDeletePackageId(null)
  }

  const handleDeleteServiceClick = (id: number) => {
    setDeleteServiceId(id)
  }

  const handleDeleteServiceConfirm = () => {
    if (deleteServiceId === null) return
    setSupportServices((prev) => prev.filter((service) => service.id !== deleteServiceId))
    toast.success("Add-on deleted successfully")
    setDeleteServiceId(null)
  }

  const openSessionDetail = (session: TherapySession) => {
    setSelectedSession(session)
    setDetailForm(sessionDetails[session.id] ?? createDefaultDetail())
  }

  const closeSessionDetail = () => {
    setSelectedSession(null)
    setDetailForm(createDefaultDetail())
    setDetailSaving(false)
  }

  const updateDetailField = <K extends keyof SessionDetail>(key: K, value: SessionDetail[K]) => {
    setDetailForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveDetail = () => {
    if (!selectedSession) return
    setDetailSaving(true)
    setSessionDetails((prev) => ({ ...prev, [selectedSession.id]: detailForm }))
    setSessionHistory((prev) => {
      const entry: SessionHistoryEntry = {
        sessionId: selectedSession.id,
        session: selectedSession,
        detail: detailForm,
        updatedAt: Date.now(),
      }
      const index = prev.findIndex((item) => item.sessionId === selectedSession.id)
      if (index === -1) {
        return [entry, ...prev]
      }
      const clone = [...prev]
      clone[index] = entry
      return clone
    })
    setTimeout(() => {
      setDetailSaving(false)
      closeSessionDetail()
    }, 250)
  }

  const handleDeleteSessionClick = (sessionId: string) => {
    setDeleteSessionId(sessionId)
  }

  const handleDeleteSessionConfirm = async () => {
    if (!deleteSessionId) return
    setDeletePendingId(deleteSessionId)
    try {
      await apiDelete(`/api/appointments/${deleteSessionId}`)
      setSessions((prev) => prev.filter((session) => session.id !== deleteSessionId))
      setSessionDetails((prev) => {
        if (!prev[deleteSessionId]) return prev
        const next = { ...prev }
        delete next[deleteSessionId]
        return next
      })
      setSessionHistory((prev) => prev.filter((entry) => entry.sessionId !== deleteSessionId))
      toast.success("Session deleted successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete session")
    } finally {
      setDeletePendingId(null)
      setDeleteSessionId(null)
    }
  }

  const handleExportLedger = () => {
    if (!filteredSessions.length) return
    const headers = ["Pet", "Client", "Date", "Time", "Reason", "Doctor", "Status"]
    const rows = filteredSessions.map((session) => [
      session.pet,
      session.client,
      session.date || "",
      session.time || "",
      session.reason,
      session.doctor,
      session.status,
    ])
    const csv = [headers.join(","), ...rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `physiotherapy-ledger-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const resetFilters = () => {
    setStatusFilter("All")
    setDateFilter("all")
    setSearchTerm("")
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Physiotherapy Services"
        subtitle="Mirror the cat boarding interface with rehab-focused tiles, filters, ledgers, and coaching overlays."
      />

      <Card className="brand-card brand-card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#0f172a] via-[#1d2671] to-[#5c1ac3] p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Rehab control room</p>
                <h2 className="text-3xl font-bold">Therapy & recovery deck</h2>
                <p className="text-sm text-white/80">
                  Cat boarding style hero piping physiotherapy metrics, live protocols, and add-on actions.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <Badge className="brand-pill border border-white/30 bg-white/10 text-white">
                  {activeProtocols ? `${activeProtocols} active protocols` : "No active protocols"}
                </Badge>
                <div className="flex gap-2">
                  <Button onClick={() => openPackageModal()} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white">
                    <Plus className="mr-2 h-4 w-4" /> New protocol
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openServiceModal()}
                    className="rounded-2xl border-white/60 text-white hover:bg-white/10"
                  >
                    <Sparkles className="mr-2 h-4 w-4" /> Add-on
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            {heroMetrics.map(({ label, value, hint, accent, icon: Icon }) => (
              <div key={label} className={`rounded-2xl border border-white/10 bg-linear-to-br ${accent} p-4 text-white shadow-lg`}>
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
                Cat boarding grade filters tuned for physiotherapy ledgers with status, timeframe, and CSV drops.
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
                  <SelectValue placeholder="All" />
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
                  <SelectItem value="all">All sessions</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Completed & past</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <Button variant="outline" onClick={resetFilters} className="h-11 rounded-2xl border-dashed">
                Reset filters
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchSessions} className="flex-1 h-11 rounded-2xl">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button
                  onClick={handleExportLedger}
                  disabled={!filteredSessions.length}
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
              <p className="text-xs text-muted-foreground">Live rehab signal</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">Protocols</CardTitle>
            <CardDescription>Tiered packages mirrored from cat boarding interactions.</CardDescription>
          </div>
          <Button onClick={() => openPackageModal()} className="rounded-2xl">
            <Plus className="mr-2 h-4 w-4" /> Add protocol
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
                    <p className="text-xs text-muted-foreground">{pkg.duration} · {pkg.focus}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => togglePackageActive(pkg.id)}
                      className="h-9 w-9 rounded-2xl"
                      title={pkg.active ? "Deactivate" : "Activate"}
                    >
                      {pkg.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => openPackageModal(pkg)} className="h-9 w-9 rounded-2xl">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleDeletePackageClick(pkg.id)}
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
              <CardTitle>Add-on services</CardTitle>
              <CardDescription>Mirrors cat boarding add-on manager.</CardDescription>
            </div>
            <Button onClick={() => openServiceModal()} className="rounded-2xl">
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
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportServices.map((service) => (
                    <TableRow key={service.id} className="transition hover:bg-muted/40">
                      <TableCell className="font-medium text-foreground">{service.name}</TableCell>
                      <TableCell className="font-semibold text-purple-600">{service.price}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{service.description}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="outline" onClick={() => openServiceModal(service)} className="h-9 w-9 rounded-2xl">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleDeleteServiceClick(service.id)}
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
            <CardTitle>Rehab playbooks</CardTitle>
            <CardDescription>Quick combos surfaced for therapists.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rehabPlaybooks.map((playbook) => (
              <div key={playbook.title} className="rounded-2xl border border-dashed border-muted-foreground/30 p-4">
                <p className={`text-xs uppercase tracking-wide ${playbook.signal}`}>{playbook.title}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {playbook.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">Therapy ledger</CardTitle>
            <CardDescription>Cat boarding style ledger filtered to physiotherapy keywords.</CardDescription>
          </div>
          <Button onClick={handleExportLedger} disabled={!filteredSessions.length} className="rounded-2xl">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {sessionsError && <p className="px-6 pt-4 text-sm text-rose-600">{sessionsError}</p>}
          {sessionsLoading ? (
            <div className="flex justify-center py-12">
              <Loader />
            </div>
          ) : filteredSessions.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pet · Client</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Therapist</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id} className="transition hover:bg-muted/40">
                      <TableCell>
                        <p className="font-semibold text-foreground">{session.pet}</p>
                        <p className="text-xs text-muted-foreground">{session.client}</p>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        <div className="space-y-0.5">
                          <p>{session.date || "Date TBD"}</p>
                          <p className="text-xs text-muted-foreground">{session.time || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{session.reason || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`${SESSION_STATUS_BADGE[session.status]} border`}>{session.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{session.doctor}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openSessionDetail(session)} className="rounded-2xl">
                            Manage
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-2xl text-rose-600 hover:text-rose-700"
                            disabled={deletePendingId === session.id}
                            onClick={() => handleDeleteSessionClick(session.id)}
                          >
                            {deletePendingId === session.id ? "Deleting…" : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No physiotherapy-focused appointments found.</p>
          )}
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <CardTitle>Session history</CardTitle>
          <CardDescription>Saved rehab checklists, exactly like the cat board.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionHistory.length ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {sessionHistory.map(({ sessionId, session, detail }) => {
                const completedChecks = SESSION_CHECKS.filter(({ key }) => detail[key])
                return (
                  <div key={sessionId} className="rounded-2xl border border-indigo-100 bg-white shadow-sm transition hover:shadow-md">
                    <div className="space-y-3 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-foreground">{session.pet}</p>
                              <p className="text-sm text-muted-foreground">{session.client}</p>
                            </div>
                            <Badge className={`${SESSION_STATUS_BADGE[session.status]} border`}>{session.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(session.date || "Date TBD")} · {(session.time || "—")} · {session.doctor}
                          </p>
                          {session.reason && <p className="text-xs text-muted-foreground">Reason: {session.reason}</p>}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {completedChecks.length ? (
                          completedChecks.map(({ key, label }) => (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800"
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
                          <p className="text-xs uppercase text-gray-400">Assessment</p>
                          <p className={`mt-1 whitespace-pre-line ${detail.assessmentSummary ? "text-foreground" : "text-muted-foreground"}`}>
                            {detail.assessmentSummary || "Assessment pending"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-gray-400">Modalities</p>
                          <p className={`mt-1 whitespace-pre-line ${detail.modalitiesApplied ? "text-foreground" : "text-muted-foreground"}`}>
                            {detail.modalitiesApplied || "Not logged"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-gray-400">Home plan</p>
                          <p className={`mt-1 whitespace-pre-line ${detail.homeExercisePlan ? "text-foreground" : "text-muted-foreground"}`}>
                            {detail.homeExercisePlan || "Owner instructions pending"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t bg-indigo-50/60 px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openSessionDetail(session)} className="rounded-2xl">
                        Update
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Save a rehab checklist to populate history cards.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" className="rounded-2xl">
          Cancel
        </Button>
        <Button className="rounded-2xl bg-[#4338ca] text-white hover:bg-[#312e81]">Save changes</Button>
      </div>

      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Rehab session checklist</CardTitle>
                <CardDescription>
                  {selectedSession.pet} · {selectedSession.client}
                </CardDescription>
              </div>
              <button className="text-2xl text-muted-foreground hover:text-foreground" onClick={closeSessionDetail}>
                ✕
              </button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Assessment summary</Label>
                  <textarea
                    className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                    rows={3}
                    value={detailForm.assessmentSummary}
                    onChange={(event) => updateDetailField("assessmentSummary", event.target.value)}
                  />
                </div>
                <div>
                  <Label>Modalities used</Label>
                  <textarea
                    className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                    rows={3}
                    value={detailForm.modalitiesApplied}
                    onChange={(event) => updateDetailField("modalitiesApplied", event.target.value)}
                  />
                </div>
                <div>
                  <Label>Home exercise plan</Label>
                  <textarea
                    className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                    rows={3}
                    value={detailForm.homeExercisePlan}
                    onChange={(event) => updateDetailField("homeExercisePlan", event.target.value)}
                  />
                </div>
                <div>
                  <Label>Follow-up date</Label>
                  <Input
                    type="date"
                    value={detailForm.followUpDate}
                    onChange={(event) => updateDetailField("followUpDate", event.target.value)}
                    className="mt-2 rounded-2xl"
                  />
                </div>
                <div>
                  <Label>Precautions</Label>
                  <textarea
                    className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                    rows={3}
                    value={detailForm.precautions}
                    onChange={(event) => updateDetailField("precautions", event.target.value)}
                  />
                </div>
                <div>
                  <Label>Goals / progress notes</Label>
                  <textarea
                    className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                    rows={3}
                    value={detailForm.goalsProgress}
                    onChange={(event) => updateDetailField("goalsProgress", event.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {SESSION_CHECKS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 rounded-2xl border border-gray-200 p-3 text-sm font-semibold text-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={detailForm[key] as boolean}
                      onChange={(event) => updateDetailField(key, event.target.checked as SessionDetail[typeof key])}
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeSessionDetail} className="rounded-2xl">
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
            <CardHeader className="flex flex-row items-center justify-between border-b bg-linear-to-r from-indigo-50 to-purple-100 pb-4">
              <div>
                <CardTitle className="text-2xl font-bold text-indigo-900">
                  {editingPackage ? "✏️ Edit protocol" : "➕ Add new protocol"}
                </CardTitle>
                <CardDescription className="text-indigo-700">
                  {editingPackage ? "Update protocol details" : "Create a new physiotherapy bundle"}
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
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Protocol name *</Label>
                  <Input
                    value={packageForm.name}
                    onChange={(event) => setPackageForm({ ...packageForm, name: event.target.value })}
                    placeholder="e.g., Mobility Reset"
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Price *</Label>
                  <Input
                    value={packageForm.price}
                    onChange={(event) => setPackageForm({ ...packageForm, price: event.target.value })}
                    placeholder="e.g., Rs. 32,000"
                    className="rounded-2xl"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold text-gray-700">Description *</Label>
                <textarea
                  value={packageForm.description}
                  onChange={(event) => setPackageForm({ ...packageForm, description: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 p-3 text-sm"
                  rows={3}
                  placeholder="Describe what's included in this protocol..."
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Duration *</Label>
                  <Input
                    value={packageForm.duration}
                    onChange={(event) => setPackageForm({ ...packageForm, duration: event.target.value })}
                    placeholder="e.g., 4 weeks"
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Focus area *</Label>
                  <Input
                    value={packageForm.focus}
                    onChange={(event) => setPackageForm({ ...packageForm, focus: event.target.value })}
                    placeholder="e.g., Sports medicine"
                    className="rounded-2xl"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-foreground">
                <span>Active protocol</span>
                <input
                  type="checkbox"
                  checked={packageForm.active}
                  onChange={(event) => setPackageForm({ ...packageForm, active: event.target.checked })}
                  className="h-4 w-4"
                />
              </div>
              <div className="flex justify-end gap-3 border-t pt-6">
                <Button variant="outline" onClick={() => setShowPackageModal(false)} className="rounded-2xl">
                  Cancel
                </Button>
                <Button className="rounded-2xl bg-linear-to-r from-purple-600 to-purple-700 text-white" onClick={savePackage}>
                  {editingPackage ? "Update protocol" : "Create protocol"}
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
                  {editingService ? "✏️ Edit add-on" : "➕ Add new add-on"}
                </CardTitle>
                <CardDescription className="text-pink-700">
                  {editingService ? "Update add-on details" : "Add an additional service"}
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
                <Label className="mb-2 block text-sm font-semibold text-gray-700">Add-on name *</Label>
                <Input
                  value={serviceForm.name}
                  onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })}
                  placeholder="e.g., Laser therapy"
                  className="rounded-2xl"
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold text-gray-700">Price *</Label>
                <Input
                  value={serviceForm.price}
                  onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })}
                  placeholder="e.g., Rs. 6,800"
                  className="rounded-2xl"
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold text-gray-700">Description *</Label>
                <textarea
                  value={serviceForm.description}
                  onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 p-3 text-sm"
                  rows={3}
                  placeholder="What does this add-on cover?"
                />
              </div>
              <div className="flex justify-end gap-3 border-t pt-6">
                <Button variant="outline" onClick={() => setShowServiceModal(false)} className="rounded-2xl">
                  Cancel
                </Button>
                <Button className="rounded-2xl bg-linear-to-r from-pink-600 to-pink-700 text-white" onClick={saveService}>
                  {editingService ? "Update add-on" : "Create add-on"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deletePackageId !== null}
        onOpenChange={(open) => !open && setDeletePackageId(null)}
        title="Delete Protocol"
        description="Are you sure you want to delete this physiotherapy protocol? This action cannot be undone."
        onConfirm={handleDeletePackageConfirm}
        variant="danger"
      />

      <ConfirmDialog
        open={deleteServiceId !== null}
        onOpenChange={(open) => !open && setDeleteServiceId(null)}
        title="Delete Add-on"
        description="Are you sure you want to delete this add-on service? This action cannot be undone."
        onConfirm={handleDeleteServiceConfirm}
        variant="danger"
      />

      <ConfirmDialog
        open={deleteSessionId !== null}
        onOpenChange={(open) => !open && setDeleteSessionId(null)}
        title="Delete Session"
        description="Are you sure you want to delete this therapy session? This action cannot be undone."
        onConfirm={handleDeleteSessionConfirm}
        variant="danger"
      />
    </div>
  )
}
