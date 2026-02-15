import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, ArrowUpRight, Boxes, ListFilter, Layers, Package, RefreshCw, Search, ShoppingBag, TrendingUp } from "lucide-react"
import { apiGet } from "@/lib/api"
import type { ApiProduct } from "@/types/product"

type LowStockStatus = "Critical" | "Low"

type LowStockProduct = {
  id: number
  code: string
  name: string
  category: string
  unit: string
  quantity: number
  reorderLevel: number
  shortage: number
  status: LowStockStatus
  usesDefaultThreshold: boolean
}

const DEFAULT_REORDER_ALERT = 5
const CRITICAL_RATIO = 0.35
const statusFilters: LowStockStatus[] = ["Critical", "Low"]

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(value)))

const formatCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`

const toLowStockProducts = (products: ApiProduct[]): LowStockProduct[] => {
  return products
    .map((product) => {
      const quantity = Number(product.quantity ?? 0)
      const configuredLevel = Number(product.reorder_level ?? 0)
      const threshold = configuredLevel > 0 ? configuredLevel : DEFAULT_REORDER_ALERT
      if (quantity > threshold) return null

      const denominator = configuredLevel > 0 ? configuredLevel : DEFAULT_REORDER_ALERT
      const ratio = denominator > 0 ? quantity / denominator : 0
      const status: LowStockStatus = quantity <= 0 || ratio <= CRITICAL_RATIO ? "Critical" : "Low"

      return {
        id: product.id,
        code: product.code || `PRD-${product.id.toString().padStart(4, "0")}`,
        name: product.name,
        category: product.category || "Uncategorized",
        unit: product.unit || "-",
        quantity,
        reorderLevel: threshold,
        shortage: Math.max(0, threshold - quantity),
        status,
        usesDefaultThreshold: configuredLevel <= 0,
      }
    })
    .filter((product): product is LowStockProduct => Boolean(product))
    .sort((a, b) => a.quantity - b.quantity)
}

const getStatusClasses = (status: LowStockStatus) =>
  status === "Critical"
    ? {
        border: "border-red-600 bg-red-50",
        badge: "bg-red-100 text-red-700",
        icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      }
    : {
        border: "border-amber-500 bg-amber-50",
        badge: "bg-amber-100 text-amber-800",
        icon: <TrendingUp className="h-6 w-6 text-amber-600" />,
      }

export default function LowStock() {
  const navigate = useNavigate()
  const [inventory, setInventory] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<"All" | LowStockStatus>("All")
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  const [searchTerm, setSearchTerm] = useState("")
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet<ApiProduct[]>("/api/products?limit=1000")
      setInventory(response.data)
      setLastUpdated(new Date().toISOString())
    } catch (err) {
      console.error("Failed to load products", err)
      setError(err instanceof Error ? err.message : "Failed to load inventory")
    } finally {
      setLoading(false)
    }
  }

  const lowStockProducts = useMemo(() => toLowStockProducts(inventory), [inventory])

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return lowStockProducts.filter((product) => {
      const statusMatch = filterStatus === "All" || product.status === filterStatus
      const searchMatch = !term
        ? true
        : [product.name, product.code, product.category, product.unit]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(term))
      return statusMatch && searchMatch
    })
  }, [lowStockProducts, filterStatus, searchTerm])

  const criticalCount = lowStockProducts.filter((item) => item.status === "Critical").length
  const lowCount = lowStockProducts.filter((item) => item.status === "Low").length
  const totalCount = lowStockProducts.length
  const totalShortage = useMemo(
    () => lowStockProducts.reduce((sum, product) => sum + product.shortage, 0),
    [lowStockProducts]
  )
  const defaultThresholdCount = useMemo(
    () => lowStockProducts.filter((product) => product.usesDefaultThreshold).length,
    [lowStockProducts]
  )
  const categoryPressure = useMemo(() => {
    const map = new Map<string, { shortage: number; count: number }>()
    lowStockProducts.forEach((product) => {
      const existing = map.get(product.category) ?? { shortage: 0, count: 0 }
      map.set(product.category, {
        shortage: existing.shortage + product.shortage,
        count: existing.count + 1,
      })
    })
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.shortage - a.shortage)
      .slice(0, 4)
  }, [lowStockProducts])
  const criticalPercentage = totalCount > 0 ? (criticalCount / totalCount) * 100 : 0
  const catalogCount = inventory.length
  const inventoryValue = useMemo(
    () =>
      inventory.reduce(
        (sum, product) => sum + Number(product.cost_price ?? 0) * Number(product.quantity ?? 0),
        0
      ),
    [inventory]
  )
  const expiredInventoryCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    return inventory.filter((product) => product.expiry_date && product.expiry_date < today).length
  }, [inventory])

  const noAlerts = !loading && lowStockProducts.length === 0
  const noFilteredAlerts = !loading && !noAlerts && filteredProducts.length === 0

  const handleRestock = (product?: LowStockProduct) => {
    const query = product
      ? `?productId=${product.id}&productName=${encodeURIComponent(product.name)}`
      : ""
    navigate(`/purchases/new${query}`)
  }

  return (
    <>
      <PageTitle title="Low Stock Management" subtitle="Command center for proactive replenishment" />

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-6 pb-10">
        <Card className="brand-card brand-card-hover overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#22d3ee] p-6 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/70">Low Stock Command Center</p>
                  <h2 className="text-3xl font-bold">Monitor depletion and plan replenishment</h2>
                  <p className="text-sm text-white/80">Identify critical gaps, align suppliers, and initiate purchase plans from a single pane.</p>
                </div>
                <div className="rounded-3xl bg-white/15 p-3">
                  <Package className="h-10 w-10 text-white" />
                </div>
              </div>

              {lastUpdated && (
                <p className="mt-4 text-xs text-white/70">Last synced {new Date(lastUpdated).toLocaleString()}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#dc2626] to-[#f97316] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Critical Alerts</p>
                <p className="mt-2 text-3xl font-bold">{formatNumber(criticalCount)}</p>
                <p className="text-xs text-white/80">{criticalPercentage.toFixed(0)}% of total alerts</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#fbbf24] to-[#f97316] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Low Stock Alerts</p>
                <p className="mt-2 text-3xl font-bold">{formatNumber(lowCount)}</p>
                <p className="text-xs text-white/80">Monitor upcoming dips</p>
              </div>
              <TrendingUp className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#0f172a] to-[#1d4ed8] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Total Alerts</p>
                <p className="mt-2 text-3xl font-bold">{formatNumber(totalCount)}</p>
                <p className="text-xs text-white/80">Across all categories</p>
              </div>
              <Package className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#0ea5e9] to-[#22d3ee] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Units Short</p>
                <p className="mt-2 text-3xl font-bold">{formatNumber(totalShortage)}</p>
                <p className="text-xs text-white/80">Needed to reach safety</p>
              </div>
              <ShoppingBag className="h-10 w-10 text-white/70" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#6a11cb] to-[#2575fc] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Catalog SKUs</p>
                <p className="mt-2 text-3xl font-bold">{formatNumber(catalogCount)}</p>
                <p className="text-xs text-white/80">Active listings in stock</p>
              </div>
              <Boxes className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#00b09b] to-[#22d3ee] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Inventory Value</p>
                <p className="mt-2 text-3xl font-bold">{formatCurrency(inventoryValue)}</p>
                <p className="text-xs text-white/80">Based on cost price</p>
              </div>
              <TrendingUp className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#ff512f] to-[#f97316] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Low Stock Items</p>
                <p className="mt-2 text-3xl font-bold">{formatNumber(totalCount)}</p>
                <p className="text-xs text-white/80">Needs replenishment</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#0f172a] to-[#94a3b8] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Expired Items</p>
                <p className="mt-2 text-3xl font-bold">{formatNumber(expiredInventoryCount)}</p>
                <p className="text-xs text-white/80">Requires disposal</p>
              </div>
              <Package className="h-10 w-10 text-white/70" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card className="brand-card brand-card-hover">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                    <ListFilter className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Search & Filter</p>
                    <h3 className="text-xl font-bold text-foreground">Curate alert views</h3>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={loadInventory} disabled={loading} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Label className="font-semibold text-foreground">Search inventory</Label>
                  <div className="mt-2 relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Product, code, category..."
                      className="h-12 bg-background/70 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">Status</Label>
                  <select
                    value={filterStatus}
                    onChange={(event) => setFilterStatus(event.target.value as typeof filterStatus)}
                    className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="All">All Status</option>
                    {statusFilters.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-foreground">View Mode</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      variant={viewMode === "cards" ? "default" : "outline"}
                      onClick={() => setViewMode("cards")}
                    >
                      Cards
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      variant={viewMode === "table" ? "default" : "outline"}
                      onClick={() => setViewMode("table")}
                    >
                      Table
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {statusFilters.map((status) => (
                  <button
                    type="button"
                    key={status}
                    onClick={() =>
                      setFilterStatus((prev) => (prev === status ? "All" : status))
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      filterStatus === status
                        ? "border-[#1d4ed8] bg-[#1d4ed8] text-white"
                        : "border-border text-muted-foreground hover:border-[#1d4ed8]/60"
                    }`}
                  >
                    {status}
                  </button>
                ))}
                <span className="ml-auto text-sm text-muted-foreground">
                  Showing <strong>{filteredProducts.length}</strong> of {totalCount} alerts
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="brand-card brand-card-hover">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-rose-500/10 p-2 text-rose-500">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Replenishment Pressure</p>
                  <h3 className="text-lg font-bold text-foreground">Focus areas today</h3>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Units short</p>
                  <p className="text-3xl font-bold text-foreground">{formatNumber(totalShortage)}</p>
                  <p className="text-xs text-muted-foreground">Across all flagged SKUs</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Default threshold items</p>
                  <p className="text-3xl font-bold text-primary">{defaultThresholdCount}</p>
                  <p className="text-xs text-muted-foreground">Need custom reorder rules</p>
                </div>
              </div>

              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Layers className="h-4 w-4" /> Category pressure
                </p>
                <div className="mt-3 space-y-3">
                  {categoryPressure.length === 0 && (
                    <p className="text-sm text-muted-foreground">No category alerts yet.</p>
                  )}
                  {categoryPressure.map((entry) => (
                    <div key={entry.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                        <span>{entry.category}</span>
                        <span>{formatNumber(entry.shortage)} units short</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-linear-to-r from-[#f97316] to-[#ef4444]"
                          style={{
                            width: `${Math.min(100, (entry.shortage / Math.max(1, totalShortage)) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{entry.count} products affected</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Tracking inventory health...
            </CardContent>
          </Card>
        ) : noAlerts ? (
          <Card className="brand-card brand-card-hover border border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-10 text-center text-emerald-600">
              <p className="text-lg font-semibold">All products are above their reorder levels. 🎉</p>
              <p className="mt-2 text-sm text-emerald-700">Keep logging purchases to maintain this cushion.</p>
            </CardContent>
          </Card>
        ) : viewMode === "cards" ? (
          <div className="space-y-4">
            {noFilteredAlerts ? (
              <Card>
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  No products match the current filters.
                </CardContent>
              </Card>
            ) : (
              filteredProducts.map((product) => {
                const styles = getStatusClasses(product.status)
                return (
                  <Card key={product.id} className={`brand-card brand-card-hover border-l-4 ${styles.border}`}>
                    <CardContent className="p-6">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="rounded-2xl bg-background/60 p-3 shadow-inner">{styles.icon}</div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-foreground">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Code: {product.code} · Category: {product.category} · Unit: {product.unit}
                              </p>
                            </div>
                            <span className={`brand-pill ${styles.badge}`}>{product.status}</span>
                          </div>

                          <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-muted/40 p-4 md:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Current Stock</p>
                              <p className="text-2xl font-bold text-destructive">{formatNumber(product.quantity)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Reorder Level</p>
                              <p className="text-2xl font-semibold text-foreground">{formatNumber(product.reorderLevel)}</p>
                              {product.usesDefaultThreshold && (
                                <p className="text-[11px] text-amber-600">Default threshold applied</p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Shortage</p>
                              <p className="text-2xl font-bold text-amber-600">{formatNumber(product.shortage)}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button size="sm" className="gap-2" onClick={() => handleRestock(product)}>
                              <ShoppingBag className="h-4 w-4" /> Create Purchase
                            </Button>
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate("/purchases/add")}>
                              <ArrowUpRight className="h-4 w-4" /> Add Product Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        ) : (
          <Card className="brand-card brand-card-hover">
            <CardContent className="p-0">
              {noFilteredAlerts ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No products match the current filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">#</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Code</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Product</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Category</th>
                        <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Current</th>
                        <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Reorder</th>
                        <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Shortage</th>
                        <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product, index) => {
                        const styles = getStatusClasses(product.status)
                        return (
                          <tr
                            key={product.id}
                            className={`border-b border-border/70 ${index % 2 === 0 ? "bg-card" : "bg-card/80"}`}
                          >
                            <td className="px-4 py-3 font-medium text-foreground/80">{index + 1}</td>
                            <td className="px-4 py-3 font-mono text-primary">{product.code}</td>
                            <td className="px-4 py-3 font-semibold text-foreground">{product.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                            <td className="px-4 py-3 text-center font-bold text-destructive">{formatNumber(product.quantity)}</td>
                            <td className="px-4 py-3 text-center font-semibold text-foreground">{formatNumber(product.reorderLevel)}</td>
                            <td className="px-4 py-3 text-center font-semibold text-amber-600">{formatNumber(product.shortage)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`brand-pill ${styles.badge}`}>{product.status}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button size="sm" variant="outline" className="gap-2" onClick={() => handleRestock(product)}>
                                <ShoppingBag className="h-4 w-4" /> Purchase
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
