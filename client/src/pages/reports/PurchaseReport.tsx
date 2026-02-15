import { useCallback, useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { ReportHero } from "@/components/reports/ReportHero"
import { ReportConsole } from "@/components/reports/ReportConsole"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiGet } from "@/lib/api"
import { AlertTriangle, Download, Filter, Layers, Package, RefreshCw, Search, TrendingUp } from "lucide-react"

type PurchaseSummaryMetrics = {
  totalSpent: number
  averagePurchase: number
  purchaseCount: number
  pendingTotal: number
  monthToDate: number
  itemsPurchased: number
  supplierCount: number
}

type StatusStat = {
  status: string
  purchases: number
  amount: number
  share: number
}

type CategoryStat = {
  category: string
  units: number
  spend: number
  share: number
}

type SupplierStat = {
  id: number | null
  name: string
  orders: number
  totalSpent: number
}

type TrendPoint = {
  date: string | null
  purchases: number
  amount: number
}

type PurchaseRow = {
  id: number
  invoiceNo: string
  supplier: string
  date: string | null
  status: string
  items: number
  total: number
}

type PurchaseSummaryResponse = {
  filters: {
    startDate: string
    endDate: string
    status: string
    search: string
  }
  summary: PurchaseSummaryMetrics
  outstandingDue: number
  trend: TrendPoint[]
  statusBreakdown: StatusStat[]
  categoryBreakdown: CategoryStat[]
  topSuppliers: SupplierStat[]
  purchases: PurchaseRow[]
}

type PurchaseStatusFilter = "all" | "pending" | "completed" | "received" | "cancelled" | "partial"

type PurchaseFilters = {
  startDate: string
  endDate: string
  status: PurchaseStatusFilter
}

const STATUS_OPTIONS: Array<{ label: string; value: PurchaseStatusFilter }> = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Received", value: "received" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Partially received", value: "partial" },
]

const createEmptySummary = (): PurchaseSummaryMetrics => ({
  totalSpent: 0,
  averagePurchase: 0,
  purchaseCount: 0,
  pendingTotal: 0,
  monthToDate: 0,
  itemsPurchased: 0,
  supplierCount: 0,
})

const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`
const formatNumber = (value: number) => Number(value || 0).toLocaleString("en-LK")

const formatDate = (value?: string | null) => {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleDateString()
}

const statusBadgeClass = (status: string) => {
  const normalized = (status || "").toLowerCase()
  if (normalized.includes("pending")) return "bg-amber-50 text-amber-700"
  if (normalized.includes("cancel")) return "bg-rose-50 text-rose-700"
  if (normalized.includes("partial")) return "bg-indigo-50 text-indigo-700"
  return "bg-emerald-50 text-emerald-700"
}

export default function PurchaseReport() {
  const [filters, setFilters] = useState<PurchaseFilters>({ startDate: "", endDate: "", status: "all" })
  const [searchTerm, setSearchTerm] = useState("")
  const [summary, setSummary] = useState<PurchaseSummaryMetrics>(() => createEmptySummary())
  const [statusBreakdown, setStatusBreakdown] = useState<StatusStat[]>([])
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryStat[]>([])
  const [topSuppliers, setTopSuppliers] = useState<SupplierStat[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [purchases, setPurchases] = useState<PurchaseRow[]>([])
  const [outstandingDue, setOutstandingDue] = useState(0)
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
      const res = await apiGet<PurchaseSummaryResponse>(`/api/purchases/summary${query}`)
      const payload = res.data
      setSummary(payload.summary ?? createEmptySummary())
      setStatusBreakdown(payload.statusBreakdown ?? [])
      setCategoryBreakdown(payload.categoryBreakdown ?? [])
      setTopSuppliers(payload.topSuppliers ?? [])
      setTrend(payload.trend ?? [])
      setPurchases(payload.purchases ?? [])
      setOutstandingDue(payload.outstandingDue ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase report")
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const visiblePurchases = useMemo(
    () =>
      purchases.filter((row) => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return (
          row.invoiceNo.toLowerCase().includes(term) ||
          row.supplier.toLowerCase().includes(term) ||
          (row.status || "").toLowerCase().includes(term)
        )
      }),
    [purchases, searchTerm]
  )

  const downloadReport = () => {
    if (typeof window === "undefined") return
    const csvContent = [
      ["Purchase Report - " + new Date().toLocaleDateString()],
      [],
      ["Date", "Invoice", "Supplier", "Items", "Amount (Rs.)", "Status"],
      ...visiblePurchases.map((row) => [
        formatDate(row.date),
        row.invoiceNo,
        row.supplier,
        row.items,
        Math.round(row.total).toLocaleString(),
        row.status,
      ]),
      [],
      ["Total Orders", summary.purchaseCount],
      ["Total Spend", Math.round(summary.totalSpent).toLocaleString()],
      ["Pending Value", Math.round(summary.pendingTotal).toLocaleString()],
      ["Items Procured", summary.itemsPurchased],
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "Purchase-Report.csv"
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  const resetFilters = () => setFilters({ startDate: "", endDate: "", status: "all" })

  const heroMetrics = [
    {
      label: "Total spend",
      value: formatCurrency(summary.totalSpent),
      hint: `MTD ${formatCurrency(summary.monthToDate)}`,
      gradient: "from-[#0f172a] via-[#312e81] to-[#38bdf8]",
      icon: Package,
    },
    {
      label: "Average purchase",
      value: formatCurrency(summary.averagePurchase),
      hint: `${formatNumber(summary.purchaseCount)} orders`,
      gradient: "from-[#14532d] to-[#10b981]",
      icon: TrendingUp,
    },
    {
      label: "Pending value",
      value: formatCurrency(summary.pendingTotal),
      hint: `Outstanding ${formatCurrency(outstandingDue)}`,
      gradient: "from-[#4c0519] to-[#fb7185]",
      icon: AlertTriangle,
    },
    {
      label: "Suppliers & items",
      value: formatNumber(summary.itemsPurchased),
      hint: `${formatNumber(summary.supplierCount)} suppliers engaged`,
      gradient: "from-[#0f172a] to-[#22d3ee]",
      icon: Layers,
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
      value: filters.startDate || filters.endDate ? `${filters.startDate || "open"} to ${filters.endDate || "today"}` : "Full history",
      accent: "text-emerald-500",
    },
    {
      label: "Ledger search",
      value: searchTerm ? `"${searchTerm}"` : "All purchases",
      accent: "text-rose-500",
    },
    {
      label: "Dues monitored",
      value: outstandingDue ? formatCurrency(outstandingDue) : "No dues",
      accent: "text-amber-500",
    },
  ]

  const consoleFooter = (
    <div className="flex flex-wrap gap-3 text-sm">
      {loading && <span className="text-muted-foreground">Syncing purchases</span>}
      {error && !loading && <span className="text-rose-600">{error}</span>}
      {!loading && !error && (
        <Badge variant="secondary" className="rounded-2xl border-dashed text-xs">
          {formatNumber(visiblePurchases.length)} rows visible
        </Badge>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageTitle title="Purchase Report" subtitle="Neon procurement cockpit for ledger, suppliers, and dues" />

      <ReportHero
        kicker="Procurement intelligence"
        title="Purchase assurance"
        subtitle="Gradient KPIs, supplier filters, and CSV-ready ledgers mirroring the supplier dashboard aesthetic."
        badgeLabel={summary.purchaseCount ? `${formatNumber(summary.purchaseCount)} orders` : "No orders"}
        metrics={heroMetrics}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={downloadReport}
              className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white"
              disabled={!visiblePurchases.length}
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
        description="Dial in the receiving window, status, or keyword; exports honor these filters."
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
              <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value as PurchaseStatusFilter }))}>
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
                  placeholder="Invoice, supplier, status"
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
              <p className="text-xs text-muted-foreground">Live procurement filter</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <CardTitle>Supplier exposure</CardTitle>
          <CardDescription>Outstanding dues vs recent order cadence.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Outstanding dues</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(outstandingDue)}</p>
            <p className="text-xs text-muted-foreground">Sum of supplier statements.</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Month cadence</p>
            <p className="text-3xl font-bold text-white">{formatNumber(summary.purchaseCount || 0)} orders</p>
            <p className="text-xs text-muted-foreground">Refresh after receiving new GRNs.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Category mix</CardTitle>
            <CardDescription>Where procurement spend is flowing.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/20">
                  <th className="py-2 px-3 text-left font-semibold">Category</th>
                  <th className="py-2 px-3 text-right font-semibold">Spend</th>
                  <th className="py-2 px-3 text-center font-semibold">Units</th>
                  <th className="py-2 px-3 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.map((category) => (
                  <tr key={category.category} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium text-white">{category.category}</td>
                    <td className="py-2 px-3 text-right text-emerald-300">{formatCurrency(category.spend)}</td>
                    <td className="py-2 px-3 text-center text-muted-foreground">{category.units}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{category.share.toFixed(1)}%</td>
                  </tr>
                ))}
                {!categoryBreakdown.length && (
                  <tr>
                    <td colSpan={4} className="py-4 px-3 text-center text-sm text-muted-foreground">
                      No category data for this window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Status health</CardTitle>
            <CardDescription>Completion mix across recent orders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusBreakdown.map((status) => (
              <div key={status.status} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white capitalize">{status.status}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(status.purchases)} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{formatCurrency(status.amount)}</p>
                    <p className="text-xs text-muted-foreground">{status.share.toFixed(1)}% of spend</p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-linear-to-r from-amber-400 to-amber-600"
                    style={{ width: `${Math.min(100, Math.max(0, status.share))}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {!statusBreakdown.length && <p className="text-sm text-muted-foreground">No status data recorded.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Top suppliers</CardTitle>
            <CardDescription>Who fulfilled most of this window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topSuppliers.map((supplier) => (
              <div key={`${supplier.id}-${supplier.name}`} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">{supplier.name}</p>
                  <p className="text-xs text-muted-foreground">{formatNumber(supplier.orders)} order(s)</p>
                </div>
                <p className="text-base font-bold text-amber-300">{formatCurrency(supplier.totalSpent)}</p>
              </div>
            ))}
            {!topSuppliers.length && <p className="text-sm text-muted-foreground">No supplier activity yet.</p>}
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Receiving cadence</CardTitle>
            <CardDescription>Last sixty days of purchases.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {trend.slice(-8).map((point) => (
              <div key={`${point.date}-${point.amount}`} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{formatDate(point.date)}</p>
                  <p className="text-xs text-muted-foreground">{formatNumber(point.purchases)} order(s)</p>
                </div>
                <p className="text-base font-semibold text-emerald-300">{formatCurrency(point.amount)}</p>
              </div>
            ))}
            {!trend.length && <p className="text-sm text-muted-foreground">No trend data for this window.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Purchase ledger</CardTitle>
            <CardDescription>Every order in this filtered window.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search supplier, invoice, or status"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-11 rounded-2xl border-0 bg-muted/30 pl-10"
              />
            </div>
            <Button type="button" onClick={downloadReport} className="rounded-2xl bg-[#0f172a] text-white" disabled={!visiblePurchases.length}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/20">
                <th className="py-2 px-3 text-left font-semibold">Date</th>
                <th className="py-2 px-3 text-left font-semibold">Invoice</th>
                <th className="py-2 px-3 text-left font-semibold">Supplier</th>
                <th className="py-2 px-3 text-center font-semibold">Items</th>
                <th className="py-2 px-3 text-right font-semibold">Amount</th>
                <th className="py-2 px-3 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {visiblePurchases.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-2 px-3 text-sm text-muted-foreground">{formatDate(row.date)}</td>
                  <td className="py-2 px-3 font-semibold text-white">{row.invoiceNo}</td>
                  <td className="py-2 px-3 text-sm text-foreground">{row.supplier}</td>
                  <td className="py-2 px-3 text-center">{row.items}</td>
                  <td className="py-2 px-3 text-right font-semibold text-white">{formatCurrency(row.total)}</td>
                  <td className="py-2 px-3 text-center">
                    <Badge variant="outline" className={`${statusBadgeClass(row.status)} border`}>{row.status}</Badge>
                  </td>
                </tr>
              ))}
              {!visiblePurchases.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No purchases match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
