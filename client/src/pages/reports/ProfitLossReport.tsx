import { useCallback, useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { ReportHero } from "@/components/reports/ReportHero"
import { ReportConsole } from "@/components/reports/ReportConsole"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { apiGet } from "@/lib/api"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"
import { DollarSign, Download, Filter, Layers, RefreshCw, Target, TrendingDown, TrendingUp } from "lucide-react"

const getDefaultFilters = () => {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 5)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

const createEmptySummary = () => ({
  totalRevenue: 0,
  costOfGoods: 0,
  grossProfit: 0,
  totalExpenses: 0,
  netProfit: 0,
  grossMargin: 0,
  netMargin: 0,
  invoiceCount: 0,
  averageInvoice: 0,
  expenseEntries: 0,
})

const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`

const formatPercent = (value: number) => `${value.toFixed(1)}%`

const formatMonthLabel = (value?: string | null) => {
  if (!value || value === "unknown") return "N/A"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) return value
  return parsed.toLocaleString("en-US", { month: "short", year: "numeric" })
}

type ProfitLossSummary = ReturnType<typeof createEmptySummary>

type MonthlyPoint = {
  period: string | null
  revenue: number
  costOfGoods: number
  expenses: number
  grossProfit: number
  netProfit: number
  invoices: number
}

type ExpenseCategory = {
  category: string
  amount: number
  entries: number
}

type ExpenseRow = {
  id: number
  category: string
  type: string
  note: string
  amount: number
  date: string | null
}

type ProfitLossResponse = {
  filters: {
    startDate: string
    endDate: string
  }
  summary: ProfitLossSummary
  monthly: MonthlyPoint[]
  expenseCategories: ExpenseCategory[]
  topExpenses: ExpenseRow[]
}

type Filters = ReturnType<typeof getDefaultFilters>

export default function ProfitLossReport() {
  const [filters, setFilters] = useState<Filters>(() => getDefaultFilters())
  const [summary, setSummary] = useState<ProfitLossSummary>(() => createEmptySummary())
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [topExpenses, setTopExpenses] = useState<ExpenseRow[]>([])
  const [chartType, setChartType] = useState<"line" | "bar">("line")
  const [monthFilter, setMonthFilter] = useState("")
  const [tableSearch, setTableSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)
      const query = params.toString() ? `?${params.toString()}` : ""
      const res = await apiGet<ProfitLossResponse>(`/api/financials/profit-loss${query}`)
      const payload = res.data
      setSummary(payload.summary ?? createEmptySummary())
      setMonthly(payload.monthly ?? [])
      setExpenseCategories(payload.expenseCategories ?? [])
      setTopExpenses(payload.topExpenses ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profit & loss report")
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const filteredMonthly = useMemo(() => {
    if (!tableSearch) return monthly
    const term = tableSearch.toLowerCase()
    return monthly.filter((row) => formatMonthLabel(row.period).toLowerCase().includes(term))
  }, [monthly, tableSearch])

  const chartData = useMemo(
    () =>
      (monthFilter
        ? monthly.filter((row) => formatMonthLabel(row.period).toLowerCase().includes(monthFilter.toLowerCase()))
        : monthly
      ).map((row) => ({
        label: formatMonthLabel(row.period),
        revenue: row.revenue,
        expenses: row.expenses,
        costOfGoods: row.costOfGoods,
        profit: row.netProfit,
      })),
    [monthFilter, monthly]
  )

  const totals = useMemo(() => {
    if (!filteredMonthly.length) {
      return { revenue: 0, expenses: 0, profit: 0 }
    }
    return filteredMonthly.reduce(
      (acc, row) => {
        acc.revenue += row.revenue
        acc.expenses += row.expenses + row.costOfGoods
        acc.profit += row.netProfit
        return acc
      },
      { revenue: 0, expenses: 0, profit: 0 }
    )
  }, [filteredMonthly])

  const profitMonths = monthly.filter((row) => row.netProfit >= 0).length
  const lossMonths = monthly.filter((row) => row.netProfit < 0).length
  const averageMonthlyProfit = monthly.length ? monthly.reduce((sum, row) => sum + row.netProfit, 0) / monthly.length : 0

  const resetFilters = () => setFilters(getDefaultFilters())

  const downloadCsv = () => {
    if (typeof window === "undefined") return
    const csv = [
      ["Profit & Loss Report", new Date().toLocaleDateString()],
      [],
      ["Period", "Revenue", "COGS", "Expenses", "Net Profit"],
      ...monthly.map((row) => [
        formatMonthLabel(row.period),
        Math.round(row.revenue),
        Math.round(row.costOfGoods),
        Math.round(row.expenses),
        Math.round(row.netProfit),
      ]),
      [],
      ["Totals", summary.totalRevenue, summary.costOfGoods, summary.totalExpenses, summary.netProfit],
    ]
      .map((line) => line.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "Profit-Loss-Report.csv"
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  const heroMetrics = [
    {
      label: "Net profit",
      value: formatCurrency(summary.netProfit),
      hint: `Net margin ${formatPercent(summary.netMargin || 0)}`,
      gradient: "from-[#0f172a] via-[#312e81] to-[#22d3ee]",
      icon: summary.netProfit >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: "Revenue velocity",
      value: formatCurrency(summary.totalRevenue),
      hint: `${summary.invoiceCount} invoices`,
      gradient: "from-[#14532d] to-[#22c55e]",
      icon: DollarSign,
    },
    {
      label: "Cost of goods",
      value: formatCurrency(summary.costOfGoods),
      hint: `Gross margin ${formatPercent(summary.grossMargin || 0)}`,
      gradient: "from-[#4c0519] to-[#fb7185]",
      icon: Layers,
    },
    {
      label: "Operating expenses",
      value: formatCurrency(summary.totalExpenses),
      hint: `${summary.expenseEntries} entries tracked`,
      gradient: "from-[#0f172a] to-[#38bdf8]",
      icon: Target,
    },
  ]

  const highlightStats = [
    {
      label: "Date window",
      value: `${filters.startDate || "Start"} → ${filters.endDate || "End"}`,
      accent: "text-sky-400",
    },
    {
      label: "Chart mode",
      value: chartType === "line" ? "Line trajectory" : "Bar pulses",
      accent: "text-emerald-400",
    },
    {
      label: "Spotlight",
      value: monthFilter ? `"${monthFilter}" focus` : "All months",
      accent: "text-amber-400",
    },
    {
      label: "Ledger coverage",
      value: `${monthly.length || 0} months`,
      accent: "text-pink-400",
    },
  ]

  const consoleFooter = (
    <div className="flex flex-wrap gap-3 text-sm">
      {loading && <span className="text-muted-foreground">Syncing financials…</span>}
      {!loading && error && <span className="text-rose-500">{error}</span>}
      {!loading && !error && (
        <>
          <span className="text-muted-foreground">{monthly.length} months analyzed</span>
          <Badge variant="secondary" className="rounded-2xl border-dashed text-xs">
            {expenseCategories.length} expense categories
          </Badge>
        </>
      )}
    </div>
  )

  const downloadReport = () => downloadCsv()

  const profitShare = monthly.length ? (profitMonths / monthly.length) * 100 : 0
  const lossShare = monthly.length ? (lossMonths / monthly.length) * 100 : 0
  const totalExpenseMix = expenseCategories.reduce((sum, category) => sum + category.amount, 0) || 1

  return (
    <div className="space-y-6">
      <PageTitle title="Profit & Loss Overview" subtitle="Neon console for revenue runways, cost gravity, and blended margins." />

      <ReportHero
        kicker="Financial intelligence"
        title="Profit runway"
        subtitle="Revenue, COGS, and expense telemetry combine into one neon cockpit."
        badgeLabel={monthly.length ? `${monthly.length} months analyzed` : "No ledger data"}
        metrics={heroMetrics}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadReport} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={fetchReport} disabled={loading} className="rounded-2xl border-white/80 bg-white/20 text-white hover:bg-white/30">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh data
            </Button>
          </div>
        }
      />

      <ReportConsole
        icon={Filter}
        title="Filters & spotlight"
        description="Shift the analysis window, spotlight a month nickname, or refresh the ledger payload."
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
                className="h-11 rounded-2xl border-0 bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">To date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
                className="h-11 rounded-2xl border-0 bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Spotlight month</Label>
              <Input
                placeholder="e.g. Jan"
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
                className="h-11 rounded-2xl border-0 bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Quick metrics</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-2xl border-dashed text-xs">
                  Avg invoice {formatCurrency(summary.averageInvoice)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[auto_auto_1fr]">
            <Button variant="outline" onClick={resetFilters} disabled={loading} className="h-11 rounded-2xl border-dashed">
              Reset filters
            </Button>
            <Button onClick={fetchReport} disabled={loading} className="h-11 rounded-2xl bg-[#0f172a] text-white">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh data
            </Button>
            <div className="flex items-center text-xs text-muted-foreground">Filters cascade into KPIs, charts, and exports.</div>
          </div>
        </>
      </ReportConsole>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlightStats.map((stat) => (
          <Card key={stat.label} className="brand-card text-center">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">Live filter context</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Profit vs. loss months</CardTitle>
            <CardDescription>Hit-rate of positive net profit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-300 font-semibold">{profitMonths} profit months</span>
              <span className="text-rose-300 font-semibold">{lossMonths} loss months</span>
            </div>
            <div className="h-3 w-full rounded-full bg-white/10">
              <div className="h-3 rounded-full bg-linear-to-r from-emerald-400 to-emerald-600" style={{ width: `${profitShare}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{profitShare.toFixed(1)}% profitable</span>
              <span>{lossShare.toFixed(1)}% loss</span>
            </div>
          </CardContent>
        </Card>
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Avg monthly profit</CardTitle>
            <CardDescription>Blended across the loaded window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className={`text-3xl font-bold ${averageMonthlyProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {formatCurrency(averageMonthlyProfit)}
            </p>
            <p className="text-xs text-muted-foreground">Per month | {monthly.length} samples</p>
          </CardContent>
        </Card>
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Invoice pulse</CardTitle>
            <CardDescription>Average invoice value vs. count.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Average invoice</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.averageInvoice)}</p>
              </div>
              <Badge variant="outline" className="rounded-2xl border-border text-foreground">
                {summary.invoiceCount} invoices
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Profit & loss trend</CardTitle>
            <CardDescription>Revenue, expense, and net profit telemetry.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setChartType("line")} variant={chartType === "line" ? "default" : "outline"} size="sm" className="rounded-2xl">
              Line chart
            </Button>
            <Button onClick={() => setChartType("bar")} variant={chartType === "bar" ? "default" : "outline"} size="sm" className="rounded-2xl">
              Bar chart
            </Button>
            <Button onClick={downloadReport} variant="outline" size="sm" className="rounded-2xl">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="h-105 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartData.length ? (
              chartType === "line" ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: "#0f172a", borderColor: "#1e293b" }} />
                  <Legend />
                  <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} name="Net profit" />
                  <Line type="monotone" dataKey="revenue" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
                  <Line type="monotone" dataKey="expenses" stroke="#fb7185" strokeWidth={2} dot={{ r: 3 }} name="Operating expenses" />
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: "#0f172a", borderColor: "#1e293b" }} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#38bdf8" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#fb7185" name="Operating expenses" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#22c55e" name="Net profit" radius={[4, 4, 0, 0]} />
                </BarChart>
              )
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No chart data for this range.</div>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Expense mix</CardTitle>
            <CardDescription>Categories consuming runway.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {expenseCategories.map((category) => (
              <div key={category.category} className="space-y-2 rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{category.category}</p>
                    <p className="text-xs text-muted-foreground">{category.entries} entries</p>
                  </div>
                  <p className="text-lg font-bold text-rose-600">{formatCurrency(category.amount)}</p>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-linear-to-r from-rose-400 to-rose-600"
                    style={{ width: `${Math.min(100, (category.amount / totalExpenseMix) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {!expenseCategories.length && <p className="text-sm text-muted-foreground">No expense data for this window.</p>}
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Biggest expense tickets</CardTitle>
            <CardDescription>Top ledger lines by value.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topExpenses.map((expense) => (
              <div key={expense.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">{expense.category}</p>
                  <span className="text-xs text-muted-foreground">{formatMonthLabel(expense.date)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{expense.type}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground line-clamp-1">{expense.note || "—"}</p>
                  <span className="text-lg font-bold text-rose-600">{formatCurrency(expense.amount)}</span>
                </div>
              </div>
            ))}
            {!topExpenses.length && <p className="text-sm text-muted-foreground">No expense entries recorded.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Monthly ledger</CardTitle>
            <CardDescription>Revenue, cost, and margin per period.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search month"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              className="h-11 w-full rounded-2xl border-0 bg-muted/30 pl-4 md:w-64"
            />
            <Button variant="outline" size="sm" onClick={() => setTableSearch("")} className="rounded-2xl border-dashed">
              Clear search
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/20">
                <th className="py-3 px-4 text-left font-semibold">Month</th>
                <th className="py-3 px-4 text-right font-semibold">Revenue</th>
                <th className="py-3 px-4 text-right font-semibold">COGS</th>
                <th className="py-3 px-4 text-right font-semibold">Expenses</th>
                <th className="py-3 px-4 text-right font-semibold">Net profit</th>
                <th className="py-3 px-4 text-center font-semibold">Status</th>
                <th className="py-3 px-4 text-center font-semibold">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {filteredMonthly.map((row) => {
                const margin = row.revenue ? (row.netProfit / row.revenue) * 100 : 0
                return (
                  <tr key={`${row.period}-${row.revenue}`} className="border-b last:border-0">
                    <td className="py-3 px-4 font-semibold text-foreground">{formatMonthLabel(row.period)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-sky-600">{formatCurrency(row.revenue)}</td>
                    <td className="py-3 px-4 text-right text-amber-600">{formatCurrency(row.costOfGoods)}</td>
                    <td className="py-3 px-4 text-right text-rose-600">{formatCurrency(row.expenses)}</td>
                    <td className={`py-3 px-4 text-right font-bold ${row.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatCurrency(row.netProfit)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className={`border ${row.netProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        {row.netProfit >= 0 ? "Profit" : "Loss"}
                      </Badge>
                    </td>
                    <td className={`py-3 px-4 text-center font-semibold ${margin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatPercent(margin)}
                    </td>
                  </tr>
                )
              })}
              {!filteredMonthly.length && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    No months match this search.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredMonthly.length > 0 && (
              <tfoot>
                <tr className="bg-muted/20 font-semibold">
                  <td className="py-3 px-4">Totals</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(totals.revenue)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(filteredMonthly.reduce((sum, row) => sum + row.costOfGoods, 0))}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(filteredMonthly.reduce((sum, row) => sum + row.expenses, 0))}</td>
                  <td className={`py-3 px-4 text-right ${totals.profit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {formatCurrency(totals.profit)}
                  </td>
                  <td></td>
                  <td className="py-3 px-4 text-center">{formatPercent(totals.revenue ? (totals.profit / totals.revenue) * 100 : 0)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
