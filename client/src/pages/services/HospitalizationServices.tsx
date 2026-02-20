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
  AlertTriangle,
  BedDouble,
  ClipboardCheck,
  Download,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  FileText,
  HeartPulse,
  Plus,
  RefreshCcw,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api"
import { useToast } from "@/components/common/Toast"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"

interface InpatientPackage {
  id: number
  name: string
  price: string
  description: string
  lengthOfStay: string
  wardLevel: string
  active: boolean
}

interface AddonCare {
  id: number
  name: string
  price: string
  description: string
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

type AppointmentStatus = "Scheduled" | "Completed" | "Cancelled" | "No-Show"

interface ApiAdmission {
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

interface InpatientCase {
  id: string
  date: string
  time: string
  client: string
  pet: string
  reason: string
  doctor: string
  status: AppointmentStatus
}

type RoundsDetail = {
  admissionSummary: string
  vitalsScore: string
  medications: string
  catheterNotes: string
  dietPlan: string
  dischargePlan: string
  consentSigned: boolean
  isolationRequired: boolean
  painScaleCaptured: boolean
  ownerUpdatesSent: boolean
}

type ApiHospitalizationCase = {
  id: number
  appointment_id: number
  admission_date: string | null
  admission_time: string | null
  discharge_date: string | null
  discharge_time: string | null
  diagnosis: string | null
  treatment_plan: string | null
  medications: string | null
  vitals_on_admission: string | null
  cage_number: string | null
  isolation_required: boolean
  iv_fluids_required: boolean
  oxygen_support: boolean
  special_diet: string | null
  daily_notes: string | null
}

type RoundsChecklistKey = keyof Pick<
  RoundsDetail,
  "consentSigned" | "isolationRequired" | "painScaleCaptured" | "ownerUpdatesSent"
>

interface RoundsHistoryEntry {
  caseId: string
  inpatientCase: InpatientCase
  detail: RoundsDetail
  updatedAt: number
}

const HOSPITAL_KEYWORDS = ["hospital", "ward", "inpatient", "icu", "drip", "fluid", "monitoring", "catheter"]

const CASE_STATUS_BADGE: Record<AppointmentStatus, string> = {
  Scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  "No-Show": "bg-rose-50 text-rose-600 border-rose-200",
}

const ROUNDS_CHECKS: Array<{ key: RoundsChecklistKey; label: string }> = [
  { key: "consentSigned", label: "Consent signed" },
  { key: "isolationRequired", label: "Isolation in place" },
  { key: "painScaleCaptured", label: "Pain scale logged" },
  { key: "ownerUpdatesSent", label: "Owner updated" },
]

const normalizeDate = (value?: string | null) => {
  if (!value) return ""
  return value.length >= 10 ? value.slice(0, 10) : value
}

const mapInpatientCase = (api: ApiAdmission): InpatientCase => ({
  id: String(api.id),
  date: normalizeDate(api.date),
  time: api.time || "",
  client: api.client_name || api.client_code || "Walk-in",
  pet: api.pet_name || "Unassigned",
  reason: api.reason || "",
  doctor: api.doctor || "Unassigned",
  status: (api.status || "Scheduled") as AppointmentStatus,
})

const recordTimestamp = (inpatientCase: InpatientCase) => {
  if (!inpatientCase.date) return null
  const iso = `${inpatientCase.date}T${inpatientCase.time || "00:00"}`
  const value = Date.parse(iso)
  return Number.isNaN(value) ? null : value
}

const createDefaultDetail = (): RoundsDetail => ({
  admissionSummary: "",
  vitalsScore: "",
  medications: "",
  catheterNotes: "",
  dietPlan: "",
  dischargePlan: "",
  consentSigned: false,
  isolationRequired: false,
  painScaleCaptured: false,
  ownerUpdatesSent: false,
})

const formatNumber = (value: number) => value.toLocaleString("en-LK")

export default function HospitalizationServices() {
  const toast = useToast()
  const [deletePackageId, setDeletePackageId] = useState<number | null>(null)
  const [deleteServiceId, setDeleteServiceId] = useState<number | null>(null)
  const [deleteCaseId, setDeleteCaseId] = useState<string | null>(null)

  const [packages, setPackages] = useState<InpatientPackage[]>([
    {
      id: 1,
      name: "Stabilization stay",
      price: "Rs. 28,500 / day",
      description: "Fluids, 24h vitals, injectable meds, shared ward",
      lengthOfStay: "1-3 days",
      wardLevel: "Standard ward",
      active: true,
    },
    {
      id: 2,
      name: "ICU monitoring",
      price: "Rs. 56,000 / day",
      description: "Ventilated cages, invasive BP, blood gas checks",
      lengthOfStay: "Per shift",
      wardLevel: "Critical care",
      active: true,
    },
    {
      id: 3,
      name: "Chronic pain lodge",
      price: "Rs. 34,900 / day",
      description: "Analgesia drips, physio touchpoints, dedicated nurse",
      lengthOfStay: "Weekly blocks",
      wardLevel: "Comfort suite",
      active: true,
    },
  ])

  const [addonServices, setAddonServices] = useState<AddonCare[]>([
    { id: 1, name: "Dedicated nurse", price: "Rs. 12,000 / shift", description: "1:1 nursing for critical watch" },
    { id: 2, name: "Owner overnight couch", price: "Rs. 9,500", description: "Bedside pass for anxious owners" },
    { id: 3, name: "Advanced diagnostics", price: "Rs. 18,200", description: "Daily ultrasound and labs" },
  ])

  const [showPackageModal, setShowPackageModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<InpatientPackage | null>(null)
  const [editingService, setEditingService] = useState<AddonCare | null>(null)

  const [packageForm, setPackageForm] = useState<InpatientPackage>({
    id: 0,
    name: "",
    price: "",
    description: "",
    lengthOfStay: "",
    wardLevel: "",
    active: true,
  })
  const [serviceForm, setServiceForm] = useState<AddonCare>({ id: 0, name: "", price: "", description: "" })

  const [cases, setCases] = useState<InpatientCase[]>([])
  const [casesLoading, setCasesLoading] = useState(true)
  const [casesError, setCasesError] = useState("")
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "All">("All")
  const [dateFilter, setDateFilter] = useState<"all" | "upcoming" | "past">("all")

  const [selectedCase, setSelectedCase] = useState<InpatientCase | null>(null)
  const [detailForm, setDetailForm] = useState<RoundsDetail>(createDefaultDetail())
  const [detailSaving, setDetailSaving] = useState(false)
  const [roundsHistory, setRoundsHistory] = useState<RoundsHistoryEntry[]>([])
  const [hospitalizationCaseId, setHospitalizationCaseId] = useState<number | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const hospitalKeywords = useMemo(() => HOSPITAL_KEYWORDS.map((keyword) => keyword.toLowerCase()), [])

  const fetchCases = useCallback(async () => {
    setCasesLoading(true)
    setCasesError("")
    try {
      const response = await apiGet<ApiAdmission[]>("/api/appointments?page=1&limit=500")
      const mapped = response.data.map(mapInpatientCase)
      const filtered = mapped.filter((record) => {
        const reason = record.reason.toLowerCase()
        return hospitalKeywords.some((keyword) => reason.includes(keyword))
      })
      setCases(filtered)
    } catch (error) {
      setCasesError(error instanceof Error ? error.message : "Failed to load hospitalizations")
    } finally {
      setCasesLoading(false)
    }
  }, [hospitalKeywords])

  const fetchPackages = useCallback(async () => {
    try {
      const res = await apiGet<ApiServicePackage[]>("/api/service-types/packages/by-type/hospitalization")
      if (res.data.length > 0) {
        setPackages(res.data.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          price: `Rs. ${parseFloat(pkg.price).toLocaleString()}`,
          description: pkg.description || "",
          lengthOfStay: pkg.duration_days ? `${pkg.duration_days} days` : "Per day",
          wardLevel: "Standard ward",
          active: pkg.status === "active"
        })))
      }
    } catch {
      // Use default packages if API fails
    }
  }, [])

  const fetchAddonServices = useCallback(async () => {
    try {
      const res = await apiGet<ApiAddOnService[]>("/api/service-types/addons/by-type/hospitalization")
      if (res.data.length > 0) {
        setAddonServices(res.data.map(addon => ({
          id: addon.id,
          name: addon.name,
          price: `Rs. ${parseFloat(addon.price).toLocaleString()}`,
          description: addon.description || ""
        })))
      }
    } catch {
      // Use default services if API fails
    }
  }, [])

  useEffect(() => {
    fetchCases()
    fetchPackages()
    fetchAddonServices()
  }, [fetchCases, fetchPackages, fetchAddonServices])

  const totalAdmissions = cases.length

  const upcomingAdmissions = useMemo(() => {
    const now = Date.now()
    return cases.filter((record) => {
      const ts = recordTimestamp(record)
      return ts !== null && ts >= now
    }).length
  }, [cases])

  const dischargedThisWeek = useMemo(() => {
    const now = Date.now()
    const threshold = now - 7 * 24 * 60 * 60 * 1000
    return cases.filter((record) => {
      const ts = recordTimestamp(record)
      return ts !== null && record.status === "Completed" && ts >= threshold
    }).length
  }, [cases])

  const activeProtocols = useMemo(() => packages.filter((pkg) => pkg.active).length, [packages])

  const filteredCases = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const now = Date.now()

    return cases
      .filter((record) => {
        const matchesStatus = statusFilter === "All" || record.status === statusFilter
        const matchesSearch =
          !normalizedSearch ||
          [record.pet, record.client, record.reason, record.doctor]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(normalizedSearch))
        const ts = recordTimestamp(record)
        const matchesDate =
          dateFilter === "all" ||
          (dateFilter === "upcoming" ? ts !== null && ts >= now : ts !== null && ts < now)

        return matchesStatus && matchesSearch && matchesDate
      })
      .sort((a, b) => {
        const aTime = recordTimestamp(a)
        const bTime = recordTimestamp(b)
        if (aTime === bTime) return 0
        if (aTime === null) return 1
        if (bTime === null) return -1
        return aTime - bTime
      })
  }, [cases, searchTerm, statusFilter, dateFilter])

  const heroMetrics = [
    {
      label: "Inpatient census",
      value: formatNumber(totalAdmissions),
      hint: `${upcomingAdmissions} arrivals scheduled`,
      accent: "from-[#0f172a] to-[#2563eb]",
      icon: BedDouble,
    },
    {
      label: "Discharges (7d)",
      value: formatNumber(dischargedThisWeek),
      hint: "Completed with handovers",
      accent: "from-[#065f46] to-[#10b981]",
      icon: ClipboardCheck,
    },
    {
      label: "Care bundles",
      value: formatNumber(activeProtocols),
      hint: "Live hospitalization offerings",
      accent: "from-[#7c2d12] to-[#f97316]",
      icon: Stethoscope,
    },
  ]

  const highlightStats = [
    { label: "Avg ICU occupancy", value: "78%", accent: "text-indigo-600" },
    { label: "Isolation wards", value: "4 active", accent: "text-rose-600" },
    { label: "Nurse-to-patient", value: "1 : 3", accent: "text-emerald-600" },
  ]

  const escalationSignals = [
    {
      title: "Fluid therapy",
      bullet: "Check pump history, replace lines every 24h",
      icon: Activity,
    },
    {
      title: "Pain rounds",
      bullet: "Pain score >6 triggers on-call vet push notification",
      icon: HeartPulse,
    },
    {
      title: "Isolation block",
      bullet: "UV sterilization logged before moving patients",
      icon: AlertTriangle,
    },
  ]

  const openPackageModal = (pkg?: InpatientPackage) => {
    if (pkg) {
      setEditingPackage(pkg)
      setPackageForm(pkg)
    } else {
      setEditingPackage(null)
      setPackageForm({
        id: Math.max(0, ...packages.map((item) => item.id)) + 1,
        name: "",
        price: "",
        description: "",
        lengthOfStay: "",
        wardLevel: "",
        active: true,
      })
    }
    setShowPackageModal(true)
  }

  const openServiceModal = (service?: AddonCare) => {
    if (service) {
      setEditingService(service)
      setServiceForm(service)
    } else {
      setEditingService(null)
      setServiceForm({
        id: Math.max(0, ...addonServices.map((serviceItem) => serviceItem.id)) + 1,
        name: "",
        price: "",
        description: "",
      })
    }
    setShowServiceModal(true)
  }

  const savePackage = () => {
    if (!packageForm.name || !packageForm.price || !packageForm.description || !packageForm.lengthOfStay || !packageForm.wardLevel) {
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
      setAddonServices((prev) => prev.map((svc) => (svc.id === serviceForm.id ? serviceForm : svc)))
    } else {
      setAddonServices((prev) => [...prev, serviceForm])
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
    toast.success("Bundle deleted successfully")
    setDeletePackageId(null)
  }

  const handleDeleteServiceClick = (id: number) => {
    setDeleteServiceId(id)
  }

  const handleDeleteServiceConfirm = () => {
    if (deleteServiceId === null) return
    setAddonServices((prev) => prev.filter((service) => service.id !== deleteServiceId))
    toast.success("Add-on deleted successfully")
    setDeleteServiceId(null)
  }

  const openCaseDetail = async (inpatientCase: InpatientCase) => {
    setSelectedCase(inpatientCase)
    setDetailLoading(true)
    setHospitalizationCaseId(null)
    setDetailForm(createDefaultDetail())
    try {
      const res = await apiGet<ApiHospitalizationCase>(`/api/services-extension/hospitalization-cases/by-appointment/${inpatientCase.id}`)
      const data = res.data
      setHospitalizationCaseId(data.id)
      setDetailForm({
        admissionSummary: data.diagnosis || "",
        vitalsScore: data.vitals_on_admission || "",
        medications: data.medications || "",
        catheterNotes: data.daily_notes || "",
        dietPlan: data.special_diet || "",
        dischargePlan: data.treatment_plan || "",
        consentSigned: false,
        isolationRequired: data.isolation_required || false,
        painScaleCaptured: false,
        ownerUpdatesSent: false,
      })
    } catch {
      // No existing record - use defaults
    } finally {
      setDetailLoading(false)
    }
  }

  const closeCaseDetail = () => {
    setSelectedCase(null)
    setDetailForm(createDefaultDetail())
    setHospitalizationCaseId(null)
    setDetailSaving(false)
  }

  const updateDetailField = <K extends keyof RoundsDetail>(key: K, value: RoundsDetail[K]) => {
    setDetailForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveDetail = async () => {
    if (!selectedCase) return
    setDetailSaving(true)
    try {
      const payload = {
        appointment_id: Number(selectedCase.id),
        diagnosis: detailForm.admissionSummary,
        treatment_plan: detailForm.dischargePlan,
        medications: detailForm.medications,
        vitals_on_admission: detailForm.vitalsScore,
        isolation_required: detailForm.isolationRequired,
        special_diet: detailForm.dietPlan,
        daily_notes: detailForm.catheterNotes,
      }
      if (hospitalizationCaseId) {
        await apiPut(`/api/services-extension/hospitalization-cases/${hospitalizationCaseId}`, payload)
        toast.success("Hospitalization details updated successfully")
      } else {
        const res = await apiPost<ApiHospitalizationCase>("/api/services-extension/hospitalization-cases", payload)
        setHospitalizationCaseId(res.data.id)
        toast.success("Hospitalization details saved successfully")
      }
      setRoundsHistory((prev) => {
        const entry: RoundsHistoryEntry = {
          caseId: selectedCase.id,
          inpatientCase: selectedCase,
          detail: detailForm,
          updatedAt: Date.now(),
        }
        const index = prev.findIndex((item) => item.caseId === selectedCase.id)
        if (index === -1) {
          return [entry, ...prev]
        }
        const clone = [...prev]
        clone[index] = entry
        return clone
      })
      closeCaseDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save hospitalization details")
    } finally {
      setDetailSaving(false)
    }
  }

  const handleDeleteCaseClick = (caseId: string) => {
    setDeleteCaseId(caseId)
  }

  const handleDeleteCaseConfirm = async () => {
    if (!deleteCaseId) return
    setDeletePendingId(deleteCaseId)
    try {
      await apiDelete(`/api/appointments/${deleteCaseId}`)
      setCases((prev) => prev.filter((record) => record.id !== deleteCaseId))
      setRoundsHistory((prev) => prev.filter((entry) => entry.caseId !== deleteCaseId))
      toast.success("Hospitalization deleted successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete hospitalization")
    } finally {
      setDeletePendingId(null)
      setDeleteCaseId(null)
    }
  }

  const handleExportLedger = () => {
    if (!filteredCases.length) return
    const headers = ["Pet", "Client", "Date", "Time", "Reason", "Veterinarian", "Status"]
    const rows = filteredCases.map((record) => [
      record.pet,
      record.client,
      record.date || "",
      record.time || "",
      record.reason,
      record.doctor,
      record.status,
    ])
    const csv = [headers.join(","), ...rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `hospitalization-ledger-${Date.now()}.csv`
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
        title="Hospitalization Services"
        subtitle="Cat Boarding-grade control room tuned for inpatient wards, ICU signals, and concierge add-ons."
      />

      <Card className="brand-card brand-card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#020617] via-[#1e1b4b] to-[#0ea5e9] p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Ward telemetry</p>
                <h2 className="text-3xl font-bold">Inpatient readiness deck</h2>
                <p className="text-sm text-white/80">
                  Same neon grip as Cat Boarding so frontline staff can manage beds, alerts, and ledger exports in one sweep.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <Badge className="brand-pill border border-white/30 bg-white/10 text-white">
                  {activeProtocols ? `${activeProtocols} active bundles` : "No active bundles"}
                </Badge>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    onClick={() => openPackageModal()}
                    className="rounded-2xl bg-white/90 px-5 py-2 text-[#020617] hover:bg-white"
                  >
                    <Plus className="mr-2 h-4 w-4" /> New bundle
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openServiceModal()}
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
                Search hospitalization ledger rows, gate by status/date, refresh live admissions, or drop CSV snapshots.
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
                  <SelectItem value="all">All admissions</SelectItem>
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
                <Button variant="outline" onClick={fetchCases} className="flex-1 h-11 rounded-2xl">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button
                  onClick={handleExportLedger}
                  disabled={!filteredCases.length}
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
              <p className="text-xs text-muted-foreground">Live ward signal</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">Hospitalization bundles</CardTitle>
            <CardDescription>Tiered stays, monitoring levels, and inclusive services.</CardDescription>
          </div>
          <Button onClick={() => openPackageModal()} className="rounded-2xl">
            <Plus className="mr-2 h-4 w-4" /> Add bundle
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
                    <p className="text-xs text-muted-foreground">{pkg.lengthOfStay} · {pkg.wardLevel}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => togglePackageActive(pkg.id)}
                      className="h-9 w-9 rounded-2xl"
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
              <CardTitle>Add-on care</CardTitle>
              <CardDescription>Concierge upgrades mirrored from Cat Boarding.</CardDescription>
            </div>
            <Button onClick={() => openServiceModal()} className="rounded-2xl">
              <Plus className="mr-2 h-4 w-4" /> Add add-on
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
                  {addonServices.map((service) => (
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
            <CardTitle>Escalation signals</CardTitle>
            <CardDescription>Quick prompts for nursing handovers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {escalationSignals.map(({ title, bullet, icon: Icon }) => (
              <div key={title} className="flex items-start gap-3 rounded-2xl border border-dashed border-muted-foreground/30 p-4">
                <span className="rounded-2xl bg-muted/80 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{bullet}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">Hospitalization ledger</CardTitle>
            <CardDescription>Cat Boarding-style ledger filtered to inpatient keywords.</CardDescription>
          </div>
          <Button onClick={handleExportLedger} disabled={!filteredCases.length} className="rounded-2xl">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {casesError && <p className="px-6 pt-4 text-sm text-rose-600">{casesError}</p>}
          {casesLoading ? (
            <div className="flex justify-center py-12">
              <Loader />
            </div>
          ) : filteredCases.length ? (
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
                  {filteredCases.map((record) => (
                    <TableRow key={record.id} className="transition hover:bg-muted/40">
                      <TableCell>
                        <p className="font-semibold text-foreground">{record.pet}</p>
                        <p className="text-xs text-muted-foreground">{record.client}</p>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        <div className="space-y-0.5">
                          <p>{record.date || "Date TBD"}</p>
                          <p className="text-xs text-muted-foreground">{record.time || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{record.reason || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`${CASE_STATUS_BADGE[record.status]} border`}>{record.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{record.doctor}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openCaseDetail(record)} className="rounded-2xl">
                            Manage
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-2xl text-rose-600 hover:text-rose-700"
                            disabled={deletePendingId === record.id}
                            onClick={() => handleDeleteCaseClick(record.id)}
                          >
                            {deletePendingId === record.id ? "Deleting…" : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No hospitalization-focused appointments found.</p>
          )}
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <CardTitle>Rounds history</CardTitle>
          <CardDescription>Saved ward checklists, identical to the Cat Boarding stays block.</CardDescription>
        </CardHeader>
        <CardContent>
          {roundsHistory.length ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {roundsHistory.map(({ caseId, inpatientCase, detail }) => {
                const completedChecks = ROUNDS_CHECKS.filter(({ key }) => detail[key])
                return (
                  <div key={caseId} className="rounded-2xl border border-sky-100 bg-white shadow-sm transition hover:shadow-md">
                    <div className="space-y-3 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-sky-50 p-3 text-sky-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-foreground">{inpatientCase.pet}</p>
                              <p className="text-sm text-muted-foreground">{inpatientCase.client}</p>
                            </div>
                            <Badge className={`${CASE_STATUS_BADGE[inpatientCase.status]} border`}>{inpatientCase.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(inpatientCase.date || "Date TBD")} · {(inpatientCase.time || "—")} · {inpatientCase.doctor}
                          </p>
                          {inpatientCase.reason && <p className="text-xs text-muted-foreground">Reason: {inpatientCase.reason}</p>}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {completedChecks.length ? (
                          completedChecks.map(({ key, label }) => (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800"
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
                          <p className="text-xs uppercase text-gray-400">Admission summary</p>
                          <p className={`mt-1 whitespace-pre-line ${detail.admissionSummary ? "text-foreground" : "text-muted-foreground"}`}>
                            {detail.admissionSummary || "Pending"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-gray-400">Vitals / meds</p>
                          <p className={`mt-1 whitespace-pre-line ${detail.vitalsScore || detail.medications ? "text-foreground" : "text-muted-foreground"}`}>
                            {detail.vitalsScore || detail.medications || "Not logged"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-gray-400">Diet & discharge</p>
                          <p className={`mt-1 whitespace-pre-line ${detail.dietPlan || detail.dischargePlan ? "text-foreground" : "text-muted-foreground"}`}>
                            {detail.dietPlan || detail.dischargePlan || "Awaiting plan"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t bg-sky-50/60 px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openCaseDetail(inpatientCase)} className="rounded-2xl">
                        Update
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Save a rounds checklist to populate history cards.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" className="rounded-2xl">
          Cancel
        </Button>
        <Button className="rounded-2xl bg-[#4338ca] text-white hover:bg-[#312e81]">Save changes</Button>
      </div>

      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Ward checklist</CardTitle>
                <CardDescription>
                  {selectedCase.pet} · {selectedCase.client}
                </CardDescription>
              </div>
              <button className="text-2xl text-muted-foreground hover:text-foreground" onClick={closeCaseDetail}>
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
                      <Label>Admission summary</Label>
                      <textarea
                        className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                        rows={3}
                        value={detailForm.admissionSummary}
                        onChange={(event) => updateDetailField("admissionSummary", event.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Vitals score / notes</Label>
                      <textarea
                        className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                        rows={3}
                        value={detailForm.vitalsScore}
                        onChange={(event) => updateDetailField("vitalsScore", event.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Medications</Label>
                      <textarea
                        className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                        rows={3}
                        value={detailForm.medications}
                        onChange={(event) => updateDetailField("medications", event.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Catheter / lines</Label>
                      <textarea
                        className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                        rows={3}
                        value={detailForm.catheterNotes}
                        onChange={(event) => updateDetailField("catheterNotes", event.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Diet plan</Label>
                      <textarea
                        className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                        rows={3}
                        value={detailForm.dietPlan}
                        onChange={(event) => updateDetailField("dietPlan", event.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Discharge plan</Label>
                      <textarea
                        className="mt-2 w-full rounded-2xl border border-gray-300 p-3 text-sm"
                        rows={3}
                        value={detailForm.dischargePlan}
                        onChange={(event) => updateDetailField("dischargePlan", event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {ROUNDS_CHECKS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 rounded-2xl border border-gray-200 p-3 text-sm font-semibold text-foreground">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={detailForm[key] as boolean}
                          onChange={(event) => updateDetailField(key, event.target.checked as RoundsDetail[typeof key])}
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={closeCaseDetail} className="rounded-2xl">
                      Cancel
                    </Button>
                    <Button onClick={handleSaveDetail} disabled={detailSaving} className="rounded-2xl bg-[#4338ca] text-white">
                      {detailSaving ? "Saving…" : "Save details"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/5 p-4 backdrop-blur-md">
          <Card className="w-full max-w-2xl rounded-3xl shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-linear-to-r from-sky-50 to-purple-100 pb-4">
              <div>
                <CardTitle className="text-2xl font-bold text-indigo-900">
                  {editingPackage ? "✏️ Edit bundle" : "➕ Add new bundle"}
                </CardTitle>
                <CardDescription className="text-indigo-700">
                  {editingPackage ? "Update bundle details" : "Create a new hospitalization bundle"}
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
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Bundle name *</Label>
                  <Input
                    value={packageForm.name}
                    onChange={(event) => setPackageForm({ ...packageForm, name: event.target.value })}
                    placeholder="e.g., ICU monitoring"
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Price *</Label>
                  <Input
                    value={packageForm.price}
                    onChange={(event) => setPackageForm({ ...packageForm, price: event.target.value })}
                    placeholder="e.g., Rs. 56,000 / day"
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
                  placeholder="Outline what's included in this stay"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Length of stay *</Label>
                  <Input
                    value={packageForm.lengthOfStay}
                    onChange={(event) => setPackageForm({ ...packageForm, lengthOfStay: event.target.value })}
                    placeholder="e.g., Per shift"
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-gray-700">Ward level *</Label>
                  <Input
                    value={packageForm.wardLevel}
                    onChange={(event) => setPackageForm({ ...packageForm, wardLevel: event.target.value })}
                    placeholder="e.g., Critical care"
                    className="rounded-2xl"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-foreground">
                <span>Active bundle</span>
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
                  {editingPackage ? "Update bundle" : "Create bundle"}
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
                  placeholder="e.g., Dedicated nurse"
                  className="rounded-2xl"
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold text-gray-700">Price *</Label>
                <Input
                  value={serviceForm.price}
                  onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })}
                  placeholder="e.g., Rs. 12,000"
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
        title="Delete Bundle"
        description="Are you sure you want to delete this hospitalization bundle? This action cannot be undone."
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
        open={deleteCaseId !== null}
        onOpenChange={(open) => !open && setDeleteCaseId(null)}
        title="Delete Hospitalization"
        description="Are you sure you want to delete this hospitalization record? This action cannot be undone."
        onConfirm={handleDeleteCaseConfirm}
        variant="danger"
      />
    </div>
  )
}
