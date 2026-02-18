import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, AlertTriangle, Clock, TrendingUp, ShoppingBag, ListFilter, RefreshCw, Search, Trash2, ArrowUpRight } from "lucide-react"
import { apiGet, apiPatch } from "@/lib/api"
import { useToast } from "@/components/common/Toast"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"

type ApiProduct = {
  id: number
  code?: string
  name: string
  category?: string
  expiry_date?: string
  quantity?: number
  status?: string
}

interface Product {
  id: string
  name: string
  code: string
  category: string
  expiryDate: string
  stock: number
  daysLeft: number
  status: "Expired" | "Critical" | "Warning" | "Good"
}

export default function ExpiryAlerts() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("All")
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  const [products, setProducts] = useState<Product[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [disposeDialogOpen, setDisposeDialogOpen] = useState(false)
  const [productToDispose, setProductToDispose] = useState<Product | null>(null)
  const toast = useToast()

  const statusFilters = ["Expired", "Critical", "Warning", "Good"]

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === "All" || product.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [products, searchTerm, filterStatus])

  const expiredCount = products.filter((p) => p.status === "Expired").length
  const criticalCount = products.filter((p) => p.status === "Critical").length
  const warningCount = products.filter((p) => p.status === "Warning").length
  const goodCount = products.filter((p) => p.status === "Good").length
  const totalTracked = products.length
  const noTrackedProducts = totalTracked === 0
  const noFilteredProducts = filteredProducts.length === 0
  const stockAtRisk = products
    .filter((p) => p.status === "Expired" || p.status === "Critical")
    .reduce((sum, p) => sum + p.stock, 0)
  const soonestExpiry = products.length > 0 ? products.reduce((min, p) => (p.daysLeft < min.daysLeft ? p : min)) : null
  const expiredPercentage = totalTracked > 0 ? (expiredCount / totalTracked) * 100 : 0

  const calculateDaysLeft = (expiryDate: string | null | undefined): number => {
    if (!expiryDate) return 999
    const expiry = new Date(expiryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expiry.setHours(0, 0, 0, 0)
    const diffTime = expiry.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const determineStatus = (expiryDate: string | null | undefined, quantity: number | undefined): Product["status"] => {
    if (!expiryDate || !quantity || quantity <= 0) return "Good"
    const daysLeft = calculateDaysLeft(expiryDate)
    if (daysLeft < 0) return "Expired"
    if (daysLeft <= 7) return "Critical"
    if (daysLeft <= 30) return "Warning"
    return "Good"
  }

  const loadInventory = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<ApiProduct[]>("/api/products?limit=1000")
      const apiProducts = res.data || []

      // Filter products that have expiry dates
      const productsWithExpiry = apiProducts
        .filter(p => p.expiry_date && p.quantity && p.quantity > 0)
        .map(p => {
          const daysLeft = calculateDaysLeft(p.expiry_date)
          return {
            id: String(p.id),
            name: p.name,
            code: p.code || "",
            category: p.category || "Uncategorized",
            expiryDate: p.expiry_date || "",
            stock: Number(p.quantity || 0),
            daysLeft,
            status: determineStatus(p.expiry_date, p.quantity)
          }
        })
        .sort((a, b) => a.daysLeft - b.daysLeft)

      setProducts(productsWithExpiry)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory")
    } finally {
      setLoading(false)
    }
  }

  const handleSell = () => {
    navigate("/sales/new")
  }

  const handleRestock = () => {
    navigate("/purchases/new")
  }

  const openDisposeDialog = (product: Product) => {
    setProductToDispose(product)
    setDisposeDialogOpen(true)
  }

  const handleDispose = async () => {
    if (!productToDispose) return
    setDisposeDialogOpen(false)
    try {
      await apiPatch(`/api/products/${productToDispose.id}`, {
        status: "Disposed",
        quantity: 0
      })
      toast.success(`${productToDispose.name} marked as disposed`)
      loadInventory()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dispose product")
    } finally {
      setProductToDispose(null)
    }
  }

  const formatDateLabel = (date: string) => {
    return new Date(date).toLocaleDateString()
  }

  const formatUnits = (units: number) => {
    return new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(Math.max(0, units))
  }

  const describeDaysLeft = (days: number) => {
    if (days < 0) return "Expired"
    if (days === 0) return "Today"
    if (days === 1) return "Tomorrow"
    return `${days} days`
  }

  const getStatusStyles = (status: string) => {
    const styles: Record<string, any> = {
      Expired: { border: "border-red-500", badge: "bg-red-100 text-red-700", text: "text-red-600", icon: <AlertTriangle className="h-6 w-6 text-red-500" /> },
      Critical: { border: "border-orange-500", badge: "bg-orange-100 text-orange-700", text: "text-orange-600", icon: <Clock className="h-6 w-6 text-orange-500" /> },
      Warning: { border: "border-yellow-500", badge: "bg-yellow-100 text-yellow-700", text: "text-yellow-600", icon: <TrendingUp className="h-6 w-6 text-yellow-500" /> },
      Good: { border: "border-green-500", badge: "bg-green-100 text-green-700", text: "text-green-600", icon: <ShoppingBag className="h-6 w-6 text-green-500" /> },
    }
    return styles[status] || styles.Good
  }

  useEffect(() => {
    loadInventory()
  }, [])

  return (
    <>
      <PageTitle title="Expiry Alerts" subtitle="Stay ahead of perishable and regulated items" />

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-6 pb-10">
        <Card className="brand-card brand-card-hover overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-linear-to-r from-[#0f172a] via-[#4338ca] to-[#22d3ee] p-6 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/70">Expiry Risk Command</p>
                  <h2 className="text-3xl font-bold">Monitor perishables & release stuck stock</h2>
                  <p className="text-sm text-white/80">Track nearing expiries, redeploy to sales, or plan disposals before compliance flags.</p>
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
          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#ef4444] to-[#f97316] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Expired</p>
                <p className="mt-2 text-3xl font-bold">{expiredCount}</p>
                <p className="text-xs text-white/80">{expiredPercentage.toFixed(0)}% of tracked</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#fb923c] to-[#facc15] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Critical (&lt;= 7d)</p>
                <p className="mt-2 text-3xl font-bold">{criticalCount}</p>
                <p className="text-xs text-white/80">Escalate promos now</p>
              </div>
              <Clock className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#fde047] to-[#22d3ee] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Warning (&lt;= 30d)</p>
                <p className="mt-2 text-3xl font-bold">{warningCount}</p>
                <p className="text-xs text-white/80">Prep campaigns</p>
              </div>
              <TrendingUp className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#0f172a] to-[#10b981] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Healthy</p>
                <p className="mt-2 text-3xl font-bold">{goodCount}</p>
                <p className="text-xs text-white/80">Long-term coverage</p>
              </div>
              <ShoppingBag className="h-10 w-10 text-white/70" />
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
                    <h3 className="text-xl font-bold text-foreground">Control expiry watchlists</h3>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={loadInventory} disabled={loading} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <Label className="font-semibold text-foreground">Search products</Label>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Name, code, or category"
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
                    onClick={() => setFilterStatus((prev) => (prev === status ? "All" : status))}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      filterStatus === status
                        ? "border-[#4338ca] bg-[#4338ca] text-white"
                        : "border-border text-muted-foreground hover:border-[#4338ca]/60"
                    }`}
                  >
                    {status}
                  </button>
                ))}
                <span className="ml-auto text-sm text-muted-foreground">
                  Showing <strong>{filteredProducts.length}</strong> of {totalTracked || 0} tracked items
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
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Remediation Plan</p>
                  <h3 className="text-lg font-bold text-foreground">Stock at risk today</h3>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Units to action</p>
                  <p className="text-3xl font-bold text-foreground">{formatUnits(stockAtRisk)}</p>
                  <p className="text-xs text-muted-foreground">Expired + critical inventory</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Tracked SKUs</p>
                  <p className="text-3xl font-bold text-foreground">{formatUnits(totalTracked)}</p>
                  <p className="text-xs text-muted-foreground">With expiry controls</p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm">
                {soonestExpiry ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Next to act</p>
                    <p className="text-lg font-semibold text-foreground">{soonestExpiry.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateLabel(soonestExpiry.expiryDate)} · {describeDaysLeft(soonestExpiry.daysLeft)} · {formatUnits(soonestExpiry.stock)} units
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No expiry-bound products available.</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="gap-2" onClick={handleSell}>
                  <ShoppingBag className="h-4 w-4" /> Move to Sale
                </Button>
                <Button size="sm" variant="outline" className="gap-2" onClick={handleRestock}>
                  <ArrowUpRight className="h-4 w-4" /> Create Purchase
                </Button>
                <Button size="sm" variant="secondary" className="gap-2" onClick={() => loadInventory()}>
                  <RefreshCw className="h-4 w-4" /> Recalculate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="brand-card brand-card-hover">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">Loading expiry data...</CardContent>
          </Card>
        ) : noTrackedProducts ? (
          <Card className="brand-card brand-card-hover border border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-10 text-center text-emerald-700">
              <p className="text-lg font-semibold">No products with expiry dates found.</p>
              <p className="text-sm mt-2">Capture expiry info while adding products to start monitoring.</p>
            </CardContent>
          </Card>
        ) : viewMode === "cards" ? (
          <div className="space-y-4">
            {noFilteredProducts ? (
              <Card className="brand-card brand-card-hover">
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  No products match the current filters.
                </CardContent>
              </Card>
            ) : (
              filteredProducts.map((product) => {
                const styles = getStatusStyles(product.status)
                return (
                  <Card key={product.id} className={`brand-card brand-card-hover border-l-4 ${styles.border}`}>
                    <CardContent className="flex flex-col gap-4 p-6 md:flex-row">
                      <div className="rounded-2xl bg-background/60 p-3 shadow-inner">{styles.icon}</div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-foreground">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Code: {product.code} · Category: {product.category}
                            </p>
                            <p className="text-xs text-muted-foreground">Expiry: {formatDateLabel(product.expiryDate)}</p>
                          </div>
                          <span className={`brand-pill ${styles.badge}`}>{product.status}</span>
                        </div>

                        <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-muted/40 p-4 md:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Days Left</p>
                            <p className={`text-lg font-bold ${styles.text}`}>{describeDaysLeft(product.daysLeft)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Current Stock</p>
                            <p className="text-lg font-semibold text-foreground">{formatUnits(product.stock)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Recommendation</p>
                            <p className="text-sm text-muted-foreground">
                              {product.status === "Expired"
                                ? "Remove from shelves"
                                : product.status === "Critical"
                                ? "Run discount or bundle"
                                : product.status === "Warning"
                                ? "Plan offer"
                                : "Monitor"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {product.status === "Expired" ? (
                            <Button size="sm" variant="destructive" className="gap-2" onClick={() => openDisposeDialog(product)}>
                              <Trash2 className="h-4 w-4" /> Dispose Stock
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="gap-2" onClick={handleSell}>
                              <ShoppingBag className="h-4 w-4" /> Move to Sale
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="gap-2" onClick={loadInventory}>
                            <RefreshCw className="h-4 w-4" /> Refresh Status
                          </Button>
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
              {noFilteredProducts ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No products match the current filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Code</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Product</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Category</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Expiry</th>
                        <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Days Left</th>
                        <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Stock</th>
                        <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product, index) => {
                        const styles = getStatusStyles(product.status)
                        return (
                          <tr
                            key={product.id}
                            className={`border-b border-border/70 ${index % 2 === 0 ? "bg-card" : "bg-card/80"}`}
                          >
                            <td className="px-4 py-3 font-mono text-primary">{product.code}</td>
                            <td className="px-4 py-3 font-semibold text-foreground">{product.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDateLabel(product.expiryDate)}</td>
                            <td className={`px-4 py-3 text-center font-semibold ${styles.text}`}>
                              {describeDaysLeft(product.daysLeft)}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-foreground">{formatUnits(product.stock)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`brand-pill ${styles.badge}`}>{product.status}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {product.status === "Expired" ? (
                                <Button size="sm" variant="destructive" className="gap-2" onClick={() => openDisposeDialog(product)}>
                                  <Trash2 className="h-4 w-4" /> Dispose
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="gap-2" onClick={handleSell}>
                                  <ShoppingBag className="h-4 w-4" /> Move to Sale
                                </Button>
                              )}
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

      <ConfirmDialog
        open={disposeDialogOpen}
        onOpenChange={setDisposeDialogOpen}
        title="Dispose Product"
        description={`Are you sure you want to dispose "${productToDispose?.name}"? This will set the stock to 0 and mark it as disposed.`}
        confirmText="Dispose"
        variant="destructive"
        onConfirm={handleDispose}
      />
    </>
  )
}
