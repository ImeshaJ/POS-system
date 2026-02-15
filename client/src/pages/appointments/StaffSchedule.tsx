import { useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api"
import {
  AlarmClock,
  Briefcase,
  CalendarClock,
  Filter,
  Phone,
  Search as SearchIcon,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react"

type Schedule = {
  id: string
  date: string
  staffName: string
  staffId?: string
  role: string
  startTime: string
  endTime: string
  status: "Scheduled" | "Completed" | "Absent" | "On Leave"
  contact?: string
  notes?: string
}

type ApiSchedule = {
  id: number
  date: string
  staff_name?: string
  staff_id?: string
  role?: string
  start_time?: string
  end_time?: string
  status?: Schedule["status"]
  contact?: string
  notes?: string
}

const emptyForm: Omit<Schedule, "id" | "date"> = {
  staffName: "",
  staffId: "",
  role: "",
  startTime: "",
  endTime: "",
  status: "Scheduled",
  contact: "",
  notes: "",
}

const STATUS_TONES: Record<Schedule["status"], string> = {
  Scheduled: "border-blue-200 bg-blue-50 text-blue-700",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Absent: "border-rose-200 bg-rose-50 text-rose-700",
  "On Leave": "border-amber-200 bg-amber-50 text-amber-700",
}

const getStatusTone = (status: Schedule["status"]) => STATUS_TONES[status] || "border-slate-200 bg-slate-50 text-slate-600"

export default function StaffSchedule() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0])
  const [searchStaff, setSearchStaff] = useState("")
  const [filterRole, setFilterRole] = useState("All")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [form, setForm] = useState<Omit<Schedule, "id" | "date">>(emptyForm)

  async function loadSchedules() {
    setLoading(true)
    setError("")
    try {
      const res = await apiGet<ApiSchedule[]>("/api/staff-schedules?page=1&limit=500")
      const mapped: Schedule[] = res.data.map((s) => ({
        id: String(s.id),
        date: s.date,
        staffName: s.staff_name || "",
        staffId: s.staff_id || "",
        role: s.role || "",
        startTime: s.start_time || "",
        endTime: s.end_time || "",
        status: (s.status || "Scheduled") as Schedule["status"],
        contact: s.contact || "",
        notes: s.notes || "",
      }))
      setSchedules(mapped)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load schedules")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
  }, [])

  const roles = ["All", ...new Set(schedules.map((s) => s.role).filter(Boolean))]

  const daySchedules = useMemo(() => {
    return schedules
      .filter((s) => s.date === selectedDate)
      .filter((s) => {
        const matchesSearch =
          s.staffName.toLowerCase().includes(searchStaff.toLowerCase()) ||
          (s.staffId || "").toLowerCase().includes(searchStaff.toLowerCase())
        const matchesRole = filterRole === "All" || s.role === filterRole
        return matchesSearch && matchesRole
      })
  }, [schedules, selectedDate, searchStaff, filterRole])

  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm })
    setOpen(true)
  }

  function openEdit(s: Schedule) {
    setEditing(s)
    setForm({
      staffName: s.staffName,
      staffId: s.staffId || "",
      role: s.role,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      contact: s.contact || "",
      notes: s.notes || "",
    })
    setOpen(true)
  }

  async function saveSchedule() {
    if (!form.staffName || !form.role || !form.startTime || !form.endTime) return

    const payload = {
      date: selectedDate,
      staff_name: form.staffName,
      staff_id: form.staffId,
      role: form.role,
      start_time: form.startTime,
      end_time: form.endTime,
      status: form.status,
      contact: form.contact,
      notes: form.notes,
    }

    try {
      if (editing) {
        const res = await apiPatch<ApiSchedule>(`/api/staff-schedules/${editing.id}`, payload)
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === editing.id
              ? {
                  id: String(res.data.id),
                  date: res.data.date,
                  staffName: res.data.staff_name || form.staffName,
                  staffId: res.data.staff_id || form.staffId,
                  role: res.data.role || form.role,
                  startTime: res.data.start_time || form.startTime,
                  endTime: res.data.end_time || form.endTime,
                  status: (res.data.status || form.status) as Schedule["status"],
                  contact: res.data.contact || form.contact,
                  notes: res.data.notes || form.notes,
                }
              : s
          )
        )
      } else {
        const res = await apiPost<ApiSchedule>("/api/staff-schedules", payload)
        setSchedules((prev) => [
          ...prev,
          {
            id: String(res.data.id),
            date: res.data.date,
            staffName: res.data.staff_name || form.staffName,
            staffId: res.data.staff_id || form.staffId,
            role: res.data.role || form.role,
            startTime: res.data.start_time || form.startTime,
            endTime: res.data.end_time || form.endTime,
            status: (res.data.status || form.status) as Schedule["status"],
            contact: res.data.contact || form.contact,
            notes: res.data.notes || form.notes,
          },
        ])
      }
      setOpen(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save schedule")
    }
  }

  async function deleteSchedule(id: string) {
    if (!confirm("Delete this schedule?")) return
    try {
      await apiDelete(`/api/staff-schedules/${id}`)
      setSchedules((prev) => prev.filter((s) => s.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete schedule")
    }
  }

  const totalShifts = schedules.length
  const scheduledCount = schedules.filter((s) => s.status === "Scheduled").length
  const completedCount = schedules.filter((s) => s.status === "Completed").length
  const absentCount = schedules.filter((s) => s.status === "Absent").length
  const leaveCount = schedules.filter((s) => s.status === "On Leave").length
  const uniqueStaff = new Set(schedules.map((s) => s.staffName).filter(Boolean)).size
  const dayHeadcount = new Set(daySchedules.map((s) => s.staffName).filter(Boolean)).size
  const selectedDateLabel = new Date(selectedDate).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  })
  const heroMetrics = [
    {
      label: "Total shifts",
      value: totalShifts,
      hint: "Tracked entries",
      gradient: "from-[#312e81] to-[#4338ca]",
      icon: CalendarClock,
    },
    {
      label: "Active staff",
      value: uniqueStaff,
      hint: "Unique profiles",
      gradient: "from-[#0f766e] to-[#14b8a6]",
      icon: Users,
    },
    {
      label: "Scheduled",
      value: scheduledCount,
      hint: "Ready for duty",
      gradient: "from-[#b45309] to-[#facc15]",
      icon: AlarmClock,
    },
    {
      label: "Completed",
      value: completedCount,
      hint: "Shifts closed",
      gradient: "from-[#15803d] to-[#22c55e]",
      icon: UserCheck,
    },
    {
      label: "Absences",
      value: absentCount,
      hint: "Needs coverage",
      gradient: "from-[#7f1d1d] to-[#ef4444]",
      icon: Briefcase,
    },
    {
      label: "On leave",
      value: leaveCount,
      hint: "Approved time",
      gradient: "from-[#92400e] to-[#f97316]",
      icon: Phone,
    },
  ]

  return (
    <>
      <PageTitle title="Staff Schedule" />

      <Card className="brand-card brand-card-hover mb-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#0f172a] via-[#4338ca] to-[#db2777] p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Ops visibility</p>
                <h2 className="text-3xl font-bold">Staffing Control Center</h2>
                <p className="text-sm text-white/80">
                  Align rosters with the Sales List visuals—monitor coverage, highlight absences, and spin up shifts fast.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <div className="rounded-3xl bg-white/15 px-5 py-3">
                  <p className="text-xs font-semibold text-white/70">{selectedDateLabel}</p>
                  <p className="text-3xl font-bold">{daySchedules.length}</p>
                  <p className="text-xs text-white/80">shifts scheduled</p>
                </div>
                <Button onClick={openAdd} className="rounded-2xl bg-white/90 px-5 py-2 text-[#4338ca] hover:bg-white">
                  <Sparkles className="mr-2 h-4 w-4" /> Add schedule
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            {heroMetrics.map(({ label, value, hint, gradient, icon: Icon }) => (
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

      <Card className="brand-card brand-card-hover mb-6">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                <Filter className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Search & filter</p>
                <h2 className="text-2xl font-bold text-foreground">Schedule console</h2>
                <p className="text-sm text-muted-foreground">Switch dates, narrow roles, and surface the exact roster you need.</p>
              </div>
            </div>
            <div className="brand-soft-panel rounded-2xl px-4 py-3 text-right">
              <p className="text-xs font-semibold text-muted-foreground">Headcount today</p>
              <p className="text-2xl font-bold text-[#4338ca]">{dayHeadcount}</p>
              <p className="text-xs text-muted-foreground">of {uniqueStaff} staff</p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2 xl:col-span-2">
              <Label className="text-sm font-semibold text-foreground">Date</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-12 rounded-2xl border-border" />
            </div>
            <div className="space-y-2 xl:col-span-2">
              <Label className="text-sm font-semibold text-foreground">Search staff</Label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchStaff}
                  onChange={(e) => setSearchStaff(e.target.value)}
                  placeholder="Name or ID"
                  className="h-12 rounded-2xl border-border bg-background/70 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Role</Label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background/70 px-4 text-sm focus:border-primary focus:outline-none"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Actions</Label>
              <div className="flex gap-2">
                <Button variant="outline" className="h-12 flex-1 rounded-2xl border-border/60" onClick={loadSchedules} disabled={loading}>
                  Refresh
                </Button>
                <Button className="h-12 flex-1 rounded-2xl bg-[#4338ca] text-white hover:bg-[#312e81]" onClick={openAdd}>
                  + Add
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Shift roster</p>
              <h2 className="text-2xl font-bold text-foreground">{selectedDateLabel}</h2>
              <p className="text-sm text-muted-foreground">
                {daySchedules.length} schedule(s) {loading ? "· refreshing" : ""}
              </p>
            </div>
            <Badge className="brand-pill bg-muted/50 text-[#4338ca]">{selectedDate}</Badge>
          </div>

          {daySchedules.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border/60 px-6 py-12 text-center text-muted-foreground">
              <Briefcase className="h-10 w-10" />
              <p>No shifts found. Adjust filters or add a schedule above.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-border/40 bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-linear-to-r from-[#eff6ff] to-[#eef2ff] text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      <th className="px-4 py-3">Staff</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Shift</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daySchedules.map((s, idx) => (
                      <tr
                        key={s.id}
                        className={`border-b border-border/70 ${idx % 2 === 0 ? "bg-card" : "bg-card/80"} transition hover:bg-muted/50`}
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-foreground">
                          <div>{s.staffName}</div>
                          <div className="text-xs text-muted-foreground">{s.staffId || "No ID"}</div>
                          {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                        </td>
                        <td className="px-4 py-4 text-sm text-foreground">{s.role || "—"}</td>
                        <td className="px-4 py-4 text-sm text-foreground">
                          {s.startTime || "--"} – {s.endTime || "--"}
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={`brand-pill border ${getStatusTone(s.status)}`}>{s.status}</Badge>
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground">
                          {s.contact ? (
                            <span className="flex items-center gap-1 text-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              {s.contact}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="outline" className="rounded-2xl border-border/60" onClick={() => openEdit(s)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="rounded-2xl" onClick={() => deleteSchedule(s.id)}>
                              Delete
                            </Button>
                          </div>
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

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-lg">{editing ? "Edit Schedule" : "New Schedule"}</h3>
                <button onClick={() => setOpen(false)} className="text-2xl text-gray-500 hover:text-gray-800">✕</button>
              </div>

              <div className="space-y-2">
                <Label>Staff Name</Label>
                <Input value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Staff ID</Label>
                <Input value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Schedule["status"] })}
                  className="w-full h-9 px-3 border border-gray-300 rounded-md"
                >
                  <option>Scheduled</option>
                  <option>Completed</option>
                  <option>Absent</option>
                  <option>On Leave</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={saveSchedule}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
