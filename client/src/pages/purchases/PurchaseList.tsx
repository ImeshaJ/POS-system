import { useState, useEffect, useMemo, type JSXElementConstructor, type Key, type ReactElement, type ReactNode, type ReactPortal } from "react"
import { useNavigate } from "react-router-dom"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, ListFilter, TrendingUp, Download, ShieldCheck, AlertTriangle, Layers, RefreshCw, ShoppingBag, ArrowUpRight, Search, Loader2, Trash2 } from "lucide-react"
import { apiDelete, apiGet, apiPatch } from "@/lib/api"
import { useToast } from "@/components/common/Toast"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"

/* ================= TYPES ================= */

interface ProductItem {
  id: number
  code: string
  name: string
  category: string
  status?: string
  quantity: number
  costPrice: number
  sellingPrice: number
  unit: string
  supplier?: string
  size?: string
  expiryDate?: string
}

const LOW_STOCK_THRESHOLD = 10
const QUICK_RESTOCK_INCREMENT = 5

const PurchaseList = () => {
  const toast = useToast()
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchaseSummary, setPurchaseSummary] = useState<any>(null)
  const [restockingId, setRestockingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await apiGet("/api/products?limit=200")
      setProducts((response.data as ProductItem[]) || [])
      setPurchaseSummary(response.summary || null)
      setLastSynced(new Date())
    } catch (err) {
      setError("Failed to load inventory data")
    } finally {
      setLoading(false)
    }
  }

  const categories = [...new Set(products.map((p) => p.category))]
  const totalProducts = products.length

  const filtered = products.filter((product) => {
    const matchesSearch =
      !searchTerm ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    const matchesCategory = !filterCategory || product.category === filterCategory
    const matchesStatus = !filterStatus || product.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const totalQuantity = filtered.reduce((sum, p) => sum + p.quantity, 0)
  const totalCostValue = filtered.reduce((sum, p) => sum + p.costPrice * p.quantity, 0)
  const totalSaleValue = filtered.reduce((sum, p) => sum + p.sellingPrice * p.quantity, 0)
  const profitMargin = totalCostValue > 0 ? (((totalSaleValue - totalCostValue) / totalCostValue) * 100) : 0
  const healthyCount = filtered.filter((p) => p.status === "In Stock").length
  const lowStockCount = filtered.filter((p) => p.status === "Low Stock").length
  const expiredCount = filtered.filter((p) => p.status === "Expired").length
  const returnedCount = filtered.filter((p) => p.status === "Returned").length

  const lowStockItems = useMemo(
    () => products.filter((p) => (p.status === "Low Stock" || p.quantity <= LOW_STOCK_THRESHOLD)),
    [products]
  )
  const lowStockSuppliersCount = useMemo(
    () => new Set(lowStockItems.map((item) => item.supplier).filter(Boolean)).size,
    [lowStockItems]
  )
  const lowStockUnitsGap = useMemo(
    () =>
      lowStockItems.reduce((sum, product) => {
        const deficit = Math.max(0, LOW_STOCK_THRESHOLD - product.quantity)
        return sum + deficit
      }, 0),
    [lowStockItems]
  )

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((product) => {
      const key = product.category || "Uncategorized"
      map.set(key, (map.get(key) || 0) + product.quantity)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
  }, [filtered])

  const formatCurrency = (value: number | undefined | null) => {
    if (typeof value !== 'number' || isNaN(value)) return 'Rs. 0';
    return `Rs. ${value.toLocaleString()}`;
  }

  const getStatusClass = (status?: string) => {
    switch (status) {
      case "In Stock":
        return "brand-pill-success"
      case "Low Stock":
        return "brand-pill-warning"
      case "Expired":
        return "brand-pill-danger"
      case "Returned":
        return "brand-pill-secondary"
      default:
        return "brand-pill-default"
    }
  }

  const handleUpdateQuantity = async (id: number, quantity: number) => {
    try {
      await apiPatch(`/api/products/${id}`, { quantity })
      setProducts(products.map((p) => (p.id === id ? { ...p, quantity } : p)))
    } catch (err) {
      setError("Failed to update quantity")
    }
  }

  const handleDeleteClick = (id: number) => {
    setDeleteProductId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteProductId) return
    try {
      setDeletingId(deleteProductId)
      await apiDelete(`/api/products/${deleteProductId}`)
      setProducts(products.filter((p) => p.id !== deleteProductId))
      toast.success("Product deleted successfully")
    } catch (err) {
      toast.error("Failed to delete product")
    } finally {
      setDeletingId(null)
      setDeleteProductId(null)
    }
  }

  const statusOptions: ProductItem["status"][] = ["In Stock", "Low Stock", "Expired", "Returned"]
  const heroMetrics = purchaseSummary?.metrics
  const heroTopSuppliers = purchaseSummary?.top_suppliers || []

  const clearFilters = () => {
    setSearchTerm("")
    setFilterCategory("")
    setFilterStatus("")
  }

  const handleQuickRestock = async (product: ProductItem) => {
    setRestockingId(product.id)
    const shortfall = Math.max(0, LOW_STOCK_THRESHOLD - product.quantity)
    const increment = Math.max(shortfall, QUICK_RESTOCK_INCREMENT)
    const nextQuantity = product.quantity + increment
    try {
      await handleUpdateQuantity(product.id, nextQuantity)
    } finally {
      setRestockingId(null)
    }
  }

  const handlePlanReorder = (product?: ProductItem) => {
    const query = product
      ? `?productId=${product.id}&productName=${encodeURIComponent(product.name)}`
      : ""
    navigate(`/purchases/new${query}`)
  }

  return (
    <>
      <PageTitle title="Product Stock Inventory" />

      {loading && <div className="mt-4 text-sm text-muted-foreground">Loading inventory...</div>}
      {error && <div className="mt-4 text-sm text-destructive">{error}</div>}

      <div className="space-y-6 pb-10">
        <Card className="brand-card brand-card-hover overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#22d3ee] p-6 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">Inventory Control Center</p>
                  <h2 className="text-3xl font-bold">Product Stock Inventory</h2>
                  <p className="text-sm text-white/80">Monitor warehouse value, supplier exposure, and selling capacity in one glance.</p>
                </div>
                <div className="rounded-3xl bg-white/20 p-3">
                  <Package className="h-10 w-10 text-white" />
                </div>
              </div>

              {heroTopSuppliers.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {heroTopSuppliers.map((supplier: { id: Key | null | undefined; name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; total_spent: number }) => (
                    <span
                      key={supplier.id}
                      className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white"
                    >
                      {supplier.name} · {formatCurrency(supplier.total_spent)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#0f172a] to-[#2563eb] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Inventory Worth</p>
                <p className="mt-2 text-3xl font-bold">{formatCurrency(heroMetrics?.total_spent ?? totalCostValue)}</p>
                <p className="text-xs text-white/80">Lifetime procurement cost</p>
              </div>
              <Package className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#00b09b] to-[#22d3ee] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Potential Revenue</p>
                <p className="mt-2 text-3xl font-bold">{formatCurrency(totalSaleValue)}</p>
                <p className="text-xs text-white/80">Based on selling price</p>
              </div>
              <TrendingUp className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#f97316] to-[#fb923c] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Pending Bills</p>
                <p className="mt-2 text-3xl font-bold">{formatCurrency(heroMetrics?.pending_total ?? 0)}</p>
                <p className="text-xs text-white/80">Awaiting vendor payment</p>
              </div>
              <RefreshCw className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#9333ea] to-[#ae7aff] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Outstanding Dues</p>
                <p className="mt-2 text-3xl font-bold">{formatCurrency(purchaseSummary?.outstanding_due ?? 0)}</p>
                <p className="text-xs text-white/80">Supplier credit balance</p>
              </div>
              <ShoppingBag className="h-10 w-10 text-white/70" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card className="brand-card brand-card-hover">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                    <ListFilter className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Search & Filter</p>
                    <h3 className="text-xl font-bold text-foreground">Inventory lookup console</h3>
                    <p className="text-sm text-muted-foreground">
                      Dive into stock by code, supplier, or status before deciding next purchase moves.
                    </p>
                  </div>
                </div>
                <div className="brand-soft-panel rounded-2xl px-4 py-3 text-right">
                  <p className="text-xs font-semibold text-gray-500">Matching records</p>
                  <p className="text-2xl font-bold text-primary">{filtered.length}</p>
                  <p className="text-xs text-gray-500">of {totalProducts}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label className="font-semibold text-foreground">Search product</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Code, supplier, or name"
                      className="h-12 rounded-2xl bg-background/70 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Category</Label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Status</Label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Status</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status || ""}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {statusOptions.map((status) => (
                  <button
                    type="button"
                    key={status}
                    onClick={() =>
                      setFilterStatus((prev) => (prev === status ? "" : status || ""))
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      filterStatus === status
                        ? "border-[#4338ca] bg-[#4338ca] text-white"
                        : "border-border text-muted-foreground hover:border-[#4338ca]/50"
                    }`}
                  >
                    {status}
                  </button>
                ))}
                <span className="ml-auto text-sm text-muted-foreground">
                  Showing <strong>{filtered.length}</strong> products
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>
                  {filterCategory || filterStatus || searchTerm
                    ? "Filters active — refine inventory focus"
                    : "Viewing full catalog"}
                </span>
                <Button variant="ghost" size="sm" className="text-primary" onClick={clearFilters}>
                  Reset Filters
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="brand-soft-panel rounded-xl border border-border p-4">
                  <p className="brand-muted mb-1">Total Items</p>
                  <p className="text-3xl font-bold text-primary">{totalQuantity}</p>
                </div>
                <div className="rounded-xl border border-transparent p-4 text-white shadow-md brand-gradient-primary">
                  <p className="text-sm font-semibold text-white/80 mb-1">Inventory Worth</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalCostValue)}</p>
                </div>
                <div className="rounded-xl border border-transparent p-4 text-white shadow-md brand-gradient-success">
                  <p className="text-sm font-semibold text-white/80 mb-1">Potential Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalSaleValue)}</p>
                </div>
                <div className="rounded-xl border border-transparent p-4 text-white shadow-md brand-gradient-warning">
                  <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-white/80">
                    <TrendingUp className="h-4 w-4" /> Profit Margin
                  </p>
                  <p className="text-2xl font-bold">{profitMargin.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="brand-card brand-card-hover">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Inventory Health</p>
                  <h3 className="text-lg font-bold text-foreground">Status distribution</h3>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Healthy Stock</p>
                  <p className="text-2xl font-bold text-emerald-600">{healthyCount}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 text-amber-600" /> Low Stock
                  </p>
                  <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Expired</p>
                  <p className="text-2xl font-bold text-rose-600">{expiredCount}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Returned</p>
                  <p className="text-2xl font-bold text-slate-600">{returnedCount}</p>
                </div>
              </div>

              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Layers className="h-4 w-4" /> Category Mix
                </p>
                <div className="mt-3 space-y-2">
                  {categoryBreakdown.map(([category, qty]) => (
                    <div key={category} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                          <span>{category}</span>
                          <span>{qty} units</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-linear-to-r from-[#22d3ee] to-[#1d4ed8]"
                            style={{ width: `${Math.min(100, (qty / (totalQuantity || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {categoryBreakdown.length === 0 && (
                    <p className="text-sm text-muted-foreground">No category data in current view.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-amber-500/10 p-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Low Stock Management</p>
                  <h3 className="text-xl font-bold text-foreground">Stabilize supply chain</h3>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => handlePlanReorder()}>
                <ShoppingBag className="h-4 w-4" /> New Purchase
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs font-semibold text-muted-foreground">Flagged SKUs</p>
                <p className="text-3xl font-bold text-foreground">{lowStockItems.length}</p>
                <p className="text-xs text-muted-foreground">Threshold: {LOW_STOCK_THRESHOLD} units</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs font-semibold text-muted-foreground">Units Needed</p>
                <p className="text-3xl font-bold text-primary">{lowStockUnitsGap}</p>
                <p className="text-xs text-muted-foreground">To reach safety stock</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs font-semibold text-muted-foreground">Suppliers Impacted</p>
                <p className="text-3xl font-bold text-foreground">{lowStockSuppliersCount}</p>
                <p className="text-xs text-muted-foreground">Prioritize vendor calls</p>
              </div>
            </div>

            {lowStockItems.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Product</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Supplier</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Qty</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Gap</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.slice(0, 6).map((product) => {
                      const gap = Math.max(0, LOW_STOCK_THRESHOLD - product.quantity)
                      return (
                        <tr key={product.id} className="border-b border-border/70">
                          <td className="px-4 py-3 font-semibold text-foreground">
                            <div>{product.name}</div>
                            <p className="text-xs text-muted-foreground">{product.code}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{product.supplier || "-"}</td>
                          <td className="px-4 py-3 text-center font-semibold text-foreground">{product.quantity}</td>
                          <td className="px-4 py-3 text-center text-rose-600">{gap}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-2"
                                disabled={restockingId === product.id}
                                onClick={() => handleQuickRestock(product)}
                              >
                                <RefreshCw className={`h-4 w-4 ${restockingId === product.id ? "animate-spin" : ""}`} />
                                Restock
                              </Button>
                              <Button size="sm" className="gap-2" onClick={() => handlePlanReorder(product)}>
                                <ArrowUpRight className="h-4 w-4" /> Plan PO
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/30 p-6 text-center">
                <p className="text-lg font-semibold text-emerald-700">No low stock alerts</p>
                <p className="text-sm text-emerald-600">All SKUs meet the safety threshold right now.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
              <div>
                <h2 className="brand-section-title">All Purchased Products</h2>
                <p className="text-sm text-muted-foreground">Monitor every SKU’s cost basis, sale value, and expiry from one grid.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full bg-muted/60 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {lastSynced ? `Synced ${lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Sync pending"}
                </div>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Code</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Supplier</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Unit</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Cost</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Sell</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Stock Value</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Expiry</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product, idx) => (
                    <tr
                      key={product.id}
                      className={`border-b border-border/70 ${idx % 2 === 0 ? "bg-card" : "bg-card/80"} transition hover:bg-secondary/30`}
                    >
                      <td className="px-4 py-3 font-bold text-primary">{product.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{product.name}</div>
                        {product.size && <div className="text-xs text-muted-foreground">{product.size}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{product.supplier || "-"}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{product.unit}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={product.quantity}
                          onChange={(e) => handleUpdateQuantity(product.id, Math.max(0, Number(e.target.value)))}
                          className="h-8 w-16 rounded border border-border bg-transparent px-2 text-center font-semibold"
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">{formatCurrency(product.costPrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">{formatCurrency(product.sellingPrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">
                        {formatCurrency(product.costPrice * product.quantity)}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{product.expiryDate}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`brand-pill ${getStatusClass(product.status)}`}>
                          {product.status || "In Stock"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-2"
                          disabled={deletingId === product.id}
                          onClick={() => handleDeleteClick(product.id)}
                        >
                          {deletingId === product.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Removing...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-muted-foreground">
                        <div className="text-lg font-medium">No products match the current filters</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteProductId !== null}
        onOpenChange={(open) => !open && setDeleteProductId(null)}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        variant="danger"
      />
    </>
  )
}

export default PurchaseList
