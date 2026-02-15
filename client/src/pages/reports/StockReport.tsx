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
import { Activity, AlertTriangle, Boxes, Download, Filter, RefreshCw, Search, Thermometer } from "lucide-react"

type StockSummaryMetrics = {
  totalUnits: number
  retailValue: number
  costValue: number
  skuCount: number
  lowStockSkus: number
  expiringSkus: number
  expiredSkus: number
}

type CategoryStat = {
  category: string
  skus: number
  units: number
  costValue: number
}

type StatusStat = {
  status: string
  skus: number
  units: number
}

type StockRow = {
  id: number
  code: string
  name: string
  category: string
  quantity: number
  reorderLevel: number
  status: string
  expiryDate: string | null
  supplier: string
  costPrice: number
  sellingPrice: number
}

type StockSummaryResponse = {
  filters: {
    category: string
    status: string
    search: string
    lowOnly: boolean
    expiryMode: string
  }
  summary: StockSummaryMetrics
  categories: CategoryStat[]
  statuses: StatusStat[]
  lowStock: StockRow[]
  expiring: StockRow[]
  products: StockRow[]
}

type StockFilters = {
  category: string
  status: "all" | "active" | "inactive" | "discontinued"
  search: string
  lowOnly: boolean
  expiryMode: "all" | "expiring" | "expired"
}

const ALL_CATEGORY_VALUE = "__all__"

const STATUS_OPTIONS: Array<{ label: string; value: StockFilters["status"] }> = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Discontinued", value: "discontinued" },
]

const EXPIRY_OPTIONS: Array<{ label: string; value: StockFilters["expiryMode"] }> = [
  { label: "All shelf-life", value: "all" },
  { label: "Expiring soon", value: "expiring" },
  { label: "Expired", value: "expired" },
]

const createEmptySummary = (): StockSummaryMetrics => ({
  totalUnits: 0,
  retailValue: 0,
  costValue: 0,
  skuCount: 0,
  lowStockSkus: 0,
  expiringSkus: 0,
  expiredSkus: 0,
})

const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`
const formatUnits = (value: number) => Number(value || 0).toLocaleString("en-LK")

const formatDate = (value?: string | null) => {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleDateString()
}

const statusBadgeClass = (status: string) => {
  const normalized = (status || "").toLowerCase()
  if (normalized.includes("active")) return "bg-emerald-50 text-emerald-700"
  if (normalized.includes("discontinu")) return "bg-slate-200 text-slate-600"
  if (normalized.includes("inactive")) return "bg-sky-50 text-sky-700"
  return "bg-amber-50 text-amber-700"
}

const statusGradientClass = (status: string) => {
  const normalized = (status || "").toLowerCase()
  if (normalized.includes("active")) return "from-emerald-400 to-emerald-600"
  if (normalized.includes("inactive")) return "from-sky-400 to-sky-600"
  if (normalized.includes("discontinu")) return "from-slate-400 to-slate-600"
  return "from-amber-400 to-amber-600"
}

export default function StockReport() {
  const [filters, setFilters] = useState<StockFilters>({ category: "", status: "all", search: "", lowOnly: false, expiryMode: "all" })
  const [tableSearch, setTableSearch] = useState("")
  const [summary, setSummary] = useState<StockSummaryMetrics>(() => createEmptySummary())
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryStat[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<StatusStat[]>([])
  const [lowStock, setLowStock] = useState<StockRow[]>([])
  const [expiring, setExpiring] = useState<StockRow[]>([])
  const [products, setProducts] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (filters.category) params.append("category", filters.category)
      if (filters.status !== "all") params.append("status", filters.status)
      if (filters.search) params.append("search", filters.search)
      if (filters.lowOnly) params.append("lowOnly", "true")
      if (filters.expiryMode !== "all") params.append("expiryMode", filters.expiryMode)
      const query = params.toString() ? `?${params.toString()}` : ""
      const res = await apiGet<StockSummaryResponse>(`/api/products/summary${query}`)
      const payload = res.data
      setSummary(payload.summary ?? createEmptySummary())
      setCategoryBreakdown(payload.categories ?? [])
      setStatusBreakdown(payload.statuses ?? [])
      setLowStock(payload.lowStock ?? [])
      setExpiring(payload.expiring ?? [])
      setProducts(payload.products ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock report")
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const visibleProducts = useMemo(
    () =>
      products.filter((item) => {
        if (!tableSearch) return true
        const term = tableSearch.toLowerCase()
        return (
          item.name.toLowerCase().includes(term) ||
          item.code.toLowerCase().includes(term) ||
          item.category.toLowerCase().includes(term) ||
          (item.status || "").toLowerCase().includes(term)
        )
      }),
    [products, tableSearch]
  )

  const downloadReport = () => {
    if (typeof window === "undefined" || !visibleProducts.length) return
    const csvContent = [
      ["Stock Report - " + new Date().toLocaleDateString()],
      [],
      ["Product", "Code", "Category", "Qty", "Reorder", "Status", "Expiry"],
      ...visibleProducts.map((row) => [
        row.name,
        row.code,
        row.category,
        row.quantity,
        row.reorderLevel,
        row.status,
        formatDate(row.expiryDate),
      ]),
      [],
      ["Total Units", summary.totalUnits],
      ["Low Stock SKUs", summary.lowStockSkus],
      ["Expiring Soon", summary.expiringSkus],
    ]
      .map((line) => line.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "Stock-Report.csv"
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  const resetFilters = () => setFilters({ category: "", status: "all", search: "", lowOnly: false, expiryMode: "all" })

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>()
    categoryBreakdown.forEach((row) => unique.add(row.category))
    return Array.from(unique)
  }, [categoryBreakdown])

  const totalCategoryUnits = categoryBreakdown.reduce((sum, row) => sum + row.units, 0) || 1
  const totalStatusUnits = statusBreakdown.reduce((sum, row) => sum + row.units, 0) || 1

  const highlightStats = [
    {
      label: "Status filter",
      value: filters.status === "all" ? "All statuses" : filters.status,
      accent: "text-sky-500",
    },
    {
      label: "Expiry focus",
      value: filters.expiryMode === "all" ? "All shelf-life" : filters.expiryMode,
      accent: "text-rose-500",
    },
    {
      label: "Low stock mode",
      value: filters.lowOnly ? "Only low stock" : "Entire catalog",
      accent: "text-amber-500",
    },
    {
      label: "Server search",
      value: filters.search ? `"${filters.search}"` : "Full inventory",
      accent: "text-emerald-500",
    },
  ]

  const heroMetrics = [
    {
      label: "Total units",
      value: formatUnits(summary.totalUnits),
      hint: `${formatUnits(summary.skuCount)} SKUs tracked`,
      gradient: "from-[#0f172a] via-[#312e81] to-[#22d3ee]",
      icon: Boxes,
    },
    {
      label: "Retail value",
      value: formatCurrency(summary.retailValue),
      hint: `Cost ${formatCurrency(summary.costValue)}`,
      gradient: "from-[#14532d] to-[#10b981]",
      icon: Activity,
    },
    {
      label: "Low stock",
      value: formatUnits(summary.lowStockSkus),
      hint: "Below reorder",
      gradient: "from-[#4c0519] to-[#fb7185]",
      icon: AlertTriangle,
    },
    {
      label: "Shelf-life risk",
      value: formatUnits(summary.expiringSkus),
      hint: `${formatUnits(summary.expiredSkus)} expired`,
      gradient: "from-[#0f172a] to-[#38bdf8]",
      icon: Thermometer,
    },
  ]

  const consoleFooter = (
    <div className="flex flex-wrap gap-3 text-sm">
      {loading && <span className="text-muted-foreground">Syncing inventory</span>}
      {error && !loading && <span className="text-rose-600">{error}</span>}
      {!loading && !error && (
        <Badge variant="secondary" className="rounded-2xl border-dashed text-xs">
          {formatUnits(visibleProducts.length)} rows visible
        </Badge>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageTitle title="Stock Report" subtitle="Neon inventory cockpit for SKU risk and shelf-life" />

      <ReportHero
        kicker="Inventory intelligence"
        title="Stock assurance"
        subtitle="Gradient KPIs, low-stock callouts, and CSV-ready ledgers aligned with the procurement suite."
        badgeLabel={summary.skuCount ? `${formatUnits(summary.skuCount)} SKUs` : "No SKUs"}
        metrics={heroMetrics}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadReport} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white" disabled={!visibleProducts.length}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={fetchSummary} disabled={loading} className="rounded-2xl border-white/60 text-white">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh data
            </Button>
          </div>
        }
      />

      <ReportConsole
        icon={Filter}
        title="Filters & exports"
        description="Dial in category, status, shelf-life, or keyword; exports honor these filters."
        footer={consoleFooter}
      >
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Category</Label>
              <Select
                value={filters.category || ALL_CATEGORY_VALUE}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, category: value === ALL_CATEGORY_VALUE ? "" : value }))
                }
              >
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORY_VALUE}>All categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value as StockFilters["status"] }))}>
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
              <Label className="text-sm font-semibold text-foreground">Shelf-life</Label>
              <Select value={filters.expiryMode} onValueChange={(value) => setFilters((prev) => ({ ...prev, expiryMode: value as StockFilters["expiryMode"] }))}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All shelf-life" />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Server search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Name, code, category"
                  value={filters.search}
                  onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                  className="h-11 rounded-2xl border-0 bg-muted/30 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Low stock focus</Label>
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, lowOnly: !prev.lowOnly }))}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  filters.lowOnly ? "border-amber-400 bg-amber-50 text-amber-800" : "border-white/20 bg-white/5 text-muted-foreground"
                }`}
              >
                <span>{filters.lowOnly ? "Only low stock" : "All inventory"}</span>
                <span className="text-xs">Toggle</span>
              </button>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[auto_auto_1fr]">
            <Button variant="outline" onClick={resetFilters} disabled={loading} className="h-11 rounded-2xl border-dashed">
              Reset filters
            </Button>
            <Button onClick={fetchSummary} disabled={loading} className="h-11 rounded-2xl bg-[#0f172a] text-white">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh data
            </Button>
            <div className="flex items-center text-xs text-muted-foreground">Filters cascade into KPIs, breakdowns, and exports.</div>
          </div>
        </>
      </ReportConsole>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlightStats.map((stat) => (
          <Card key={stat.label} className="brand-card text-center">
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">Live inventory filter</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Category mix</CardTitle>
            <CardDescription>Cost exposure and units per family.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryBreakdown.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{category.category}</p>
                    <p className="text-xs text-muted-foreground">{formatUnits(category.skus)} SKU(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-white">{formatUnits(category.units)} units</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(category.costValue)} cost</p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-linear-to-r from-sky-400 to-sky-600"
                    style={{ width: `${Math.min(100, Math.max(0, (category.units / totalCategoryUnits) * 100))}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {!categoryBreakdown.length && <p className="text-sm text-muted-foreground">No category data for this window.</p>}
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Status mix</CardTitle>
            <CardDescription>Operational posture of inventory buckets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusBreakdown.map((status) => (
              <div key={status.status} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white capitalize">{status.status}</p>
                    <p className="text-xs text-muted-foreground">{formatUnits(status.skus)} SKU(s)</p>
                  </div>
                  <p className="text-sm font-semibold text-white">{formatUnits(status.units)} units</p>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className={`h-2 rounded-full bg-linear-to-r ${statusGradientClass(status.status)}`}
                    style={{ width: `${Math.min(100, Math.max(0, (status.units / totalStatusUnits) * 100))}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {!statusBreakdown.length && <p className="text-sm text-muted-foreground">No status data for this filter.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Critical stock</CardTitle>
            <CardDescription>Below reorder thresholds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-amber-200/30 bg-amber-500/10 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Current {formatUnits(item.quantity)} - Min {formatUnits(item.reorderLevel || 0)}</p>
                </div>
                <Badge variant="outline" className="border-amber-400 text-amber-300">
                  Reorder
                </Badge>
              </div>
            ))}
            {!lowStock.length && <p className="text-sm text-muted-foreground">No products fall below reorder right now.</p>}
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Expiring soon</CardTitle>
            <CardDescription>Next 30-day shelf-life watchlist.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiring.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-rose-200/30 bg-rose-500/10 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Expires {formatDate(item.expiryDate)}</p>
                </div>
                <Badge variant="outline" className="border-rose-400 text-rose-300">
                  Rotate stock
                </Badge>
              </div>
            ))}
            {!expiring.length && <p className="text-sm text-muted-foreground">No imminent expirations.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Inventory ledger</CardTitle>
            <CardDescription>Every SKU in this filtered window.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, code, or status"
                value={tableSearch}
                onChange={(event) => setTableSearch(event.target.value)}
                className="h-11 rounded-2xl border-0 bg-muted/30 pl-10"
              />
            </div>
            <Button type="button" onClick={downloadReport} className="rounded-2xl bg-[#0f172a] text-white" disabled={!visibleProducts.length}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/20">
                <th className="py-2 px-3 text-left font-semibold">Product</th>
                <th className="py-2 px-3 text-left font-semibold">Code</th>
                <th className="py-2 px-3 text-left font-semibold">Category</th>
                <th className="py-2 px-3 text-right font-semibold">Qty</th>
                <th className="py-2 px-3 text-right font-semibold">Reorder</th>
                <th className="py-2 px-3 text-left font-semibold">Supplier</th>
                <th className="py-2 px-3 text-left font-semibold">Expiry</th>
                <th className="py-2 px-3 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2 px-3 font-semibold text-white">{item.name}</td>
                  <td className="py-2 px-3 text-sm text-muted-foreground">{item.code}</td>
                  <td className="py-2 px-3 text-sm text-muted-foreground">{item.category}</td>
                  <td className="py-2 px-3 text-right font-semibold text-white">{formatUnits(item.quantity)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{item.reorderLevel || "—"}</td>
                  <td className="py-2 px-3 text-sm text-muted-foreground">{item.supplier}</td>
                  <td className="py-2 px-3 text-sm text-muted-foreground">{formatDate(item.expiryDate)}</td>
                  <td className="py-2 px-3 text-center">
                    <Badge variant="outline" className={`${statusBadgeClass(item.status)} border`}>
                      {item.status || "Unknown"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!visibleProducts.length && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                    No products match this view.
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
