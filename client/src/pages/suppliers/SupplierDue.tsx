import { useState, useEffect, useMemo } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  Download,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  LayoutGrid,
  Table,
  Wallet,
  Users,
  ArrowUpRight,
  CalendarClock,
} from "lucide-react"
import { apiGet, apiPatch, apiPost } from "@/lib/api"
import { useToast } from "@/components/common/Toast"

type PaymentHistory = {
  date: string
  amount: number
  reference?: string
}

type SupplierDue = {
  id: string
  supplier: string
  supplierId: string
  email?: string
  phone: string
  address?: string
  totalAmount: number
  paidAmount: number
  dueAmount: number
  dueDate?: string
  daysDue?: number
  lastPaymentDate?: string
  paymentHistory?: PaymentHistory[]
  notes?: string
}

type ApiSupplierDue = {
  id: string
  supplier_id: string
  total_amount: number
  paid_amount: number
  due_amount: number
  due_date?: string
  last_payment_date?: string
  notes?: string
}

type ApiSupplierDuePayment = {
  id: string
  supplier_due_id: string
  payment_date: string
  amount: number
  reference?: string
}

export default function SupplierDueComponent() {
  const toast = useToast()
  const [dues, setDues] = useState<SupplierDue[]>([])
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dueDateFilter, setDueDateFilter] = useState<"all" | "overdue" | "this-week" | "this-month">("all")
  const [sortBy, setSortBy] = useState("due-amount")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [selected, setSelected] = useState<SupplierDue | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [paymentRef, setPaymentRef] = useState("")
  const [viewHistory, setViewHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [createSupplierId, setCreateSupplierId] = useState("")
  const [createTotal, setCreateTotal] = useState("")
  const [createPaid, setCreatePaid] = useState("")
  const [createDueDate, setCreateDueDate] = useState("")
  const [createNotes, setCreateNotes] = useState("")
  const [suppliersList] = useState<Array<{ id: string; name: string }>>([])

  const loadDues = async () => {
    try {
      setLoading(true)
      const res = await apiGet<ApiSupplierDue[]>("/api/supplier-dues")
      const mapped = (res.data || []).map((d) => ({
        id: d.id,
        supplierId: d.supplier_id,
        supplier: d.supplier_id,
        email: "",
        phone: "",
        totalAmount: d.total_amount,
        paidAmount: d.paid_amount,
        dueAmount: d.due_amount,
        dueDate: d.due_date,
        daysDue: d.due_date ? getDaysOverdue(d.due_date) : 0,
        lastPaymentDate: d.last_payment_date,
        notes: d.notes,
        paymentHistory: [],
      }))
      setDues(mapped)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dues")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDues()
  }, [])

  const filteredSuppliers = useMemo(() => {
    let filtered = dues.filter((d) => {
      const matchesSearch = search.trim() === "" || 
        d.supplier.toLowerCase().includes(search.toLowerCase()) ||
        d.phone.includes(search) ||
        (d.email?.toLowerCase().includes(search.toLowerCase()) || false)
      
      const matchesStatus = filterStatus === "all" || 
        getStatusLabel(d.dueAmount, d.dueDate) === filterStatus
      
      const matchesDueDate = dueDateFilter === "all" || (
        dueDateFilter === "overdue" ? (d.dueDate && new Date(d.dueDate) < new Date()) :
        dueDateFilter === "this-week" ? (() => {
          if (!d.dueDate) return false
          const due = new Date(d.dueDate)
          const today = new Date()
          const weekEnd = new Date(today)
          weekEnd.setDate(today.getDate() + 7)
          return due >= today && due <= weekEnd
        })() :
        dueDateFilter === "this-month" ? (() => {
          if (!d.dueDate) return false
          const due = new Date(d.dueDate)
          const today = new Date()
          return due.getMonth() === today.getMonth() && due.getFullYear() === today.getFullYear()
        })() : false
      )

      return matchesSearch && matchesStatus && matchesDueDate
    })

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "due-amount":
          return b.dueAmount - a.dueAmount
        case "days-due":
          return (b.daysDue || 0) - (a.daysDue || 0)
        case "supplier-name":
          return a.supplier.localeCompare(b.supplier)
        case "due-date":
          return new Date(b.dueDate || 0).getTime() - new Date(a.dueDate || 0).getTime()
        default:
          return 0
      }
    })

    return filtered
  }, [dues, search, filterStatus, sortBy, dueDateFilter])

  const STATUS_TONES: Record<string, string> = {
    Overdue: "border-rose-200 bg-rose-50 text-rose-700",
    Due: "border-amber-200 bg-amber-50 text-amber-700",
    Paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }

  const STATUS_ACCENTS: Record<string, string> = {
    Overdue: "bg-rose-50 text-rose-700",
    Due: "bg-amber-50 text-amber-700",
    Paid: "bg-emerald-50 text-emerald-700",
  }

  const getStatusTone = (status: string) => STATUS_TONES[status] || "border-slate-200 bg-slate-50 text-slate-600"

  const getStatusAccent = (status: string) => STATUS_ACCENTS[status] || "bg-slate-50 text-slate-600"

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Overdue":
        return <AlertCircle className="w-5 h-5" />
      case "Due":
        return <Clock className="w-5 h-5" />
      case "Paid":
        return <Calendar className="w-5 h-5" />
      default:
        return <Calendar className="w-5 h-5" />
    }
  }

  const getStatusLabel = (dueAmount: number, dueDate?: string): string => {
    if (dueAmount === 0) return "Paid"
    if (dueDate && new Date(dueDate) < new Date()) return "Overdue"
    return "Due"
  }

  const getDaysOverdue = (dueDate?: string): number => {
    if (!dueDate) return 0
    const due = new Date(dueDate)
    const today = new Date()
    if (due >= today) return 0
    return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  }

  const formatSriLankaDateTime = (value?: string) => {
    if (!value) return "-"
    return new Date(value).toLocaleString("en-LK", { timeZone: "Asia/Colombo" })
  }

  const formatSriLankaDate = (value?: string) => {
    if (!value) return "-"
    return new Date(value).toLocaleDateString("en-LK", { timeZone: "Asia/Colombo" })
  }

  function closeModal() {
    setSelected(null)
    setPayAmount(0)
    setPaymentRef("")
    setViewHistory(false)
  }

  async function savePayment() {
    if (!selected || payAmount <= 0 || payAmount > selected.dueAmount) {
      toast.warning("Please enter a valid payment amount")
      return
    }

    const newPaidAmount = selected.paidAmount + payAmount
    const newDueAmount = Math.max(0, selected.totalAmount - newPaidAmount)
    const today = new Date().toISOString().split("T")[0]

    try {
      const res = await apiPatch<ApiSupplierDue>(`/api/supplier-dues/${selected.id}`, {
        paid_amount: newPaidAmount,
        due_amount: newDueAmount,
        last_payment_date: today,
        notes: selected.notes || undefined,
      })

      await apiPost<ApiSupplierDuePayment>("/api/supplier-due-payments", {
        supplier_due_id: selected.id,
        payment_date: today,
        amount: payAmount,
        reference: paymentRef || undefined,
      })

      setDues((prev) =>
        prev.map((d) =>
          d.id === selected.id
            ? {
                ...d,
                paidAmount: Number(res.data.paid_amount || newPaidAmount),
                dueAmount: Number(res.data.due_amount || newDueAmount),
                lastPaymentDate: res.data.last_payment_date || today,
                paymentHistory: [
                  ...(d.paymentHistory || []),
                  { date: today, amount: payAmount, reference: paymentRef || undefined },
                ],
              }
            : d
        )
      )

      closeModal()
      toast.success("Payment recorded")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save payment")
    }
  }

  const exportToCSV = () => {
    const headers = [
      "Supplier Name",
      "Phone",
      "Supplier ID",
      "Due Amount",
      "Days Due",
      "Status",
    ]
    const csvContent = [
      headers.join(","),
      ...filteredSuppliers.map((s) =>
        [
          s.supplier,
          s.phone,
          s.supplierId,
          s.dueAmount,
          s.daysDue || 0,
          getStatusLabel(s.dueAmount, s.dueDate),
        ].join(",")
      ),
    ].join("\n")

    const element = document.createElement("a")
    element.setAttribute(
      "href",
      `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`
    )
    element.setAttribute(
      "download",
      `due_suppliers_${new Date().toISOString().split("T")[0]}.csv`
    )
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const exportPaymentsCSV = () => {
    const headers = ["Supplier", "Supplier ID", "Payment Date", "Amount", "Reference"]
    const rows = dues.flatMap((due) => {
      if (!due.paymentHistory || due.paymentHistory.length === 0) return []
      return due.paymentHistory.map((p) => [
        due.supplier,
        due.supplierId || "",
        p.date,
        p.amount,
        p.reference || "",
      ])
    })

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const element = document.createElement("a")
    element.setAttribute(
      "href",
      `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`
    )
    element.setAttribute(
      "download",
      `supplier_payments_${new Date().toISOString().split("T")[0]}.csv`
    )
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const syncFromPurchases = async () => {
    try {
      await apiPost("/api/supplier-dues-sync/sync", {})
      await loadDues()
      toast.success("Supplier dues synced from purchases")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to sync dues")
    }
  }

  const resetCreateForm = () => {
    setCreateSupplierId("")
    setCreateTotal("")
    setCreatePaid("")
    setCreateDueDate("")
    setCreateNotes("")
  }

  const createDue = async () => {
    if (!createSupplierId || !createTotal) {
      toast.warning("Supplier and Total Amount are required")
      return
    }
    const totalAmount = Number(createTotal) || 0
    const paidAmount = Number(createPaid) || 0
    const dueAmount = Math.max(0, totalAmount - paidAmount)
    try {
      const dueRes = await apiPost<ApiSupplierDue>("/api/supplier-dues", {
        supplier_id: Number(createSupplierId),
        total_amount: totalAmount,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        last_payment_date: paidAmount > 0 ? new Date().toISOString().split("T")[0] : null,
        due_date: createDueDate || null,
        notes: createNotes || null,
      })
      const createdDueId = dueRes.data?.id

      if (paidAmount > 0 && createdDueId) {
        const today = new Date().toISOString().split("T")[0]
        await apiPost("/api/supplier-due-payments", {
          supplier_due_id: createdDueId,
          payment_date: today,
          amount: paidAmount,
          reference: "Initial payment",
        })
      }

      await loadDues()
      setShowCreate(false)
      resetCreateForm()
      toast.success("Supplier due created")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create due")
    }
  }

  const totalDue = dues.reduce((sum, supplier) => sum + supplier.dueAmount, 0)
  const overdueCount = dues.filter((s) => s.dueAmount > 0 && s.dueDate && new Date(s.dueDate) < new Date()).length
  const dueCount = dues.filter((s) => s.dueAmount > 0 && (!s.dueDate || new Date(s.dueDate) >= new Date())).length
  const paidCount = dues.filter((s) => s.dueAmount === 0).length
  const totalRecovered = dues.reduce((sum, supplier) => sum + supplier.paidAmount, 0)
  const overdueDays = dues.filter((s) => (s.daysDue || 0) > 0)
  const averageDaysDue = overdueDays.length ? Math.round(overdueDays.reduce((sum, s) => sum + (s.daysDue || 0), 0) / overdueDays.length) : 0
  const upcomingWeekCount = dues.filter((s) => {
    if (!s.dueDate) return false
    const due = new Date(s.dueDate)
    const today = new Date()
    const weekEnd = new Date(today)
    weekEnd.setDate(today.getDate() + 7)
    return due >= today && due <= weekEnd && s.dueAmount > 0
  }).length
  const heroMetrics = [
    {
      label: "Outstanding",
      value: `Rs. ${totalDue.toLocaleString()}`,
      hint: "Open exposure",
      gradient: "from-[#312e81] to-[#4338ca]",
      icon: Wallet,
    },
    {
      label: "Overdue",
      value: overdueCount,
      hint: "Needs escalation",
      gradient: "from-[#b91c1c] to-[#f43f5e]",
      icon: AlertCircle,
    },
    {
      label: "Due soon",
      value: dueCount,
      hint: "Within SLA",
      gradient: "from-[#b45309] to-[#facc15]",
      icon: CalendarClock,
    },
    {
      label: "Recovered",
      value: `Rs. ${totalRecovered.toLocaleString()}`,
      hint: `${paidCount} partners paid`,
      gradient: "from-[#0f766e] to-[#14b8a6]",
      icon: Users,
    },
  ]

  return (
    <>
      <PageTitle title="Supplier Due - Professional Dashboard" />

      {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card className="brand-card brand-card-hover mb-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="relative bg-linear-to-r from-[#042f2e] via-[#0f766e] to-[#22d3ee] p-6 text-white">
            <div className="absolute right-6 top-6 rounded-3xl bg-white/15 px-5 py-3 text-right shadow-lg backdrop-blur">
              <p className="text-xs font-semibold text-white/70">Avg overdue days</p>
              <p className="text-3xl font-bold">{averageDaysDue}</p>
              <p className="text-xs text-white/80">across {overdueDays.length} accounts</p>
            </div>
            <div className="mt-20 flex flex-wrap items-center justify-between gap-4 md:mt-0">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Professional dashboard</p>
                <h2 className="text-3xl font-bold">Supplier Due Intelligence</h2>
                <p className="text-sm text-white/80">
                  Keep procurement cash flow aligned with Sales List styling—triage overdue partners, launch collections, and sync ledgers fast.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <div className="flex gap-2">
                  <Button onClick={() => setShowCreate(true)} className="rounded-2xl bg-white/90 px-4 py-2 text-[#0f766e] hover:bg-white">
                    <Sparkles className="mr-2 h-4 w-4" /> Create due
                  </Button>
                  <Button variant="outline" onClick={exportToCSV} className="rounded-2xl border-white/40 text-white hover:bg-white/10">
                    <Download className="mr-2 h-4 w-4" /> Export due
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="rounded-2xl bg-white/10 px-3 py-1">{filteredSuppliers.length} records in view</span>
              <span className="rounded-2xl bg-white/10 px-3 py-1">{upcomingWeekCount} due within 7 days</span>
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

      <Card className="brand-card brand-card-hover mb-6">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                <Filter className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Search & filter</p>
                <h2 className="text-2xl font-bold text-foreground">Ledger console</h2>
                <p className="text-sm text-muted-foreground">
                  {loading ? "Syncing supplier dues..." : "Drive SLA pivots, export proofs, or open new dues all in one lane."}
                </p>
              </div>
            </div>
            <div className="brand-soft-panel rounded-2xl px-4 py-3 text-right">
              <p className="text-xs font-semibold text-muted-foreground">In viewport</p>
              <p className="text-2xl font-bold text-[#4338ca]">{filteredSuppliers.length}</p>
              <p className="text-xs text-muted-foreground">of {dues.length} suppliers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <Label className="text-sm font-semibold text-foreground">Search ledger</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Supplier, email, phone..."
                  className="h-12 rounded-2xl border-border bg-background/70 pl-9"
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
                <option value="all">All Status</option>
                <option value="Overdue">Overdue</option>
                <option value="Due">Due Soon</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Due date window</Label>
              <select
                value={dueDateFilter}
                onChange={(e) => setDueDateFilter(e.target.value as typeof dueDateFilter)}
                className="h-12 w-full rounded-2xl border border-border bg-background/70 px-4 text-sm focus:border-primary focus:outline-none"
              >
                <option value="all">All Dates</option>
                <option value="overdue">Overdue</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Sort ledger</Label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background/70 px-4 text-sm focus:border-primary focus:outline-none"
              >
                <option value="due-amount">Due Amount (High)</option>
                <option value="days-due">Days Due (Most)</option>
                <option value="supplier-name">Supplier Name</option>
                <option value="due-date">Due Date</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">View mode</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={viewMode === "grid" ? "default" : "outline"}
                  className={`h-12 flex-1 rounded-2xl ${viewMode === "grid" ? "bg-[#4338ca] text-white" : "border-border/60"}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="mr-2 h-4 w-4" /> Cards
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "table" ? "default" : "outline"}
                  className={`h-12 flex-1 rounded-2xl ${viewMode === "table" ? "bg-[#4338ca] text-white" : "border-border/60"}`}
                  onClick={() => setViewMode("table")}
                >
                  <Table className="mr-2 h-4 w-4" /> Table
                </Button>
              </div>
            </div>

            <div className="space-y-2 xl:col-span-2">
              <Label className="text-sm font-semibold text-foreground">Actions</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-12 rounded-2xl border-border/60" onClick={syncFromPurchases}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Sync from purchases
                </Button>
                <Button variant="outline" className="h-12 rounded-2xl border-border/60" onClick={exportPaymentsCSV}>
                  <ArrowUpRight className="mr-2 h-4 w-4" /> Export payments
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers List */}
      <div>
        {viewMode === "grid" ? (
          <div className="space-y-3">
            {filteredSuppliers.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No due suppliers found</p>
                </CardContent>
              </Card>
            ) : (
              filteredSuppliers.map((supplier) => (
                <Card
                  key={supplier.id}
                  className="hover:shadow-lg transition"
                >
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      {/* Left Section */}
                      <div>
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`p-3 rounded-2xl ${getStatusAccent(getStatusLabel(supplier.dueAmount, supplier.dueDate))}`}>
                            {getStatusIcon(getStatusLabel(supplier.dueAmount, supplier.dueDate))}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">
                              {supplier.supplier}
                            </h3>
                            <p className="text-sm text-gray-600">ID: {supplier.supplierId}</p>
                            <Badge className={`brand-pill border mt-2 ${getStatusTone(getStatusLabel(supplier.dueAmount, supplier.dueDate))}`}>
                              {getStatusLabel(supplier.dueAmount, supplier.dueDate)}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail className="w-4 h-4 text-blue-600" />
                            {supplier.email || "N/A"}
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Phone className="w-4 h-4 text-blue-600" />
                            {supplier.phone}
                          </div>
                          {supplier.address && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <MapPin className="w-4 h-4 text-blue-600" />
                              {supplier.address}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Section */}
                      <div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              Supplier ID
                            </p>
                            <p className="font-bold text-gray-900">
                              {supplier.supplierId}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              Total Amount
                            </p>
                            <p className="font-bold text-gray-900">
                              Rs.{supplier.totalAmount.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              Paid
                            </p>
                            <p className="font-bold text-green-600">
                              Rs.{supplier.paidAmount.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              Due
                            </p>
                            <p className="font-bold text-red-600">
                              Rs.{supplier.dueAmount.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              Due Date
                            </p>
                            <p className="font-bold text-gray-900">
                              {supplier.dueDate
                                ? formatSriLankaDate(supplier.dueDate)
                                : "-"}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              Days Due
                            </p>
                            <p className="font-bold text-gray-900">
                              {supplier.daysDue || 0}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="bg-[#002366] hover:bg-[#001a4d] text-white"
                            onClick={() => setSelected(supplier)}
                          >
                            Record Payment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* Table View */
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Supplier</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Paid</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Due</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Due Date</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                          No due suppliers found
                        </td>
                      </tr>
                    ) : (
                      filteredSuppliers.map((supplier) => (
                        <tr key={supplier.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{supplier.supplier}</div>
                            <div className="text-xs text-gray-500">{supplier.email}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{supplier.phone}</td>
                          <td className="px-4 py-3 text-gray-700">{supplier.supplierId}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            Rs.{supplier.totalAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600 font-semibold">
                            Rs.{supplier.paidAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600 font-semibold">
                            Rs.{supplier.dueAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {supplier.dueDate
                              ? formatSriLankaDate(supplier.dueDate)
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`brand-pill border ${getStatusTone(getStatusLabel(supplier.dueAmount, supplier.dueDate))}`}>
                              {getStatusLabel(supplier.dueAmount, supplier.dueDate)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              className="bg-[#002366] hover:bg-[#001a4d] text-white"
                              onClick={() => setSelected(supplier)}
                            >
                              Pay
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-4 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {viewHistory ? "Payment History" : "Record Payment"}
                </h2>
                <button onClick={closeModal} className="text-2xl text-gray-500 hover:text-gray-800">
                  X
                </button>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <p className="font-semibold text-gray-800">{selected.supplier}</p>
                <p className="text-sm text-gray-600">ID: {selected.supplierId}</p>
                <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                  <div>
                    <p className="text-gray-600">Total Amount</p>
                    <p className="font-bold text-blue-600">Rs. {selected.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Already Paid</p>
                    <p className="font-bold text-green-600">Rs. {selected.paidAmount.toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Remaining Due</p>
                    <p className="font-bold text-red-600">Rs. {selected.dueAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {selected.dueDate && (
                <div className={`p-3 rounded-lg mb-4 ${getDaysOverdue(selected.dueDate) > 0 ? "bg-red-50" : "bg-yellow-50"}`}>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Due Date:</span> {formatSriLankaDate(selected.dueDate)}
                    {getDaysOverdue(selected.dueDate) > 0 && (
                      <span className="text-red-600 font-bold"> ({getDaysOverdue(selected.dueDate)} days overdue)</span>
                    )}
                  </p>
                </div>
              )}

              {selected.paymentHistory && selected.paymentHistory.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2 text-sm">Payment History</h4>
                  <div className="space-y-2 max-h-28 overflow-y-auto">
                    {selected.paymentHistory.map((payment, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded">
                        <div>
                          <p className="font-semibold text-gray-800">{formatSriLankaDateTime(payment.date)}</p>
                          {payment.reference && <p className="text-xs text-gray-600">Ref: {payment.reference}</p>}
                        </div>
                        <p className="font-bold text-green-600">Rs. {payment.amount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!viewHistory && selected.dueAmount > 0 && (
                <>
                  <div className="space-y-2 mb-4">
                    <Label className="text-sm font-medium">Payment Amount*</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount to pay"
                      value={payAmount || ""}
                      onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                      className="h-9 text-base border-2"
                      max={selected.dueAmount}
                      min={0}
                    />
                    {payAmount > 0 && (
                      <p className="text-xs text-gray-600">
                        Remaining after payment: Rs. {(selected.dueAmount - payAmount).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <Label className="text-sm font-medium">Reference/Cheque No. (Optional)</Label>
                    <Input
                      type="text"
                      placeholder="CHQ001, TXN123..."
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                {!viewHistory && selected.dueAmount > 0 ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPayAmount(0)
                        setPaymentRef("")
                        closeModal()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={savePayment}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={payAmount <= 0}
                    >
                      Pay
                    </Button>
                  </>
                ) : (
                  <div className="text-green-600 font-bold text-center flex-1">
                    Payment Complete
                  </div>
                )}
                <Button variant="outline" onClick={closeModal}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Due Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-bold text-gray-900">Create Supplier Due</h2>
                <button
                  onClick={() => {
                    setShowCreate(false)
                    resetCreateForm()
                  }}
                  className="text-2xl text-gray-500 hover:text-gray-800"
                >
                  X
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Supplier*</Label>
                  <select
                    value={createSupplierId}
                    onChange={(e) => setCreateSupplierId(e.target.value)}
                    className="w-full h-9 px-3 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Supplier</option>
                    {suppliersList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Total Amount*</Label>
                  <Input
                    type="number"
                    value={createTotal}
                    onChange={(e) => setCreateTotal(e.target.value)}
                    className="h-9"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Paid Amount</Label>
                  <Input
                    type="number"
                    value={createPaid}
                    onChange={(e) => setCreatePaid(e.target.value)}
                    className="h-9"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Due Date</Label>
                  <Input
                    type="date"
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Notes</Label>
                  <Input
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                    className="h-9"
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={createDue}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
