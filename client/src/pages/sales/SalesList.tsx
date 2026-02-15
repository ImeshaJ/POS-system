import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowDownRight, CreditCard, Eye, Printer, ReceiptText, RotateCcw, TrendingUp, Trash2 } from "lucide-react"
import { apiDelete, apiGet } from "@/lib/api"

/* ========= TYPES ========= */

type SaleItem = {
  name: string
  price: number
  qty: number
}

type Sale = {
  id: string
  saleId?: number
  date?: string
  time?: string
  clientId?: string
  customer?: string
  petName?: string
  total?: number
  payment?: string
  status?: "Completed" | "Partially Returned" | "Returned"
  items?: SaleItem[]
  isReturn?: boolean
  sortKey?: number
  rowKey?: string
}

type ApiSale = {
  id: number
  invoice_no?: string
  date?: string
  time?: string
  client_id?: number
  customer?: string
  pet_name?: string
  total?: number
  payment_type?: string
  status?: string
}

type ApiSaleItem = {
  sale_id: number
  name: string
  price?: number
  qty?: number
}

type ApiSalesReturn = {
  id: number
  sale_id: number
  invoice_no?: string
  total_refund?: number
  created_at?: string
}

type ApiSalesReturnItem = {
  sales_return_id: number
  name?: string
  qty?: number
  price?: number
}

const formatCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`

const getChronoValue = (date?: string | null, time?: string | null) => {
  if (!date) return 0
  const textual = time ? `${date} ${time}` : date
  const timestamp = Date.parse(textual)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

/* ========= COMPONENT ========= */

export default function SalesList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [statusFilter, setStatusFilter] = useState<"All" | "Completed" | "Returned" | "Partially Returned">("All")
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const [salesRes, itemsRes, returnsRes, returnItemsRes] = await Promise.all([
          apiGet<ApiSale[]>("/api/sales?limit=1000"),
          apiGet<ApiSaleItem[]>("/api/sale-items?limit=2000"),
          apiGet<ApiSalesReturn[]>("/api/sales-returns?limit=1000"),
          apiGet<ApiSalesReturnItem[]>("/api/sales-return-items?limit=2000"),
        ])

        if (!mounted) return

        const itemsBySale = new Map<number, SaleItem[]>()
        ;(itemsRes.data || []).forEach((item) => {
          const current = itemsBySale.get(item.sale_id) || []
          current.push({
            name: item.name || "Item",
            price: Number(item.price || 0),
            qty: Number(item.qty || 0),
          })
          itemsBySale.set(item.sale_id, current)
        })

        const itemsByReturn = new Map<number, SaleItem[]>()
        ;(returnItemsRes.data || []).forEach((item) => {
          const current = itemsByReturn.get(item.sales_return_id) || []
          current.push({
            name: item.name || "Returned Item",
            price: Number(item.price || 0),
            qty: Number(item.qty || 0),
          })
          itemsByReturn.set(item.sales_return_id, current)
        })

        const mappedSales: Sale[] = (salesRes.data || []).map((sale) => {
          const chrono = getChronoValue(sale.date, sale.time) || sale.id || 0
          const validStatus = (sale.status as "Completed" | "Partially Returned" | "Returned" | undefined) || "Completed"
          return {
            id: sale.invoice_no || `INV-${sale.id}`,
            saleId: sale.id,
            date: sale.date || "",
            time: sale.time || "",
            clientId: sale.client_id ? sale.client_id.toString() : "-",
            customer: sale.customer || "Walk-in",
            petName: sale.pet_name || "",
            total: Number(sale.total || 0),
            payment: sale.payment_type || "Cash",
            status: validStatus,
            items: itemsBySale.get(sale.id) || [],
            sortKey: chrono,
            rowKey: `sale-${sale.id}`,
          }
        })

        const saleLookup = new Map(mappedSales.map((sale) => [sale.saleId, sale]))

        const mappedReturns: Sale[] = (returnsRes.data || []).map((ret) => {
          const createdAt = ret.created_at ? new Date(ret.created_at) : null
          const relatedSale = saleLookup.get(ret.sale_id)
          return {
            id: ret.invoice_no || `RET-${ret.id}`,
            saleId: ret.sale_id,
            date: createdAt ? createdAt.toLocaleDateString("en-LK") : relatedSale?.date || "",
            time: createdAt
              ? createdAt.toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" })
              : relatedSale?.time || "",
            clientId: relatedSale?.clientId || "-",
            customer: relatedSale?.customer || "Refund",
            petName: relatedSale?.petName || "",
            total: Number(ret.total_refund || 0),
            payment: "Refund",
            status: "Returned",
            items: itemsByReturn.get(ret.id) || [],
            isReturn: true,
            sortKey: createdAt ? createdAt.getTime() : getChronoValue(relatedSale?.date, relatedSale?.time),
            rowKey: `return-${ret.id}`,
          }
        })

        const combined = [...mappedSales, ...mappedReturns].sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0))
        setSales(combined)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sales")
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sales.filter((sale) => {
      const matchesStatus =
        statusFilter === "All" ||
        sale.status === statusFilter ||
        (statusFilter === "Returned" && sale.isReturn)

      const matchesSearch = term
        ? [sale.id, sale.clientId, sale.customer, sale.petName]
            .filter((field) => field !== undefined && field !== null)
            .some((field) => String(field).toLowerCase().includes(term))
        : true

      return matchesStatus && matchesSearch
    })
  }, [sales, search, statusFilter])

  const salesStats = useMemo(() => {
    const completed = sales.filter((sale) => !sale.isReturn)
    const returns = sales.filter((sale) => sale.isReturn)
    const revenue = completed.reduce((sum, sale) => sum + (sale.total ?? 0), 0)
    const refund = returns.reduce((sum, sale) => sum + (sale.total ?? 0), 0)
    const average = completed.length ? revenue / completed.length : 0
    const latest = completed[0] ?? null

    return {
      completedCount: completed.length,
      returnsCount: returns.length,
      revenue,
      refund,
      average,
      latestInvoice: latest?.id ?? "-",
      latestDate: latest?.date ?? "",
      latestTime: latest?.time ?? "",
      latestAmount: latest?.total ?? 0,
    }
  }, [sales])

  const netRevenue = salesStats.revenue - salesStats.refund
  const recentReturns = useMemo(() => sales.filter((sale) => sale.isReturn).slice(0, 4), [sales])
  const noRecords = !loading && filteredSales.length === 0

  const handleResetFilters = () => {
    setSearch("")
    setStatusFilter("All")
  }

  const handleDeleteSale = async (sale: Sale) => {
    if (!sale.saleId || sale.isReturn) return
    const confirmed = confirm(`Delete sale ${sale.id}? This action cannot be undone.`)
    if (!confirmed) return

    try {
      setDeletingId(sale.saleId)
      setError(null)
      await apiDelete(`/api/sales/${sale.saleId}`)
      setSales((prev) => prev.filter((item) => item.saleId !== sale.saleId))
      if (selectedSale?.saleId === sale.saleId) {
        setSelectedSale(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sale")
    } finally {
      setDeletingId(null)
    }
  }
  

  const getStatusBadgeClass = (status: Sale["status"]) => {
    switch (status) {
      case "Completed":
        return "brand-pill brand-pill-success"
      case "Partially Returned":
        return "brand-pill brand-pill-warning"
      case "Returned":
        return "brand-pill bg-red-100 text-red-700"
      default:
        return "brand-pill brand-pill-neutral"
    }
  }

  return (
    <>
      <PageTitle title="Sales List" />

      <section className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_55%),linear-gradient(120deg,#0f172a,#0b5ed7)] p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-white/70">Sales runway</p>
            <h2 className="text-3xl font-semibold leading-tight">Sales list command deck</h2>
            <p className="text-sm text-white/80">
              Monitor invoice flow, track refund drag, and jump straight into new sales or returns from one neon banner.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate("/sales/new")}
                className="rounded-2xl bg-white/90 px-6 py-2 text-[#0f172a] shadow-lg hover:bg-white"
              >
                + New Sale
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/sales/return")}
                className="rounded-2xl border-white/60 bg-white/5 px-6 py-2 text-white hover:bg-white/10"
              >
                View Returns
              </Button>
            </div>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/10 p-5 text-center text-white/80 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">Live queue</p>
            <p className="text-4xl font-bold text-white">{filteredSales.length}</p>
            <p className="text-xs">matching current filters</p>
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#6a11cb] to-[#2575fc] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Net Revenue</p>
              <p className="mt-2 text-3xl font-bold">{formatCurrency(netRevenue)}</p>
              <p className="text-xs text-white/80">After refunds ({formatCurrency(salesStats.refund)})</p>
            </div>
            <TrendingUp className="h-10 w-10 text-white/70" />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#00b09b] to-[#22d3ee] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Completed Orders</p>
              <p className="mt-2 text-3xl font-bold">{salesStats.completedCount}</p>
              <p className="text-xs text-white/80">Gross {formatCurrency(salesStats.revenue)}</p>
            </div>
            <ReceiptText className="h-10 w-10 text-white/70" />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#ff512f] to-[#dd2476] p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Returns Logged</p>
              <p className="mt-2 text-3xl font-bold">{salesStats.returnsCount}</p>
              <p className="text-xs text-white/80">Refunded {formatCurrency(salesStats.refund)}</p>
            </div>
            <ArrowDownRight className="h-10 w-10 text-white/70" />
          </div>
        </div>
        <div className="brand-soft-panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">Avg Ticket</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(salesStats.average)}</p>
              <p className="text-xs text-gray-500">
                Last sale {salesStats.latestInvoice} · {formatCurrency(salesStats.latestAmount)}
              </p>
            </div>
            <CreditCard className="h-10 w-10 text-blue-600" />
          </div>
        </div>
      </div>

      {loading && <div className="mb-4 text-sm text-gray-500">Loading sales...</div>}
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="brand-card brand-card-hover xl:col-span-2">
          <CardContent className="space-y-6 p-6">
            <div className="space-y-1">
              <h2 className="brand-section-title">Search & Filter</h2>
              <p className="text-sm text-gray-500">Dial invoices by client, invoice ID, or return status.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">Search</label>
                <Input
                  placeholder="Invoice, Client ID, Customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-[#002366] focus:outline-none focus:ring-2 focus:ring-[#002366]/20"
                >
                  <option value="All">All</option>
                  <option value="Completed">Completed</option>
                  <option value="Partially Returned">Partially Returned</option>
                  <option value="Returned">Returned</option>
                </select>
              </div>
              <div className="brand-soft-panel flex flex-col justify-center rounded-2xl px-4 py-3">
                <p className="text-xs font-semibold text-gray-500">Matching Records</p>
                <p className="text-2xl font-bold text-[#002366]">{filteredSales.length}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
              <span>
                Showing <span className="font-semibold text-gray-900">{filteredSales.length}</span> of {sales.length} entries
              </span>
              <Button variant="ghost" size="sm" className="text-[#002366]" onClick={handleResetFilters}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-4 p-6">
            <div className="brand-section-title">Recent Returns</div>
            {recentReturns.length === 0 ? (
              <p className="text-sm text-gray-500">All caught up! No returns logged yet.</p>
            ) : (
              <div className="space-y-3">
                {recentReturns.map((ret) => (
                  <div
                    key={ret.rowKey || ret.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{ret.id}</p>
                      <p className="text-xs text-gray-500">
                        {ret.date || "-"}
                        {ret.time ? ` · ${ret.time}` : ""}
                      </p>
                      <p className="text-xs text-gray-500">{ret.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">- {formatCurrency(ret.total || 0)}</p>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedSale(ret)}>
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="brand-card brand-card-hover">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-linear-to-r from-[#eff6ff] to-[#eef2ff]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Pet</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Payment</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale, idx) => (
                  <tr
                    key={sale.rowKey || sale.id}
                    className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} border-b border-border/60 transition-colors hover:bg-blue-50/60`}
                  >
                    <td className="px-4 py-3 font-semibold text-[#002366]">{sale.id}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="text-sm font-medium">{sale.date || "-"}</div>
                      <div className="text-xs text-gray-500">{sale.time || ""}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{sale.clientId || "-"}</td>
                    <td className="px-4 py-3 text-gray-700">{sale.customer}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{sale.petName || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(sale.total ?? 0)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="brand-pill brand-pill-primary uppercase">{sale.payment}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={getStatusBadgeClass(sale.status)}>{sale.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#002366] hover:bg-[#002366]/10"
                          onClick={() => setSelectedSale(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {sale.status === "Completed" && !sale.isReturn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:bg-orange-50"
                            onClick={() => navigate("/sales/return")}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {!sale.isReturn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:bg-gray-100"
                            onClick={() => navigate(`/sales/invoice/${sale.id}`, { state: sale })}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                        {!sale.isReturn && sale.saleId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteSale(sale)}
                            disabled={deletingId === sale.saleId}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {noRecords && (
              <div className="py-12 text-center text-gray-500">
                <p className="text-lg font-semibold">No sales match the current filters.</p>
                <p className="text-sm">Try adjusting search keywords or status.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="brand-card brand-card-hover w-full max-w-3xl overflow-hidden">
            <div className="flex items-start justify-between gap-4 bg-linear-to-r from-[#002366] to-[#0052a2] px-6 py-5 text-white">
              <div>
                <p className="text-xs uppercase text-white/70">Invoice</p>
                <p className="text-2xl font-bold">{selectedSale.id}</p>
                <p className="text-sm text-white/80">
                  {selectedSale.date || "-"}
                  {selectedSale.time ? ` · ${selectedSale.time}` : ""}
                </p>
              </div>
              <Button variant="ghost" className="text-white hover:bg-white/20" onClick={() => setSelectedSale(null)}>
                Close
              </Button>
            </div>

            <CardContent className="p-0">
              <div className="space-y-6 p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <img src="/src/assets/images/logo.png" alt="logo" className="h-12 w-12 object-contain" />
                    <div>
                      <h3 className="text-lg font-bold text-[#002366]">Furry Friends</h3>
                      <p className="text-xs text-gray-500">No4, Old Kesbewa Road, Gangodawila, Nugegoda</p>
                      <p className="text-xs text-gray-500">0704667700</p>
                      <p className="text-xs text-gray-500">skfurryfriends@gmail.com</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold text-gray-500">Bill To</p>
                    <p className="text-base font-bold text-gray-900">{selectedSale.customer}</p>
                    {selectedSale.petName && <p className="text-xs text-gray-500">Pet: {selectedSale.petName}</p>}
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-500">Payment</p>
                      <span className="brand-pill brand-pill-primary">{selectedSale.payment}</span>
                    </div>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-linear-to-r from-[#edf2ff] to-[#e0ecff]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Item</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Unit</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items && selectedSale.items.length ? (
                      selectedSale.items.map((item, index) => (
                        <tr key={`${item.name}-${index}`} className="border-b">
                          <td className="px-3 py-2 text-gray-800">{item.name}</td>
                          <td className="px-3 py-2 text-center text-gray-700">{item.qty}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(item.price)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatCurrency(item.qty * item.price)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                          No items found for this invoice.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-semibold text-gray-500">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedSale.items?.length ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-transparent bg-linear-to-r from-[#002366] to-[#0b5ed7] p-4 text-white">
                    <p className="text-xs uppercase text-white/70">Grand Total</p>
                    <p className="text-3xl font-bold">{formatCurrency(selectedSale.total ?? 0)}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                <Button variant="outline" onClick={() => setSelectedSale(null)}>
                  Close
                </Button>
                <Button
                  className="bg-[#002366] text-white hover:bg-[#001a4d]"
                  onClick={() => navigate(`/sales/invoice/${selectedSale.id}`, { state: selectedSale })}
                >
                  <Printer className="mr-2 h-4 w-4" /> Print Invoice
                </Button>
                {selectedSale.status === "Completed" && (
                  <Button
                    className="bg-orange-600 text-white hover:bg-orange-700"
                    onClick={() => {
                      setSelectedSale(null)
                      navigate("/sales/return")
                    }}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Process Return
                  </Button>
                )}
                {!selectedSale.isReturn && selectedSale.saleId && (
                  <Button
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={() => handleDeleteSale(selectedSale)}
                    disabled={deletingId === selectedSale.saleId}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletingId === selectedSale.saleId ? "Deleting..." : "Delete Sale"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
