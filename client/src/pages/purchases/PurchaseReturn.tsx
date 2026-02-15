import { useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, Search, AlertCircle, Check, X, ArrowRight, CheckCircle2 } from "lucide-react"
import { apiGet, apiPatch } from "@/lib/api"

type ReturnItem = {
  id: number
  productId: number
  productName: string
  qty: number
  cost: number
  selected: boolean
}

type PurchaseInvoice = {
  purchaseId: number
  invoiceNo: string
  supplierName?: string
  date?: string
  items: ReturnItem[]
}

type ApiPurchase = {
  id: number
  invoice_no?: string
  supplier_id?: number
  date?: string
  status?: string
}

type ApiPurchaseItem = {
  id: number
  purchase_id: number
  product_id: number
  qty?: number
  cost_price?: number
}

type ApiProduct = {
  id: number
  name: string
  quantity?: number
}

type ApiSupplier = {
  id: number
  name: string
}

const formatCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`

export default function PurchaseReturn() {
  const [invoiceNo, setInvoiceNo] = useState("")
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null)
  const [searchError, setSearchError] = useState("")
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const normalizeInvoice = (value: string) =>
    value.trim().toUpperCase().replace(/^PUR-/, "")

  const searchInvoice = async () => {
    setSearchError("")
    if (!invoiceNo.trim()) {
      setSearchError("Please enter a purchase invoice number")
      return
    }

    try {
      setLoading(true)
      const [purchasesRes, itemsRes, productsRes, suppliersRes] = await Promise.all([
        apiGet<ApiPurchase[]>("/api/purchases?limit=1000"),
        apiGet<ApiPurchaseItem[]>("/api/purchase-items?limit=2000"),
        apiGet<ApiProduct[]>("/api/products?limit=2000"),
        apiGet<ApiSupplier[]>("/api/suppliers?limit=1000"),
      ])

      const purchases = purchasesRes.data || []
      const input = normalizeInvoice(invoiceNo)
      const purchase = purchases.find((p) => {
        const invoiceCandidate = p.invoice_no || `PUR-${p.id}`
        const normalizedCandidate = normalizeInvoice(invoiceCandidate)
        return normalizedCandidate === input || String(p.id) === input
      })

      if (!purchase) {
        setInvoice(null)
        setSearchError("Purchase invoice not found")
        return
      }

      const productMap = new Map<number, ApiProduct>()
      ;(productsRes.data || []).forEach((p) => productMap.set(p.id, p))

      const supplierMap = new Map<number, string>()
      ;(suppliersRes.data || []).forEach((s) => supplierMap.set(s.id, s.name))

      const items = (itemsRes.data || [])
        .filter((item) => item.purchase_id === purchase.id)
        .map((item) => ({
          id: item.id,
          productId: item.product_id,
          productName: productMap.get(item.product_id)?.name || `Product ${item.product_id}`,
          qty: Number(item.qty || 0),
          cost: Number(item.cost_price || 0),
          selected: false,
        }))

      setInvoice({
        purchaseId: purchase.id,
        invoiceNo: purchase.invoice_no || `PUR-${purchase.id}`,
        supplierName: purchase.supplier_id ? supplierMap.get(purchase.supplier_id) || "" : "",
        date: purchase.date || "",
        items,
      })
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Failed to load purchase invoice")
      setInvoice(null)
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = (id: number) => {
    if (!invoice) return
    setInvoice({
      ...invoice,
      items: invoice.items.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      ),
    })
  }

  const selectedCount = invoice?.items.filter((i) => i.selected).length || 0
  const refundAmount =
    invoice?.items
      .filter((i) => i.selected)
      .reduce((sum, i) => sum + i.cost * i.qty, 0) || 0
  const totalItems = invoice?.items.length || 0
  const selectionProgress = totalItems ? Math.round((selectedCount / totalItems) * 100) : 0
  const invoiceDateLabel = invoice?.date ? new Date(invoice.date).toLocaleDateString("en-LK") : "-"

  const handleProcessReturn = () => {
    if (!invoice || selectedCount === 0) {
      setSearchError("Please select at least one item to return")
      return
    }
    setShowConfirm(true)
  }

  const confirmProcessReturn = async () => {
    if (!invoice) return

    setShowConfirm(false)
    setProcessing(true)
    try {
      await apiPatch(`/api/purchases/${invoice.purchaseId}`, { status: "Returned" })

      const productQuantities = new Map<number, number>()
      invoice.items.forEach((item) => {
        if (!item.selected) return
        productQuantities.set(
          item.productId,
          (productQuantities.get(item.productId) || 0) + item.qty
        )
      })

      const productsRes = await apiGet<ApiProduct[]>("/api/products?limit=2000")
      const currentProducts = new Map(productsRes.data.map((p) => [p.id, p]))

      await Promise.all(
        Array.from(productQuantities.entries()).map(([productId, qty]) => {
          const current = currentProducts.get(productId)
          const currentQty = Number(current?.quantity || 0)
          const newQty = Math.max(0, currentQty - qty)
          return apiPatch(`/api/products/${productId}`, { quantity: newQty })
        })
      )

      setShowSuccess(true)
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Failed to process return")
    } finally {
      setProcessing(false)
    }
  }

  const handleNewReturn = () => {
    setShowSuccess(false)
    setInvoiceNo("")
    setInvoice(null)
    setSearchError("")
  }

  return (
    <>
      <PageTitle title="Purchase Return" />

      <div className="space-y-6 pb-10">
        <Card className="brand-card brand-card-hover overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-linear-to-r from-[#ff6b6b] via-[#f97316] to-[#facc15] p-6 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">Vendor Reconciliation</p>
                  <h2 className="text-3xl font-bold">Reverse a Purchase</h2>
                  <p className="text-sm text-white/80">Find the supplier invoice, choose damaged stock, and restock balances instantly.</p>
                </div>
                <div className="rounded-3xl bg-white/15 p-3">
                  <Package className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="brand-card brand-card-hover">
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Invoice Lookup</p>
              <h3 className="text-lg font-bold text-gray-900">Search Purchase Invoice</h3>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <Label className="text-sm font-semibold text-gray-600">Invoice Number *</Label>
                <Input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="Enter invoice (e.g., PUR-1023)"
                  className="mt-2 h-12"
                  onKeyDown={(e) => e.key === "Enter" && searchInvoice()}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={searchInvoice}
                  disabled={!invoiceNo.trim() || loading}
                  className="h-12 w-full bg-[#0f172a] text-white hover:bg-[#0b1220] lg:w-auto lg:px-10"
                >
                  <Search className="mr-2 h-4 w-4" />
                  {loading ? "Searching..." : "Find Invoice"}
                </Button>
              </div>
            </div>
            {searchError && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {searchError}
              </div>
            )}
          </CardContent>
        </Card>

        {invoice && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="brand-soft-panel rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Invoice No.</p>
                <p className="mt-2 text-xl font-bold text-[#002366]">{invoice.invoiceNo}</p>
                <p className="text-xs text-gray-500">Purchase #{invoice.purchaseId}</p>
              </div>
              <div className="brand-soft-panel rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Supplier</p>
                <p className="mt-2 text-xl font-bold text-gray-900">{invoice.supplierName || "Unknown"}</p>
                <p className="text-xs text-gray-500">Vendor of record</p>
              </div>
                <div className="brand-soft-panel rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Items</p>
                <p className="mt-2 text-xl font-bold text-gray-900">{totalItems}</p>
                <p className="text-xs text-gray-500">{selectedCount} selected</p>
              </div>
              <div className="brand-soft-panel rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Invoice Date</p>
                <p className="mt-2 text-xl font-bold text-gray-900">{invoiceDateLabel}</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="brand-card brand-card-hover">
                <CardContent className="space-y-6 p-6">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-rose-100 p-1 text-rose-700">
                      <Check className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Invoice Details</p>
                      <h3 className="text-lg font-bold text-gray-900">Verified purchase located</h3>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 p-4">
                      <p className="text-xs font-semibold text-gray-500">Supplier</p>
                      <p className="text-base font-bold text-gray-900">{invoice.supplierName || "Unknown"}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 p-4">
                      <p className="text-xs font-semibold text-gray-500">Invoice Date</p>
                      <p className="text-base font-bold text-gray-900">{invoiceDateLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 p-4">
                      <p className="text-xs font-semibold text-gray-500">Invoice Number</p>
                      <p className="text-base font-bold text-gray-900">{invoice.invoiceNo}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 p-4">
                      <p className="text-xs font-semibold text-gray-500">Purchase Reference</p>
                      <p className="text-base font-bold text-gray-900">#{invoice.purchaseId}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="brand-card brand-card-hover">
                <CardContent className="space-y-6 p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Return Summary</p>
                    <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(refundAmount)}</h3>
                    <p className="text-sm text-gray-500">Refund amount across {selectedCount || 0} item(s)</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm font-semibold text-gray-600">
                      <span>Selection Progress</span>
                      <span>{selectionProgress}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-linear-to-r from-[#ff6b6b] to-[#f97316]"
                        style={{ width: `${selectionProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setInvoice(null)
                        setInvoiceNo("")
                      }}
                      className="h-12 text-base"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                    <Button
                      onClick={handleProcessReturn}
                      disabled={refundAmount === 0 || processing}
                      className="h-12 text-base bg-[#f97316] text-white hover:bg-[#ea580c] disabled:opacity-50"
                    >
                      {processing ? (
                        <>
                          <div className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Process Return
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="brand-card brand-card-hover">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Select Items</p>
                    <h3 className="text-lg font-bold text-gray-900">Tap to include in vendor return</h3>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#002366]">
                    {selectedCount} / {totalItems} Selected
                  </span>
                </div>

                <div className="space-y-3">
                  {invoice.items.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`w-full rounded-2xl border-2 px-4 py-4 text-left transition ${
                        item.selected
                          ? "border-[#ff6b6b] bg-[#fff1f2] shadow-sm"
                          : "border-gray-200 bg-white hover:border-[#f97316]/70"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-4">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-md border-2 text-sm font-semibold ${
                            item.selected
                              ? "border-[#ff6b6b] bg-[#ff6b6b] text-white"
                              : "border-gray-300 text-gray-400"
                          }`}
                        >
                          {item.selected ? <Check className="h-4 w-4" /> : ""}
                        </span>
                        <div className="flex-1 min-w-40">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                              ID {item.productId}
                            </span>
                            <p className="font-semibold text-gray-900">{item.productName}</p>
                          </div>
                          <p className="text-xs text-gray-500">Qty {item.qty}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Line Total</p>
                          <p className="text-base font-semibold text-gray-900">
                            {formatCurrency(item.cost * item.qty)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {invoice.items.length === 0 && (
                    <div className="py-12 text-center text-gray-400">No return items found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ---------- CONFIRM ---------- */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur">
          <Card className="brand-card brand-card-hover w-full max-w-xl overflow-hidden">
            <div className="bg-linear-to-r from-[#f97316] to-[#fb7185] px-6 py-5 text-white">
              <p className="text-xs uppercase text-white/70">Confirmation</p>
              <h3 className="text-2xl font-bold">Confirm Purchase Return?</h3>
              <p className="text-sm text-white/80">Stock will decrease and the vendor will be flagged.</p>
            </div>
            <CardContent className="space-y-6 p-6">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Refund Amount</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(refundAmount)}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={processing} className="h-11">
                  Cancel
                </Button>
                <Button
                  onClick={confirmProcessReturn}
                  disabled={processing}
                  className="h-11 bg-[#f97316] text-white hover:bg-[#ea580c]"
                >
                  {processing ? "Processing..." : "Confirm"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------- SUCCESS ---------- */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur">
          <Card className="brand-card brand-card-hover w-full max-w-xl overflow-hidden">
            <div className="bg-linear-to-r from-[#22c55e] to-[#16a34a] px-6 py-5 text-white">
              <p className="text-xs uppercase text-white/70">Success</p>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6" />
                <h3 className="text-2xl font-bold">Return Processed</h3>
              </div>
              <p className="text-sm text-white/80">Inventory updated and supplier notified.</p>
            </div>
            <CardContent className="space-y-4 p-6">
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                <p className="text-sm text-green-700">Refund Amount</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(refundAmount)}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button onClick={handleNewReturn} className="h-11 bg-[#002366] text-white hover:bg-[#001a4d]">
                  New Return
                </Button>
                <Button variant="outline" onClick={handleNewReturn} className="h-11">
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
