import { useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ArrowUpRight, Filter, RefreshCcw, Search, Sparkles, Wallet } from "lucide-react"

type Expense = {
  id: string
  category: string
  type: string
  amount: number
  note: string
  date: string
  paymentMethod: string
  status: "Pending" | "Paid" | "Rejected"
  createdAt: string
}

export default function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem("expenses")
    if (saved) {
      try {
        return JSON.parse(saved) as Expense[]
      } catch (e) {
        console.error("Failed to load expenses", e)
      }
    }
    return []
  })
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("All")
  const [filterStatus, setFilterStatus] = useState("All")
  const [sortBy, setSortBy] = useState("date")
  const [dateRange, setDateRange] = useState({ from: "", to: "" })

  useEffect(() => {
    localStorage.setItem("expenses", JSON.stringify(expenses))
  }, [expenses])

  const categories = useMemo(() => ["All", ...new Set(expenses.map((e) => e.category))], [expenses])
  const statuses = useMemo(() => ["All", "Pending", "Paid", "Rejected"], [])

  const filtered = expenses.filter((e) => {
    const matchesSearch =
      e.type.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.id.includes(search)
    const matchesCategory = filterCategory === "All" || e.category === filterCategory
    const matchesStatus = filterStatus === "All" || e.status === filterStatus
    const matchesDateFrom = !dateRange.from || e.date >= dateRange.from
    const matchesDateTo = !dateRange.to || e.date <= dateRange.to
    return matchesSearch && matchesCategory && matchesStatus && matchesDateFrom && matchesDateTo
  })

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "date":
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      case "amount":
        return b.amount - a.amount
      case "category":
        return a.category.localeCompare(b.category)
      case "type":
        return a.type.localeCompare(b.type)
      default:
        return 0
    }
  })

  function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return
    setExpenses((prev) => prev.filter((e) => e.id !== id))
    alert("Expense deleted ✅")
  }

  function updateStatus(id: string, status: "Pending" | "Paid" | "Rejected") {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e))
    )
    alert("Status updated ✅")
  }

  function exportToCSV() {
    const headers = ["ID", "Date", "Category", "Type", "Amount", "Payment Method", "Status", "Notes"]
    const rows = sorted.map((e) => [
      e.id,
      e.date,
      e.category,
      e.type,
      e.amount,
      e.paymentMethod,
      e.status,
      e.note,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expense_list_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0)
  const pendingAmount = expenses.filter((e) => e.status === "Pending").reduce((sum, e) => sum + e.amount, 0)
  const paidAmount = expenses.filter((e) => e.status === "Paid").reduce((sum, e) => sum + e.amount, 0)
  const rejectedAmount = expenses.filter((e) => e.status === "Rejected").reduce((sum, e) => sum + e.amount, 0)
  const filteredTotal = sorted.reduce((sum, e) => sum + e.amount, 0)
  const filtersActive =
    Boolean(search.trim()) ||
    filterCategory !== "All" ||
    filterStatus !== "All" ||
    sortBy !== "date" ||
    Boolean(dateRange.from) ||
    Boolean(dateRange.to)
  const filteredStatuses = sorted.reduce(
    (acc, expense) => {
      acc[expense.status] = (acc[expense.status] || 0) + expense.amount
      return acc
    },
    {} as Record<Expense["status"], number>
  )

  function resetFilters() {
    setSearch("")
    setFilterCategory("All")
    setFilterStatus("All")
    setSortBy("date")
    setDateRange({ from: "", to: "" })
  }

  const heroMetrics = [
    {
      label: "Total burn",
      value: `Rs. ${totalExpense.toLocaleString()}`,
      hint: `${expenses.length} logged entries`,
      gradient: "from-[#1d1313] to-[#b91c1c]",
      icon: Wallet,
    },
    {
      label: "Pending approvals",
      value: `Rs. ${pendingAmount.toLocaleString()}`,
      hint: `${expenses.filter((e) => e.status === "Pending").length} items queued`,
      gradient: "from-[#78350f] to-[#f59e0b]",
      icon: RefreshCcw,
    },
    {
      label: "Paid out",
      value: `Rs. ${paidAmount.toLocaleString()}`,
      hint: `${expenses.filter((e) => e.status === "Paid").length} cleared`,
      gradient: "from-[#064e3b] to-[#22c55e]",
      icon: Sparkles,
    },
    {
      label: "Rejected",
      value: `Rs. ${rejectedAmount.toLocaleString()}`,
      hint: `${expenses.filter((e) => e.status === "Rejected").length} flagged`,
      gradient: "from-[#701a75] to-[#db2777]",
      icon: AlertCircle,
    },
    {
      label: "Filtered snapshot",
      value: `Rs. ${filteredTotal.toLocaleString()}`,
      hint: `${sorted.length} expenses in view`,
      gradient: "from-[#0f172a] to-[#1d4ed8]",
      icon: ArrowUpRight,
    },
  ]

  const STATUS_TONES: Record<Expense["status"], string> = {
    Pending: "bg-amber-50 text-amber-700",
    Paid: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-rose-50 text-rose-700",
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Expense Management" />

      <Card className="brand-card brand-card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#2b0c0c] via-[#7f1d1d] to-[#dc2626] p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Spend visibility</p>
                <h2 className="text-3xl font-bold">Expense intelligence board</h2>
                <p className="text-sm text-white/80">
                  Zero in on burn, approvals, and outliers with the same visual language as Supplier Management.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <Badge className="brand-pill border border-white/40 bg-white/10 text-white">
                  {filtersActive ? "Filtered view" : "Full ledger"}
                </Badge>
                <Button onClick={exportToCSV} className="rounded-2xl bg-white/90 px-5 py-2 text-[#7f1d1d] hover:bg-white">
                  <Sparkles className="mr-2 h-4 w-4" /> Export CSV
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="rounded-2xl bg-white/10 px-3 py-1">{expenses.length} total entries</span>
              <span className="rounded-2xl bg-white/10 px-3 py-1">Rs. {totalExpense.toLocaleString()} lifetime burn</span>
              <span className="rounded-2xl bg-white/10 px-3 py-1">Rs. {filteredTotal.toLocaleString()} in viewport</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            {heroMetrics.map(({ label, value, hint, gradient, icon: Icon }) => (
              <div
                key={label}
                className={`relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br ${gradient} p-4 text-white shadow-lg`}
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
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                <Filter className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Search & filter</p>
                <h2 className="text-2xl font-bold text-foreground">Spend console</h2>
                <p className="text-sm text-muted-foreground">
                  Slice by modality, approval state, and date window to prep quick finance responses.
                </p>
              </div>
            </div>
            <div className="brand-soft-panel rounded-2xl px-4 py-3 text-right">
              <p className="text-xs font-semibold text-muted-foreground">In viewport</p>
              <p className="text-2xl font-bold text-[#dc2626]">Rs. {filteredTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{sorted.length} expenses</p>
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
                  placeholder="Type, category, ID, or keyword"
                  className="h-12 rounded-2xl border border-border bg-background/70 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Category</Label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3 text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3 text-sm"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Sort by</Label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3 text-sm"
              >
                <option value="date">Date (Newest)</option>
                <option value="amount">Amount (Highest)</option>
                <option value="category">Category</option>
                <option value="type">Type</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">From date</Label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="h-12 rounded-2xl border border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">To date</Label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="h-12 rounded-2xl border border-border"
              />
            </div>
            <div className="flex items-end gap-3">
              <Button
                variant="outline"
                onClick={resetFilters}
                disabled={!filtersActive}
                className="h-12 w-full rounded-2xl border-border/60"
              >
                Reset filters
              </Button>
            </div>
            <div className="flex items-end">
              <Badge className="brand-pill border border-[#fee2e2] bg-[#fee2e2]/40 text-[#b91c1c]">
                {sorted.length} / {expenses.length || 0} entries
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Expense ledger</p>
              <h2 className="text-2xl font-bold text-foreground">Burn breakdown</h2>
              <p className="text-sm text-muted-foreground">
                {filtersActive ? "Filtered snapshot" : "Complete expense log"} — keep payment rails and approvals aligned.
              </p>
            </div>
            <Badge className="brand-pill border border-[#f87171]/30 bg-[#fee2e2] text-[#b91c1c]">
              {sorted.length} entries · Rs. {filteredTotal.toLocaleString()}
            </Badge>
          </div>

          <div className="rounded-3xl border border-border/40 bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-linear-to-r from-[#fee2e2] to-[#ffe4e6] text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <th className="px-4 py-3">Expense</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Payment</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                          {expenses.length === 0 ? "No expenses captured yet." : "No records match the current filters."}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sorted.map((expense, idx) => (
                      <tr
                        key={expense.id}
                        className={`border-b border-border/70 ${idx % 2 === 0 ? "bg-card" : "bg-card/80"} transition hover:bg-muted/50`}
                      >
                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold text-foreground">{expense.type}</p>
                          <p className="text-xs text-muted-foreground">ID {expense.id} · {expense.date}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Badge className="brand-pill border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]">{expense.category}</Badge>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-[#b91c1c]">Rs. {expense.amount.toLocaleString()}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="rounded-2xl bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                            {expense.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <select
                            value={expense.status}
                            onChange={(e) => updateStatus(expense.id, e.target.value as Expense["status"])}
                            className={`rounded-2xl border border-transparent px-3 py-1 text-xs font-semibold focus:outline-none ${STATUS_TONES[expense.status]}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground" title={expense.note}>
                          {expense.note || "—"}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteExpense(expense.id)}
                            className="rounded-2xl px-4 text-xs"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {sorted.length > 0 && (
        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Range recap</p>
                <h2 className="text-2xl font-bold text-foreground">Filtered summary</h2>
                <p className="text-sm text-muted-foreground">Hold vendors accountable with a crisp breakdown of the current selection.</p>
              </div>
              <Badge className="brand-pill border border-[#fee2e2] bg-[#fff1f2] text-[#b91c1c]">{sorted.length} records</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
                <p className="text-xs font-semibold text-muted-foreground">Amount in view</p>
                <p className="mt-2 text-3xl font-bold text-[#b91c1c]">Rs. {filteredTotal.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Across {sorted.length} expenses</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
                <p className="text-xs font-semibold text-muted-foreground">Status allocation</p>
                <div className="mt-3 space-y-2 text-sm font-semibold">
                  <p className="text-amber-700">Pending · Rs. {(filteredStatuses.Pending || 0).toLocaleString()}</p>
                  <p className="text-emerald-700">Paid · Rs. {(filteredStatuses.Paid || 0).toLocaleString()}</p>
                  <p className="text-rose-700">Rejected · Rs. {(filteredStatuses.Rejected || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
