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
import { Download, Filter, PackageCheck, RefreshCw, RotateCcw, Search, Wallet } from "lucide-react"

type SalesReturnRow = {
  id: number
  invoiceNo: string
  customer: string
  date: string | null
  items: number
  refund: number
  reason: string
}

type PurchaseReturnRow = {
  id: number
  invoiceNo: string
  supplier: string
  date: string | null
  items: number
  refund: number
  reason: string
}

type ReturnSummary = {
  salesCount: number
  salesItems: number
  salesRefund: number
  purchaseCount: number
  purchaseItems: number
  purchaseRefund: number
  netRefund: number
}

type ReasonStat = {
  label: string
  amount: number
  count: number
}

type ReturnHistoryResponse = {
  filters: {
    startDate: string
    endDate: string
    type: string
    search: string
  }
  summary: ReturnSummary
  reasons: ReasonStat[]
  sales: SalesReturnRow[]
  purchases: PurchaseReturnRow[]
}

type ReturnFilters = {
  startDate: string
  endDate: string
  type: "all" | "sales" | "purchase"
  search: string
}

const emptySummary: ReturnSummary = {
  salesCount: 0,
  salesItems: 0,
  salesRefund: 0,
  purchaseCount: 0,
  purchaseItems: 0,
  purchaseRefund: 0,
  netRefund: 0,
}

const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`
const formatNumber = (value: number) => Number(value || 0).toLocaleString("en-LK")

const formatDate = (value?: string | null) => {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleDateString()
}

export default function ReturnHistory() {
  const [filters, setFilters] = useState<ReturnFilters>({ startDate: "", endDate: "", type: "all", search: "" })
  const [data, setData] = useState<ReturnHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)
      if (filters.type !== "all") params.append("type", filters.type)
      if (filters.search.trim()) params.append("search", filters.search.trim())
      const query = params.toString() ? `?${params.toString()}` : ""
      const response = await apiGet<ReturnHistoryResponse>(`/api/returns/summary${query}`)
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load return history")
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const summary = data?.summary ?? emptySummary
  const salesReturns = data?.sales ?? []
  const purchaseReturns = data?.purchases ?? []
  const reasons = data?.reasons ?? []
  const itemsRestocked = summary.salesItems + summary.purchaseItems
  const totalCases = summary.salesCount + summary.purchaseCount

  const resetFilters = () => setFilters({ startDate: "", endDate: "", type: "all", search: "" })

  const downloadCsv = (rows: Array<SalesReturnRow | PurchaseReturnRow>, label: string) => {
    if (!rows.length || typeof window === "undefined") return
    const csv = [
      [`${label} - ${new Date().toLocaleDateString()}`],
      [],
      ["Invoice", "Counterparty", "Date", "Items", "Refund", "Reason"],
      ...rows.map((row) => [
        row.invoiceNo,
        "customer" in row ? row.customer : (row as PurchaseReturnRow).supplier,
        formatDate(row.date),
        row.items,
        Math.round(row.refund).toLocaleString(),
        row.reason,
      ]),
    ]
      .map((line) => line.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${label.replace(/\s+/g, "-")}.csv`
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  const visibleSales = useMemo(() => salesReturns, [salesReturns])
  const visiblePurchases = useMemo(() => purchaseReturns, [purchaseReturns])

  const heroMetrics = [
    {
      label: "Sales refunds",
      value: formatCurrency(summary.salesRefund),
      hint: `${formatNumber(summary.salesCount)} cases · ${formatNumber(summary.salesItems)} items`,
      gradient: "from-[#0f172a] via-[#312e81] to-[#38bdf8]",
      icon: RotateCcw,
    },
    {
      label: "Purchase credits",
      value: formatCurrency(summary.purchaseRefund),
      hint: `${formatNumber(summary.purchaseCount)} cases · ${formatNumber(summary.purchaseItems)} items`,
      gradient: "from-[#4c0519] to-[#fb7185]",
      icon: RefreshCw,
    },
    {
      label: "Net cash impact",
      value: formatCurrency(summary.netRefund),
      hint: "Sales vs supplier delta",
      gradient: "from-[#14532d] to-[#10b981]",
      icon: Wallet,
    },
    {
      label: "Items restocked",
      value: formatNumber(itemsRestocked),
      hint: `${formatNumber(summary.salesItems)} sales · ${formatNumber(summary.purchaseItems)} purchase`,
      gradient: "from-[#0f172a] to-[#22d3ee]",
      icon: PackageCheck,
    },
  ]

  const highlightStats = [
    {
      label: "Return type",
      value: filters.type === "all" ? "All flows" : filters.type === "sales" ? "Sales only" : "Purchase only",
      accent: "text-sky-500",
    },
    {
      label: "Date span",
      value: filters.startDate || filters.endDate ? `${filters.startDate || "∞"} → ${filters.endDate || "∞"}` : "Full history",
      accent: "text-emerald-500",
    },
    {
      label: "Search term",
      value: filters.search ? `“${filters.search}”` : "No keyword",
      accent: "text-rose-500",
    },
    {
      label: "Reason tags",
      value: reasons.length ? `${reasons.length} reasons` : "No tags",
      accent: "text-amber-500",
    },
  ]

  const consoleFooter = (
    <div className="flex flex-wrap gap-3 text-sm">
      {loading && <span className="text-muted-foreground">Syncing returns…</span>}
      {error && !loading && <span className="text-rose-600">{error}</span>}
      {!loading && !error && (
        <Badge variant="secondary" className="rounded-2xl border-dashed text-xs">
          {totalCases ? `${formatNumber(totalCases)} cases loaded` : "No results"}
        </Badge>
      )}
    </div>
  )

  const hasSales = filters.type === "all" || filters.type === "sales"
  const hasPurchases = filters.type === "all" || filters.type === "purchase"

  return (
    <div className="space-y-6">
      <PageTitle title="Return History" subtitle="Neon reverse-logistics cockpit for sales & supplier flows" />

      <ReportHero
        kicker="Reverse logistics"
        title="Return assurance"
        subtitle="Mirror the supplier dashboard polish with gradient KPIs, console filters, and CSV-ready ledgers."
        badgeLabel={totalCases ? `${formatNumber(totalCases)} cases tracked` : "No returns yet"}
        metrics={heroMetrics}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => downloadCsv(visibleSales, "Sales Returns")}
              className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white"
              disabled={!visibleSales.length}
            >
              <Download className="mr-2 h-4 w-4" /> Sales CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadCsv(visiblePurchases, "Purchase Returns")}
              disabled={!visiblePurchases.length}
              className="rounded-2xl border-white/80 bg-white/20 text-white hover:bg-white/30"
            >
              <Download className="mr-2 h-4 w-4" /> Purchase CSV
            </Button>
          </div>
        }
      />

      <ReportConsole
        icon={Filter}
        title="Filters & exports"
        description="Dial in the window, flow, or keyword to drive the ledger and CSV actions."
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
              <Label className="text-sm font-semibold text-foreground">Return type</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters((prev) => ({ ...prev, type: value as ReturnFilters["type"] }))}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All returns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All returns</SelectItem>
                  <SelectItem value="sales">Sales returns</SelectItem>
                  <SelectItem value="purchase">Purchase returns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Invoice, customer, reason"
                  value={filters.search}
                  onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                  className="h-11 rounded-2xl border-0 bg-muted/30 pl-10"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[auto_auto_1fr]">
            <Button variant="outline" onClick={resetFilters} disabled={loading} className="h-11 rounded-2xl border-dashed">
              <RotateCcw className="mr-2 h-4 w-4" /> Reset filters
            </Button>
            <Button onClick={fetchHistory} disabled={loading} className="h-11 rounded-2xl bg-[#0f172a] text-white">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh data
            </Button>
            <div className="flex items-center text-xs text-muted-foreground">
              Filters cascade into both the hero KPIs and the CSV exports above.
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
              <p className="text-xs text-muted-foreground">Live filter badge</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader>
          <CardTitle>Top reasons</CardTitle>
          <CardDescription>Most common triggers across sales and purchase flows.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {!reasons.length && !loading && <p className="text-sm text-muted-foreground">No reasons captured for this window.</p>}
          {reasons.slice(0, 6).map((reason) => (
            <div key={reason.label} className="min-w-40 rounded-2xl border border-border bg-muted/20 px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatNumber(reason.count)} cases</span>
                <Badge variant="secondary" className="rounded-2xl border-dashed text-xs">
                  {formatCurrency(reason.amount)}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{reason.label}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {hasSales && (
        <Card className="brand-card brand-card-hover">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Sales returns</CardTitle>
              <CardDescription>Latest {visibleSales.length || 0} approvals synced from POS.</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => downloadCsv(visibleSales, "Sales Returns")} disabled={!visibleSales.length} className="rounded-2xl">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="py-3 px-4 text-left font-semibold">Invoice</th>
                    <th className="py-3 px-4 text-left font-semibold">Customer</th>
                    <th className="py-3 px-4 text-left font-semibold">Reason</th>
                    <th className="py-3 px-4 text-left font-semibold">Date</th>
                    <th className="py-3 px-4 text-center font-semibold">Items</th>
                    <th className="py-3 px-4 text-right font-semibold">Refund</th>
                  </tr>
                </thead>
                <tbody>
                  {!visibleSales.length && !loading && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        No sales returns in this range.
                      </td>
                    </tr>
                  )}
                  {visibleSales.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-3 px-4 font-semibold text-sky-600">{row.invoiceNo}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{row.customer}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{row.reason}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(row.date)}</td>
                      <td className="py-3 px-4 text-center">{row.items}</td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-600">{formatCurrency(row.refund)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-semibold">
                    <td className="py-3 px-4">Totals</td>
                    <td className="py-3 px-4">{formatNumber(summary.salesCount)}</td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 text-center">{formatNumber(summary.salesItems)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(summary.salesRefund)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {hasPurchases && (
        <Card className="brand-card brand-card-hover">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Purchase returns</CardTitle>
              <CardDescription>Recent supplier credits flowing back into cash.</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => downloadCsv(visiblePurchases, "Purchase Returns")} disabled={!visiblePurchases.length} className="rounded-2xl">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="py-3 px-4 text-left font-semibold">Invoice</th>
                    <th className="py-3 px-4 text-left font-semibold">Supplier</th>
                    <th className="py-3 px-4 text-left font-semibold">Reason</th>
                    <th className="py-3 px-4 text-left font-semibold">Date</th>
                    <th className="py-3 px-4 text-center font-semibold">Items</th>
                    <th className="py-3 px-4 text-right font-semibold">Refund</th>
                  </tr>
                </thead>
                <tbody>
                  {!visiblePurchases.length && !loading && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        No purchase returns in this range.
                      </td>
                    </tr>
                  )}
                  {visiblePurchases.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-3 px-4 font-semibold text-sky-600">{row.invoiceNo}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{row.supplier}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{row.reason}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(row.date)}</td>
                      <td className="py-3 px-4 text-center">{row.items}</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">{formatCurrency(row.refund)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-semibold">
                    <td className="py-3 px-4">Totals</td>
                    <td className="py-3 px-4">{formatNumber(summary.purchaseCount)}</td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 text-center">{formatNumber(summary.purchaseItems)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(summary.purchaseRefund)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
