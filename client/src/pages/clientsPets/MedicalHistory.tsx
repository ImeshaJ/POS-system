import { useCallback, useEffect, useMemo, useState } from "react"
import type { ChangeEvent } from "react"
import { useSearchParams } from "react-router-dom"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FileText,
  Search,
  Pill,
  Syringe,
  AlertCircle,
  ChevronDown,
  Stethoscope,
  Activity,
  ClipboardList,
  CheckCircle2,
  RefreshCw,
  CalendarClock,
  Filter,
} from "lucide-react"
import { apiDelete, apiGet, apiPatch } from "@/lib/api"
import type { Attachment } from "@/lib/attachments"
import {
  buildAttachmentDataUrl,
  cloneAttachments,
  formatFileSize,
  normalizeAttachments,
  readFileAsAttachment,
} from "@/lib/attachments"

type Status = "Scheduled" | "Completed" | "Cancelled" | "No-Show"

type ApiAppointment = {
  id: number
  date: string
  time: string
  client_name?: string
  client_id?: number | null
  client_code?: string | null
  pet_name?: string
  pet_type?: string
  age?: string | null
  weight?: string | null
  doctor?: string
  reason?: string
  status?: Status
  notes?: string
  last_visit?: string | null
  attachments?: unknown
}

type MedicalRecord = {
  id: string
  petName: string
  owner: string
  clientId: string
  date: string
  type: string
  details: string
  vet: string
  nextVisit: string
  status: Status
  notes: string
  petType: string
  age: string
  weight: string
  attachments: Attachment[]
}

type ViewMode = "grid" | "table"

type EditFormState = {
  details: string
  vet: string
  status: Status
  nextVisit: string
  notes: string
  petType: string
  age: string
  weight: string
  attachments: Attachment[]
}

const BASE_TYPES = ["Checkup", "Treatment", "Vaccination", "Surgery", "Prescription"]
const STATUS_OPTIONS: Status[] = ["Scheduled", "Completed", "Cancelled", "No-Show"]

const normalizeDateString = (value?: string | null) => {
  if (!value) return ""
  if (value.length >= 10) return value.slice(0, 10)
  return value
}

const inferRecordType = (reason?: string) => {
  if (!reason) return "Checkup"
  const lower = reason.toLowerCase()
  if (lower.includes("surg")) return "Surgery"
  if (lower.includes("vacci") || lower.includes("vaccine")) return "Vaccination"
  if (lower.includes("treat") || lower.includes("therapy")) return "Treatment"
  if (lower.includes("prescription") || lower.includes("rx") || lower.includes("med")) return "Prescription"
  return "Checkup"
}

const mapToMedicalRecord = (api: ApiAppointment): MedicalRecord => ({
  id: String(api.id),
  petName: api.pet_name || "Unnamed Pet",
  owner: api.client_name || "Unknown Owner",
  clientId: api.client_code || (api.client_id ? String(api.client_id) : "-"),
  date: normalizeDateString(api.date),
  type: inferRecordType(api.reason),
  details: api.reason || "General consultation",
  vet: api.doctor || "Unassigned",
  nextVisit: normalizeDateString(api.last_visit) || "-",
  status: (api.status || "Scheduled") as Status,
  notes: api.notes || "",
  petType: api.pet_type || "-",
  age: api.age || "-",
  weight: api.weight || "-",
  attachments: normalizeAttachments(api.attachments),
})

const getRecordIcon = (type: string) => {
  switch (type) {
    case "Vaccination":
      return <Syringe className="w-5 h-5" />
    case "Prescription":
      return <Pill className="w-5 h-5" />
    case "Surgery":
      return <AlertCircle className="w-5 h-5" />
    case "Treatment":
      return <Activity className="w-5 h-5" />
    default:
      return <Stethoscope className="w-5 h-5" />
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case "Vaccination":
      return "bg-purple-100 text-purple-800"
    case "Treatment":
      return "bg-red-100 text-red-800"
    case "Surgery":
      return "bg-orange-100 text-orange-800"
    case "Prescription":
      return "bg-indigo-100 text-indigo-800"
    default:
      return "bg-blue-100 text-blue-800"
  }
}

const getStatusColor = (status: Status) => {
  switch (status) {
    case "Completed":
      return "bg-green-100 text-green-800"
    case "Cancelled":
      return "bg-gray-100 text-gray-800"
    case "No-Show":
      return "bg-yellow-100 text-yellow-800"
    default:
      return "bg-blue-100 text-blue-800"
  }
}

export default function MedicalHistory() {
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<EditFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchParams] = useSearchParams()

  const highlightedId = searchParams.get("appointmentId")

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await apiGet<ApiAppointment[]>("/api/appointments?page=1&limit=500")
      setRecords(response.data.map(mapToMedicalRecord))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load medical history")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useEffect(() => {
    if (highlightedId && records.some((record) => record.id === highlightedId)) {
      setExpandedId(highlightedId)
      const element = document.getElementById(`medical-record-${highlightedId}`)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }
  }, [highlightedId, records])

  const beginEdit = (record: MedicalRecord) => {
    setExpandedId(record.id)
    setEditingId(record.id)
    setFormState({
      details: record.details,
      vet: record.vet,
      status: record.status,
      nextVisit: record.nextVisit === "-" ? "" : record.nextVisit,
      notes: record.notes,
      petType: record.petType === "-" ? "" : record.petType,
      age: record.age === "-" ? "" : record.age,
      weight: record.weight === "-" ? "" : record.weight,
      attachments: cloneAttachments(record.attachments),
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormState(null)
  }

  const handleFormChange = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    setFormState((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!formState || !files?.length) {
      event.target.value = ""
      return
    }
    try {
      const uploads = await Promise.all(Array.from(files).map((file) => readFileAsAttachment(file)))
      setFormState((prev) => (prev ? { ...prev, attachments: [...prev.attachments, ...uploads] } : prev))
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to process attachments")
    } finally {
      event.target.value = ""
    }
  }

  const handleAttachmentRemove = (index: number) => {
    setFormState((prev) =>
      prev
        ? {
            ...prev,
            attachments: prev.attachments.filter((_, fileIndex) => fileIndex !== index),
          }
        : prev
    )
  }

  const handleSaveEdit = async () => {
    if (!editingId || !formState) return
    setSaving(true)
    try {
      const payload = {
        reason: formState.details,
        doctor: formState.vet,
        status: formState.status,
        notes: formState.notes,
        last_visit: formState.nextVisit || null,
        pet_type: formState.petType || null,
        age: formState.age || null,
        weight: formState.weight || null,
        attachments: formState.attachments || [],
      }
      const response = await apiPatch<ApiAppointment>(`/api/appointments/${editingId}`, payload)
      const updated = mapToMedicalRecord(response.data)
      setRecords((prev) => prev.map((record) => (record.id === editingId ? updated : record)))
      setExpandedId(updated.id)
      setEditingId(null)
      setFormState(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save record")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Delete this medical history entry?")) return
    setDeletingId(id)
    try {
      await apiDelete(`/api/appointments/${id}`)
      setRecords((prev) => prev.filter((record) => record.id !== id))
      if (expandedId === id) {
        setExpandedId(null)
      }
      if (editingId === id) {
        cancelEdit()
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete record")
    } finally {
      setDeletingId(null)
    }
  }

  const activeRecord = expandedId ? records.find((record) => record.id === expandedId) || null : null

  const filteredRecords = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return records.filter((record) => {
      const matchesSearch =
        record.petName.toLowerCase().includes(search) ||
        record.owner.toLowerCase().includes(search) ||
        record.details.toLowerCase().includes(search)

      const matchesType = filterType === "all" || record.type === filterType
      const matchesStatus = filterStatus === "all" || record.status === filterStatus

      return matchesSearch && matchesType && matchesStatus
    })
  }, [records, searchTerm, filterType, filterStatus])

  const typeOptions = useMemo(() => {
    const unique = new Set([...BASE_TYPES, ...records.map((record) => record.type)])
    return ["all", ...Array.from(unique)]
  }, [records])

  const summary = useMemo(() => {
    return {
      total: records.length,
      completed: records.filter((record) => record.status === "Completed").length,
      active: records.filter((record) => record.status === "Scheduled").length,
      followUps: records.filter((record) => record.nextVisit && record.nextVisit !== "-").length,
    }
  }, [records])

  const renderDetailsSection = (record: MedicalRecord) => {
    const isEditing = editingId === record.id && formState
    const attachments = isEditing && formState ? formState.attachments : record.attachments || []

    return (
      <div
        className="mt-6 pt-4 border-t space-y-4 text-sm text-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {isEditing && formState ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Details</label>
                <textarea
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                  value={formState.details}
                  onChange={(e) => handleFormChange("details", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Veterinarian</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={formState.vet}
                  onChange={(e) => handleFormChange("vet", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Status</label>
                <select
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={formState.status}
                  onChange={(e) => handleFormChange("status", e.target.value as Status)}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Next Visit</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={formState.nextVisit}
                  onChange={(e) => handleFormChange("nextVisit", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Pet Type</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={formState.petType}
                  onChange={(e) => handleFormChange("petType", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Age</label>
                  <input
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    value={formState.age}
                    onChange={(e) => handleFormChange("age", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Weight</label>
                  <input
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    value={formState.weight}
                    onChange={(e) => handleFormChange("weight", e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Notes</label>
              <textarea
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                rows={3}
                value={formState.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Attachments</label>
              <div className="mt-2 space-y-3">
                <input
                  type="file"
                  multiple
                  onChange={handleAttachmentUpload}
                  className="w-full text-sm"
                />
                <p className="text-xs text-gray-500">Upload lab results, images, or reports.</p>
                <div className="space-y-2">
                  {formState.attachments.length > 0 ? (
                    formState.attachments.map((file, index) => {
                      const downloadUrl = buildAttachmentDataUrl(file)
                      return (
                        <div
                          key={`${file.name || "attachment"}-${index}`}
                          className="flex flex-col gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-semibold text-gray-800">{file.name || `Attachment ${index + 1}`}</p>
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
                                Preview
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">No file data</span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleAttachmentRemove(index)}
                            >
                              Remove
                            </Button>
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
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  cancelEdit()
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-green-600 text-white hover:bg-green-700"
                disabled={saving}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSaveEdit()
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Date</p>
                <p className="font-medium">{record.date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Status</p>
                <p className="font-medium">{record.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Client ID</p>
                <p className="font-medium">{record.clientId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Veterinarian</p>
                <p className="font-medium">{record.vet}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Pet Type</p>
                <p className="font-medium">{record.petType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Age / Weight</p>
                <p className="font-medium">
                  {record.age} · {record.weight}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Next Visit</p>
                <p className="font-medium">{record.nextVisit || "-"}</p>
              </div>
            </div>

            {record.notes && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Notes</p>
                <p className="mt-1 text-gray-800">{record.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  beginEdit(record)
                }}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={deletingId === record.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteRecord(record.id)
                }}
              >
                {deletingId === record.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </>
        )}

        {!isEditing && attachments.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 uppercase">Attachments</p>
            <div className="mt-2 space-y-2">
              {attachments.map((file, index) => {
                const downloadUrl = buildAttachmentDataUrl(file)
                return (
                  <div
                    key={`${file.name || "attachment"}-${index}`}
                    className="flex flex-col gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {file.name || `Attachment ${index + 1}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.type || "Unknown").slice(0, 60)} · {formatFileSize(file.size)}
                      </p>
                    </div>
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
                      <span className="text-xs text-gray-400">No file data</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderGridView = () =>
    filteredRecords.map((record) => (
      <Card
        key={record.id}
        id={`medical-record-${record.id}`}
        className="brand-card brand-card-hover cursor-pointer transition"
        onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">{getRecordIcon(record.type)}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{record.petName}</h3>
                <p className="text-sm text-gray-600">{record.owner}</p>
                <p className="text-xs text-gray-500 mt-1">Client ID: {record.clientId}</p>
                <p className="text-xs text-gray-500">
                  Pet: {record.petType} · Age {record.age} · Weight {record.weight}
                </p>
                <p className="text-sm text-gray-700 mt-1">{record.details}</p>
                {record.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {record.attachments.slice(0, 3).map((file, index) => {
                      const downloadUrl = buildAttachmentDataUrl(file)
                      return downloadUrl ? (
                        <a
                          key={`${record.id}-file-chip-${index}`}
                          href={downloadUrl}
                          download={file.name || `attachment-${index + 1}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          onClick={(event) => event.stopPropagation()}
                        >
                          📎 {file.name?.slice(0, 18) || `Attachment ${index + 1}`}
                        </a>
                      ) : null
                    })}
                    {record.attachments.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{record.attachments.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Vet: {record.vet} | Next: {record.nextVisit || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge className={getTypeColor(record.type)}>{record.type}</Badge>
              <Badge className={getStatusColor(record.status)}>{record.status}</Badge>
              <div className="text-xs text-gray-500 px-2">
                {new Date(record.date).toLocaleDateString()}
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition ${expandedId === record.id ? "rotate-180" : ""}`}
              />
            </div>
          </div>

          {expandedId === record.id && renderDetailsSection(record)}
        </CardContent>
      </Card>
    ))

  const renderTableView = () => (
    <>
      <Card className="brand-card brand-card-hover">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-linear-to-r from-[#eff6ff] to-[#eef2ff] text-left text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Pet</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Client ID</th>
                <th className="px-4 py-3">Pet Type</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Files</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 text-gray-700">{record.date}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{record.petName}</td>
                  <td className="px-4 py-3 text-gray-700">{record.owner}</td>
                  <td className="px-4 py-3 text-gray-700">{record.clientId}</td>
                  <td className="px-4 py-3 text-gray-700">{record.petType}</td>
                  <td className="px-4 py-3 text-gray-700">{record.age}</td>
                  <td className="px-4 py-3 text-gray-700">{record.weight}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {record.attachments.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-800">
                          {record.attachments.length} file{record.attachments.length > 1 ? "s" : ""}
                        </Badge>
                        {record.attachments.slice(0, 2).map((file, index) => {
                          const downloadUrl = buildAttachmentDataUrl(file)
                          if (!downloadUrl) return null
                          return (
                            <a
                              key={`${record.id}-table-file-${index}`}
                              href={downloadUrl}
                              download={file.name || `attachment-${index + 1}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-blue-600 hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {file.name?.slice(0, 14) || `Attachment ${index + 1}`}
                            </a>
                          )
                        })}
                        {record.attachments.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{record.attachments.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{record.vet}</td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusColor(record.status)}>{record.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-200"
                        onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                      >
                        {expandedId === record.id ? "Hide" : "View"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => beginEdit(record)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingId === record.id}
                        onClick={() => handleDeleteRecord(record.id)}
                      >
                        {deletingId === record.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {activeRecord && (
        <Card id={`medical-record-${activeRecord.id}`} className="brand-card brand-card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-gray-500">Selected Record</p>
                <h3 className="text-lg font-semibold text-gray-900">{activeRecord.petName}</h3>
                <p className="text-sm text-gray-600">{activeRecord.owner}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setExpandedId(null)}>
                Close
              </Button>
            </div>
            {renderDetailsSection(activeRecord)}
          </CardContent>
        </Card>
      )}
    </>
  )

  return (
    <>
      <PageTitle title="Medical History" />

      <Card className="brand-card brand-card-hover mb-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#0f172a] via-[#4338ca] to-[#14b8a6] p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Clinical Intelligence Hub</p>
                <h2 className="text-3xl font-bold">Medical History Command</h2>
                <p className="text-sm text-white/80">
                  Monitor treatments, vaccinations, and follow-ups to keep every pet’s care plan on track.
                </p>
              </div>
              <div className="rounded-3xl bg-white/15 p-3">
                <Stethoscope className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#1d4ed8] to-[#22d3ee] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Total Records</p>
              <p className="mt-2 text-3xl font-bold">{summary.total}</p>
              <p className="text-xs text-white/80">Across all pets</p>
            </div>
            <ClipboardList className="h-10 w-10 text-white/70" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#10b981] to-[#22c55e] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Completed Visits</p>
              <p className="mt-2 text-3xl font-bold">{summary.completed}</p>
              <p className="text-xs text-white/80">Treatments closed</p>
            </div>
            <CheckCircle2 className="h-10 w-10 text-white/70" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#f97316] to-[#facc15] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Scheduled</p>
              <p className="mt-2 text-3xl font-bold">{summary.active}</p>
              <p className="text-xs text-white/80">Upcoming visits</p>
            </div>
            <CalendarClock className="h-10 w-10 text-white/70" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#7c3aed] to-[#ec4899] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Follow-ups</p>
              <p className="mt-2 text-3xl font-bold">{summary.followUps}</p>
              <p className="text-xs text-white/80">Next visit scheduled</p>
            </div>
            <RefreshCw className="h-10 w-10 text-white/70" />
          </div>
        </div>
      </div>

      <Card className="brand-card brand-card-hover mb-6">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                <Filter className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Search & filter</p>
                <h3 className="text-2xl font-bold text-foreground">Curate clinical timelines</h3>
                <p className="text-sm text-muted-foreground">Blend pet, owner, and treatment filters to investigate patient journeys.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="brand-soft-panel rounded-2xl px-4 py-3 text-right">
                <p className="text-xs font-semibold text-gray-500">Matching records</p>
                <p className="text-2xl font-bold text-primary">{filteredRecords.length}</p>
                <p className="text-xs text-gray-500">of {summary.total}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={loadRecords}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label className="font-semibold text-foreground">Search records</Label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pet, owner, diagnosis..."
                  className="h-12 rounded-2xl bg-background/70 pl-9"
                />
              </div>
            </div>
            <div>
              <Label className="font-semibold text-foreground">Record type</Label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type === "all" ? "All Types" : type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="font-semibold text-foreground">Status</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {["all", ...STATUS_OPTIONS].map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "All Status" : status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="font-semibold text-foreground">View mode</Label>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  variant={viewMode === "grid" ? "default" : "outline"}
                  onClick={() => setViewMode("grid")}
                >
                  Grid
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  variant={viewMode === "table" ? "default" : "outline"}
                  onClick={() => setViewMode("table")}
                >
                  Table
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((status) => (
              <button
                type="button"
                key={status}
                onClick={() => setFilterStatus((prev) => (prev === status ? "all" : status))}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  filterStatus === status
                    ? "border-[#4338ca] bg-[#4338ca] text-white"
                    : "border-border text-muted-foreground hover:border-[#4338ca]/60"
                }`}
              >
                {status}
              </button>
            ))}
            <span className="ml-auto text-sm text-muted-foreground">
              Showing <strong>{filteredRecords.length}</strong> results
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <Card className="brand-card brand-card-hover">
            <CardContent className="p-12 text-center text-muted-foreground">Loading medical history...</CardContent>
          </Card>
        ) : filteredRecords.length === 0 ? (
          <Card className="brand-card brand-card-hover border border-dashed border-primary/40">
            <CardContent className="p-12 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-primary/40" />
              <p className="text-muted-foreground">No medical records found</p>
              <p className="text-sm text-muted-foreground">Adjust filters or sync appointments to populate this view.</p>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          renderGridView()
        ) : (
          renderTableView()
        )}
      </div>
    </>
  )
}
