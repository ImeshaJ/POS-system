import { useState, useEffect } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, Filter, Package, Plus, Search, Sparkles, Tag, TrendingUp, Wallet } from "lucide-react"
import { useToast } from "@/components/common/Toast"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"

type Product = {
  id: string
  product: string
  category: string
  qty: number
  unitPrice: number
  revenue: number
  costPrice?: number
  profit?: number
  date: string
}

type ProductForm = {
  product: string
  category: string
  qty: number
  unitPrice: number
  costPrice: number
  date: string
}

const createDefaultProductForm = (): ProductForm => ({
  product: "",
  category: "Food",
  qty: 0,
  unitPrice: 0,
  costPrice: 0,
  date: new Date().toISOString().split("T")[0],
})

const initialProducts: Product[] = [
  {
    id: "PRD001",
    product: "Dog Food (10kg)",
    category: "Food",
    qty: 120,
    unitPrice: 3000,
    revenue: 360000,
    costPrice: 1800,
    profit: 144000,
    date: "2026-02-03",
  },
  {
    id: "PRD002",
    product: "Cat Vaccine",
    category: "Medicines",
    qty: 55,
    unitPrice: 3000,
    revenue: 165000,
    costPrice: 1500,
    profit: 82500,
    date: "2026-02-03",
  },
  {
    id: "PRD003",
    product: "Pet Shampoo",
    category: "Grooming",
    qty: 75,
    unitPrice: 1500,
    revenue: 112500,
    costPrice: 750,
    profit: 56250,
    date: "2026-02-03",
  },
  {
    id: "PRD004",
    product: "Deworming Tablet",
    category: "Medicines",
    qty: 140,
    unitPrice: 700,
    revenue: 98000,
    costPrice: 350,
    profit: 49000,
    date: "2026-02-03",
  },
]

export default function ProductRevenue() {
  const toast = useToast()
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem("product_revenue")
    if (saved) {
      try {
        return JSON.parse(saved) as Product[]
      } catch (e) {
        console.error("Failed to load products", e)
      }
    }
    return initialProducts
  })
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("All")
  const [sortBy, setSortBy] = useState("revenue")
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [form, setForm] = useState<ProductForm>(createDefaultProductForm())

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("product_revenue", JSON.stringify(products))
  }, [products])

  const categories = ["All", ...new Set(products.map((p) => p.category))]

  const filtered = products.filter((p) => {
    const matchesSearch = p.product.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search)
    const matchesCategory = filterCategory === "All" || p.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "revenue":
        return b.revenue - a.revenue
      case "profit":
        return (b.profit || 0) - (a.profit || 0)
      case "qty":
        return b.qty - a.qty
      case "name":
        return a.product.localeCompare(b.product)
      default:
        return 0
    }
  })

  function openAddModal() {
    setEditingProduct(null)
    setForm(createDefaultProductForm())
    setShowModal(true)
  }

  function openEditModal(product: Product) {
    setEditingProduct(product)
    setForm({
      product: product.product,
      category: product.category,
      qty: product.qty,
      unitPrice: product.unitPrice,
      costPrice: product.costPrice || 0,
      date: product.date,
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingProduct(null)
  }

  function saveProduct() {
    if (!form.product || form.qty <= 0 || form.unitPrice <= 0) {
      toast.warning("Please fill all required fields")
      return
    }

    const revenue = form.qty * form.unitPrice
    const profit = form.costPrice ? revenue - form.qty * form.costPrice : 0

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...form,
                id: editingProduct.id,
                revenue,
                profit,
              }
            : p
        )
      )
    } else {
      const newId = "PRD" + String(products.length + 1).padStart(3, "0")
      setProducts((prev) => [
        ...prev,
        {
          ...form,
          id: newId,
          revenue,
          profit,
        },
      ])
    }

    closeModal()
    toast.success(editingProduct ? "Product updated successfully" : "Product added successfully")
  }

  function handleDeleteProductClick(id: string) {
    setDeleteProductId(id)
  }

  function handleDeleteProductConfirm() {
    if (!deleteProductId) return
    setProducts((prev) => prev.filter((p) => p.id !== deleteProductId))
    toast.success("Product deleted successfully")
    setDeleteProductId(null)
  }

  function resetFilters() {
    setSearch("")
    setFilterCategory("All")
    setSortBy("revenue")
  }

  function exportToCSV() {
    const headers = ["Product", "Category", "Qty", "Unit Price", "Revenue", "Cost Price", "Profit", "Profit %"]
    const rows = sorted.map((p) => [
      p.product,
      p.category,
      p.qty,
      p.unitPrice,
      p.revenue,
      p.costPrice || 0,
      p.profit || 0,
      p.costPrice ? (((p.profit || 0) / p.revenue) * 100).toFixed(2) : 0,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `product_revenue_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0)
  const totalProfit = products.reduce((sum, p) => sum + (p.profit || 0), 0)
  const totalQty = products.reduce((sum, p) => sum + p.qty, 0)
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0
  const filteredTotals = filtered.reduce(
    (acc, p) => {
      acc.revenue += p.revenue
      acc.profit += p.profit || 0
      acc.qty += p.qty
      return acc
    },
    { revenue: 0, profit: 0, qty: 0 }
  )
  const filtersActive = Boolean(search.trim()) || filterCategory !== "All"
  const isConsoleDirty = filtersActive || sortBy !== "revenue"
  const avgUnitPrice = totalQty > 0 ? Math.round(totalRevenue / totalQty) : 0
  const avgProfitPerUnit = totalQty > 0 ? Math.round(totalProfit / totalQty) : 0
  const bestSeller = products.reduce<Product | null>((top, current) => {
    if (!top || current.revenue > top.revenue) return current
    return top
  }, null)
  const heroMetrics = [
    {
      label: "Revenue captured",
      value: `Rs. ${totalRevenue.toLocaleString()}`,
      hint: `${products.length} SKUs tracked`,
      gradient: "from-[#1d4ed8] to-[#60a5fa]",
      icon: Wallet,
    },
    {
      label: "Blended margin",
      value: `${profitMargin}%`,
      hint: `Rs. ${totalProfit.toLocaleString()} profit`,
      gradient: "from-[#5b21b6] to-[#a855f7]",
      icon: TrendingUp,
    },
    {
      label: "Units shipped",
      value: totalQty.toLocaleString(),
      hint: `Avg price Rs. ${avgUnitPrice.toLocaleString()}`,
      gradient: "from-[#065f46] to-[#22c55e]",
      icon: Package,
    },
    {
      label: bestSeller ? "Top performer" : "Need products",
      value: bestSeller ? bestSeller.product : "No data yet",
      hint: bestSeller ? `Rs. ${bestSeller.revenue.toLocaleString()} revenue` : "Add products to compare",
      gradient: "from-[#9a3412] to-[#f97316]",
      icon: Tag,
    },
  ]
  const getMarginTone = (value: number) => {
    if (value >= 50) return "bg-emerald-50 text-emerald-700"
    if (value >= 30) return "bg-amber-50 text-amber-700"
    return "bg-rose-50 text-rose-700"
  }

  return (
    <>
      <div className="space-y-6">
        <PageTitle title="Product Revenue Management" />

        <Card className="brand-card brand-card-hover overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#38bdf8] p-6 text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">Merchandising runway</p>
                  <h2 className="text-3xl font-bold">Product revenue cockpit</h2>
                  <p className="text-sm text-white/80">
                    Mirror the Supplier dashboards—surface sell-through velocity, highlight top movers, and export proofs in a click.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3 text-right">
                  <Badge className="brand-pill border border-white/40 bg-white/10 text-white">
                    {filtersActive ? "Filtered view" : "Full catalog"}
                  </Badge>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button onClick={exportToCSV} className="rounded-2xl bg-white/90 px-5 py-2 text-[#0f172a] hover:bg-white">
                      <ArrowUpRight className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button onClick={openAddModal} className="rounded-2xl bg-[#22d3ee] px-5 py-2 text-[#0f172a] hover:bg-[#2dd4bf]">
                      <Plus className="mr-2 h-4 w-4" /> Add product
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/80">
                <span className="rounded-2xl bg-white/10 px-3 py-1">{products.length} SKUs tracked</span>
                <span className="rounded-2xl bg-white/10 px-3 py-1">
                  Rs. {filteredTotals.revenue.toLocaleString()} in viewport
                </span>
                <span className="rounded-2xl bg-white/10 px-3 py-1">Avg profit Rs. {avgProfitPerUnit.toLocaleString()} / unit</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
              {heroMetrics.map(({ label, value, hint, gradient, icon: Icon }) => (
                <div
                  key={label}
                  className={`relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br ${gradient} p-4 text-white shadow-lg`}
                >
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
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-muted/60 p-2 text-primary">
                  <Filter className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Search & filter</p>
                  <h2 className="text-2xl font-bold text-foreground">Merch console</h2>
                  <p className="text-sm text-muted-foreground">
                    Dial into categories, set sort logic, and surface the exact basket you need for buyer conversations.
                  </p>
                </div>
              </div>
              <div className="brand-soft-panel rounded-2xl px-4 py-3 text-right">
                <p className="text-xs font-semibold text-muted-foreground">In viewport</p>
                <p className="text-2xl font-bold text-[#4338ca]">Rs. {filteredTotals.revenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{filtered.length} products</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-2">
                <Label className="text-sm font-semibold text-foreground">Search catalog</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Product, ID, or keyword"
                    className="h-12 rounded-2xl border border-border bg-background/70 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Category</Label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3 text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Sort by</Label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-border bg-background/70 px-3 text-sm"
                >
                  <option value="revenue">Revenue</option>
                  <option value="profit">Profit</option>
                  <option value="qty">Quantity</option>
                  <option value="name">Product Name</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  disabled={!isConsoleDirty}
                  className="h-12 w-full rounded-2xl border-border/50 text-muted-foreground"
                >
                  Reset filters
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>
                Showing {sorted.length} / {products.length} products · Rs. {filteredTotals.revenue.toLocaleString()} total
              </p>
              <Button variant="outline" className="rounded-2xl border-border/60" onClick={exportToCSV}>
                <Sparkles className="mr-2 h-4 w-4" /> Export current view
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Product ledger</p>
                <h2 className="text-2xl font-bold text-foreground">Revenue breakdown</h2>
                <p className="text-sm text-muted-foreground">
                  {filtersActive ? "Filtered snapshot of SKUs in focus" : "Complete catalog earnings view"}
                </p>
              </div>
              <Badge className="brand-pill border border-[#4338ca]/30 bg-[#4338ca]/10 text-[#4338ca]">
                {sorted.length} entries · {filteredTotals.qty} units
              </Badge>
            </div>

            <div className="rounded-3xl border border-border/40 bg-card">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-linear-to-r from-[#eff6ff] to-[#eef2ff] text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Unit price</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Profit</th>
                      <th className="px-4 py-3 text-center">Margin</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                          No products match the current filters.
                        </td>
                      </tr>
                    ) : (
                      sorted.map((p, idx) => {
                        const margin = p.costPrice ? Number((((p.profit || 0) / p.revenue) * 100).toFixed(1)) : 0
                        return (
                          <tr
                            key={p.id}
                            className={`border-b border-border/70 ${idx % 2 === 0 ? "bg-card" : "bg-card/80"} transition hover:bg-muted/50`}
                          >
                            <td className="px-4 py-4 align-top">
                              <p className="font-semibold text-foreground">{p.product}</p>
                              <p className="text-xs text-muted-foreground">ID {p.id} · Updated {p.date}</p>
                            </td>
                            <td className="px-4 py-4 align-top">
                              <Badge className="brand-pill border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]">{p.category}</Badge>
                            </td>
                            <td className="px-4 py-4 text-center font-semibold text-foreground">{p.qty}</td>
                            <td className="px-4 py-4 text-right text-muted-foreground">Rs. {p.unitPrice.toLocaleString()}</td>
                            <td className="px-4 py-4 text-right font-semibold text-blue-600">Rs. {p.revenue.toLocaleString()}</td>
                            <td className="px-4 py-4 text-right font-semibold text-emerald-700">Rs. {(p.profit || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 text-center">
                              <span className={`rounded-2xl px-3 py-1 text-xs font-semibold ${getMarginTone(margin)}`}>
                                {margin}%
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditModal(p)}
                                  className="rounded-2xl border-border px-4 text-xs"
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteProductClick(p.id)}
                                  className="rounded-2xl px-4 text-xs"
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border/40 shadow-2xl">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <h3 className="text-lg font-bold">{editingProduct ? "Edit Product" : "Add New Product"}</h3>
                <button onClick={closeModal} className="text-2xl text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Product Name*</Label>
                  <Input
                    placeholder="Product name"
                    value={form.product}
                    onChange={(e) => setForm({ ...form, product: e.target.value })}
                    className="h-10 rounded-2xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Category*</Label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="h-10 w-full rounded-2xl border border-border px-3"
                  >
                    <option value="Food">Food</option>
                    <option value="Medicines">Medicines</option>
                    <option value="Grooming">Grooming</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Quantity*</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.qty || ""}
                      onChange={(e) => setForm({ ...form, qty: Number(e.target.value) || 0 })}
                      className="h-10 rounded-2xl"
                      required
                      min={0}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Unit Price*</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.unitPrice || ""}
                      onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) || 0 })}
                      className="h-10 rounded-2xl"
                      required
                      min={0}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Cost Price</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.costPrice || ""}
                      onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) || 0 })}
                      className="h-10 rounded-2xl"
                      min={0}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Date</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="h-10 rounded-2xl"
                    />
                  </div>
                </div>

                {form.qty > 0 && form.unitPrice > 0 && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Total Revenue:</span> Rs. {(form.qty * form.unitPrice).toLocaleString()}
                    </p>
                    {form.costPrice > 0 && (
                      <p className="mt-1 text-sm text-gray-700">
                        <span className="font-semibold">Total Profit:</span> Rs. {((form.qty * form.unitPrice) - (form.qty * form.costPrice)).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border/40 pt-4">
                <Button variant="outline" onClick={closeModal} className="rounded-2xl">
                  Cancel
                </Button>
                <Button onClick={saveProduct} className="rounded-2xl bg-[#1d4ed8] text-white hover:bg-[#1e3a8a]">
                  {editingProduct ? "✓ Update" : "+ Add"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleteProductId !== null}
        onOpenChange={(open) => !open && setDeleteProductId(null)}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={handleDeleteProductConfirm}
        variant="danger"
      />
    </>
  )
}
