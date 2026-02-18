import { useState, useEffect } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api"
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  NotebookPen,
  PawPrint,
  Plus,
  Sparkles,
  Users,
} from "lucide-react"
import { useToast } from "@/components/common/Toast"

type Status = "Scheduled" | "Completed" | "Cancelled" | "No-Show"

type Appointment = {
  id: string
  date: string
  time: string
  client: string
  clientId?: string
  pet: string
  petType?: string
  doctor: string
  reason: string
  status: Status
  notes?: string
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
  doctor?: string
  reason?: string
  status?: Status
  notes?: string
}

const STATUS_SHORTCUTS: Array<{ value: Status; label: string; note: string; accent: string }> = [
  {
    value: "Scheduled",
    label: "Mark Scheduled",
    note: "Appointment scheduled for follow-up",
    accent: "border-blue-200 text-blue-700",
  },
  {
    value: "Completed",
    label: "Mark Completed",
    note: "Visit completed and notes recorded",
    accent: "border-green-200 text-green-700",
  },
  {
    value: "Cancelled",
    label: "Mark Cancelled",
    note: "Client informed of cancellation",
    accent: "border-red-200 text-red-700",
  },
  {
    value: "No-Show",
    label: "Mark No-Show",
    note: "Client did not arrive, follow-up required",
    accent: "border-yellow-200 text-yellow-700",
  },
]

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate()

const getStartDay = (year: number, month: number) =>
  new Date(year, month, 1).getDay()

const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const normalizeDateString = (value?: string | null) => {
  if (!value) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return formatDate(parsed)
  }
  return value.slice(0, 10)
}

export default function AppointmentCalendar() {
  const toast = useToast()
  const today = new Date()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(formatDate(today))
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function loadAppointments() {
    setLoading(true)
    setError("")
    try {
      const res = await apiGet<ApiAppointment[]>("/api/appointments?page=1&limit=500")
      const mapped: Appointment[] = res.data.map((a) => ({
        id: String(a.id),
        date: normalizeDateString(a.date),
        time: a.time,
        client: a.client_name || "",
        clientId: a.client_code || (a.client_id ? String(a.client_id) : ""),
        pet: a.pet_name || "",
        petType: a.pet_type || "",
        doctor: a.doctor || "",
        reason: a.reason || "",
        status: (a.status || "Scheduled") as Status,
        notes: a.notes || "",
      }))
      setAppointments(mapped)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load appointments")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  const [form, setForm] = useState({
    date: formatDate(today),
    time: "",
    client: "",
    clientId: "",
    pet: "",
    petType: "",
    doctor: "",
    reason: "",
    status: "Scheduled" as Status,
    notes: "",
  })

  const daysInMonth = getDaysInMonth(year, month)
  const startDay = getStartDay(year, month)

  const calendarDays = Array(startDay)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))

  function changeMonth(dir: number) {
    const newMonth = month + dir
    if (newMonth < 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else if (newMonth > 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else {
      setMonth(newMonth)
    }
  }

  const selectedAppointments = appointments.filter((a) => a.date === selectedDate)
  const scheduledCount = appointments.filter((a) => a.status === "Scheduled").length
  const completedCount = appointments.filter((a) => a.status === "Completed").length
  const cancelledCount = appointments.filter((a) => a.status === "Cancelled").length
  const noShowCount = appointments.filter((a) => a.status === "No-Show").length
  const todayCount = appointments.filter((a) => a.date === formatDate(today)).length
  const selectedDateLabel = selectedDate
    ? new Date(selectedDate).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "short",
      })
    : "Pick a date"
  const calendarMetrics = [
    {
      label: "Total",
      value: appointments.length,
      hint: "All records",
      gradient: "from-[#312e81] to-[#4338ca]",
      icon: CalendarDays,
    },
    {
      label: "Today",
      value: todayCount,
      hint: "Same day",
      gradient: "from-[#0f766e] to-[#14b8a6]",
      icon: Clock,
    },
    {
      label: "Scheduled",
      value: scheduledCount,
      hint: "Awaiting visit",
      gradient: "from-[#b45309] to-[#facc15]",
      icon: Sparkles,
    },
    {
      label: "Completed",
      value: completedCount,
      hint: "Closed visits",
      gradient: "from-[#15803d] to-[#22c55e]",
      icon: Users,
    },
  ]

  async function saveAppointment() {
    if (!form.date || !form.time || !form.client || !form.pet) return

    try {
      const trimmedClientId = form.clientId.trim()
      const parsedClientId =
        trimmedClientId && /^\d+$/.test(trimmedClientId) ? Number(trimmedClientId) : null
      const clientIdNum = parsedClientId !== null && parsedClientId > 0 ? parsedClientId : null
      const payload = {
        date: form.date,
        time: form.time,
        client_id: clientIdNum,
        client_code: trimmedClientId || null,
        client_name: form.client,
        pet_name: form.pet,
        pet_type: form.petType,
        doctor: form.doctor,
        reason: form.reason,
        status: form.status,
        notes: form.notes,
      }

      if (editingId) {
        const res = await apiPatch<ApiAppointment>(`/api/appointments/${editingId}`, payload)
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === editingId
                ? {
                  id: String(res.data.id),
                  date: normalizeDateString(res.data.date),
                  time: res.data.time,
                  client: res.data.client_name || form.client,
                  clientId:
                    res.data.client_code || (res.data.client_id ? String(res.data.client_id) : form.clientId),
                  pet: res.data.pet_name || form.pet,
                  petType: res.data.pet_type || form.petType,
                  doctor: res.data.doctor || "",
                  reason: res.data.reason || "",
                  status: (res.data.status || "Scheduled") as Status,
                  notes: res.data.notes || "",
                }
              : a
          )
        )
      } else {
        const res = await apiPost<ApiAppointment>("/api/appointments", payload)
        setAppointments((prev) => [
          ...prev,
          {
            id: String(res.data.id),
            date: normalizeDateString(res.data.date),
            time: res.data.time,
            client: res.data.client_name || form.client,
            clientId:
              res.data.client_code || (res.data.client_id ? String(res.data.client_id) : form.clientId),
            pet: res.data.pet_name || form.pet,
            petType: res.data.pet_type || form.petType,
            doctor: res.data.doctor || "",
            reason: res.data.reason || "",
            status: (res.data.status || "Scheduled") as Status,
            notes: res.data.notes || "",
          },
        ])
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save appointment")
      return
    }

    toast.success(editingId ? "Appointment updated successfully" : "Appointment created successfully")
    setSelectedDate(form.date)
    await loadAppointments()
    resetForm()
    setOpen(false)
  }

  function resetForm() {
    setForm({
      date: selectedDate,
      time: "",
      client: "",
      clientId: "",
      pet: "",
      petType: "",
      doctor: "",
      reason: "",
      status: "Scheduled" as Status,
      notes: "",
    })
    setEditingId(null)
  }

  async function deleteAppointment(id: string) {
    try {
      await apiDelete(`/api/appointments/${id}`)
      setAppointments((prev) => prev.filter((a) => a.id !== id))
      toast.success("Appointment deleted successfully")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete appointment")
    }
  }

  function openEditModal(apt: Appointment) {
    setForm({
      date: apt.date,
      time: apt.time,
      client: apt.client,
      clientId: apt.clientId || "",
      pet: apt.pet,
      petType: apt.petType || "",
      doctor: apt.doctor,
      reason: apt.reason,
      status: apt.status,
      notes: apt.notes || "",
    })
    setEditingId(apt.id)
    if (apt.date) {
      setSelectedDate(apt.date)
    }
    setOpen(true)
  }

  function applyStatusShortcut(value: Status, note: string) {
    setForm((prev) => ({
      ...prev,
      status: value,
      notes: prev.notes?.trim() ? prev.notes : note,
    }))
  }

  function getStatusColor(status: Status) {
    switch (status) {
      case "Scheduled":
        return "border-blue-200 bg-blue-50 text-blue-700"
      case "Completed":
        return "border-emerald-200 bg-emerald-50 text-emerald-700"
      case "Cancelled":
        return "border-rose-200 bg-rose-50 text-rose-700"
      case "No-Show":
        return "border-amber-200 bg-amber-50 text-amber-700"
      default:
        return "border-slate-200 bg-slate-50 text-slate-600"
    }
  }

  const monthYear = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  })

  return (
    <>
      <PageTitle title="Appointment Calendar" />

      <Card className="brand-card brand-card-hover mb-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#0f172a] via-[#4338ca] to-[#db2777] p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Schedule intelligence</p>
                <h2 className="text-3xl font-bold">Calendar Control Center</h2>
                <p className="text-sm text-white/80">
                  Navigate months, monitor workload, and launch visits with the same language as the Sales List dashboard.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <div className="rounded-3xl bg-white/15 px-5 py-3">
                  <p className="text-xs font-semibold text-white/70">Selected day</p>
                  <p className="text-3xl font-bold">{selectedAppointments.length}</p>
                  <p className="text-xs text-white/80">appointments queued</p>
                </div>
                <Button
                  onClick={() => {
                    resetForm()
                    setOpen(true)
                  }}
                  className="rounded-2xl bg-white/90 px-5 py-2 text-[#4338ca] hover:bg-white"
                >
                  <Plus className="mr-2 h-4 w-4" /> Book visit
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            {calendarMetrics.map(({ label, value, hint, gradient, icon: Icon }) => (
              <div
                key={label}
                className={`relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br ${gradient} p-4 text-white shadow-lg`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
                    <p className="mt-2 text-3xl font-bold">{value}</p>
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

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="brand-card brand-card-hover lg:col-span-2">
          <CardContent className="space-y-6 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Viewing</p>
                <h3 className="text-xl font-bold text-foreground">{monthYear}</h3>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" className="rounded-2xl" onClick={() => changeMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" className="rounded-2xl" onClick={() => changeMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} className="aspect-square" />
                }

                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                const hasAppointments = appointments.some(
                  (a) => a.date === dateStr && a.status !== "Cancelled"
                )
                const isToday = formatDate(today) === dateStr

                return (
                  <button
                    type="button"
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square rounded-2xl border text-sm font-semibold transition hover:shadow-sm ${
                      selectedDate === dateStr
                        ? "border-[#4338ca] bg-[#4338ca] text-white shadow-lg"
                        : isToday
                        ? "border-[#4338ca]/50 bg-[#4338ca]/10 text-[#4338ca]"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    <div>{day}</div>
                    {hasAppointments && <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-rose-500" />}
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/40 bg-muted/40 p-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status Mix</p>
                <div className="flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">Scheduled</span>
                  <span className="font-semibold">{scheduledCount}</span>
                </div>
                <div className="flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">Completed</span>
                  <span className="font-semibold">{completedCount}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Follow-ups</p>
                <div className="flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">Cancelled</span>
                  <span className="font-semibold">{cancelledCount}</span>
                </div>
                <div className="flex items-center justify-between text-foreground">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">No-show</span>
                  <span className="font-semibold">{noShowCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover lg:col-span-3">
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected date</p>
                <h3 className="text-2xl font-bold text-foreground">{selectedDateLabel}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedAppointments.length} appointment(s) {loading ? "· refreshing" : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className="brand-pill bg-muted/50 text-[#4338ca]">
                  {selectedDate}
                </Badge>
                <Button
                  onClick={() => {
                    resetForm()
                    setOpen(true)
                  }}
                  className="rounded-2xl bg-[#4338ca] px-5 py-2 text-white hover:bg-[#312e81]"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add appointment
                </Button>
              </div>
            </div>

            {selectedAppointments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border/60 px-6 py-12 text-center text-muted-foreground">
                <AlertCircle className="h-10 w-10" />
                <p>No appointments scheduled. Use the button above to create one.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedAppointments
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((a) => (
                    <div
                      key={a.id}
                      className="rounded-3xl border border-border/60 bg-card px-5 py-4 shadow-sm transition hover:border-[#4338ca]/50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-lg font-semibold text-foreground">
                              {a.pet} · {a.client}
                            </h4>
                            <Badge className={`brand-pill border ${getStatusColor(a.status)}`}>
                              {a.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-4 w-4" /> {a.time} · ID {a.clientId || "—"}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <PawPrint className="h-4 w-4" /> {a.petType || "Species not set"}
                          </p>
                          <p className="text-sm text-primary flex items-center gap-1">
                            <Users className="h-4 w-4" /> {a.doctor || "Unassigned"}
                          </p>
                          <p className="text-sm text-foreground flex items-center gap-1">
                            <NotebookPen className="h-4 w-4" /> {a.reason || "No reason added"}
                          </p>
                          {a.notes && (
                            <p className="text-xs text-muted-foreground italic">{a.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-2xl border-border/60 text-[#4338ca]"
                            onClick={() => openEditModal(a)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="rounded-2xl"
                            onClick={() => deleteAppointment(a.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Appointment Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md h-full max-h-screen overflow-y-auto">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-bold text-lg">
                  {editingId ? "Edit Appointment" : "New Appointment"}
                </h3>
                <button
                  onClick={() => {
                    resetForm()
                    setOpen(false)
                  }}
                  className="text-2xl text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="appointment-date" className="text-sm font-medium">Date</Label>
                  <Input
                    id="appointment-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => {
                      const nextDate = e.target.value
                      setForm((prev) => ({ ...prev, date: nextDate }))
                      if (nextDate) {
                        setSelectedDate(nextDate)
                      }
                    }}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="appointment-time" className="text-sm font-medium">Time</Label>
                  <Input
                    id="appointment-time"
                    type="time"
                    className="h-9"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="appointment-client-id" className="text-sm font-medium">Client ID</Label>
                    <Input
                      id="appointment-client-id"
                      placeholder="1"
                      className="h-9"
                      value={form.clientId}
                      onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="appointment-client-name" className="text-sm font-medium">Client Name*</Label>
                    <Input
                      id="appointment-client-name"
                      placeholder="Client name"
                      className="h-9"
                      value={form.client}
                      onChange={(e) => setForm({ ...form, client: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="appointment-pet-name" className="text-sm font-medium">Pet Name*</Label>
                    <Input
                      id="appointment-pet-name"
                      placeholder="Pet name"
                      className="h-9"
                      value={form.pet}
                      onChange={(e) => setForm({ ...form, pet: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="appointment-pet-type" className="text-sm font-medium">Pet Type</Label>
                    <Input
                      id="appointment-pet-type"
                      placeholder="Labrador"
                      className="h-9"
                      value={form.petType}
                      onChange={(e) => setForm({ ...form, petType: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="appointment-doctor" className="text-sm font-medium">Doctor</Label>
                  <Input
                    id="appointment-doctor"
                    placeholder="Doctor name"
                    className="h-9"
                    value={form.doctor}
                    onChange={(e) => setForm({ ...form, doctor: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="appointment-reason" className="text-sm font-medium">Reason for Visit</Label>
                  <Input
                    id="appointment-reason"
                    placeholder="e.g., Vaccination, Grooming"
                    className="h-9"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="appointment-status" className="text-sm font-medium">Status</Label>
                  <select
                    id="appointment-status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                    className="w-full h-9 px-3 border border-gray-300 rounded-md"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="No-Show">No-Show</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600">Quick nurse updates</p>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_SHORTCUTS.map((shortcut) => {
                      const isActive = form.status === shortcut.value
                      return (
                        <Button
                          key={shortcut.value}
                          type="button"
                          variant="outline"
                          onClick={() => applyStatusShortcut(shortcut.value, shortcut.note)}
                          className={`h-auto py-2 flex flex-col items-start text-left text-xs font-semibold border-dashed ${
                            isActive ? "border-2 bg-slate-50" : "border"
                          } ${shortcut.accent}`}
                        >
                          <span>{shortcut.label}</span>
                          <span className="text-[11px] font-normal text-gray-500">
                            {shortcut.note}
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="appointment-notes" className="text-sm font-medium">Notes</Label>
                  <textarea
                    id="appointment-notes"
                    placeholder="Add nurse actions, follow-ups, or reminders"
                    className="w-full p-2 border border-gray-300 rounded-md text-sm h-20"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setOpen(false)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveAppointment}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingId ? "✓ Update" : "+ Add"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
