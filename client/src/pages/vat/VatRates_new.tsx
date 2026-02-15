'use client'

import { useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import Loader from "@/components/common/Loader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUpRight,
  ClipboardCheck,
  Download,
  FileWarning,
  Layers,
  PenSquare,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  TrendingUp,
} from "lucide-react"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api"
import { formatCurrency } from "@/utils/formatters"

type VatRate = {
  id: number
  category: string
  description: string | null
  rate: number
  applicableFrom: string
  status: "Active" | "Inactive"
  remarks: string | null
}

type VatSummaryRow = {
  label: string
  period: string | null
  invoices: number
  taxableSales: number
  vatAmount: number
  averageRate: number
}

type VatFiling = {
  label: string
  dueDate: string | null
  status: "Upcoming" | "Pending" | "Overdue" | "Filed"
  vatAmount: number
  invoices: number
}

type VatLedgerRow = {
  id: number
  invoiceNo: string
  date: string | null
  customer: string
  taxableAmount: number
  vatAmount: number
  totalAmount: number
  status: string
}

type VatSummaryPayload = {
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

const RATE_STATUS_TONE: Record<VatRate["status"], string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Inactive: "bg-rose-50 text-rose-700",
}

const FILING_STATUS_TONE: Record<VatFiling["status"], string> = {
  Overdue: "bg-rose-50 text-rose-700",
  Pending: "bg-amber-50 text-amber-700",
  Upcoming: "bg-slate-50 text-slate-700",
  Filed: "bg-emerald-50 text-emerald-700",
}

const formatPercent = (value: number | undefined | null, fractionDigits = 2) => `${(value ?? 0).toFixed(fractionDigits)}%`

export default function VatManagement() {
  const [activeTab, setActiveTab] = useState("rates")
  const [vatRates, setVatRates] = useState<VatRate[]>([])
  const [summary, setSummary] = useState<VatSummaryPayload | null>(null)
  const [ratesError, setRatesError] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [ratesLoading, setRatesLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [showAddRate, setShowAddRate] = useState(false)
  const [showEditRate, setShowEditRate] = useState(false)
  const [selectedRate, setSelectedRate] = useState<VatRate | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("All")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [newRate, setNewRate] = useState<Partial<VatRate>>({
    category: "",
    description: "",
    rate: 0,
    applicableFrom: new Date().toISOString().split("T")[0],
    status: "Active",
    remarks: "",
  })

  const filteredRates = useMemo(
    () => vatRates.filter((rate) => filterStatus === "All" || rate.status === filterStatus),
    [vatRates, filterStatus]
  )

  const fetchRates = async () => {
    setRatesLoading(true)
    setRatesError(null)
    try {
      const response = await apiGet<{ rates: VatRate[] }>("/api/vat/rates")
      setVatRates(response.data.rates)
    } catch (error) {
      setRatesError(error instanceof Error ? error.message : "Unable to load VAT rates")
    } finally {
      setRatesLoading(false)
    }
  }

  const fetchSummary = async () => {
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const response = await apiGet<VatSummaryPayload>("/api/vat/summary")
      setSummary(response.data)
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Unable to load VAT summary")
    } finally {
      setSummaryLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
    fetchSummary()
  }, [])

  const resetRateForm = () => {
    setNewRate({
      category: "",
      description: "",
      rate: 0,
      applicableFrom: new Date().toISOString().split("T")[0],
      status: "Active",
      remarks: "",
    })
  }

  const handleAddRate = async () => {
    if (!newRate.category || newRate.rate === undefined) {
      setActionError("Category and rate are required")
      return
    }
    setIsSubmitting(true)
    setActionError(null)
    try {
      const payload = {
        ...newRate,
        rate: Number(newRate.rate) || 0,
      }
      await apiPost<VatRate>("/api/vat/rates", payload)
      setShowAddRate(false)
      resetRateForm()
      fetchRates()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to add rate")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRate = async () => {
    if (!selectedRate) return
    setIsSubmitting(true)
    setActionError(null)
    try {
      const payload = {
        ...selectedRate,
        rate: Number(selectedRate.rate) || 0,
      }
      await apiPut<VatRate>(`/api/vat/rates/${selectedRate.id}`, payload)
      setShowEditRate(false)
      setSelectedRate(null)
      fetchRates()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update rate")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRate = async (id: number) => {
    setIsSubmitting(true)
    setActionError(null)
    try {
      await apiDelete(`/api/vat/rates/${id}`)
      fetchRates()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete rate")
    } finally {
      setIsSubmitting(false)
    }
  }

  const downloadVatReport = () => {
    if (!summary?.monthlyBreakdown?.length) return
    const csv = [
      ["Period", "Invoices", "Taxable Sales", "VAT Amount", "Average Rate"],
      ...summary.monthlyBreakdown.map((row) => [
        row.label,
        row.invoices.toString(),
        row.taxableSales.toFixed(2),
        row.vatAmount.toFixed(2),
        `${row.averageRate.toFixed(2)}%`,
      ]),
    ]
      .map((line) => line.join(","))
      .join("\n")

    const link = document.createElement("a")
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    link.download = `VAT_Report_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const downloadVatCalculations = () => {
    if (!summary?.vatLedger?.length) return
    const csv = [
      ["Invoice", "Customer", "Date", "Taxable", "VAT", "Total", "Status"],
      ...summary.vatLedger.map((entry) => [
        entry.invoiceNo,
        entry.customer,
        entry.date || "",
        entry.taxableAmount.toFixed(2),
        entry.vatAmount.toFixed(2),
        entry.totalAmount.toFixed(2),
        entry.status,
      ]),
    ]
      .map((line) => line.join(","))
      .join("\n")

    const link = document.createElement("a")
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    link.download = `VAT_Calculations_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
  }

  const totalVat = summary?.summary?.totalVat ?? 0
  const taxableSales = summary?.summary?.taxableSales ?? 0
  const invoiceCount = summary?.summary?.invoiceCount ?? 0
  const complianceScore = summary?.summary?.complianceScore ?? 0
  const outstandingReturns = summary?.summary?.outstandingReturns ?? 0
  const nextReturnDue = summary?.summary?.nextReturnDue

  const heroMetrics = [
    {
      label: "VAT collected",
      value: formatCurrency(totalVat),
      hint: `${invoiceCount} invoices in scope`,
      gradient: "from-[#0f172a] via-[#1d4ed8] to-[#7c3aed]",
      icon: ShieldCheck,
    },
    {
      label: "Taxable sales",
      value: formatCurrency(taxableSales),
      hint: formatPercent(summary?.summary?.averageVatRate) + " avg rate",
      gradient: "from-[#134e4a] to-[#10b981]",
      icon: TrendingUp,
    },
    {
      label: "Outstanding returns",
      value: outstandingReturns,
      hint: nextReturnDue ? `Next due ${nextReturnDue}` : "All clear",
      gradient: "from-[#4c0519] to-[#db2777]",
      icon: FileWarning,
    },
    {
      label: "Compliance score",
      value: `${complianceScore || 0}%`,
      hint: `${summary?.summary?.filedReturns ?? 0} filed · ${summary?.summary?.pendingReturns ?? 0} pending`,
      gradient: "from-[#0f172a] to-[#38bdf8]",
      icon: ArrowUpRight,
    },
  ]

  return (
    <div className="space-y-6">
      <PageTitle title="VAT Management" subtitle="Neon compliance cockpit with live rates, filings, and ledgers" />

      <Card className="brand-card brand-card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#7c3aed] p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Tax intelligence</p>
                <h2 className="text-3xl font-bold">VAT assurance</h2>
                <p className="text-sm text-white/80">Hero metrics, pdf-ready ledgers, and inline rate governance to mirror the supplier dashboard polish.</p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <Badge className="brand-pill border border-white/30 bg-white/10 text-white">
                  {vatRates.length ? `${vatRates.length} rate bands` : "No VAT bands yet"}
                </Badge>
                <Button onClick={() => setShowAddRate(true)} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white">
                  <Plus className="mr-2 h-4 w-4" /> New VAT rate
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
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-muted/60 p-2 text-primary">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Console</p>
              <h2 className="text-2xl font-bold text-foreground">Filters & exports</h2>
              <p className="text-sm text-muted-foreground">Search rate bands, toggle neon filters, trigger CSV drops, and refresh data inline.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Status filter</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <Button variant="outline" onClick={() => setFilterStatus("All")} className="h-11 rounded-2xl border-dashed">
                Reset
              </Button>
              <Button variant="outline" onClick={fetchRates} className="h-11 rounded-2xl">
                <RefreshCcw className="mr-2 h-4 w-4" /> Refresh data
              </Button>
            </div>
            <div className="flex flex-col justify-end gap-2 md:col-span-2">
              <Button onClick={downloadVatReport} disabled={!summary?.monthlyBreakdown?.length} className="h-11 rounded-2xl bg-[#0f172a] text-white disabled:cursor-not-allowed disabled:opacity-60">
                <Download className="mr-2 h-4 w-4" /> Export filings snapshot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-2xl bg-muted/30 p-1">
          <TabsTrigger value="rates">Rates</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="calculations">Calculations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-4">
          {ratesError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center justify-between py-4 text-sm text-red-700">
                <p>{ratesError}</p>
                <Button variant="outline" size="sm" onClick={fetchRates}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Retry
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="brand-card brand-card-hover">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl">VAT rate ledger</CardTitle>
                <CardDescription>Category DNA, effective dates, and compliance pills.</CardDescription>
              </div>
              <Button onClick={() => setShowAddRate(true)} className="rounded-2xl">
                <Plus className="mr-2 h-4 w-4" /> Add rate
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {ratesLoading ? (
                <div className="flex justify-center py-10">
                  <Loader />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead>Effective</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                          No VAT rates match the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredRates.map((rate) => (
                      <TableRow key={rate.id} className="transition hover:bg-muted/40">
                        <TableCell className="font-semibold text-foreground">{rate.category}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{rate.description || "—"}</TableCell>
                        <TableCell className="text-right font-semibold text-[#0f172a]">{formatPercent(rate.rate, 2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-2xl border-dashed text-xs">
                            {rate.applicableFrom}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${RATE_STATUS_TONE[rate.status]}`}>
                            {rate.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{rate.remarks || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button size="icon" variant="outline" onClick={() => {
                              setSelectedRate(rate)
                              setShowEditRate(true)
                            }} className="h-9 w-9 rounded-2xl">
                              <PenSquare className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" disabled={isSubmitting} onClick={() => handleDeleteRate(rate.id)} className="h-9 w-9 rounded-2xl text-rose-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {summaryError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center justify-between py-4 text-sm text-red-700">
                <p>{summaryError}</p>
                <Button variant="outline" size="sm" onClick={fetchSummary}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Retry
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total VAT collected</CardTitle>
                <CardDescription>Across the current reporting window</CardDescription>
              </CardHeader>
              <CardContent>{summaryLoading ? <Loader /> : <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalVat)}</p>}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Average VAT rate</CardTitle>
                <CardDescription>Weighted by taxable sales</CardDescription>
              </CardHeader>
              <CardContent>
                {summaryLoading ? <Loader /> : <p className="text-2xl font-bold text-sky-600">{formatPercent(summary?.summary?.averageVatRate)}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Compliance pulse</CardTitle>
                <CardDescription>Filed vs pending vs overdue</CardDescription>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Loader />
                ) : (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Filed · {summary?.summary?.filedReturns ?? 0}</p>
                    <p>Pending · {summary?.summary?.pendingReturns ?? 0}</p>
                    <p>Overdue · {summary?.summary?.overdueReturns ?? 0}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="brand-card brand-card-hover">
            <CardHeader>
              <CardTitle>Filing schedule</CardTitle>
              <CardDescription>Auto-generated from historic VAT periods.</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="flex justify-center py-8">
                  <Loader />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(summary?.filings || []).map((filing) => (
                    <div key={`${filing.label}-${filing.status}`} className="rounded-2xl border border-border/50 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{filing.label}</p>
                          <p className="text-xs text-muted-foreground">Due {filing.dueDate || "TBD"}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${FILING_STATUS_TONE[filing.status]}`}>
                          {filing.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(filing.vatAmount)} VAT</span>
                        <span>{filing.invoices} invoices</span>
                      </div>
                    </div>
                  ))}
                  {!summary?.filings?.length && <p className="text-sm text-muted-foreground">No filings available.</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculations" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-foreground">VAT ledger</h2>
              <p className="text-sm text-muted-foreground">Taxable base, VAT component, and total per invoice.</p>
            </div>
            <Button onClick={downloadVatCalculations} disabled={!summary?.vatLedger?.length} className="rounded-2xl">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>

          <Card className="brand-card brand-card-hover">
            <CardContent className="p-0">
              {summaryLoading ? (
                <div className="flex justify-center py-10">
                  <Loader />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Taxable</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(summary?.vatLedger || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                          No VAT ledger entries available.
                        </TableCell>
                      </TableRow>
                    )}
                    {(summary?.vatLedger || []).map((entry) => (
                      <TableRow key={entry.id} className="transition hover:bg-muted/40">
                        <TableCell className="font-semibold text-foreground">{entry.invoiceNo}</TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground">{entry.customer}</p>
                          <p className="text-xs text-muted-foreground">{entry.date || "—"}</p>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.taxableAmount)}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">{formatCurrency(entry.vatAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.totalAmount)}</TableCell>
                        <TableCell>{entry.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">VAT settings</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="brand-card brand-card-hover">
              <CardHeader>
                <CardTitle>Default VAT rate</CardTitle>
                <CardDescription>Used when no category match is found.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input type="number" placeholder="Enter default VAT rate %" defaultValue="15" className="rounded-2xl" />
                <Button className="w-full rounded-2xl bg-[#0f172a] text-white">Save</Button>
              </CardContent>
            </Card>
            <Card className="brand-card brand-card-hover">
              <CardHeader>
                <CardTitle>Calculation method</CardTitle>
                <CardDescription>Inclusive vs exclusive VAT handling.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select defaultValue="inclusive">
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inclusive">Inclusive</SelectItem>
                    <SelectItem value="exclusive">Exclusive</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full rounded-2xl">Save</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddRate} onOpenChange={setShowAddRate}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add VAT rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Category" value={newRate.category || ""} onChange={(event) => setNewRate({ ...newRate, category: event.target.value })} className="rounded-2xl" />
            <Input placeholder="Description" value={newRate.description || ""} onChange={(event) => setNewRate({ ...newRate, description: event.target.value })} className="rounded-2xl" />
            <Input type="number" placeholder="VAT rate (%)" value={newRate.rate || 0} onChange={(event) => setNewRate({ ...newRate, rate: Number.parseFloat(event.target.value) || 0 })} className="rounded-2xl" />
            <Input type="date" value={newRate.applicableFrom || ""} onChange={(event) => setNewRate({ ...newRate, applicableFrom: event.target.value })} className="rounded-2xl" />
            <Select value={newRate.status || "Active"} onValueChange={(value: string) => setNewRate({ ...newRate, status: value as VatRate["status"] })}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
            <div className="flex gap-3">
              <Button onClick={handleAddRate} className="flex-1 rounded-2xl" disabled={isSubmitting}>
                <ClipboardCheck className="mr-2 h-4 w-4" /> Add rate
              </Button>
              <Button variant="outline" onClick={() => setShowAddRate(false)} className="flex-1 rounded-2xl">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditRate} onOpenChange={setShowEditRate}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit VAT rate</DialogTitle>
          </DialogHeader>
          {selectedRate && (
            <div className="space-y-4">
              <Input value={selectedRate.category} onChange={(event) => setSelectedRate({ ...selectedRate, category: event.target.value })} className="rounded-2xl" />
              <Input value={selectedRate.description ?? ""} onChange={(event) => setSelectedRate({ ...selectedRate, description: event.target.value })} className="rounded-2xl" />
              <Input type="number" value={selectedRate.rate} onChange={(event) => setSelectedRate({ ...selectedRate, rate: Number.parseFloat(event.target.value) || 0 })} className="rounded-2xl" />
              <Input type="date" value={selectedRate.applicableFrom} onChange={(event) => setSelectedRate({ ...selectedRate, applicableFrom: event.target.value })} className="rounded-2xl" />
              <Select value={selectedRate.status} onValueChange={(value: string) => setSelectedRate({ ...selectedRate, status: value as VatRate["status"] })}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
              <div className="flex gap-3">
                <Button onClick={handleUpdateRate} className="flex-1 rounded-2xl" disabled={isSubmitting}>
                  <ClipboardCheck className="mr-2 h-4 w-4" /> Update rate
                </Button>
                <Button variant="outline" onClick={() => setShowEditRate(false)} className="flex-1 rounded-2xl">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
