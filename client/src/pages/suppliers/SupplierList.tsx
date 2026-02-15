import { useState, useEffect } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api"
import type { LucideIcon } from "lucide-react"
import { Building2, ClipboardList, Filter, Mail, MapPin, Phone, Search as SearchIcon, Sparkles, Tag, Users, Wallet } from "lucide-react"

type Supplier = {
  id: string
  dbId: number
  name: string
  phone: string
  email: string
  address: string
  category: string
  contactPerson?: string
  bankDetails?: string
  taxId?: string
  status: "Active" | "Inactive"
}

type ApiSupplier = {
  id: number
  code?: string
  name: string
  phone?: string
  email?: string
  address?: string
  category?: string
  contact_person?: string
  bank_details?: string
  tax_id?: string
  status?: string
}

const STATUS_TONES: Record<Supplier["status"], string> = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Inactive: "border-amber-200 bg-amber-50 text-amber-700",
}

const getStatusTone = (status: Supplier["status"]) => STATUS_TONES[status] || "border-slate-200 bg-slate-50 text-slate-600"

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [form, setForm] = useState<Omit<Supplier, "id" | "dbId">>({
    name: "",
    phone: "",
    email: "",
    address: "",
    category: "",
    contactPerson: "",
    bankDetails: "",
    taxId: "",
    status: "Active",
  })

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError("")
        const res = await apiGet<ApiSupplier[]>("/api/suppliers?limit=1000")
        if (!mounted) return
        const mapped = (res.data || []).map((s) => ({
          id: s.code || `SUP-${s.id}`,
          dbId: s.id,
          name: s.name,
          phone: s.phone || "",
          email: s.email || "",
          address: s.address || "",
          category: s.category || "",
          contactPerson: s.contact_person || "",
          bankDetails: s.bank_details || "",
          taxId: s.tax_id || "",
          status: (s.status as Supplier["status"]) || "Active",
        }))
        setSuppliers(mapped)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load suppliers")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const categories = ["All", ...new Set(suppliers.map((s) => s.category).filter(Boolean))]
  const statuses = ["All", "Active", "Inactive"]

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      `${s.name} ${s.phone} ${s.email} ${s.category}`.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase())

    const matchesCategory = filterCategory === "All" || s.category === filterCategory
    const matchesStatus = filterStatus === "All" || s.status === filterStatus

    return matchesSearch && matchesCategory && matchesStatus
  })

  const totalSuppliers = suppliers.length
  const activeSuppliers = suppliers.filter((s) => s.status === "Active").length
  const inactiveSuppliers = suppliers.filter((s) => s.status === "Inactive").length
  const uniqueCategoryCount = new Set(suppliers.map((s) => s.category).filter(Boolean)).size
  const filteredCount = filteredSuppliers.length
  const filtersActive = Boolean(search.trim()) || filterCategory !== "All" || filterStatus !== "All"
  const filterBadgeLabel = filtersActive ? "Filtered view" : "All suppliers"

  const heroMetrics: { label: string; value: number; hint: string; gradient: string; icon: LucideIcon }[] = [
    {
      label: "Vendor network",
      value: totalSuppliers,
      hint: "Registered partners",
      gradient: "from-[#312e81] to-[#4338ca]",
      icon: Building2,
    },
    {
      label: "Active partners",
      value: activeSuppliers,
      hint: "Supplying now",
      gradient: "from-[#0f766e] to-[#14b8a6]",
      icon: Users,
    },
    {
      label: "On hold",
      value: inactiveSuppliers,
      hint: "Needs follow-up",
      gradient: "from-[#b45309] to-[#f97316]",
      icon: ClipboardList,
    },
    {
      label: "Categories",
      value: uniqueCategoryCount,
      hint: "Sourcing lanes",
      gradient: "from-[#9333ea] to-[#db2777]",
      icon: Tag,
    },
  ]

  function openAddModal() {
    setEditingSupplier(null)
    setForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      category: "",
      contactPerson: "",
      bankDetails: "",
      taxId: "",
      status: "Active",
    })
    setShowModal(true)
  }

  function openEditModal(supplier: Supplier) {
    setEditingSupplier(supplier)
    setForm({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      category: supplier.category,
      contactPerson: supplier.contactPerson || "",
      bankDetails: supplier.bankDetails || "",
      taxId: supplier.taxId || "",
      status: supplier.status,
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingSupplier(null)
  }

  async function saveSupplier() {
    if (!form.name || !form.phone || !form.category) {
      alert("Please fill in required fields: Name, Phone, Category")
      return
    }

    try {
      if (editingSupplier) {
        const res = await apiPatch<ApiSupplier>(`/api/suppliers/${editingSupplier.dbId}`, {
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          category: form.category,
          contact_person: form.contactPerson || undefined,
          bank_details: form.bankDetails || undefined,
          tax_id: form.taxId || undefined,
          status: form.status,
        })
        const updated = res.data
        setSuppliers((prev) =>
          prev.map((s) =>
            s.dbId === editingSupplier.dbId
              ? {
                  id: updated.code || `SUP-${updated.id}`,
                  dbId: updated.id,
                  name: updated.name,
                  phone: updated.phone || "",
                  email: updated.email || "",
                  address: updated.address || "",
                  category: updated.category || "",
                  contactPerson: updated.contact_person || "",
                  bankDetails: updated.bank_details || "",
                  taxId: updated.tax_id || "",
                  status: (updated.status as Supplier["status"]) || "Active",
                }
              : s
          )
        )
      } else {
        const res = await apiPost<ApiSupplier>("/api/suppliers", {
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          category: form.category,
          contact_person: form.contactPerson || undefined,
          bank_details: form.bankDetails || undefined,
          tax_id: form.taxId || undefined,
          status: form.status,
        })
        const created = res.data
        setSuppliers((prev) => [
          {
            id: created.code || `SUP-${created.id}`,
            dbId: created.id,
            name: created.name,
            phone: created.phone || "",
            email: created.email || "",
            address: created.address || "",
            category: created.category || "",
            contactPerson: created.contact_person || "",
            bankDetails: created.bank_details || "",
            taxId: created.tax_id || "",
            status: (created.status as Supplier["status"]) || "Active",
          },
          ...prev,
        ])
      }

      closeModal()
      alert(editingSupplier ? "Supplier updated" : "Supplier added")
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save supplier")
    }
  }

  async function deleteSupplier(id: string, dbId: number) {
    if (!confirm("Delete this supplier?")) return
    try {
      await apiDelete(`/api/suppliers/${dbId}`)
      setSuppliers((prev) => prev.filter((s) => s.id !== id))
      alert("Supplier deleted")
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete supplier")
    }
  }

  return (
    <>
      <PageTitle title="Supplier Management" />

      <Card className="brand-card brand-card-hover mb-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#042f2e] via-[#0f766e] to-[#22d3ee] p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Procurement control</p>
                <h2 className="text-3xl font-bold">Supplier Management Hub</h2>
                <p className="text-sm text-white/80">
                  Energize your vendor network with the same crisp visuals as Sales List—spot gaps, tag risk, and invite new partners fast.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <div className="rounded-3xl bg-white/15 px-5 py-3">
                  <p className="text-xs font-semibold text-white/70">{filtersActive ? "Filtered roster" : "Network size"}</p>
                  <p className="text-3xl font-bold">{filtersActive ? filteredCount : totalSuppliers}</p>
                  <p className="text-xs text-white/80">{filtersActive ? "records in view" : "total suppliers"}</p>
                </div>
                <Button onClick={openAddModal} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f766e] hover:bg-white">
                  <Sparkles className="mr-2 h-4 w-4" /> Add supplier
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
                <h2 className="text-2xl font-bold text-foreground">Supplier console</h2>
                <p className="text-sm text-muted-foreground">
                  Drive category and status pivots without leaving the page. {loading ? "Syncing supplier data..." : ""}
                </p>
              </div>
            </div>
            <div className="brand-soft-panel rounded-2xl px-4 py-3 text-right">
              <p className="text-xs font-semibold text-muted-foreground">In viewport</p>
              <p className="text-2xl font-bold text-[#4338ca]">{filteredCount}</p>
              <p className="text-xs text-muted-foreground">of {totalSuppliers} suppliers</p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <Label className="text-sm font-semibold text-foreground">Search suppliers</Label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, phone, email, ID"
                  className="h-12 rounded-2xl border-border bg-background/70 pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Category</Label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background/70 px-4 text-sm focus:border-primary focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat || "Uncategorized"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background/70 px-4 text-sm focus:border-primary focus:outline-none"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Actions</Label>
              <Button className="h-12 w-full rounded-2xl bg-[#4338ca] text-white hover:bg-[#312e81]" onClick={openAddModal}>
                + Add supplier
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Supplier ledger</p>
              <h2 className="text-2xl font-bold text-foreground">Network overview</h2>
              <p className="text-sm text-muted-foreground">{filteredCount} of {totalSuppliers} suppliers visible</p>
            </div>
            <Badge className={`brand-pill border ${filtersActive ? "border-[#4338ca]/40 bg-[#4338ca]/10 text-[#4338ca]" : "border-muted bg-muted/40 text-muted-foreground"}`}>
              {filterBadgeLabel}
            </Badge>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border/60 px-6 py-12 text-center text-muted-foreground">
              <Building2 className="h-10 w-10" />
              <p>Loading suppliers...</p>
            </div>
          ) : filteredCount === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border/60 px-6 py-12 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10" />
              <p>No suppliers match the current filters.</p>
              <p className="text-xs">Try broadening your search to see more partners.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-border/40 bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-linear-to-r from-[#eff6ff] to-[#eef2ff] text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Bank / Tax</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuppliers.map((s, idx) => (
                      <tr
                        key={s.id}
                        className={`border-b border-border/70 ${idx % 2 === 0 ? "bg-card" : "bg-card/80"} transition hover:bg-muted/50`}
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-foreground">
                          <div className="flex flex-col gap-1">
                            <span className="text-base">{s.name}</span>
                            <span className="text-xs text-muted-foreground">{s.id}</span>
                            {s.contactPerson && <span className="text-xs text-muted-foreground">POC: {s.contactPerson}</span>}
                            {s.address && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {s.address}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-foreground">
                          <div className="space-y-1">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {s.phone || "—"}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              {s.email || "Not set"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-foreground">
                          <p className="font-semibold">{s.category || "Uncategorized"}</p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={`brand-pill border ${getStatusTone(s.status)}`}>{s.status}</Badge>
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground">
                          {s.bankDetails ? (
                            <span className="flex items-center gap-1 text-foreground">
                              <Wallet className="h-3.5 w-3.5" />
                              {s.bankDetails}
                            </span>
                          ) : (
                            "Bank n/a"
                          )}
                          {s.taxId && <div className="mt-1 text-[11px] text-muted-foreground">Tax: {s.taxId}</div>}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="outline" className="rounded-2xl border-border/60" onClick={() => openEditModal(s)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="rounded-2xl" onClick={() => deleteSupplier(s.id, s.dbId)}>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-bold text-lg">
                  {editingSupplier ? "Edit Supplier" : "New Supplier"}
                </h3>
                <button onClick={closeModal} className="text-2xl text-gray-500 hover:text-gray-800">
                  X
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Supplier Name*</Label>
                  <Input
                    placeholder="ABC Pet Foods"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-9"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Phone*</Label>
                  <Input
                    placeholder="0771234567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-9"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Email</Label>
                  <Input
                    type="email"
                    placeholder="supplier@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Address</Label>
                  <Input
                    placeholder="Colombo"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Category*</Label>
                  <Input
                    placeholder="Food, Medicine, Equipment..."
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="h-9"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Contact Person</Label>
                  <Input
                    placeholder="John Doe"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Bank Details</Label>
                  <Input
                    placeholder="Bank Name - Account Number"
                    value={form.bankDetails}
                    onChange={(e) => setForm({ ...form, bankDetails: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Tax ID</Label>
                  <Input
                    placeholder="TAX123456"
                    value={form.taxId}
                    onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Status</Label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Supplier["status"] })}
                    className="w-full h-9 px-3 border border-gray-300 rounded-md"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button onClick={saveSupplier} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {editingSupplier ? "Update" : "Add"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
