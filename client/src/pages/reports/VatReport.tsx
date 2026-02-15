import { useEffect, useRef, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Loader } from "@/components/common/Loader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Calendar, BarChart3, Search, Download, AlertTriangle } from "lucide-react"
import { apiGet } from "@/lib/api"
import { formatCurrency } from "@/utils/formatters"

type FilterState = {
  startDate: string
  endDate: string
}

type VatSummaryRow = {
  period: string | null
  label: string
  invoices: number
  taxableSales: number
  vatAmount: number
  averageRate: number
}

type VatFiling = {
  period: string | null
  label: string
  dueDate: string | null
  taxableSales: number
  vatAmount: number
  invoices: number
  status: "Upcoming" | "Pending" | "Overdue" | "Filed"
}

type VatLedgerRow = {
  id: number
  invoiceNo: string
  date: string | null
  customer: string
  taxableAmount: number
  vatAmount: number
  totalAmount: number
  paymentType: string
  status: string
}

type VatSummaryPayload = {
  filters: FilterState & {
    status: string | null
    paymentType: string | null
    search: string | null
  }
  summary: {
    totalVat: number
    taxableSales: number
    totalSales: number
    invoiceCount: number
    averageVatRate: number
    outstandingReturns: number
    complianceScore: number
    nextReturnDue: string | null
    filedReturns: number
    pendingReturns: number
    overdueReturns: number
  }
  monthlyBreakdown: VatSummaryRow[]
  filings: VatFiling[]
  vatLedger: VatLedgerRow[]
}

export default function VatReport() {
  const [filters, setFilters] = useState<FilterState>({ startDate: "", endDate: "" })
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({ startDate: "", endDate: "" })
  const [data, setData] = useState<VatSummaryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDownloading, setIsDownloading] = useState(false)
  const hasHydratedFilters = useRef(false)

  useEffect(() => {
    let cancelled = false
    const fetchSummary = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (appliedFilters.startDate) params.set("startDate", appliedFilters.startDate)
        if (appliedFilters.endDate) params.set("endDate", appliedFilters.endDate)
        const query = params.toString() ? `?${params.toString()}` : ""
        const response = await apiGet<VatSummaryPayload>(`/api/vat/summary${query}`)
        if (cancelled) return
        setData(response.data)
        if (!hasHydratedFilters.current) {
          setFilters({
            startDate: response.data.filters.startDate || "",
            endDate: response.data.filters.endDate || "",
          })
          hasHydratedFilters.current = true
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load VAT summary")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchSummary()
    return () => {
      cancelled = true
    }
  }, [appliedFilters.startDate, appliedFilters.endDate])

  const summary = data?.summary
  const filteredMonthly = data?.monthlyBreakdown.filter(row =>
    row.label.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []
  const maxVat = filteredMonthly.reduce((max, row) => Math.max(max, row.vatAmount), 0) || 1
  const filingRows = [...(data?.filings || [])].sort((a, b) => {
    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0
    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0
    return dateA - dateB
  })

  const handleFiltersChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleApplyFilters = () => {
    setAppliedFilters(filters)
  }

  const handleResetFilters = () => {
    const reset = { startDate: "", endDate: "" }
    setFilters(reset)
    setAppliedFilters(reset)
  }

  const handleDownload = () => {
    if (!filteredMonthly.length) return
    setIsDownloading(true)
    try {
      const csv = [
        ["VAT Report", new Date().toISOString()],
        [],
        ["Period", "Invoices", "Taxable Sales", "VAT Amount", "Avg Rate"],
        ...filteredMonthly.map(row => [
          row.label,
          row.invoices.toString(),
          row.taxableSales.toFixed(2),
          row.vatAmount.toFixed(2),
          `${row.averageRate.toFixed(2)}%`,
        ]),
      ]
        .map(line => line.join(","))
        .join("\n")

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "vat-report.csv"
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle title="VAT Report" subtitle="Live VAT collections, filings, and ledger activity" />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Choose a date range to recalculate VAT totals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Start date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={event => handleFiltersChange("startDate", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">End date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={event => handleFiltersChange("endDate", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button className="flex-1" onClick={handleApplyFilters} disabled={loading}>
                Apply
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleResetFilters} disabled={loading}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6 flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <Button variant="outline" onClick={handleApplyFilters}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total VAT collected</p>
                  <p className="text-3xl font-bold text-emerald-600">{formatCurrency(summary.totalVat)}</p>
                  <p className="text-xs text-slate-500 mt-1">Across {summary.invoiceCount} invoices</p>
                </div>
                <BarChart3 className="h-12 w-12 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Average VAT rate</p>
                  <p className="text-3xl font-bold text-sky-600">{summary.averageVatRate.toFixed(2)}%</p>
                  <p className="text-xs text-slate-500 mt-1">Taxable sales {formatCurrency(summary.taxableSales)}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-sky-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Compliance score</p>
                  <p className="text-3xl font-bold text-amber-600">{summary.complianceScore.toFixed(1)}%</p>
                  <p className="text-xs text-slate-500 mt-1">Next return due {summary.nextReturnDue || "—"}</p>
                </div>
                <Calendar className="h-12 w-12 text-amber-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Monthly VAT breakdown</CardTitle>
            <CardDescription>Sales, VAT, and effective tax rate per filing period</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search period"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <Button onClick={handleDownload} disabled={isDownloading || !filteredMonthly.length}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredMonthly.length && !loading && (
            <p className="text-center text-sm text-slate-500 py-6">No VAT data found for this range.</p>
          )}
          <div className="space-y-4">
            {filteredMonthly.map(row => (
              <div key={row.period} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{row.label}</p>
                    <p className="text-xs text-slate-500">{row.invoices} invoices · Avg rate {row.averageRate.toFixed(2)}%</p>
                  </div>
                  <span className="font-bold text-emerald-600">{formatCurrency(row.vatAmount)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-linear-to-r from-emerald-400 to-emerald-600"
                    style={{ width: `${Math.min(100, (row.vatAmount / maxVat) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Taxable sales {formatCurrency(row.taxableSales)}</span>
                  <span>Total VAT {formatCurrency(row.vatAmount)}</span>
                </div>
              </div>
            ))}
          </div>
          {loading && (
            <div className="flex justify-center py-6">
              <Loader />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>VAT ledger</CardTitle>
            <CardDescription>Most recent invoices contributing to VAT</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2">Invoice</th>
                    <th className="py-2">Customer</th>
                    <th className="py-2 text-right">Taxable</th>
                    <th className="py-2 text-right">VAT</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.vatLedger || []).map(entry => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-2 font-medium text-slate-800">{entry.invoiceNo}</td>
                      <td className="py-2 text-slate-600">
                        <p>{entry.customer}</p>
                        <p className="text-xs text-slate-400">{entry.date || "—"}</p>
                      </td>
                      <td className="py-2 text-right">{formatCurrency(entry.taxableAmount)}</td>
                      <td className="py-2 text-right text-emerald-600 font-semibold">{formatCurrency(entry.vatAmount)}</td>
                      <td className="py-2 text-right">{formatCurrency(entry.totalAmount)}</td>
                      <td className="py-2">
                        <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600">
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!data?.vatLedger?.length && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500 text-sm">
                        No ledger entries available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filing status</CardTitle>
            <CardDescription>Upcoming and historical VAT obligations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filingRows.slice(0, 6).map(row => (
              <div key={`${row.label}-${row.status}`} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{row.label}</p>
                    <p className="text-xs text-slate-500">Due {row.dueDate || "TBD"}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      row.status === "Overdue"
                        ? "bg-red-100 text-red-700"
                        : row.status === "Pending"
                          ? "bg-amber-100 text-amber-700"
                          : row.status === "Filed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>{formatCurrency(row.vatAmount)} VAT</span>
                  <span>{row.invoices} invoices</span>
                </div>
              </div>
            ))}
            {!filingRows.length && (
              <p className="text-sm text-slate-500 text-center py-6">No filing schedule available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
