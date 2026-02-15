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
import { BarChart3, Calendar, Download, Filter, PackageCheck, RefreshCw, Search, ShoppingCart, TrendingUp } from "lucide-react"

type SalesSummary = {
  totalAmount: number
  averageAmount: number
  invoiceCount: number
  subtotalAmount: number
  vatAmount: number
  discountAmount: number
  itemsSold: number
  costAmount: number
  grossProfit: number
  grossMargin: number
}

type PaymentBreakdown = {
  paymentType: string
  invoices: number
  amount: number
  share: number
}

type StatusBreakdown = {
  status: string
  invoices: number
  amount: number
  share: number
}

type DailyPoint = {
  date: string
  invoices: number
  amount: number
}

type ProductStat = {
  name: string
  units: number
  revenue: number
  cost: number
  profit: number
}

type InvoiceRow = {
  id: number
  invoiceNo: string
  customer: string
  date: string | null
  total: number
  paymentType: string
  status: string
  items: number
}

type SalesSummaryResponse = {
  filters: {
    startDate: string | null
    endDate: string | null
    status: string | null
    paymentType: string | null
    search: string | null
  }
  summary: SalesSummary
  paymentBreakdown: PaymentBreakdown[]
  statusBreakdown: StatusBreakdown[]
  dailyTrend: DailyPoint[]
  topProducts: ProductStat[]
  recentInvoices: InvoiceRow[]
}

type SalesStatusFilter = "all" | "completed" | "pending" | "cancelled"
type PaymentFilter = "all" | "cash" | "card" | "bank" | "other"

type SalesFilters = {
  startDate: string
  endDate: string
  status: SalesStatusFilter
  paymentType: PaymentFilter
}

const createEmptySummary = (): SalesSummary => ({
  totalAmount: 0,
  averageAmount: 0,
  invoiceCount: 0,
  subtotalAmount: 0,
  vatAmount: 0,
  discountAmount: 0,
  itemsSold: 0,
  costAmount: 0,
  grossProfit: 0,
  grossMargin: 0,
})

const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`
const formatNumber = (value: number) => Number(value || 0).toLocaleString("en-LK")

const formatDate = (value?: string | null) => {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleDateString()
}

const STATUS_OPTIONS: Array<{ label: string; value: SalesStatusFilter }> = [
  { label: "All statuses", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
  { label: "Cancelled", value: "cancelled" },
]

const PAYMENT_OPTIONS: Array<{ label: string; value: PaymentFilter }> = [
  { label: "All payments", value: "all" },
  { label: "Cash", value: "cash" },
  { label: "Card", value: "card" },
  { label: "Bank Transfer", value: "bank" },
  { label: "Other", value: "other" },
]

const statusBadgeClass = (status: string) => {
  const normalized = (status || "").toLowerCase()
  if (normalized === "completed") return "bg-emerald-50 text-emerald-700"
  if (normalized === "pending") return "bg-amber-50 text-amber-700"
  if (normalized === "cancelled") return "bg-rose-50 text-rose-700"
  return "bg-slate-100 text-slate-700"
}

export default function SalesReport() {
  const [filters, setFilters] = useState<SalesFilters>({ startDate: "", endDate: "", status: "all", paymentType: "all" })
  const [searchTerm, setSearchTerm] = useState("")
  const [summary, setSummary] = useState<SalesSummary>(() => createEmptySummary())
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([])
  const [dailyTrend, setDailyTrend] = useState<DailyPoint[]>([])
  const [topProducts, setTopProducts] = useState<ProductStat[]>([])
  const [recentInvoices, setRecentInvoices] = useState<InvoiceRow[]>([])
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
      if (filters.paymentType !== "all") params.append("paymentType", filters.paymentType)
      const query = params.toString() ? `?${params.toString()}` : ""
      const res = await apiGet<SalesSummaryResponse>(`/api/sales/summary${query}`)
      const payload = res.data
      setSummary(payload.summary ?? createEmptySummary())
      setPaymentBreakdown(payload.paymentBreakdown ?? [])
      setStatusBreakdown(payload.statusBreakdown ?? [])
      setDailyTrend(payload.dailyTrend ?? [])
      setTopProducts(payload.topProducts ?? [])
      setRecentInvoices(payload.recentInvoices ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sales report")
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const visibleInvoices = useMemo(
    () =>
      recentInvoices.filter((invoice) => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return (
          invoice.invoiceNo.toLowerCase().includes(term) ||
          invoice.customer.toLowerCase().includes(term) ||
          (invoice.status || "").toLowerCase().includes(term)
        )
      }),
    [recentInvoices, searchTerm]
  )

  const downloadReport = () => {
    if (typeof window === "undefined") return
    const csvContent = [
      ["Sales Report - " + new Date().toLocaleDateString()],
      [],
      ["Date", "Invoice", "Customer", "Items", "Amount (Rs.)", "Status", "Payment"],
      ...visibleInvoices.map((invoice) => [
        formatDate(invoice.date),
        invoice.invoiceNo,
        invoice.customer,
        invoice.items,
        Math.round(invoice.total).toLocaleString(),
        invoice.status,
        invoice.paymentType,
      ]),
      [],
      ["Total Invoices", summary.invoiceCount],
      ["Total Amount", Math.round(summary.totalAmount).toLocaleString()],
      ["Cost of Goods", Math.round(summary.costAmount).toLocaleString()],
      ["Gross Profit", Math.round(summary.grossProfit).toLocaleString()],
      ["Gross Margin", `${summary.grossMargin.toFixed(1)}%`],
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "Sales-Report.csv"
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  const resetFilters = () => setFilters({ startDate: "", endDate: "", status: "all", paymentType: "all" })

  const heroMetrics = [
    {
      label: "Total revenue",
      value: formatCurrency(summary.totalAmount),
      hint: `${formatNumber(summary.invoiceCount)} invoices`,
      gradient: "from-[#0f172a] via-[#312e81] to-[#38bdf8]",
      icon: ShoppingCart,
    },
    {
      label: "Gross profit",
      value: formatCurrency(summary.grossProfit),
      hint: `${summary.grossMargin.toFixed(1)}% margin`,
      gradient: "from-[#14532d] to-[#10b981]",
      icon: TrendingUp,
    },
    {
      label: "Average invoice",
      value: formatCurrency(summary.averageAmount),
      hint: `${formatCurrency(summary.costAmount)} COGS`,
      gradient: "from-[#4c0519] to-[#ec4899]",
      icon: Calendar,
    },
    {
      label: "Items fulfilled",
      value: formatNumber(summary.itemsSold),
      hint: "Ledger window",
      gradient: "from-[#0f172a] to-[#22d3ee]",
      icon: PackageCheck,
    },
  ]

  const highlightStats = [
    {
      label: "Status filter",
      value: filters.status === "all" ? "All" : filters.status,
      accent: "text-sky-500",
    },
    {
      label: "Payment mix",
      value: filters.paymentType === "all" ? "All" : filters.paymentType,
      accent: "text-emerald-500",
    },
    {
      label: "Date window",
      value: filters.startDate || filters.endDate ? `${filters.startDate || "∞"} → ${filters.endDate || "∞"}` : "Full history",
      accent: "text-amber-500",
    },
    {
      label: "Search scope",
      value: searchTerm ? `“${searchTerm}”` : "All invoices",
      accent: "text-rose-500",
    },
  ]

  const consoleFooter = (
    <div className="flex flex-wrap gap-3 text-sm">
      {loading && <span className="text-muted-foreground">Syncing sales…</span>}
      {error && !loading && <span className="text-rose-600">{error}</span>}
      {!loading && !error && (
        <Badge variant="secondary" className="rounded-2xl border-dashed text-xs">
          {visibleInvoices.length} invoices visible
        </Badge>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageTitle title="Sales Report" subtitle="Neon revenue cockpit mirroring supplier dashboards" />

      <ReportHero
        kicker="Revenue intelligence"
        title="Sales assurance"
        subtitle="Gradient KPIs, payment mix diagnostics, and CSV-ready ledgers to match the neon supplier energy."
        badgeLabel={summary.invoiceCount ? `${formatNumber(summary.invoiceCount)} invoices` : "No invoices"}
        metrics={heroMetrics}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={downloadReport}
              className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white"
              disabled={!visibleInvoices.length}
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
        description="Dial in window, status, or tender; reset instantly or drop fresh CSVs."
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
              <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value as SalesStatusFilter }))}>
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
              <Label className="text-sm font-semibold text-foreground">Payment type</Label>
              <Select
                value={filters.paymentType}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, paymentType: value as PaymentFilter }))}
              >
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All payments" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              Payment mix, status, and tender filters cascade directly into exports.
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
              <p className="text-xs text-muted-foreground">Live sales filters</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Payment mix</CardTitle>
            <CardDescription>Share of revenue by tender type.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!paymentBreakdown.length && !loading && <p className="text-sm text-muted-foreground">No payments recorded for this window.</p>}
            {paymentBreakdown.map((method) => (
              <div key={method.paymentType} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{method.paymentType}</p>
                    <p className="text-xs text-muted-foreground">{method.invoices} invoices</p>
                  </div>
                  <p className="text-base font-bold text-white">{formatCurrency(method.amount)}</p>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-linear-to-r from-sky-400 to-blue-600"
                    style={{ width: `${Math.min(100, Math.max(0, method.share ?? 0))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Status health</CardTitle>
            <CardDescription>Completion and tax adjustments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {statusBreakdown.map((status) => (
                <div key={status.status} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{status.status}</p>
                    <p className="text-xs text-muted-foreground">{status.invoices} invoices</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{formatCurrency(status.amount)}</p>
                    <p className="text-xs text-muted-foreground">{(status.share ?? 0).toFixed(1)}% of revenue</p>
                  </div>
                </div>
              ))}
              {!statusBreakdown.length && !loading && <p className="text-sm text-muted-foreground">No status data available.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(summary.subtotalAmount)}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">VAT</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(summary.vatAmount)}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">Discounts</p>
                <p className="text-lg font-semibold text-rose-300">{formatCurrency(summary.discountAmount)}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-xs text-muted-foreground">Gross margin</p>
                <p className="text-lg font-semibold text-emerald-300">{summary.grossMargin.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>Leading SKUs by revenue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!topProducts.length && !loading && <p className="text-sm text-muted-foreground">No sale items for this window.</p>}
            {topProducts.map((product) => (
              <div key={product.name} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.units} units</p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-base font-semibold text-white">{formatCurrency(product.revenue)}</p>
                  <p className="text-muted-foreground">COGS {formatCurrency(product.cost)}</p>
                  <p className="text-emerald-300">Profit {formatCurrency(product.profit)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle>Daily trend</CardTitle>
            <CardDescription>Trailing two-week movement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!dailyTrend.length && !loading && <p className="text-sm text-muted-foreground">No daily data yet.</p>}
            {dailyTrend.map((point) => (
              <div key={point.date} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-white/10 p-2">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{formatDate(point.date)}</p>
                    <p className="text-xs text-muted-foreground">{point.invoices} invoices</p>
                  </div>
                </div>
                <p className="text-base font-semibold text-white">{formatCurrency(point.amount)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="brand-card brand-card-hover">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Recent invoices</CardTitle>
            <CardDescription>Latest 100 sales pulled from the ledger.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search invoice, customer, status"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-11 rounded-2xl border-0 bg-muted/30 pl-10"
              />
            </div>
            <Button type="button" onClick={downloadReport} className="rounded-2xl bg-[#0f172a] text-white" disabled={!visibleInvoices.length}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="py-3 px-4 text-left font-semibold">Date</th>
                  <th className="py-3 px-4 text-left font-semibold">Invoice</th>
                  <th className="py-3 px-4 text-left font-semibold">Customer</th>
                  <th className="py-3 px-4 text-center font-semibold">Items</th>
                  <th className="py-3 px-4 text-right font-semibold">Amount</th>
                  <th className="py-3 px-4 text-left font-semibold">Payment</th>
                  <th className="py-3 px-4 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {!visibleInvoices.length && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-sm text-muted-foreground">
                      No invoices match this search.
                    </td>
                  </tr>
                )}
                {visibleInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b last:border-0">
                    <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(invoice.date)}</td>
                    <td className="py-3 px-4 font-semibold text-sky-400">{invoice.invoiceNo}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{invoice.customer}</td>
                    <td className="py-3 px-4 text-center text-sm">{invoice.items}</td>
                    <td className="py-3 px-4 text-right font-semibold text-white">{formatCurrency(invoice.total)}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{invoice.paymentType}</td>
                    <td className="py-3 px-4 text-right">
                      <Badge className={`${statusBadgeClass(invoice.status)} border`}>{invoice.status}</Badge>
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
