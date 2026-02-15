import { useCallback, useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { ReportConsole } from "@/components/reports/ReportConsole"
import { ReportHero } from "@/components/reports/ReportHero"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertCircle,
  ClipboardCheck,
  Download,
  Filter,
  RefreshCw,
  Search,
  TrendingDown,
  Wallet,
} from "lucide-react"
import { apiGet } from "@/lib/api"

type ExpenseCategoryStat = {
  category: string
  amount: number
  percentage: number
  entries: number
}

type ExpenseEntry = {
  id: number
  category: string
  type: string
  amount: number
  note: string
  date: string | null
  paymentMethod: string
  status: string
}

type ExpenseSummary = {
  totalAmount: number
  averageAmount: number
  entryCount: number
}

type ExpenseSummaryResponse = {
  filters: {
    startDate: string | null
    endDate: string | null
    category: string | null
    status: string | null
    search: string | null
  }
  categories: ExpenseCategoryStat[]
  summary: ExpenseSummary
  recent: ExpenseEntry[]
}

type ExpenseStatusFilter = "all" | "pending" | "approved" | "paid" | "cancelled"

type ExpenseFilters = {
  startDate: string
  endDate: string
  status: ExpenseStatusFilter
}

const createEmptySummary = (): ExpenseSummary => ({
  totalAmount: 0,
  averageAmount: 0,
  entryCount: 0,
})

const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`
const formatNumber = (value: number) => Number(value || 0).toLocaleString("en-LK")

const formatDate = (value?: string | null) => {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleDateString()
}

const STATUS_OPTIONS: Array<{ label: string; value: ExpenseStatusFilter }> = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Paid", value: "paid" },
  { label: "Cancelled", value: "cancelled" },
]

export default function ExpenseReport() {
  const [filters, setFilters] = useState<ExpenseFilters>({ startDate: "", endDate: "", status: "all" })
  const [searchTerm, setSearchTerm] = useState("")
  const [categories, setCategories] = useState<ExpenseCategoryStat[]>([])
  const [summary, setSummary] = useState<ExpenseSummary>(() => createEmptySummary())
  const [recentExpenses, setRecentExpenses] = useState<ExpenseEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)
      if (filters.status !== "all") params.append("status", filters.status)
      const query = params.toString() ? `?${params.toString()}` : ""
      const res = await apiGet<ExpenseSummaryResponse>(`/api/expenses/summary${query}`)
      const payload = res.data
      setCategories(payload.categories ?? [])
      setSummary(payload.summary ?? createEmptySummary())
      setRecentExpenses(payload.recent ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expense report")
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const visibleCategories = useMemo(
    () =>
      categories.filter((category) =>
        category.category.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [categories, searchTerm]
  )

  const totalExpenses = summary.totalAmount || 0
  const averageExpense = summary.averageAmount || 0
  const categoryCount = categories.length
  const recentToDisplay = recentExpenses.slice(0, 8)

  const statusBreakdown = useMemo(() => {
    if (!recentToDisplay.length) return []
    const total = recentToDisplay.reduce((sum, entry) => sum + entry.amount, 0)
    const aggregates = new Map<string, { amount: number; entries: number }>()
    recentToDisplay.forEach((entry) => {
      const key = (entry.status || "pending").toLowerCase()
      const bucket = aggregates.get(key) ?? { amount: 0, entries: 0 }
      bucket.amount += entry.amount
      bucket.entries += 1
      aggregates.set(key, bucket)
    })
    return Array.from(aggregates.entries())
      .map(([status, data]) => ({
        status,
        amount: data.amount,
        entries: data.entries,
        share: total ? (data.amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [recentToDisplay])

  const downloadReport = () => {
    if (typeof window === "undefined" || !visibleCategories.length) return
    const csvContent = [
      ["Expense Report - " + new Date().toLocaleDateString()],
      [],
      ["Category", "Amount (Rs.)", "Percentage", "Entries"],
      ...visibleCategories.map((category) => [
        category.category,
        Math.round(category.amount).toLocaleString(),
        `${category.percentage.toFixed(1)}%`,
        category.entries,
      ]),
      [],
      ["Total Expenses", Math.round(totalExpenses).toLocaleString(), "100%"],
      ["Average Expense", Math.round(averageExpense).toLocaleString(), ""],
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "Expense-Report.csv"
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  const resetFilters = () => setFilters({ startDate: "", endDate: "", status: "all" })

  const statusBadgeClass = (status: string) => {
    const normalized = (status || "").toLowerCase()
    if (normalized === "paid") return "bg-emerald-50 text-emerald-700"
    if (normalized === "approved") return "bg-blue-50 text-blue-700"
    if (normalized === "cancelled") return "bg-rose-50 text-rose-700"
    return "bg-amber-50 text-amber-700"
  }

  const statusGradientClass = (status: string) => {
    const normalized = (status || "").toLowerCase()
    if (normalized === "paid") return "from-emerald-400 to-emerald-600"
    if (normalized === "approved") return "from-sky-400 to-sky-600"
    if (normalized === "cancelled") return "from-rose-400 to-rose-600"
    return "from-amber-400 to-amber-600"
  }

  const heroMetrics = [
    {
      label: "Total spend",
      value: formatCurrency(totalExpenses),
      hint: `${formatNumber(summary.entryCount || 0)} entries logged`,
      gradient: "from-[#0f172a] via-[#312e81] to-[#fb7185]",
      icon: Wallet,
    },
    {
      label: "Average entry",
      value: formatCurrency(averageExpense),
      hint: "Live mean slip",
      gradient: "from-[#14532d] to-[#22d3ee]",
      icon: TrendingDown,
    },
    {
      label: "Categories tracked",
      value: formatNumber(categoryCount),
      hint: `${formatNumber(visibleCategories.length)} visible now`,
      gradient: "from-[#4c0519] to-[#fb7185]",
      icon: AlertCircle,
    },
    {
      label: "Recent ledger rows",
      value: formatNumber(recentToDisplay.length),
      hint: "Latest 8 entries",
      gradient: "from-[#0f172a] to-[#38bdf8]",
      icon: ClipboardCheck,
    },
  ]

  const highlightStats = [
    {
      label: "Status filter",
      value: filters.status === "all" ? "All statuses" : filters.status,
      accent: "text-sky-500",
    },
    {
      label: "Date window",
      value: filters.startDate || filters.endDate ? `${filters.startDate || "∞"} → ${filters.endDate || "∞"}` : "Full history",
      accent: "text-emerald-500",
    },
    {
      label: "Ledger search",
      value: searchTerm ? `"${searchTerm}"` : "All ledgers",
      accent: "text-rose-500",
    },
    {
      label: "Categories visible",
      value: `${formatNumber(visibleCategories.length)} / ${formatNumber(categoryCount || 0)}`,
      accent: "text-amber-500",
    },
  ]

  const consoleFooter = (
    <div className="flex flex-wrap gap-3 text-sm">
      {loading && <span className="text-muted-foreground">Syncing expenses...</span>}
      {error && !loading && <span className="text-rose-600">{error}</span>}
      {!loading && !error && (
        <Badge variant="secondary" className="rounded-2xl border-dashed text-xs">
          {formatNumber(visibleCategories.length)} categories visible
        </Badge>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageTitle title="Expense Report" subtitle="Neon spend cockpit with CSV-ready ledgers" />

      <ReportHero
        kicker="Expense intelligence"
        title="Expense assurance"
        subtitle="Mirror the supplier neon cockpit: hero KPIs, inline CSV exports, and live ledger refresh."
        badgeLabel={categoryCount ? `${categoryCount} categories` : "No categories"}
        metrics={heroMetrics}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={downloadReport}
              className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white"
              disabled={!visibleCategories.length}
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={fetchSummary}
              disabled={loading}
              className="rounded-2xl border-white/60 text-white"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh data
            </Button>
          </div>
        }
      />

      <ReportConsole
        icon={Filter}
        title="Filters & exports"
        description="Dial in the spend window, status, or keyword; exports honor these filters."
        footer={consoleFooter}
      >
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">From date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">To date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value as ExpenseStatusFilter }))}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Ledger search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Category, type, status"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-11 rounded-2xl border-0 bg-muted/30 pl-10"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[auto_auto_1fr]">
            <Button variant="outline" onClick={resetFilters} disabled={loading} className="h-11 rounded-2xl border-dashed">
              Reset filters
            </Button>
            <Button onClick={fetchSummary} disabled={loading} className="h-11 rounded-2xl bg-[#0f172a] text-white">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh data
            </Button>
            <div className="flex items-center text-xs text-muted-foreground">
              Filters cascade into KPIs, breakdowns, and the export action above.
            </div>
          </div>
        </>
      </ReportConsole>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlightStats.map((stat) => (
          <Card key={stat.label} className="brand-card text-center">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">Live expense telemetry</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <CardTitle>Cash exposure</CardTitle>
          <CardDescription>Blends total spend with per-entry averages.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Total spend</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-muted-foreground">All categories combined.</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Average entry</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(averageExpense)}</p>
            <p className="text-xs text-muted-foreground">{formatNumber(summary.entryCount || 0)} entries logged.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Share of spend by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!visibleCategories.length && !loading && <p className="text-sm text-muted-foreground">No categories match this search.</p>}
              {visibleCategories.map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{category.category}</span>
                    <span className="text-lg font-bold text-rose-500">{formatCurrency(category.amount)}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted/40">
                    <div
                      className="h-3 rounded-full bg-linear-to-r from-rose-400 to-rose-600 transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, category.percentage))}%` }}
                    ></div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {category.percentage.toFixed(1)}% of total - {category.entries} entries
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Status health</CardTitle>
            <CardDescription>Mix of approvals, payouts, and holds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusBreakdown.map((status) => (
              <div key={status.status} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold capitalize text-white">{status.status}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(status.entries)} entries</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{formatCurrency(status.amount)}</p>
                    <p className="text-xs text-muted-foreground">{status.share.toFixed(1)}% of recent spend</p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className={`h-2 rounded-full bg-linear-to-r ${statusGradientClass(status.status)}`}
                    style={{ width: `${Math.min(100, Math.max(0, status.share))}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {!statusBreakdown.length && <p className="text-sm text-muted-foreground">No recent expenses to chart.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Detailed Expense Summary</CardTitle>
            <CardDescription>Filter categories and export to CSV.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search category"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-11 rounded-2xl border-0 bg-muted/30 pl-10"
              />
            </div>
            <Button
              type="button"
              onClick={downloadReport}
              className="rounded-2xl bg-[#0f172a] text-white hover:bg-[#020817]"
              disabled={!visibleCategories.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 bg-muted/20">
                  <th className="py-3 px-4 text-left font-semibold">Category</th>
                  <th className="py-3 px-4 text-center font-semibold">Amount</th>
                  <th className="py-3 px-4 text-right font-semibold">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {visibleCategories.map((category) => (
                  <tr key={category.category} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">{category.category}</td>
                    <td className="py-3 px-4 text-center font-semibold text-rose-500">{formatCurrency(category.amount)}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{category.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="bg-rose-50 font-bold text-rose-700">
                  <td className="py-3 px-4">Total Expenses</td>
                  <td className="py-3 px-4 text-center">{formatCurrency(totalExpenses)}</td>
                  <td className="py-3 px-4 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <CardTitle>Recent expenses</CardTitle>
          <CardDescription>Latest entries synced from the expense ledger.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="py-3 px-4 text-left font-semibold">Date</th>
                  <th className="py-3 px-4 text-left font-semibold">Category</th>
                  <th className="py-3 px-4 text-left font-semibold">Type</th>
                  <th className="py-3 px-4 text-center font-semibold">Amount</th>
                  <th className="py-3 px-4 text-left font-semibold">Payment</th>
                  <th className="py-3 px-4 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {!recentToDisplay.length && (
                  <tr>
                    <td className="py-4 px-4 text-center text-sm text-muted-foreground" colSpan={6}>
                      No recent expenses found.
                    </td>
                  </tr>
                )}
                {recentToDisplay.map((expense) => (
                  <tr key={expense.id} className="border-b last:border-0">
                    <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(expense.date)}</td>
                    <td className="py-3 px-4">{expense.category}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{expense.type}</td>
                    <td className="py-3 px-4 text-center font-semibold">{formatCurrency(expense.amount)}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{expense.paymentMethod}</td>
                    <td className="py-3 px-4 text-right">
                      <Badge className={`${statusBadgeClass(expense.status)} border`}>{expense.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
