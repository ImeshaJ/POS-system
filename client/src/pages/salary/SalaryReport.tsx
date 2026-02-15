import { useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  CalendarClock,
  ClipboardCheck,
  Download,
  Filter,
  Minus,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react"

type Employee = {
  id: string
  name: string
  role: string
  salary: number
}

type SalaryStatus = "Pending" | "Processed" | "Paid" | "Rejected"

type AllowanceLine = {
  type: string
  amount: number
}

type DeductionLine = {
  reason: string
  amount: number
}

type SalaryRecord = {
  id: string
  employeeId: string
  employeeName: string
  role: string
  month: string
  baseSalary: number
  allowances: AllowanceLine[]
  deductions: DeductionLine[]
  netSalary: number
  status: SalaryStatus
  paymentDate?: string
  createdAt: string
}

type SalaryFormState = {
  employeeId: string
  employeeName: string
  role: string
  month: string
  baseSalary: number
  allowances: AllowanceLine[]
  deductions: DeductionLine[]
}

type EditableFormField = "role" | "month" | "baseSalary"

type PersistedSalaryRecord = Omit<SalaryRecord, "allowances" | "deductions"> & {
  allowances: unknown
  deductions: unknown
}

const STATUS_OPTIONS: SalaryStatus[] = ["Pending", "Processed", "Paid", "Rejected"]

const STATUS_TONES: Record<SalaryStatus, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Processed: "bg-indigo-50 text-indigo-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-rose-50 text-rose-700",
}

const monthStamp = () => new Date().toISOString().slice(0, 7)

const createDefaultForm = (month?: string): SalaryFormState => ({
  employeeId: "",
  employeeName: "",
  role: "",
  month: month ?? monthStamp(),
  baseSalary: 0,
  allowances: [{ type: "", amount: 0 }],
  deductions: [{ reason: "", amount: 0 }],
})

const formatCurrency = (value: number) => `Rs. ${value.toLocaleString()}`

const getAllowanceTotal = (lines: AllowanceLine[]) =>
  lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)

const getDeductionTotal = (lines: DeductionLine[]) =>
  lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)

const calculateNetSalary = (base: number, allowances: AllowanceLine[], deductions: DeductionLine[]) =>
  Math.max(base + getAllowanceTotal(allowances) - getDeductionTotal(deductions), 0)

const normalizeAllowanceLines = (value: unknown): AllowanceLine[] => {
  if (Array.isArray(value)) {
    return value.map((line) => ({
      type: typeof (line as AllowanceLine).type === "string" ? (line as AllowanceLine).type : "",
      amount: Number((line as AllowanceLine).amount) || 0,
    }))
  }
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue !== 0 ? [{ type: "Allowance", amount: numericValue }] : []
}

const normalizeDeductionLines = (value: unknown): DeductionLine[] => {
  if (Array.isArray(value)) {
    return value.map((line) => ({
      reason: typeof (line as DeductionLine).reason === "string" ? (line as DeductionLine).reason : "",
      amount: Number((line as DeductionLine).amount) || 0,
    }))
  }
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue !== 0
    ? [{ reason: "Adjustment", amount: numericValue }]
    : []
}

export default function SalaryReport() {
  const initialMonth = monthStamp()
  const [employees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem("employees")
    if (!saved) return []
    try {
      return JSON.parse(saved) as Employee[]
    } catch (error) {
      console.error("Failed to parse employees", error)
      return []
    }
  })

  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>(() => {
    const saved = localStorage.getItem("salaryRecords")
    if (!saved) return []
    try {
      const parsed = JSON.parse(saved) as PersistedSalaryRecord[]
      return parsed.map((record) => ({
        ...record,
        allowances: normalizeAllowanceLines(record.allowances),
        deductions: normalizeDeductionLines(record.deductions),
      })) as SalaryRecord[]
    } catch (error) {
      console.error("Failed to parse salary records", error)
      return []
    }
  })

  const [filterMonth, setFilterMonth] = useState(initialMonth)
  const [filterStatus, setFilterStatus] = useState<SalaryStatus | "All">("All")
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(true)
  const [form, setForm] = useState<SalaryFormState>(() => createDefaultForm(initialMonth))

  useEffect(() => {
    localStorage.setItem("salaryRecords", JSON.stringify(salaryRecords))
  }, [salaryRecords])

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase()
    return salaryRecords.filter((record) => {
      const matchesMonth = filterMonth ? record.month === filterMonth : true
      const matchesStatus = filterStatus === "All" || record.status === filterStatus
      const matchesSearch = term
        ? record.employeeName.toLowerCase().includes(term) || record.employeeId.toLowerCase().includes(term)
        : true
      return matchesMonth && matchesStatus && matchesSearch
    })
  }, [salaryRecords, filterMonth, filterStatus, search])

  const previewNetSalary = useMemo(
    () => calculateNetSalary(form.baseSalary, form.allowances, form.deductions),
    [form]
  )

  const totalBase = filteredRecords.reduce((sum, record) => sum + record.baseSalary, 0)
  const totalAllowances = filteredRecords.reduce((sum, record) => sum + getAllowanceTotal(record.allowances), 0)
  const totalDeductions = filteredRecords.reduce((sum, record) => sum + getDeductionTotal(record.deductions), 0)
  const totalNet = filteredRecords.reduce((sum, record) => sum + record.netSalary, 0)
  const globalNet = salaryRecords.reduce((sum, record) => sum + record.netSalary, 0)

  const pendingCount = filteredRecords.filter((record) => record.status === "Pending").length
  const processedCount = filteredRecords.filter((record) => record.status === "Processed").length
  const paidCount = filteredRecords.filter((record) => record.status === "Paid").length

  const monthLabel = filterMonth ? new Date(`${filterMonth}-01`).toLocaleString("default", { month: "long", year: "numeric" }) : "All periods"

  const heroMetrics = [
    {
      label: "Total payroll run",
      value: formatCurrency(globalNet),
      hint: salaryRecords.length ? `${salaryRecords.length} disbursements recorded` : "No salary data yet",
      gradient: "from-[#0f172a] via-[#1e3a8a] to-[#312e81]",
      icon: Wallet,
    },
    {
      label: "Current window",
      value: formatCurrency(totalNet),
      hint: monthLabel,
      gradient: "from-[#134e4a] to-[#10b981]",
      icon: CalendarClock,
    },
    {
      label: "Pending approvals",
      value: `${pendingCount || 0} awaiting`,
      hint: `${processedCount} processed · ${paidCount} paid`,
      gradient: "from-[#4c0519] to-[#e11d48]",
      icon: Sparkles,
    },
    {
      label: "Allowance lift",
      value: formatCurrency(totalAllowances),
      hint: `Deductions ${formatCurrency(totalDeductions)}`,
      gradient: "from-[#0f172a] to-[#38bdf8]",
      icon: TrendingUp,
    },
  ]

  function resetFilters() {
    setSearch("")
    setFilterStatus("All")
    setFilterMonth(initialMonth)
  }

  function handleEmployeeChange(employeeId: string) {
    const employee = employees.find((emp) => emp.id === employeeId)
    setForm((prev) => ({
      ...prev,
      employeeId,
      employeeName: employee?.name || "",
      role: employee?.role || prev.role,
      baseSalary: employee?.salary ?? prev.baseSalary,
    }))
  }

  function handleFormField(field: EditableFormField, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: field === "baseSalary" ? Number(value) : value,
    }))
  }

  function handleAllowanceChange(index: number, field: keyof AllowanceLine, value: string | number) {
    setForm((prev) => {
      const allowances = prev.allowances.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: field === "amount" ? Number(value) : value } : line
      )
      return { ...prev, allowances }
    })
  }

  function removeAllowance(index: number) {
    setForm((prev) => ({
      ...prev,
      allowances: prev.allowances.filter((_, lineIndex) => lineIndex !== index),
    }))
  }

  function addAllowance() {
    setForm((prev) => ({
      ...prev,
      allowances: [...prev.allowances, { type: "", amount: 0 }],
    }))
  }

  function handleDeductionChange(index: number, field: keyof DeductionLine, value: string | number) {
    setForm((prev) => {
      const deductions = prev.deductions.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: field === "amount" ? Number(value) : value } : line
      )
      return { ...prev, deductions }
    })
  }

  function removeDeduction(index: number) {
    setForm((prev) => ({
      ...prev,
      deductions: prev.deductions.filter((_, lineIndex) => lineIndex !== index),
    }))
  }

  function addDeduction() {
    setForm((prev) => ({
      ...prev,
      deductions: [...prev.deductions, { reason: "", amount: 0 }],
    }))
  }

  function handleSaveSalaryRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.employeeId || !form.employeeName || !form.baseSalary) {
      alert("Select an employee and enter the base salary before saving.")
      return
    }

    const allowanceTotal = getAllowanceTotal(form.allowances)
    const deductionTotal = getDeductionTotal(form.deductions)
    const netSalary = calculateNetSalary(form.baseSalary, form.allowances, form.deductions)
    const nextId = `SAL-${String(salaryRecords.length + 1).padStart(4, "0")}`

    const newRecord: SalaryRecord = {
      id: nextId,
      employeeId: form.employeeId,
      employeeName: form.employeeName,
      role: form.role,
      month: form.month,
      baseSalary: form.baseSalary,
      allowances: form.allowances,
      deductions: form.deductions,
      netSalary,
      status: "Pending",
      paymentDate: "",
      createdAt: new Date().toISOString(),
    }

    setSalaryRecords((prev) => [newRecord, ...prev])
    alert(
      `Payroll record for ${form.employeeName} saved. Net salary ${formatCurrency(netSalary)} (Allowance ${formatCurrency(
        allowanceTotal
      )} · Deduction ${formatCurrency(deductionTotal)}).`
    )
    setForm(createDefaultForm(form.month))
  }

  function updateStatus(id: string, status: SalaryStatus) {
    setSalaryRecords((prev) =>
      prev.map((record) =>
        record.id === id
          ? {
              ...record,
              status,
              paymentDate: status === "Paid" ? new Date().toISOString().split("T")[0] : record.paymentDate,
            }
          : record
      )
    )
  }

  function exportToCSV() {
    if (!filteredRecords.length) {
      alert("No records available for export.")
      return
    }

    const headers = [
      "Payroll ID",
      "Employee",
      "Role",
      "Month",
      "Base Salary",
      "Allowances",
      "Deductions",
      "Net Salary",
      "Status",
      "Payment Date",
    ]

    const rows = filteredRecords.map((record) => [
      record.id,
      record.employeeName,
      record.role,
      record.month,
      record.baseSalary,
      getAllowanceTotal(record.allowances),
      getDeductionTotal(record.deductions),
      record.netSalary,
      record.status,
      record.paymentDate || "",
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `salary_report_${filterMonth || "all"}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Salary Report & Payroll Management" />

      <Card className="brand-card brand-card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#7c3aed] p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Payroll cockpit</p>
                <h2 className="text-3xl font-bold">Salary orchestration</h2>
                <p className="text-sm text-white/80">
                  Neon-grade summaries, inline approvals, and export-ready ledgers for every cycle.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <Badge className="brand-pill border border-white/30 bg-white/10 text-white">
                  {filteredRecords.length ? `${filteredRecords.length} records in view` : "No records yet"}
                </Badge>
                <Button onClick={() => setShowForm((prev) => !prev)} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  {showForm ? "Hide" : "Show"} payroll form
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            {heroMetrics.map(({ label, value, hint, gradient, icon: Icon }) => (
              <div key={label} className={`rounded-2xl border border-white/10 bg-linear-to-br ${gradient} p-4 text-white shadow-lg`}>
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
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-muted/50 p-2 text-primary">
              <Filter className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Reconciliation filters</p>
              <h2 className="text-2xl font-bold text-foreground">Payroll console</h2>
              <p className="text-sm text-muted-foreground">Search, slice, and export the salary ledger without leaving the cockpit.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Search roster</Label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="EMP ID or name" className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Month</Label>
              <Input type="month" value={filterMonth} onChange={(event) => setFilterMonth(event.target.value)} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status</Label>
              <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as SalaryStatus | "All")} className="h-11 w-full rounded-2xl border border-border bg-background/70 px-3">
                <option value="All">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2 md:flex-row">
              <Button variant="outline" onClick={resetFilters} className="h-11 flex-1 rounded-2xl border-dashed">
                Reset
              </Button>
              <Button onClick={exportToCSV} className="h-11 flex-1 rounded-2xl bg-[#0f172a] text-white">
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-6 p-6">
            <form className="space-y-6" onSubmit={handleSaveSalaryRecord}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Employee*</Label>
                  <select value={form.employeeId} onChange={(event) => handleEmployeeChange(event.target.value)} className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3">
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.id} · {employee.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Role / Band</Label>
                  <Input value={form.role} onChange={(event) => handleFormField("role", event.target.value)} placeholder="Role" className="h-12 rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Payroll month</Label>
                  <Input type="month" value={form.month} onChange={(event) => handleFormField("month", event.target.value)} className="h-12 rounded-2xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Base salary (Rs.)*</Label>
                  <Input type="number" min={0} value={form.baseSalary} onChange={(event) => handleFormField("baseSalary", event.target.value)} className="h-12 rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Allowances snapshot</Label>
                  <Input readOnly value={formatCurrency(getAllowanceTotal(form.allowances))} className="h-12 rounded-2xl bg-muted/40" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Net salary preview</Label>
                  <Input readOnly value={formatCurrency(previewNetSalary)} className="h-12 rounded-2xl font-semibold" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Allowances</p>
                    <p className="text-xs text-muted-foreground">Travel, overtime, incentives, or any positive adjustments.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={addAllowance} className="rounded-2xl border-dashed">
                    <Plus className="mr-2 h-4 w-4" /> Add line
                  </Button>
                </div>
                {form.allowances.map((allowance, index) => (
                  <div key={`allowance-${index}`} className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 md:grid-cols-12">
                    <div className="md:col-span-7">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type</Label>
                      <Input value={allowance.type} onChange={(event) => handleAllowanceChange(index, "type", event.target.value)} placeholder="Allowance label" className="mt-1 h-11 rounded-2xl" />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Amount</Label>
                      <Input type="number" min={0} value={allowance.amount} onChange={(event) => handleAllowanceChange(index, "amount", Number(event.target.value))} className="mt-1 h-11 rounded-2xl" />
                    </div>
                    <div className="flex items-end justify-end md:col-span-2">
                      <Button type="button" variant="ghost" onClick={() => removeAllowance(index)} className="h-11 rounded-2xl text-rose-600 hover:bg-rose-50">
                        <Minus className="mr-1 h-4 w-4" /> Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Deductions</p>
                    <p className="text-xs text-muted-foreground">Taxes, advances, penalties, or other offsets.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={addDeduction} className="rounded-2xl border-dashed">
                    <Plus className="mr-2 h-4 w-4" /> Add line
                  </Button>
                </div>
                {form.deductions.map((deduction, index) => (
                  <div key={`deduction-${index}`} className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 md:grid-cols-12">
                    <div className="md:col-span-7">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Reason</Label>
                      <Input value={deduction.reason} onChange={(event) => handleDeductionChange(index, "reason", event.target.value)} placeholder="Deduction reason" className="mt-1 h-11 rounded-2xl" />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Amount</Label>
                      <Input type="number" min={0} value={deduction.amount} onChange={(event) => handleDeductionChange(index, "amount", Number(event.target.value))} className="mt-1 h-11 rounded-2xl" />
                    </div>
                    <div className="flex items-end justify-end md:col-span-2">
                      <Button type="button" variant="ghost" onClick={() => removeDeduction(index)} className="h-11 rounded-2xl text-rose-600 hover:bg-rose-50">
                        <Minus className="mr-1 h-4 w-4" /> Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" className="flex-1 rounded-2xl bg-[#0f172a] text-white hover:bg-[#020617]">
                  <ClipboardCheck className="mr-2 h-4 w-4" /> Save payroll entry
                </Button>
                <Button type="button" variant="outline" onClick={() => setForm(createDefaultForm(form.month))} className="rounded-2xl border-border/60">
                  Reset form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {filteredRecords.length > 0 && (
        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Base salary</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(totalBase)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Allowances</p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">+{formatCurrency(totalAllowances)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Deductions</p>
                <p className="mt-2 text-2xl font-bold text-rose-600">-{formatCurrency(totalDeductions)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Net payroll</p>
                <p className="mt-2 text-2xl font-bold text-[#0f172a]">{formatCurrency(totalNet)}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status mix</p>
                <p className="mt-2 text-sm text-emerald-600">Paid · {paidCount}</p>
                <p className="text-sm text-indigo-600">Processed · {processedCount}</p>
                <p className="text-sm text-amber-600">Pending · {pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="brand-card brand-card-hover">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Salary ledger</p>
              <h2 className="text-2xl font-bold text-foreground">Payroll records</h2>
              <p className="text-sm text-muted-foreground">Inline approvals, net salary clarity, and audit-ready formatting.</p>
            </div>
            <Badge className="brand-pill border border-[#fee2e2] bg-[#fee2e2]/60 text-[#7f1d1d]">
              {filteredRecords.length ? `${filteredRecords.length} records` : "Awaiting entries"}
            </Badge>
          </div>

          <div className="rounded-3xl border border-border/40 bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-linear-to-r from-[#eef2ff] to-[#e0f2fe] text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right">Base</th>
                    <th className="px-4 py-3 text-right">Allowances</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                        {salaryRecords.length === 0 ? "No salary records yet" : "No records match the current filters."}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record, index) => (
                      <tr key={record.id} className={`border-b border-border/70 ${index % 2 === 0 ? "bg-card" : "bg-card/80"} transition hover:bg-muted/50`}>
                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold text-foreground">{record.employeeName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{record.employeeId}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Badge className="brand-pill border border-[#f5d0fe] bg-[#fdf4ff] text-[#86198f]">{record.role || "—"}</Badge>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Badge variant="outline" className="rounded-2xl border-dashed text-xs">
                            {record.month}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-muted-foreground">{formatCurrency(record.baseSalary)}</td>
                        <td className="px-4 py-4 text-right font-semibold text-emerald-600">+{formatCurrency(getAllowanceTotal(record.allowances))}</td>
                        <td className="px-4 py-4 text-right font-semibold text-rose-600">-{formatCurrency(getDeductionTotal(record.deductions))}</td>
                        <td className="px-4 py-4 text-right text-lg font-bold text-[#0f172a]">{formatCurrency(record.netSalary)}</td>
                        <td className="px-4 py-4 text-center">
                          <select value={record.status} onChange={(event) => updateStatus(record.id, event.target.value as SalaryStatus)} className={`rounded-2xl border border-transparent px-3 py-1 text-xs font-semibold focus:outline-none ${STATUS_TONES[record.status]}`}>
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 text-center text-xs text-muted-foreground">
                          {record.paymentDate ? record.paymentDate : "—"}
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
    </div>
  )
}
