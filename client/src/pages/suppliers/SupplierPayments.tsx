import { useEffect, useMemo, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { apiGet } from "@/lib/api"
import {
  ArrowUpRight,
  CalendarClock,
  Filter,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react"

type ApiSupplierDuePayment = {
  id: number
  supplier_due_id: number
  payment_date?: string
  amount?: number
  reference?: string
}

type ApiSupplierDue = {
  id: number
  supplier_id?: number
}

type ApiSupplier = {
  id: number
  code?: string
  name: string
}

type PaymentRow = {
  id: number
  supplier: string
  supplierId: string
  date: string
  amount: number
  reference: string
}

export default function SupplierPayments() {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")
  const formatSriLankaDateTime = (value?: string) => {
    if (!value) return "-"
    return new Date(value).toLocaleString("en-LK", { timeZone: "Asia/Colombo" })
  }

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError("")
        const [paymentsRes, duesRes, suppliersRes] = await Promise.all([
          apiGet<ApiSupplierDuePayment[]>("/api/supplier-due-payments?limit=5000"),
          apiGet<ApiSupplierDue[]>("/api/supplier-dues?limit=2000"),
          apiGet<ApiSupplier[]>("/api/suppliers?limit=2000"),
        ])

        if (!mounted) return

        const dueMap = new Map<number, ApiSupplierDue>()
        ;(duesRes.data || []).forEach((d) => dueMap.set(d.id, d))

        const supplierMap = new Map<number, ApiSupplier>()
        ;(suppliersRes.data || []).forEach((s) => supplierMap.set(s.id, s))

        const mapped = (paymentsRes.data || []).map((p) => {
          const due = dueMap.get(p.supplier_due_id)
          const supplier = due?.supplier_id ? supplierMap.get(due.supplier_id) : undefined
          return {
            id: p.id,
            supplier: supplier?.name || "Unknown",
            supplierId: supplier?.code || (supplier ? `SUP-${supplier.id}` : ""),
            date: p.payment_date || "",
            amount: Number(p.amount || 0),
            reference: p.reference || "",
          }
        })

        setPayments(mapped)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load payments")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    let rows = payments
    if (search) {
      const key = search.toLowerCase()
      rows = rows.filter(
        (p) =>
          p.supplier.toLowerCase().includes(key) ||
          p.supplierId.toLowerCase().includes(key) ||
          p.reference.toLowerCase().includes(key)
      )
    }
    if (dateFrom) {
      rows = rows.filter((p) => p.date && p.date >= dateFrom)
    }
    if (dateTo) {
      rows = rows.filter((p) => p.date && p.date <= dateTo)
    }
    if (minAmount) {
      const min = Number(minAmount) || 0
      rows = rows.filter((p) => p.amount >= min)
    }
    if (maxAmount) {
      const max = Number(maxAmount) || 0
      rows = rows.filter((p) => p.amount <= max)
    }
    return rows
  }, [payments, search, dateFrom, dateTo, minAmount, maxAmount])

  const ledgerTotalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalPayments = payments.length
  const filteredTotalAmount = filtered.reduce((sum, p) => sum + p.amount, 0)
  const averagePayment = totalPayments ? Math.round(ledgerTotalAmount / totalPayments) : 0
  const lastPaymentDate = payments.length ? payments.reduce((latest, p) => (p.date > latest ? p.date : latest), payments[0].date) : ""
  const formattedLastPayment = lastPaymentDate ? new Date(lastPaymentDate).toLocaleDateString("en-LK", { timeZone: "Asia/Colombo" }) : "No payments"
  const filtersActive = Boolean(search.trim()) || dateFrom !== "" || dateTo !== "" || minAmount !== "" || maxAmount !== ""
  const heroMetrics = [
    {
      label: "Total paid",
      value: `Rs. ${ledgerTotalAmount.toLocaleString()}`,
      hint: `${totalPayments} transactions`,
      gradient: "from-[#312e81] to-[#4338ca]",
      icon: Wallet,
    },
    {
      label: "Average payment",
      value: `Rs. ${averagePayment.toLocaleString()}`,
      hint: "per payout",
      gradient: "from-[#0f766e] to-[#22c55e]",
      icon: Sparkles,
    },
    {
      label: "Latest activity",
      value: formattedLastPayment,
      hint: "Last payment date",
      gradient: "from-[#b45309] to-[#facc15]",
      icon: CalendarClock,
    },
    {
      label: "Filtered total",
      value: `Rs. ${filteredTotalAmount.toLocaleString()}`,
      hint: `${filtered.length} in view`,
      gradient: "from-[#1d4ed8] to-[#38bdf8]",
      icon: ArrowUpRight,
    },
  ]

  const exportCSV = () => {
    const headers = ["Supplier", "Supplier ID", "Payment Date", "Amount", "Reference"]
    const rows = filtered.map((p) => [
      p.supplier,
      p.supplierId,
      formatSriLankaDateTime(p.date),
      p.amount,
      p.reference,
    ])

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const element = document.createElement("a")
    element.setAttribute("href", `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`)
    element.setAttribute("download", `supplier_payments_${new Date().toISOString().split("T")[0]}.csv`)
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Supplier Payments" />

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card className="brand-card brand-card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-linear-to-r from-[#042f2e] via-[#0f766e] to-[#22d3ee] p-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Liquidity radar</p>
                <h2 className="text-3xl font-bold">Supplier Payout Monitor</h2>
                <p className="text-sm text-white/80">
                  Mirror the Supplier Management vibe—surface payout velocity, filter receipts, and export ledger proofs in seconds.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <Badge className="brand-pill border border-white/40 bg-white/10 text-white">{filtersActive ? "Filtered view" : "Full ledger"}</Badge>
                <Button onClick={exportCSV} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f766e] hover:bg-white">
                  <Sparkles className="mr-2 h-4 w-4" /> Export CSV
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="rounded-2xl bg-white/10 px-3 py-1">{totalPayments} total payments</span>
              <span className="rounded-2xl bg-white/10 px-3 py-1">Rs. {ledgerTotalAmount.toLocaleString()} disbursed</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            {heroMetrics.map(({ label, value, hint, gradient, icon: Icon }) => (
              <div
                key={label}
                className={`relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br ${gradient} p-4 text-white shadow-lg`}
              >
                <div className="flex items-center justify-between">
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
                <Filter className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Search & filter</p>
                <h2 className="text-2xl font-bold text-foreground">Payment console</h2>
                <p className="text-sm text-muted-foreground">{loading ? "Syncing payments..." : "Dial in a precise payout subset using dates, ranges, and quick search."}</p>
              </div>
            </div>
            <div className="brand-soft-panel rounded-2xl px-4 py-3 text-right">
              <p className="text-xs font-semibold text-muted-foreground">In viewport</p>
              <p className="text-2xl font-bold text-[#4338ca]">Rs. {filteredTotalAmount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{filtered.length} payments</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2 xl:col-span-2">
              <Label className="text-sm font-semibold text-foreground">Search payouts</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Supplier, ID, reference"
                  className="h-12 rounded-2xl border-border bg-background/70 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">From date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-12 rounded-2xl border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">To date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-12 rounded-2xl border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Min amount</Label>
              <Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="h-12 rounded-2xl border-border" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Max amount</Label>
              <Input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="h-12 rounded-2xl border-border" placeholder="0" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>
              Showing {filtered.length} / {totalPayments} payments · Rs. {filteredTotalAmount.toLocaleString()} total
            </p>
            <Button variant="outline" className="rounded-2xl border-border/60" onClick={exportCSV}>
              <ArrowUpRight className="mr-2 h-4 w-4" /> Export current view
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="brand-card brand-card-hover">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment ledger</p>
              <h2 className="text-2xl font-bold text-foreground">Disbursement history</h2>
              <p className="text-sm text-muted-foreground">{filtersActive ? "Filtered snapshot" : "Complete payment ledger"}</p>
            </div>
            <Badge className="brand-pill border border-[#4338ca]/30 bg-[#4338ca]/10 text-[#4338ca]">{filtered.length} entries</Badge>
          </div>

          <div className="rounded-3xl border border-border/40 bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-linear-to-r from-[#eff6ff] to-[#eef2ff] text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Supplier ID</th>
                    <th className="px-4 py-3">Payment date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                        No payments match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p, idx) => (
                      <tr
                        key={p.id}
                        className={`border-b border-border/70 ${idx % 2 === 0 ? "bg-card" : "bg-card/80"} transition hover:bg-muted/50`}
                      >
                        <td className="px-4 py-3 font-semibold text-foreground">{p.supplier}</td>
                        <td className="px-4 py-3 text-foreground">{p.supplierId}</td>
                        <td className="px-4 py-3 text-foreground">{formatSriLankaDateTime(p.date)}</td>
                        <td className="px-4 py-3 text-right text-emerald-700 font-semibold">Rs. {p.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.reference || "—"}</td>
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
