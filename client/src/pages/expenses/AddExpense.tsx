import { useState, useEffect } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ClipboardCheck, Filter, Layers, Search, Sparkles, Wallet } from "lucide-react"
import { useToast } from "@/components/common/Toast"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"

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

type ExpenseForm = {
  category: string
  customCategory: string
  type: string
  customType: string
  amount: string | number
  note: string
  date: string
  paymentMethod: string
  status: Expense["status"]
}

const createDefaultExpenseForm = (): ExpenseForm => ({
  category: "",
  customCategory: "",
  type: "",
  customType: "",
  amount: "",
  note: "",
  date: new Date().toISOString().split("T")[0],
  paymentMethod: "Cash",
  status: "Pending",
})

const EXPENSE_CATEGORIES = [
  "Salary",
  "Utilities",
  "Rent",
  "Supplies",
  "Equipment",
  "Medical",
  "Transportation",
  "Insurance",
  "Maintenance",
  "Other",
]

const EXPENSE_TYPES: Record<string, string[]> = {
  Salary: ["Veterinarian Salary", "Staff Salary", "Bonus", "Incentive"],
  Utilities: ["Electricity", "Water", "Gas", "Internet", "Telephone"],
  Rent: ["Clinic Rent", "Building Lease", "Equipment Lease", "Storage Rent"],
  Supplies: ["Medical Supplies", "Office Supplies", "Pet Food", "Cleaning Supplies"],
  Equipment: ["Medical Equipment", "Furniture", "Computer", "Vehicle", "Tools"],
  Medical: ["Medicine Purchase", "Vaccination", "Laboratory Test", "Medical Waste"],
  Transportation: ["Fuel", "Vehicle Maintenance", "Repairs", "Parking", "Delivery"],
  Insurance: ["Health Insurance", "Vehicle Insurance", "Property Insurance", "Liability Insurance"],
  Maintenance: ["Clinic Maintenance", "Equipment Repair", "Cleaning Service", "Pest Control"],
  Other: ["Miscellaneous", "Office Party", "Training", "Donation"],
}

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Check", "Card", "Credit"]

export default function AddExpense() {
  const toast = useToast()
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
  const [showList, setShowList] = useState(false)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("All")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)

  const [form, setForm] = useState<ExpenseForm>(createDefaultExpenseForm())

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("expenses", JSON.stringify(expenses))
  }, [expenses])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const finalCategory = form.category === "Add New" ? form.customCategory : form.category
    const finalType = form.type === "Add New" ? form.customType : form.type

    if (!finalCategory || !finalType || !form.amount || !form.date) {
      toast.warning("Please fill all required fields")
      return
    }

    const newId = "EXP" + String(expenses.length + 1).padStart(4, "0")
    const newExpense: Expense = {
      id: newId,
      category: finalCategory,
      type: finalType,
      amount: Number(form.amount),
      note: form.note,
      date: form.date,
      paymentMethod: form.paymentMethod,
      status: form.status,
      createdAt: new Date().toISOString(),
    }

    setExpenses((prev) => [newExpense, ...prev])
    resetForm()
    toast.success("Expense added successfully")
  }

  function resetForm() {
    setForm(createDefaultExpenseForm())
  }

  function handleDeleteClick(id: string) {
    setExpenseToDelete(id)
    setDeleteDialogOpen(true)
  }

  function handleDeleteConfirm() {
    if (!expenseToDelete) return
    setExpenses((prev) => prev.filter((e) => e.id !== expenseToDelete))
    toast.success("Expense deleted successfully")
    setDeleteDialogOpen(false)
    setExpenseToDelete(null)
  }

  function updateStatus(id: string, status: "Pending" | "Paid" | "Rejected") {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e))
    )
    toast.success("Status updated successfully")
  }

  function exportToCSV() {
    const headers = ["ID", "Category", "Type", "Amount", "Date", "Payment Method", "Status", "Notes"]
    const rows = filteredExpenses.map((e) => [
      e.id,
      e.category,
      e.type,
      e.amount,
      e.date,
      e.paymentMethod,
      e.status,
      e.note,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expenses_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.type.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.id.includes(search)
    const matchesStatus = filterStatus === "All" || e.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0)
  const pendingAmount = expenses.filter((e) => e.status === "Pending").reduce((sum, e) => sum + e.amount, 0)
  const paidAmount = expenses.filter((e) => e.status === "Paid").reduce((sum, e) => sum + e.amount, 0)
  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  const heroMetrics = [
    {
      label: "Total burn",
      value: `Rs. ${totalExpense.toLocaleString()}`,
      hint: `${expenses.length} entries logged`,
      gradient: "from-[#1d1313] to-[#b91c1c]",
      icon: Wallet,
    },
    {
      label: "Pending approval",
      value: `Rs. ${pendingAmount.toLocaleString()}`,
      hint: `${expenses.filter((e) => e.status === "Pending").length} waiting`,
      gradient: "from-[#78350f] to-[#f59e0b]",
      icon: Layers,
    },
    {
      label: "Paid out",
      value: `Rs. ${paidAmount.toLocaleString()}`,
      hint: `${expenses.filter((e) => e.status === "Paid").length} cleared`,
      gradient: "from-[#065f46] to-[#22c55e]",
      icon: Sparkles,
    },
    {
      label: "Filtered view",
      value: `Rs. ${filteredTotal.toLocaleString()}`,
      hint: `${filteredExpenses.length} rows in panel`,
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
      <PageTitle title="Expense Capture" />

      <Card className="brand-card brand-card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#2b0c0c] via-[#7f1d1d] to-[#dc2626] p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Spend intake</p>
                <h2 className="text-3xl font-bold">Log expenses with confidence</h2>
                <p className="text-sm text-white/80">Mirror the supplier dashboards—hero tiles, neon filters, ledger clarity.</p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <Badge className="brand-pill border border-white/40 bg-white/10 text-white">{showList ? "Entry + ledger" : "Entry focus"}</Badge>
                <Button onClick={() => setShowList((prev) => !prev)} className="rounded-2xl bg-white/90 px-5 py-2 text-[#7f1d1d] hover:bg-white">
                  <ClipboardCheck className="mr-2 h-4 w-4" /> {showList ? "Hide" : "View"} ledger
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="rounded-2xl bg-white/10 px-3 py-1">{expenses.length} total entries</span>
              <span className="rounded-2xl bg-white/10 px-3 py-1">Rs. {totalExpense.toLocaleString()} lifetime burn</span>
              <span className="rounded-2xl bg-white/10 px-3 py-1">Rs. {filteredTotal.toLocaleString()} in ledger view</span>
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
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Add expense</p>
                <h2 className="text-2xl font-bold text-foreground">Capture details</h2>
                <p className="text-sm text-muted-foreground">Auto-id, contextual dropdowns, and inline validation keep finance tidy.</p>
              </div>
            </div>
            <Badge className="brand-pill border border-[#fee2e2] bg-[#fff1f2] text-[#b91c1c]">Next ID · {`EXP${String(expenses.length + 1).padStart(4, "0")}`}</Badge>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Category*</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value, type: "", customCategory: "", customType: "" })}
                  className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3"
                  required
                >
                  <option value="">Select Category</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Add New">+ Add New Category</option>
                </select>
              </div>
              {form.category === "Add New" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">New Category Name*</Label>
                  <Input
                    type="text"
                    value={form.customCategory}
                    onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                    placeholder="Eg. Marketing"
                    className="h-12 rounded-2xl"
                    required
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Expense Type*</Label>
                {form.category && form.category !== "Add New" ? (
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value, customType: "" })}
                    className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3"
                    required
                  >
                    <option value="">Select Type</option>
                    {EXPENSE_TYPES[form.category]?.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                    <option value="Add New">+ Add New Type</option>
                  </select>
                ) : form.category === "Add New" ? (
                  <Input
                    type="text"
                    value={form.customType}
                    onChange={(e) => setForm({ ...form, customType: e.target.value })}
                    placeholder="Enter expense type"
                    className="h-12 rounded-2xl"
                    required
                  />
                ) : (
                  <Input type="text" placeholder="Select category first" disabled className="h-12 rounded-2xl bg-muted" />
                )}
              </div>
              {form.type === "Add New" && form.category !== "Add New" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">New Type Name*</Label>
                  <Input
                    type="text"
                    value={form.customType}
                    onChange={(e) => setForm({ ...form, customType: e.target.value })}
                    placeholder="Eg. Digital ads"
                    className="h-12 rounded-2xl"
                    required
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Amount (Rs.)*</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Enter amount"
                  className="h-12 rounded-2xl"
                  required
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Expense Date*</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-12 rounded-2xl" required />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Payment Method</Label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Expense["status"] })}
                  className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Note</Label>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="h-32 w-full rounded-2xl border border-border bg-background/70 px-3 py-2"
                placeholder="Optional notes for finance"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" className="flex-1 rounded-2xl bg-[#1d4ed8] text-white hover:bg-[#1e3a8a]">
                <Wallet className="mr-2 h-4 w-4" /> Save expense
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} className="rounded-2xl border-border/60">
                Clear
              </Button>
              {expenses.length > 0 && (
                <Button type="button" variant="outline" onClick={() => setShowList((prev) => !prev)} className="rounded-2xl border-green-200 text-green-700">
                  {showList ? "Hide" : "Show"} ledger
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {showList && expenses.length > 0 && (
        <>
          <Card className="brand-card brand-card-hover">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                    <Filter className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Ledger filters</p>
                    <h2 className="text-2xl font-bold text-foreground">Expense console</h2>
                    <p className="text-sm text-muted-foreground">Target specific approvals or categories before exporting.</p>
                  </div>
                </div>
                <Badge className="brand-pill border border-[#fee2e2] bg-[#fee2e2]/40 text-[#b91c1c]">{filteredExpenses.length} entries · Rs. {filteredTotal.toLocaleString()}</Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Search ledger</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Type, category, or ID"
                      className="h-12 rounded-2xl border border-border bg-background/70 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Status</Label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3"
                  >
                    <option value="All">All</option>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex items-end gap-3">
                  <Button onClick={exportToCSV} className="h-12 flex-1 rounded-2xl bg-[#1d4ed8] text-white hover:bg-[#1e3a8a]">
                    <ArrowUpRight className="mr-2 h-4 w-4" /> Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="brand-card brand-card-hover">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Expense ledger</p>
                  <h2 className="text-2xl font-bold text-foreground">Captured expenses</h2>
                  <p className="text-sm text-muted-foreground">Status controls remain inline for quick approvals.</p>
                </div>
                <Badge className="brand-pill border border-[#f87171]/30 bg-[#fee2e2] text-[#b91c1c]">{filteredExpenses.length} entries</Badge>
              </div>

              <div className="rounded-3xl border border-border/40 bg-card">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-linear-to-r from-[#fee2e2] to-[#ffe4e6] text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                        <th className="px-4 py-3">Expense</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-center">Date</th>
                        <th className="px-4 py-3 text-center">Payment</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                            No expenses match the current filters.
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map((expense, idx) => (
                          <tr
                            key={expense.id}
                            className={`border-b border-border/70 ${idx % 2 === 0 ? "bg-card" : "bg-card/80"} transition hover:bg-muted/50`}
                          >
                            <td className="px-4 py-4 align-top">
                              <p className="font-semibold text-foreground">{expense.type}</p>
                              <p className="text-xs text-muted-foreground">ID {expense.id}</p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <Badge className="brand-pill border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]">{expense.category}</Badge>
                            </td>
                            <td className="px-4 py-4 text-right font-semibold text-[#b91c1c]">Rs. {expense.amount.toLocaleString()}</td>
                            <td className="px-4 py-4 text-center text-sm text-muted-foreground">{expense.date}</td>
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
                            <td className="px-4 py-4 text-center">
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(expense.id)} className="rounded-2xl px-4 text-xs">
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
        </>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  )
}
