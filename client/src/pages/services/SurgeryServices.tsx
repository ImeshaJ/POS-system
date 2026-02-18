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
  AlertTriangle,
  ClipboardCheck,
  Download,
  Edit2,
  Filter,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react"
import { apiDelete, apiGet } from "@/lib/api"
import { useToast } from "@/components/common/Toast"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"

interface SurgeryPackage {
  id: number
  name: string
  priceRange: string
  description: string
  length: string
  active: boolean
}

interface AddonService {
  id: number
  name: string
  price: string
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

interface SurgeryCase {
  id: string
  date: string
  time: string
  patient: string
  client: string
  reason: string
  doctor: string
  status: AppointmentStatus
}

type CaseDetail = {
  fastingConfirmed: boolean
  bloodworkDone: boolean
  consentSigned: boolean
  implantsReady: boolean
  notes: string
  anesthesiaPlan: string
  recoveryPlan: string
}

type CaseChecklistKey = keyof Pick<CaseDetail, "fastingConfirmed" | "bloodworkDone" | "consentSigned" | "implantsReady">

const SURGERY_KEYWORDS = ["surgery", "spay", "neuter", "repair", "hernia", "orthopedic", "mass removal"]
const SURGERY_STATUS_BADGE: Record<AppointmentStatus, string> = {
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  "No-Show": "bg-rose-50 text-rose-700 border-rose-200",
}

const CASE_BOOLEAN_CHECKS: Array<{ key: CaseChecklistKey; label: string }> = [
  { key: "fastingConfirmed", label: "Fasting confirmed" },
  { key: "bloodworkDone", label: "Bloodwork reviewed" },
  { key: "consentSigned", label: "Consent signed" },
  { key: "implantsReady", label: "Implants & trays ready" },
]

const normalizeDate = (value?: string | null) => {
  if (!value) return ""
  return value.length >= 10 ? value.slice(0, 10) : value
}

const mapCase = (api: ApiAppointment): SurgeryCase => ({
  id: String(api.id),
  date: normalizeDate(api.date),
  time: api.time || "",
  patient: api.pet_name || "Unassigned",
  client: api.client_name || api.client_code || "Walk-in",
  reason: api.reason || "",
  doctor: api.doctor || "Unassigned",
  status: (api.status || "Scheduled") as AppointmentStatus,
})

const createDefaultDetail = (): CaseDetail => ({
  fastingConfirmed: false,
  bloodworkDone: false,
  consentSigned: false,
  implantsReady: false,
  notes: "",
  anesthesiaPlan: "",
  recoveryPlan: "",
})

const timestampFromCase = (surgeryCase: SurgeryCase) => {
  if (!surgeryCase.date) return null
  const iso = `${surgeryCase.date}T${surgeryCase.time || "00:00"}`
  const ts = Date.parse(iso)
  return Number.isNaN(ts) ? null : ts
}

export default function SurgeryServices() {
  const toast = useToast()
  const [deleteCaseId, setDeleteCaseId] = useState<string | null>(null)

  const [packages, setPackages] = useState<SurgeryPackage[]>([
    {
      id: 1,
      name: "Routine Soft Tissue",
      priceRange: "Rs. 65,000 - Rs. 110,000",
      description: "Spay, neuter, and standard lump removals with anesthesia monitoring",
      length: "1.5 - 2 hrs",
      active: true,
    },
    {
      id: 2,
      name: "Orthopedic Suite",
      priceRange: "Rs. 180,000 - Rs. 320,000",
      description: "TPLO, fracture repair, and implant work with intra-op imaging",
      length: "3 - 4 hrs",
      active: true,
    },
    {
      id: 3,
      name: "Emergency / Critical",
      priceRange: "Rs. 95,000 - Rs. 210,000",
      description: "GDV, C-section, trauma stabilization with 24h ICU",
      length: "As required",
      active: true,
    },
  ])

  const [addons, setAddons] = useState<AddonService[]>([
    { id: 1, name: "Advanced analgesia pump", price: "Rs. 15,500" },
    { id: 2, name: "Intra-op imaging", price: "Rs. 22,000" },
    { id: 3, name: "Plate & screw kit rental", price: "Rs. 35,000" },
    { id: 4, name: "Owner live updates", price: "Rs. 4,500" },
  ])

  const [showPackageModal, setShowPackageModal] = useState(false)
  const [showAddonModal, setShowAddonModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<SurgeryPackage | null>(null)
  const [editingAddon, setEditingAddon] = useState<AddonService | null>(null)
  const [packageForm, setPackageForm] = useState<SurgeryPackage>({
    id: 0,
    name: "",
    priceRange: "",
    description: "",
    length: "",
    active: true,
  })
  const [addonForm, setAddonForm] = useState<AddonService>({ id: 0, name: "", price: "" })

  const [appointmentRecords, setAppointmentRecords] = useState<SurgeryCase[]>([])
  const [appointmentLoading, setAppointmentLoading] = useState(true)
  const [appointmentError, setAppointmentError] = useState("")

  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "All">("All")
  const [timeframeFilter, setTimeframeFilter] = useState<"all" | "upcoming" | "past">("all")
  const [searchTerm, setSearchTerm] = useState("")

  const [caseDetails, setCaseDetails] = useState<Record<string, CaseDetail>>({})
  const [selectedCase, setSelectedCase] = useState<SurgeryCase | null>(null)
  const [detailForm, setDetailForm] = useState<CaseDetail>(createDefaultDetail())
  const [detailSaving, setDetailSaving] = useState(false)

  const surgeryKeywords = useMemo(() => SURGERY_KEYWORDS.map((item) => item.toLowerCase()), [])

  const fetchAppointments = useCallback(async () => {
    setAppointmentLoading(true)
    setAppointmentError("")
    try {
      const res = await apiGet<ApiAppointment[]>("/api/appointments?page=1&limit=500")
      const mapped = res.data.map(mapCase)
      const filtered = mapped.filter((item) => {
        const reason = item.reason.toLowerCase()
        return surgeryKeywords.some((keyword) => reason.includes(keyword))
      })
      setAppointmentRecords(filtered)
    } catch (err) {
      setAppointmentError(err instanceof Error ? err.message : "Failed to load surgeries")
    } finally {
      setAppointmentLoading(false)
    }
  }, [surgeryKeywords])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const totalCases = appointmentRecords.length
  const upcomingCount = useMemo(() => {
    const now = Date.now()
    return appointmentRecords.filter((record) => {
      const ts = timestampFromCase(record)
      return ts !== null && ts >= now
    }).length
  }, [appointmentRecords])

  const completedLastWeek = useMemo(() => {
    const now = Date.now()
    const threshold = now - 7 * 24 * 60 * 60 * 1000
    return appointmentRecords.filter((record) => {
      const ts = timestampFromCase(record)
      return ts !== null && record.status === "Completed" && ts >= threshold
    }).length
  }, [appointmentRecords])

  const filteredCases = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const now = Date.now()

    return appointmentRecords
      .filter((record) => {
        const matchesStatus = statusFilter === "All" || record.status === statusFilter
        const matchesSearch =
          !normalizedSearch ||
          [record.patient, record.client, record.reason, record.doctor]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedSearch))
        const ts = timestampFromCase(record)
        const matchesTimeframe =
          timeframeFilter === "all" ||
          (timeframeFilter === "upcoming" ? ts !== null && ts >= now : ts !== null && ts < now)

        return matchesStatus && matchesSearch && matchesTimeframe
      })
      .sort((a, b) => {
        const aTime = timestampFromCase(a)
        const bTime = timestampFromCase(b)
        if (aTime === bTime) return 0
        if (aTime === null) return 1
        if (bTime === null) return -1
        return aTime - bTime
      })
  }, [appointmentRecords, statusFilter, timeframeFilter, searchTerm])

  const heroMetrics = [
    {
      label: "Active cases",
      value: totalCases,
      hint: `${upcomingCount} on deck this week`,
      accent: "from-[#0f172a] to-[#2563eb]",
      icon: Scale,
    },
    {
      label: "Completed (7d)",
      value: completedLastWeek,
      hint: "Closed with discharge",
      accent: "from-[#065f46] to-[#10b981]",
      icon: ShieldCheck,
    },
    {
      label: "Protocols",
      value: packages.length,
      hint: "Bundled offerings",
      accent: "from-[#7c2d12] to-[#f97316]",
      icon: ClipboardCheck,
    },
  ]

  const activePackageCount = useMemo(() => packages.filter((pkg) => pkg.active).length, [packages])

  const openPackageModal = (pkg?: SurgeryPackage) => {
    if (pkg) {
      setEditingPackage(pkg)
      setPackageForm(pkg)
    } else {
      setEditingPackage(null)
      setPackageForm({
        id: Math.max(...packages.map((item) => item.id), 0) + 1,
        name: "",
        priceRange: "",
        description: "",
        length: "",
        active: true,
      })
    }
    setShowPackageModal(true)
  }

  const openAddonModal = (service?: AddonService) => {
    if (service) {
      setEditingAddon(service)
      setAddonForm(service)
    } else {
      setEditingAddon(null)
      setAddonForm({
        id: Math.max(...addons.map((item) => item.id), 0) + 1,
        name: "",
        price: "",
      })
    }
    setShowAddonModal(true)
  }

  const savePackage = () => {
    if (!packageForm.name || !packageForm.priceRange || !packageForm.description || !packageForm.length) {
      toast.warning("Please complete all package fields")
      return
    }
    if (editingPackage) {
      setPackages((prev) => prev.map((pkg) => (pkg.id === packageForm.id ? packageForm : pkg)))
    } else {
      setPackages((prev) => [...prev, packageForm])
    }
    setShowPackageModal(false)
  }

  const saveAddon = () => {
    if (!addonForm.name || !addonForm.price) {
      toast.warning("Please complete all add-on fields")
      return
    }
    if (editingAddon) {
      setAddons((prev) => prev.map((svc) => (svc.id === addonForm.id ? addonForm : svc)))
    } else {
      setAddons((prev) => [...prev, addonForm])
    }
    setShowAddonModal(false)
  }

  const handleDeleteCaseClick = (caseId: string) => {
    setDeleteCaseId(caseId)
  }

  const handleDeleteCaseConfirm = async () => {
    if (!deleteCaseId) return
    try {
      await apiDelete(`/api/appointments/${deleteCaseId}`)
      setAppointmentRecords((prev) => prev.filter((record) => record.id !== deleteCaseId))
      setCaseDetails((prev) => {
        if (!prev[deleteCaseId]) return prev
        const updated = { ...prev }
        delete updated[deleteCaseId]
        return updated
      })
      toast.success("Surgery case deleted successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete case")
    } finally {
      setDeleteCaseId(null)
    }
  }

  const openCaseDetail = (record: SurgeryCase) => {
    setSelectedCase(record)
    setDetailForm(caseDetails[record.id] ?? createDefaultDetail())
  }

  const closeCaseDetail = () => {
    setSelectedCase(null)
    setDetailForm(createDefaultDetail())
    setDetailSaving(false)
  }

  const updateDetailField = <K extends keyof CaseDetail>(key: K, value: CaseDetail[K]) => {
    setDetailForm((prev) => ({ ...prev, [key]: value }))
  }

  const saveCaseDetail = () => {
    if (!selectedCase) return
    setDetailSaving(true)
    setCaseDetails((prev) => ({ ...prev, [selectedCase.id]: detailForm }))
    setTimeout(() => {
      setDetailSaving(false)
      closeCaseDetail()
    }, 250)
  }

  const resetFilters = () => {
    setStatusFilter("All")
    setTimeframeFilter("all")
    setSearchTerm("")
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Surgery Programs"
        subtitle="Run OR schedules, bundled tariffs, and perioperative checklists from one dashboard"
      />

      <Card className="brand-card brand-card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#020617] via-[#1e1b4b] to-[#0ea5e9] p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Surgical command</p>
                <h2 className="text-3xl font-bold">OR readiness center</h2>
                <p className="text-sm text-white/80">
                  Monitor anesthesia blocks, tie protocols to tariffs, and keep ledgers synced before scrubbing in.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <Badge className="brand-pill border border-white/30 bg-white/10 text-white">
                  {activePackageCount ? `${activePackageCount} active protocols` : "No active protocols"}
                </Badge>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    onClick={() => openPackageModal()}
                    className="rounded-2xl bg-white/90 px-5 py-2 text-[#020617] hover:bg-white"
                  >
                    <Plus className="mr-2 h-4 w-4" /> New package
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openAddonModal()}
                    className="rounded-2xl border-white/60 text-white"
                  >
                    <Sparkles className="mr-2 h-4 w-4" /> Add-on
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            {heroMetrics.map(({ label, value, hint, accent, icon: Icon }) => (
              <div
                key={label}
                className={`rounded-2xl border border-white/10 bg-linear-to-br ${accent} p-4 text-white shadow-lg`}
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
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Surgery bundles</CardTitle>
            <CardDescription>Standardize quotes and inclusions for every tier.</CardDescription>
          </div>
          <Button className="rounded-2xl" onClick={() => openPackageModal()}>
            <Plus className="mr-2 h-4 w-4" /> New package
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-3xl border border-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-foreground">{pkg.name}</p>
                  <p className="text-sm text-muted-foreground">{pkg.length}</p>
                </div>
                <Badge variant={pkg.active ? "default" : "outline"} className="rounded-full">
                  {pkg.active ? "Active" : "Archived"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{pkg.description}</p>
              <p className="text-xl font-bold text-primary">{pkg.priceRange}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openPackageModal(pkg)} className="gap-2 rounded-2xl">
                  <Edit2 className="h-4 w-4" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-2xl text-rose-600 hover:text-rose-700"
                  onClick={() => setPackages((prev) => prev.filter((item) => item.id !== pkg.id))}
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Add-on services</CardTitle>
            <CardDescription>Layer premium monitoring, imaging, or concierge moments.</CardDescription>
          </div>
          <Button variant="outline" className="rounded-2xl" onClick={() => openAddonModal()}>
            <Plus className="mr-2 h-4 w-4" /> Add item
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {addons.map((service) => (
            <div key={service.id} className="rounded-2xl border border-dashed border-border/80 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{service.name}</p>
                <p className="text-sm text-muted-foreground">{service.price}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => openAddonModal(service)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setAddons((prev) => prev.filter((item) => item.id !== service.id))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-blue-50 p-2 text-blue-700">
              <Filter className="h-4 w-4" />
            </span>
            <div>
              <CardTitle>OR Schedule Ledger</CardTitle>
              <CardDescription>Search, filter, and clear cases in seconds.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label className="text-xs uppercase text-muted-foreground">Search</Label>
              <Input
                className="mt-1 rounded-2xl"
                placeholder="Pet, client, doctor, or procedure"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AppointmentStatus | "All")}>
                <SelectTrigger className="mt-1 rounded-2xl">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="No-Show">No-Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Timeframe</Label>
              <Select value={timeframeFilter} onValueChange={(value) => setTimeframeFilter(value as typeof timeframeFilter)}>
                <SelectTrigger className="mt-1 rounded-2xl">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>
              Showing <strong>{filteredCases.length}</strong> cases
            </span>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-primary">
              Reset filters
            </Button>
            <Button variant="outline" size="sm" className="ml-auto gap-2 rounded-2xl">
              <Download className="h-4 w-4" /> Export ledger
            </Button>
          </div>

          <div className="rounded-3xl border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Pet / Client</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{record.date || "—"}</div>
                      <div className="text-xs text-muted-foreground">{record.time}</div>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-foreground">{record.patient}</p>
                      <p className="text-xs text-muted-foreground">{record.client}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">{record.reason || "Awaiting description"}</p>
                    </TableCell>
                    <TableCell>{record.doctor}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`rounded-full border ${SURGERY_STATUS_BADGE[record.status]}`}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => openCaseDetail(record)}>
                        <Stethoscope className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => handleDeleteCaseClick(record.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredCases.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No surgeries match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-emerald-50 p-2 text-emerald-700">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <CardTitle>Pre / Post-op Checklist</CardTitle>
              <CardDescription>Make sure no patient enters or exits OR without the essentials.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {CASE_BOOLEAN_CHECKS.map((item) => (
              <label key={item.key} className="flex items-center gap-3 rounded-2xl border border-dashed border-border/60 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={detailForm[item.key]}
                  onChange={(event) => updateDetailField(item.key, event.target.checked)}
                  disabled={!selectedCase}
                />
                {item.label}
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-sm font-medium">Anesthesia plan</Label>
              <Input
                className="mt-1"
                placeholder="Induction, maintenance, monitoring"
                value={detailForm.anesthesiaPlan}
                onChange={(event) => updateDetailField("anesthesiaPlan", event.target.value)}
                disabled={!selectedCase}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Recovery plan</Label>
              <Input
                className="mt-1"
                placeholder="Analgesia, temperature, discharge"
                value={detailForm.recoveryPlan}
                onChange={(event) => updateDetailField("recoveryPlan", event.target.value)}
                disabled={!selectedCase}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <Input
                className="mt-1"
                placeholder="Implants, owner preferences, risks"
                value={detailForm.notes}
                onChange={(event) => updateDetailField("notes", event.target.value)}
                disabled={!selectedCase}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              className="rounded-2xl"
              disabled={!selectedCase || detailSaving}
              onClick={saveCaseDetail}
            >
              {detailSaving ? "Saving..." : "Save detail"}
            </Button>
            <Button variant="ghost" className="rounded-2xl" disabled={!selectedCase} onClick={closeCaseDetail}>
              Close panel
            </Button>
          </div>
          {!selectedCase && (
            <p className="mt-4 text-sm text-muted-foreground">
              Select a surgery from the OR ledger to populate this checklist.
            </p>
          )}
        </CardContent>
      </Card>

      {appointmentLoading && (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader />
          </CardContent>
        </Card>
      )}

      {appointmentError && !appointmentLoading && (
        <Card className="border border-rose-200 bg-rose-50">
          <CardContent className="flex items-center gap-3 py-4 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
            {appointmentError}
          </CardContent>
        </Card>
      )}

      {(showPackageModal || showAddonModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{showPackageModal ? (editingPackage ? "Edit package" : "Add package") : editingAddon ? "Edit add-on" : "Add add-on"}</CardTitle>
                <CardDescription>
                  {showPackageModal ? "Update bundled tariffs" : "Layer optional experiences"}
                </CardDescription>
              </div>
              <button className="text-2xl text-muted-foreground" onClick={() => { setShowPackageModal(false); setShowAddonModal(false) }}>
                <X />
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              {showPackageModal ? (
                <>
                  <div>
                    <Label>Name</Label>
                    <Input className="mt-1" value={packageForm.name} onChange={(event) => setPackageForm({ ...packageForm, name: event.target.value })} />
                  </div>
                  <div>
                    <Label>Price range</Label>
                    <Input className="mt-1" value={packageForm.priceRange} onChange={(event) => setPackageForm({ ...packageForm, priceRange: event.target.value })} />
                  </div>
                  <div>
                    <Label>Length / OR time</Label>
                    <Input className="mt-1" value={packageForm.length} onChange={(event) => setPackageForm({ ...packageForm, length: event.target.value })} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input className="mt-1" value={packageForm.description} onChange={(event) => setPackageForm({ ...packageForm, description: event.target.value })} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Name</Label>
                    <Input className="mt-1" value={addonForm.name} onChange={(event) => setAddonForm({ ...addonForm, name: event.target.value })} />
                  </div>
                  <div>
                    <Label>Price</Label>
                    <Input className="mt-1" value={addonForm.price} onChange={(event) => setAddonForm({ ...addonForm, price: event.target.value })} />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setShowPackageModal(false); setShowAddonModal(false) }}>
                  Cancel
                </Button>
                <Button onClick={showPackageModal ? savePackage : saveAddon}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleteCaseId !== null}
        onOpenChange={(open) => !open && setDeleteCaseId(null)}
        title="Delete Surgery Case"
        description="Are you sure you want to delete this surgery case? This action cannot be undone."
        onConfirm={handleDeleteCaseConfirm}
        variant="danger"
      />
    </div>
  )
}
