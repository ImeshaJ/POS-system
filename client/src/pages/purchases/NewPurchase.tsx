import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, Truck } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api"
import { useToast } from "@/components/common/Toast"

/* ================= TYPES ================= */

type PurchaseItem = {
  id: number
  productId: number
  name: string
  qty: number
  cost: number
}

type ApiProduct = {
  id: number
  name: string
  cost_price?: number
  quantity?: number
}

type ApiSupplier = {
  id: number
  name: string
}

const formatCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`

/* ================= COMPONENT ================= */

export default function NewPurchase() {
  const toast = useToast()
  const navigate = useNavigate()

  /* ---------- STATE ---------- */

  const [supplier, setSupplier] = useState("")
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false)

  const [items, setItems] = useState<PurchaseItem[]>([])
  const [productId, setProductId] = useState("")
  const [productName, setProductName] = useState("")
  const [qty, setQty] = useState("")
  const [cost, setCost] = useState("")
  const resetForm = () => {
    setSupplier("")
    setSupplierId(null)
    setItems([])
    setProductId("")
    setProductName("")
    setQty("")
    setCost("")
  }

  const [showProductSuggestions, setShowProductSuggestions] = useState(false)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split("T")[0]
  const totalAmount = items.reduce((sum, i) => sum + i.qty * i.cost, 0)
  const totalQuantity = items.reduce((sum, i) => sum + i.qty, 0)
  const uniqueProducts = new Set(items.map((item) => item.productId)).size
  const averageCost = totalQuantity ? totalAmount / totalQuantity : 0

  /* ---------- LOAD DATA ---------- */

  const fetchCatalogData = async () => {
    const [productsRes, suppliersRes] = await Promise.all([
      apiGet<ApiProduct[]>("/api/products?limit=1000"),
      apiGet<ApiSupplier[]>("/api/suppliers?limit=1000"),
    ])
    return {
      products: productsRes.data || [],
      suppliers: suppliersRes.data || [],
    }
  }

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const { products: productRows, suppliers: supplierRows } = await fetchCatalogData()
        if (!mounted) return
        setProducts(productRows)
        setSuppliers(supplierRows)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : "Failed to load purchase data")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const ensureSupplierId = async () => {
    const trimmed = supplier.trim()
    if (!trimmed) return null

    const existing = suppliers.find(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (existing) return existing.id

    const created = await apiPost<ApiSupplier>("/api/suppliers", { name: trimmed })
    const newSupplier = created.data
    setSuppliers((prev) => [newSupplier, ...prev])
    setSupplierId(newSupplier.id)
    return newSupplier.id
  }

  /* ---------- ITEMS ---------- */

  const addItem = () => {
    if (!productName || !qty || !cost) return

    let resolvedProductId = Number(productId)
    let resolvedProductName = productName

    if (!resolvedProductId || Number.isNaN(resolvedProductId)) {
      const matchedByName = products.find(
        (p) => p.name.toLowerCase() === productName.toLowerCase()
      )
      if (matchedByName) {
        resolvedProductId = matchedByName.id
        resolvedProductName = matchedByName.name
      }
    }

    if (!resolvedProductId) {
      toast.warning("Select a product from the list")
      return
    }

    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        productId: resolvedProductId,
        name: resolvedProductName,
        qty: Number(qty),
        cost: Number(cost),
      },
    ])
    setProductId("")
    setProductName("")
    setQty("")
    setCost("")
  }

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  /* ---------- SAVE PURCHASE ---------- */

  const savePurchase = async () => {
    if (!supplier || items.length === 0) {
      toast.warning("Supplier and items required")
      return
    }

    try {
      setSaving(true)
      const resolvedSupplierId = supplierId || (await ensureSupplierId())
      if (!resolvedSupplierId) {
        toast.warning("Supplier is required")
        return
      }

      const response = await apiPost<{ id: number }>("/api/purchases/full", {
        supplier_id: resolvedSupplierId,
        invoice_no: `PUR-${Date.now().toString().slice(-6)}`,
        date: today,
        status: "Completed",
        items: items.map((item) => ({
          product_id: item.productId,
          qty: item.qty,
          cost_price: item.cost,
        })),
      })

      toast.success("Purchase saved successfully")

      // Navigate to purchase detail page
      if (response.data?.id) {
        navigate(`/purchases/${response.data.id}`)
      } else {
        resetForm()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save purchase")
    } finally {
      setSaving(false)
    }
  }

  /* ---------- CLOSE DROPDOWNS ---------- */

  useEffect(() => {
    const close = () => {
      setShowSupplierSuggestions(false)
      setShowProductSuggestions(false)
    }
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [])

  /* ================= UI ================= */

  return (
    <>
      <PageTitle title="New Purchase" />

      {loading && <div className="mt-4 text-sm text-gray-500">Loading purchase data...</div>}
      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

      <div className="space-y-6 pb-10">
        <Card className="brand-card brand-card-hover overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#22d3ee] p-6 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">Procurement</p>
                  <h2 className="text-3xl font-bold">Create a Purchase Order</h2>
                  <p className="text-sm text-white/80">Source stock, log incoming batches, and keep inventory on track.</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-3">
                  <Truck className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div>
                  <Label className="text-sm font-semibold text-gray-600">Supplier *</Label>
                  <div className="relative mt-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={supplier}
                      onFocus={() => setShowSupplierSuggestions(true)}
                      onChange={(e) => {
                        setSupplier(e.target.value)
                        setSupplierId(null)
                        setShowSupplierSuggestions(true)
                      }}
                      placeholder="Select or enter supplier name"
                      className="h-12 text-base"
                    />
                    {showSupplierSuggestions && suppliers.length > 0 && (
                      <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
                        {suppliers
                          .filter((s) => s.name.toLowerCase().includes(supplier.toLowerCase()))
                          .map((s) => (
                            <button
                              type="button"
                              key={s.id}
                              className="flex w-full flex-col px-4 py-3 text-left text-sm hover:bg-blue-50"
                              onClick={() => {
                                setSupplier(s.name)
                                setSupplierId(s.id)
                                setShowSupplierSuggestions(false)
                              }}
                            >
                              <span className="font-semibold text-gray-900">{s.name}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Type a new supplier name to create it automatically.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="brand-soft-panel rounded-2xl p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery Date</p>
                    <p className="mt-2 text-lg font-bold text-gray-900">{today}</p>
                    <p className="text-xs text-gray-500">Auto-set to today for quick entries</p>
                  </div>
                  <div className="brand-soft-panel rounded-2xl p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Items Added</p>
                    <p className="mt-2 text-lg font-bold text-gray-900">{items.length}</p>
                    <p className="text-xs text-gray-500">Current spend {formatCurrency(totalAmount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <Card className="brand-card brand-card-hover">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-blue-100 p-2 text-blue-600">
                  <Package className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Add Items</p>
                  <h3 className="text-lg font-bold text-gray-900">Build the purchase list</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-600">Product ID</Label>
                  <Input
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    placeholder="e.g., 102"
                    className="h-11"
                  />
                </div>

                <div className="relative space-y-2">
                  <Label className="text-sm font-semibold text-gray-600">Product *</Label>
                  <Input
                    value={productName}
                    onFocus={() => setShowProductSuggestions(true)}
                    onChange={(e) => {
                      setProductName(e.target.value)
                      setShowProductSuggestions(true)
                    }}
                    placeholder="Search by name"
                    className="h-11"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {showProductSuggestions && productName.length > 0 && (
                    <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
                      {products
                        .filter((p) => p.name.toLowerCase().includes(productName.toLowerCase()))
                        .map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            className="flex w-full flex-col px-4 py-3 text-left text-sm hover:bg-blue-50"
                            onClick={() => {
                              setProductName(p.name)
                              setProductId(String(p.id))
                              setCost(String(p.cost_price || 0))
                              setShowProductSuggestions(false)
                            }}
                          >
                            <span className="font-semibold text-gray-900">{p.name}</span>
                            <span className="text-xs text-gray-500">Default cost {formatCurrency(Number(p.cost_price || 0))}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-600">Qty</Label>
                  <Input
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="0"
                    type="number"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-600">Cost (Rs.)</Label>
                  <Input
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    className="h-11"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={addItem}
                    className="h-11 w-full bg-[#0f172a] text-white hover:bg-[#0b1220]"
                  >
                    + Add Item
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="brand-card brand-card-hover">
            <CardContent className="space-y-6 p-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Purchase Summary</p>
                <h3 className="text-xl font-bold text-gray-900">{items.length ? "Ready to receive" : "Start adding items"}</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Total lines</span>
                  <span className="font-semibold text-gray-900">{items.length}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>Units ordered</span>
                  <span className="font-semibold text-gray-900">{totalQuantity}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>Unique products</span>
                  <span className="font-semibold text-gray-900">{uniqueProducts}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>Average cost</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(averageCost)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-transparent bg-linear-to-r from-[#22c55e] to-[#16a34a] p-4 text-white">
                <p className="text-xs uppercase text-white/70">Estimated spend</p>
                <p className="text-3xl font-bold">{formatCurrency(totalAmount)}</p>
                <p className="text-xs text-white/80">Before freight or adjustments</p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={savePurchase}
                  className="h-11 w-full bg-[#0f172a] text-white hover:bg-[#0b1220] disabled:opacity-50"
                  disabled={items.length === 0 || !supplier || saving}
                >
                  {saving ? "Saving..." : "Save Purchase"}
                </Button>
                <Button variant="outline" onClick={resetForm} className="h-11 w-full">
                  Reset Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Purchase Items</p>
                <h3 className="text-lg font-bold text-gray-900">{items.length} line(s) drafted</h3>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#002366]">
                Live total {formatCurrency(totalAmount)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-linear-to-r from-[#eff6ff] to-[#e0ecff]">
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">Product ID</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">Product</th>
                    <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold uppercase tracking-wide text-gray-600">Cost</th>
                    <th className="px-4 py-3 text-right font-semibold uppercase tracking-wide text-gray-600">Line Total</th>
                    <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} border-b border-gray-100 transition-colors hover:bg-blue-50/50`}
                    >
                      <td className="px-4 py-3 font-semibold text-[#1d4ed8]">{item.productId}</td>
                      <td className="px-4 py-3 text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900">{item.qty}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.cost)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(item.qty * item.cost)}</td>
                      <td className="px-4 py-3 text-center">
                        <Button onClick={() => removeItem(item.id)} variant="destructive" size="sm">
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        <div className="text-lg font-semibold">No items added yet</div>
                        <p className="text-sm">Search for a product above to get started.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
