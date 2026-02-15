import type { ChangeEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api"
import type { Attachment } from "@/lib/attachments"
import {
  buildAttachmentDataUrl,
  cloneAttachments,
  formatFileSize,
  normalizeAttachments,
  readFileAsAttachment,
} from "@/lib/attachments"
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ListFilter,
  Search as SearchIcon,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react"

type Appointment = {
  id: string
  date: string
  time: string
  client: string
  clientId?: string
  pet: string
  petType: string
  age: string
  weight: string
  lastVisit: string
  doctor: string
  reason: string
  status: "Scheduled" | "Completed" | "Cancelled" | "No-Show"
  notes?: string
  attachments: Attachment[]
}

type ApiAppointment = {
  id: number
  date: string
  time: string
  client_id?: number | null
  client_name?: string
  client_code?: string | null
  pet_name?: string
  pet_type?: string
  age?: string
  weight?: string
  last_visit?: string
  doctor?: string
  reason?: string
  status?: "Scheduled" | "Completed" | "Cancelled" | "No-Show"
  notes?: string
  attachments?: unknown
}

type AppointmentSummary = {
  metrics: {
    total: number
    today: number
    upcoming: number
    completed: number
    scheduled: number
  }
  statuses: Array<{ status: string; count: number }>
  daily: Array<{ date: string; count: number }>
  doctors: Array<{ doctor: string; count: number }>
}

type ViewMode = "basic" | "professional" | "enhanced"

type FormState = Omit<Appointment, "id">

const normalizeDateString = (value?: string | null) => {
  if (!value) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear()
    const month = String(parsed.getMonth() + 1).padStart(2, "0")
    const day = String(parsed.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  return value.slice(0, 10)
}

const isGroomingReason = (value?: string | null) => {
  if (!value) return false
  return value.toLowerCase().includes("groom")
}

const formatReason = (value?: string | null) => {
  return value?.trim() || "Not specified"
}

const mapApiAppointment = (api: ApiAppointment, fallback?: FormState): Appointment => {
  return {
    id: String(api.id),
    date: normalizeDateString(api.date) || fallback?.date || "",
    time: api.time || fallback?.time || "",
    client: api.client_name || fallback?.client || "",
    clientId:
      api.client_code ||
      (api.client_id ? String(api.client_id) : fallback?.clientId || ""),
    pet: api.pet_name || fallback?.pet || "",
    petType: api.pet_type || fallback?.petType || "",
    age: api.age || fallback?.age || "",
    weight: api.weight || fallback?.weight || "",
    lastVisit: normalizeDateString(api.last_visit) || fallback?.lastVisit || "",
    doctor: api.doctor || fallback?.doctor || "",
    reason: api.reason || fallback?.reason || "",
    status: (api.status || fallback?.status || "Scheduled") as Appointment["status"],
    notes: api.notes ?? fallback?.notes ?? "",
    attachments: normalizeAttachments(api.attachments, fallback?.attachments),
  }
}

const toFormState = (appointment: Appointment): FormState => ({
  date: appointment.date,
  time: appointment.time,
  client: appointment.client,
  clientId: appointment.clientId || "",
  pet: appointment.pet,
  petType: appointment.petType,
  age: appointment.age,
  weight: appointment.weight,
  lastVisit: appointment.lastVisit,
  doctor: appointment.doctor,
  reason: appointment.reason,
  status: appointment.status,
  notes: appointment.notes || "",
  attachments: cloneAttachments(appointment.attachments),
})

const createEmptyForm = (): FormState => ({
  date: "",
  time: "",
  client: "",
  clientId: "",
  pet: "",
  petType: "",
  age: "",
  weight: "",
  lastVisit: "",
  doctor: "",
  reason: "",
  status: "Scheduled",
  notes: "",
  attachments: [],
})

const STATUS_STYLES: Record<Appointment["status"], string> = {
  Scheduled: "border-amber-200 bg-amber-50 text-amber-700",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Cancelled: "border-slate-200 bg-slate-50 text-slate-600",
  "No-Show": "border-rose-200 bg-rose-50 text-rose-700",
}

const getStatusTone = (status: Appointment["status"] | string) =>
  STATUS_STYLES[status as Appointment["status"]] || "border-slate-200 bg-slate-50 text-slate-600"

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string; description: string }> = [
  { value: "basic", label: "Roster", description: "Core schedule" },
  { value: "professional", label: "Vitals", description: "Add patient stats" },
  { value: "enhanced", label: "Insights", description: "Show notes" },
]

const VIEW_DESCRIPTIONS: Record<ViewMode, string> = {
  basic: "Lean roster table for quick triage.",
  professional: "Adds age, weight, and last visit context.",
  enhanced: "Surfaces notes for pre-visit prep.",
}

type MetricKey = keyof AppointmentSummary["metrics"]

const SUMMARY_METRIC_CONFIG: Array<{
  key: MetricKey
  label: string
  hint: string
  gradient: string
  icon: typeof CalendarClock
}> = [
  { key: "total", label: "Total Visits", hint: "Overall scheduled", gradient: "from-[#312e81] to-[#4338ca]", icon: CalendarClock },
  { key: "today", label: "Today", hint: "Same-day", gradient: "from-[#0f766e] to-[#14b8a6]", icon: Activity },
  { key: "upcoming", label: "Upcoming", hint: "Next 7 days", gradient: "from-[#a855f7] to-[#ec4899]", icon: Sparkles },
  { key: "scheduled", label: "Scheduled", hint: "Awaiting visit", gradient: "from-[#d97706] to-[#facc15]", icon: ClipboardList },
  { key: "completed", label: "Completed", hint: "Closed cases", gradient: "from-[#15803d] to-[#22c55e]", icon: CheckCircle2 },
]

export default function AppointmentListConsolidated() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [editingData, setEditingData] = useState<FormState>(createEmptyForm())
  const [editMode, setEditMode] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("All")
  const [filterDoctor, setFilterDoctor] = useState<string>("All")
  const [viewMode, setViewMode] = useState<ViewMode>("basic")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)
  const [summary, setSummary] = useState<AppointmentSummary | null>(null)
  const groomingVisitActive = isGroomingReason(editingData.reason)

  const normalizeSummary = (payload?: AppointmentSummary | null) => {
    if (!payload) return null
    return {
      ...payload,
      statuses: payload.statuses || [],
      daily: payload.daily || [],
      doctors: payload.doctors || [],
    }
  }

  async function loadAppointments() {
    setLoading(true)
    setError("")
    try {
      const [appointmentsRes, summaryRes] = await Promise.all([
        apiGet<ApiAppointment[]>("/api/appointments?page=1&limit=500"),
        apiGet<AppointmentSummary>("/api/appointments/summary"),
      ])
      const mapped: Appointment[] = appointmentsRes.data.map((a) => mapApiAppointment(a))
      setAppointments(mapped)
      setSummary(normalizeSummary(summaryRes.data))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load appointments")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  const doctors = ["All", ...new Set(appointments.map((a) => a.doctor).filter(Boolean))]
  const statuses = ["All", "Scheduled", "Completed", "Cancelled", "No-Show"]

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const matchesSearch =
        a.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.pet.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.clientId || "").toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = filterStatus === "All" || a.status === filterStatus
      const matchesDoctor = filterDoctor === "All" || a.doctor === filterDoctor

      return matchesSearch && matchesStatus && matchesDoctor
    })
  }, [appointments, searchTerm, filterStatus, filterDoctor])

  function openModal(a: Appointment) {
    setSelected({ ...a, attachments: cloneAttachments(a.attachments) })
    setEditingData(toFormState(a))
    setEditMode(false)
    setCreating(false)
  }

  function openCreate() {
    setSelected(null)
    setEditingData(createEmptyForm())
    setEditMode(true)
    setCreating(true)
  }

  function closeModal() {
    setSelected(null)
    setEditingData(createEmptyForm())
    setEditMode(false)
    setCreating(false)
  }

  async function saveChanges() {
    if (!editingData.client || !editingData.pet || !editingData.date || !editingData.time) {
      alert("Please fill required fields")
      return
    }

    const trimmedClientId = editingData.clientId?.trim()
    const parsedClientId =
      trimmedClientId && /^\d+$/.test(trimmedClientId) ? Number(trimmedClientId) : null
    const clientIdNum = parsedClientId !== null && parsedClientId > 0 ? parsedClientId : null
    const payload = {
      date: editingData.date,
      time: editingData.time,
      client_id: clientIdNum,
      client_code: trimmedClientId || null,
      client_name: editingData.client,
      pet_name: editingData.pet,
      pet_type: editingData.petType,
      age: editingData.age,
      weight: editingData.weight,
      last_visit: editingData.lastVisit,
      doctor: editingData.doctor,
      reason: editingData.reason,
      status: editingData.status,
      notes: editingData.notes,
      attachments: editingData.attachments || [],
    }

    try {
      if (creating) {
        const res = await apiPost<ApiAppointment>("/api/appointments", payload)
        const normalized = mapApiAppointment(res.data, editingData)
        setAppointments((prev) => [...prev, normalized])
      } else if (selected) {
        const res = await apiPatch<ApiAppointment>(`/api/appointments/${selected.id}`, payload)
        const normalized = mapApiAppointment(res.data, editingData)
        setAppointments((prev) => prev.map((a) => (a.id === selected.id ? normalized : a)))
      }
      await loadAppointments()
      closeModal()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save appointment")
    }
  }

  async function deleteAppointment(id: string) {
    if (!confirm("Delete this appointment?")) return
    try {
      await apiDelete(`/api/appointments/${id}`)
      closeModal()
      await loadAppointments()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete appointment")
    }
  }

  const openMedicalHistory = () => {
    if (!selected) return
    const targetId = selected.id
    navigate(targetId ? `/medical-history?appointmentId=${targetId}` : "/medical-history")
  }

  async function handleAttachmentUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!editMode && !creating) {
      event.target.value = ""
      return
    }

    const files = event.target.files
    if (!files?.length) return

    try {
      const uploads = await Promise.all(Array.from(files).map((file) => readFileAsAttachment(file)))
      setEditingData((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...uploads],
      }))
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to process attachments")
    } finally {
      event.target.value = ""
    }
  }

  function handleAttachmentRemove(index: number) {
    if (!editMode && !creating) return
    setEditingData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }))
  }

  const summaryMetrics = SUMMARY_METRIC_CONFIG.map((config) => ({
    ...config,
    value: summary?.metrics?.[config.key] ?? null,
  }))
  const statusBreakdown = summary?.statuses ?? []
  const doctorLeaders = (summary?.doctors ?? []).slice(0, 4)
  const upcomingWindow = (summary?.daily ?? []).slice(0, 5)
  const analyticsReady = Boolean(summary)
  const totalAppointments = appointments.length
  const showVitals = viewMode !== "basic"
  const showNotes = viewMode === "enhanced"
  const viewModeNote = VIEW_DESCRIPTIONS[viewMode]
  const formatMetricValue = (value: number | null) =>
    typeof value === "number" ? value.toLocaleString("en-LK") : "—"
  const resetFilters = () => {
    setSearchTerm("")
    setFilterStatus("All")
    setFilterDoctor("All")
    setViewMode("basic")
  }

  return (
    <>
      <PageTitle title="Appointments" />

      <Card className="brand-card brand-card-hover mb-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#0f172a] via-[#4338ca] to-[#db2777] p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Clinical operations</p>
                <h2 className="text-3xl font-bold">Appointments Intelligence Hub</h2>
                <p className="text-sm text-white/80">
                  Track load, team focus, and follow-up readiness with the same visual language as the refreshed Sales List.
                </p>
                {!analyticsReady && (
                  <p className="mt-2 text-xs text-white/70">Syncing analytics summary…</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <div className="rounded-3xl bg-white/15 px-5 py-3">
                  <p className="text-xs font-semibold text-white/70">Live roster</p>
                  <p className="text-3xl font-bold">{totalAppointments}</p>
                  <p className="text-xs text-white/80">records loaded</p>
                </div>
                <Button
                  onClick={openCreate}
                  className="rounded-2xl bg-white/90 px-6 py-2 text-[#4338ca] hover:bg-white"
                >
                  <ArrowUpRight className="mr-2 h-4 w-4" /> Book visit
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-6 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {summaryMetrics.map((metric) => {
                const Icon = metric.icon
                return (
                  <div
                    key={metric.key}
                    className={`relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br ${metric.gradient} p-4 text-white shadow-lg`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/70">{metric.label}</p>
                        <p className="mt-2 text-3xl font-bold">{formatMetricValue(metric.value)}</p>
                        <p className="text-xs text-white/80">{metric.hint}</p>
                      </div>
                      <span className="rounded-2xl bg-white/20 p-2">
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="brand-soft-panel rounded-2xl border border-border/40 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Status mix</p>
                    <h3 className="text-lg font-semibold text-foreground">Queue health</h3>
                  </div>
                  <Badge className="brand-pill bg-muted/50 text-xs font-semibold text-foreground">
                    {statusBreakdown.length || "—"}
                  </Badge>
                </div>
                {statusBreakdown.length ? (
                  <ul className="space-y-2 text-sm">
                    {statusBreakdown.map((status) => (
                      <li key={status.status} className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-current" />
                          {status.status}
                        </span>
                        <span className="font-semibold text-foreground">{status.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No status analytics yet.</p>
                )}
              </div>

              <div className="brand-soft-panel rounded-2xl border border-border/40 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Doctors</p>
                    <h3 className="text-lg font-semibold text-foreground">Lead clinicians</h3>
                  </div>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                {doctorLeaders.length ? (
                  <ul className="space-y-2 text-sm">
                    {doctorLeaders.map((doctor) => (
                      <li key={doctor.doctor} className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-primary" />
                          {doctor.doctor}
                        </span>
                        <span className="font-semibold text-foreground">{doctor.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No doctor weighting available.</p>
                )}
              </div>

              <div className="brand-soft-panel rounded-2xl border border-border/40 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Horizon</p>
                    <h3 className="text-lg font-semibold text-foreground">Next 14 days</h3>
                  </div>
                  <CalendarClock className="h-5 w-5 text-muted-foreground" />
                </div>
                {upcomingWindow.length ? (
                  <ul className="space-y-2 text-sm">
                    {upcomingWindow.map((day) => (
                      <li key={day.date} className="flex items-center justify-between text-muted-foreground">
                        <span>{day.date}</span>
                        <span className="font-semibold text-foreground">{day.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Upcoming calendar syncing…</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover relative mb-6">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                <ListFilter className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Search & filter</p>
                <h2 className="text-2xl font-bold text-foreground">Scheduling console</h2>
                <p className="text-sm text-muted-foreground">Slice the roster by client, status, or doctor to react faster.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="brand-soft-panel rounded-2xl px-4 py-3 text-right">
                <p className="text-xs font-semibold text-muted-foreground">Matching visits</p>
                <p className="text-2xl font-bold text-[#4338ca]">{filteredAppointments.length}</p>
                <p className="text-xs text-muted-foreground">of {totalAppointments}</p>
              </div>
              <Button
                className="rounded-2xl bg-[#4338ca] px-4 py-2 text-white hover:bg-[#312e81]"
                onClick={openCreate}
              >
                + New appointment
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-2 xl:col-span-2">
              <Label className="text-sm font-semibold text-foreground">Search roster</Label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Client, pet, ID..."
                  className="h-12 rounded-2xl border-border bg-background/70 pl-9 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background/70 px-4 text-sm focus:border-primary focus:outline-none"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Doctor</Label>
              <select
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background/70 px-4 text-sm focus:border-primary focus:outline-none"
              >
                {doctors.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Quick actions</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-12 flex-1 rounded-2xl border-border/60"
                  onClick={loadAppointments}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  className="h-12 flex-1 rounded-2xl text-muted-foreground hover:text-foreground"
                  onClick={resetFilters}
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="space-y-2 xl:col-span-2">
              <Label className="text-sm font-semibold text-foreground">View modes</Label>
              <div className="flex flex-wrap gap-2">
                {VIEW_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setViewMode(option.value)}
                    className={`flex flex-1 min-w-30 flex-col rounded-2xl border px-4 py-2 text-left text-sm transition ${
                      viewMode === option.value
                        ? "border-[#4338ca] bg-[#4338ca]/10 text-[#4338ca] shadow-sm"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="font-semibold">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{viewModeNote}</p>
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active visits</p>
              <h2 className="text-2xl font-bold text-foreground">Appointments roster</h2>
              <p className="text-sm text-muted-foreground">
                {filteredAppointments.length} appointments {loading ? "· refreshing" : ""}
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-2xl border-border/60"
              onClick={loadAppointments}
              disabled={loading}
            >
              Re-sync data
            </Button>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border/60 px-6 py-16 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No appointments match the current filters.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-border/40 bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-linear-to-r from-[#eff6ff] to-[#eef2ff] text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Client / Pet</th>
                      {showVitals && (
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Vitals</th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Doctor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
                      {showNotes && (
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Notes</th>
                      )}
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((a, idx) => (
                      <tr
                        key={a.id}
                        className={`border-b border-border/70 ${
                          idx % 2 === 0 ? "bg-card" : "bg-card/80"
                        } transition hover:bg-muted/50`}
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-foreground">
                          <div>{a.date}</div>
                          <div className="text-xs text-muted-foreground">{a.time}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-foreground">
                          <div className="font-semibold">{a.client}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.pet} · {a.clientId || "No ID"}
                          </div>
                        </td>
                        {showVitals && (
                          <td className="px-4 py-4 text-xs text-muted-foreground">
                            <p>Age {a.age || "-"} · {a.weight || "-"}</p>
                            <p>Last visit {a.lastVisit || "—"}</p>
                          </td>
                        )}
                        <td className="px-4 py-4 text-sm text-foreground">{a.doctor || "—"}</td>
                        <td className="px-4 py-4 text-sm text-foreground">
                          {a.reason ? (
                            <Badge
                              variant="outline"
                              className={`brand-pill border ${
                                isGroomingReason(a.reason)
                                  ? "border-pink-200 bg-pink-50 text-pink-700"
                                  : "border-primary/30 bg-primary/5 text-primary"
                              }`}
                            >
                              {a.reason}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not specified</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={`brand-pill border ${getStatusTone(a.status)}`}>
                            {a.status}
                          </Badge>
                        </td>
                        {showNotes && (
                          <td className="px-4 py-4 text-xs text-muted-foreground">
                            {a.notes || "No notes"}
                          </td>
                        )}
                        <td className="px-4 py-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-200 text-[#4338ca]"
                            onClick={() => openModal(a)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(selected || creating) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-screen overflow-y-auto">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-lg">{creating ? "New Appointment" : "Appointment Details"}</h3>
                <button onClick={closeModal} className="text-2xl text-gray-500 hover:text-gray-800">✕</button>
              </div>

              <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-700">Visit Reason:</span>
                  <Badge
                    variant={groomingVisitActive ? "default" : "secondary"}
                    className={
                      groomingVisitActive
                        ? "bg-pink-100 text-pink-700 border-pink-200"
                        : "bg-white text-gray-700 border-gray-200"
                    }
                  >
                    {formatReason(editingData.reason)}
                  </Badge>
                </div>
                {groomingVisitActive && (
                  <p className="text-xs text-pink-700">
                    Grooming-focused visit detected — capture coat condition, preferred package, and any styling notes.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editingData.date}
                    onChange={(e) => setEditingData({ ...editingData, date: e.target.value })}
                    disabled={!editMode && !creating}
                  />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={editingData.time}
                    onChange={(e) => setEditingData({ ...editingData, time: e.target.value })}
                    disabled={!editMode && !creating}
                  />
                </div>
                <div>
                  <Label>Client ID</Label>
                  <Input
                    value={editingData.clientId}
                    onChange={(e) => setEditingData({ ...editingData, clientId: e.target.value })}
                    disabled={!editMode && !creating}
                  />
                </div>
                <div>
                  <Label>Client Name</Label>
                  <Input
                    value={editingData.client}
                    onChange={(e) => setEditingData({ ...editingData, client: e.target.value })}
                    disabled={!editMode && !creating}
                  />
                </div>
                <div>
                  <Label>Pet Name</Label>
                  <Input
                    value={editingData.pet}
                    onChange={(e) => setEditingData({ ...editingData, pet: e.target.value })}
                    disabled={!editMode && !creating}
                  />
                </div>
                <div>
                  <Label>Pet Type</Label>
                  <Input
                    value={editingData.petType}
                    onChange={(e) => setEditingData({ ...editingData, petType: e.target.value })}
                    disabled={!editMode && !creating}
                  />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input
                    value={editingData.age}
                    onChange={(e) => setEditingData({ ...editingData, age: e.target.value })}
                    disabled={!editMode && !creating}
                  />
                </div>
                <div>
                  <Label>Weight</Label>
                  <Input
                    value={editingData.weight}
                    onChange={(e) => setEditingData({ ...editingData, weight: e.target.value })}
                    disabled={!editMode && !creating}
                  />
                </div>
                <div>
                  <Label>Last Visit</Label>
                  <Input
                    value={editingData.lastVisit}
                    onChange={(e) => setEditingData({ ...editingData, lastVisit: e.target.value })}
                    disabled={!editMode && !creating}
                  />
                </div>
                <div>
                  <Label>Doctor</Label>
                  <Input
                    value={editingData.doctor}
                    onChange={(e) => setEditingData({ ...editingData, doctor: e.target.value })}
                    disabled={!editMode && !creating}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Reason</Label>
                  <Input
                    value={editingData.reason}
                    onChange={(e) => setEditingData({ ...editingData, reason: e.target.value })}
                    disabled={!editMode && !creating}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    value={editingData.status}
                    onChange={(e) => setEditingData({ ...editingData, status: e.target.value as Appointment["status"] })}
                    className="w-full h-9 px-3 border border-gray-300 rounded-md"
                    disabled={!editMode && !creating}
                  >
                    <option>Scheduled</option>
                    <option>Completed</option>
                    <option>Cancelled</option>
                    <option>No-Show</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label>Notes</Label>
                  <Input
                    value={editingData.notes || ""}
                    onChange={(e) => setEditingData({ ...editingData, notes: e.target.value })}
                    disabled={!editMode && !creating}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Attachments</Label>
                  <div className="mt-2 space-y-3">
                    <Input
                      type="file"
                      multiple
                      accept="*/*"
                      onChange={handleAttachmentUpload}
                      disabled={!editMode && !creating}
                    />
                    <p className="text-xs text-gray-500">
                      Upload any file type. Files are stored securely with the appointment record.
                    </p>
                    <div className="space-y-2">
                      {editingData.attachments.length > 0 ? (
                        editingData.attachments.map((file, idx) => {
                          const downloadUrl = buildAttachmentDataUrl(file)
                          return (
                            <div
                              key={`${file.name || "file"}-${idx}`}
                              className="flex flex-col gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {file.name || `Attachment ${idx + 1}`}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(file.type || "Unknown").slice(0, 60)} · {formatFileSize(file.size)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {downloadUrl ? (
                                  <a
                                    href={downloadUrl}
                                    download={file.name || "attachment"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-semibold text-blue-600 hover:underline"
                                  >
                                    Download
                                  </a>
                                ) : (
                                  <span className="text-xs text-gray-400">No data</span>
                                )}
                                {(editMode || creating) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => handleAttachmentRemove(idx)}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-xs text-gray-500">No attachments yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                {!editMode && !creating ? (
                  <>
                    <Button variant="outline" onClick={closeModal}>Close</Button>
                    {selected && (
                      <Button
                        variant="outline"
                        className="border-blue-200 text-blue-700"
                        onClick={openMedicalHistory}
                      >
                        Medical History
                      </Button>
                    )}
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setEditMode(true)}>
                      Edit
                    </Button>
                    <Button variant="destructive" onClick={() => deleteAppointment(selected!.id)}>
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={closeModal}>Cancel</Button>
                    {selected && !creating && (
                      <Button
                        variant="outline"
                        className="border-blue-200 text-blue-700"
                        onClick={openMedicalHistory}
                      >
                        Medical History
                      </Button>
                    )}
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={saveChanges}>
                      Save
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
