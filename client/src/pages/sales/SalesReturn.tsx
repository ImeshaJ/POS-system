import { useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Printer, Search, Check, X, ArrowRight, Package, AlertCircle, CheckCircle2 } from "lucide-react"
import { apiGet, apiPatch, apiPost } from "@/lib/api"

/* ---------- TYPES ---------- */

type ReturnItem = {
  id: number
  productId: number | null
  productCode: string
  name: string
  qty: number
  price: number
  selected: boolean
}

type Invoice = {
  saleId: number
  invoiceNo: string
  clientName?: string
  petName?: string
  date?: string
  items: ReturnItem[]
}

type ApiSale = {
  id: number
  invoice_no?: string
  customer?: string
  pet_name?: string
  date?: string
}

type ApiSaleItem = {
  id: number
  sale_id: number
  product_id?: number | null
  name: string
  price?: number
  qty?: number
}

type ApiProduct = {
  id: number
  quantity?: number
}

const formatCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`

/* ---------- COMPONENT ---------- */

const SalesReturn = () => {
  const [invoiceNo, setInvoiceNo] = useState("")
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [loading, setLoading] = useState(false)

  const normalizeInvoice = (value: string) =>
    value.trim().toUpperCase().replace(/^INV-/, "")

  const searchInvoice = async () => {
    setSearchError("")
    if (!invoiceNo.trim()) {
      setSearchError("Please enter an invoice number")
      return
    }

    try {
      setLoading(true)
      const [salesRes, itemsRes] = await Promise.all([
        apiGet<ApiSale[]>("/api/sales?limit=1000"),
        apiGet<ApiSaleItem[]>("/api/sale-items?limit=2000"),
      ])

      const input = normalizeInvoice(invoiceNo)
      const sales = salesRes.data || []
      const sale = sales.find((s) => {
        const invoiceCandidate = s.invoice_no || `INV-${s.id}`
        const normalizedCandidate = normalizeInvoice(invoiceCandidate)
        return normalizedCandidate === input || String(s.id) === input
      })

      if (!sale) {
        setInvoice(null)
        setSearchError("Invoice not found. Try a valid invoice number.")
        return
      }

      const items = (itemsRes.data || [])
        .filter((item) => item.sale_id === sale.id)
        .map((item) => ({
          id: item.id,
          productId: item.product_id ?? null,
          productCode: `ITEM-${item.id}`,
          name: item.name,
          qty: Number(item.qty || 0),
          price: Number(item.price || 0),
          selected: false,
        }))

      setInvoice({
        saleId: sale.id,
        invoiceNo: sale.invoice_no || `INV-${sale.id}`,
        clientName: sale.customer || "Guest",
        petName: sale.pet_name || "",
        date: sale.date || "",
        items,
      })
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Failed to load invoice")
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
      .reduce((sum, i) => sum + i.price * i.qty, 0) || 0
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
      const selectedItems = invoice.items.filter((item) => item.selected)
      if (selectedItems.length === 0) {
        setSearchError("Please select at least one item to return")
        return
      }

      const returnRes = await apiPost<{ id: number }>("/api/sales-returns", {
        sale_id: invoice.saleId,
        invoice_no: invoice.invoiceNo,
        total_refund: refundAmount,
        reason: "Sales return",
      })

      const salesReturnId = returnRes.data?.id
      if (salesReturnId) {
        await Promise.all(
          selectedItems.map((item) =>
            apiPost("/api/sales-return-items", {
              sales_return_id: salesReturnId,
              sale_item_id: item.id,
              name: item.name,
              qty: item.qty,
              price: item.price,
            })
          )
        )
      }

      const productsRes = await apiGet<ApiProduct[]>("/api/products?limit=2000")
      const productMap = new Map(productsRes.data.map((p) => [p.id, p]))
      const quantities = new Map<number, number>()

      selectedItems.forEach((item) => {
        if (!item.productId) return
        quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.qty)
      })

      await Promise.all(
        Array.from(quantities.entries()).map(([productId, qty]) => {
          const current = productMap.get(productId)
          const currentQty = Number(current?.quantity || 0)
          return apiPatch(`/api/products/${productId}`, { quantity: currentQty + qty })
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
      <PageTitle title="Sales Return" />

      <div className="space-y-6 pb-10">
        <Card className="brand-card brand-card-hover overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-linear-to-r from-[#ff5f6d] to-[#ffc371] p-6 text-white">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-white/20 p-2">
                  <Package className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/70">Sales Operations</p>
                  <h2 className="text-2xl font-bold">Process Sales Return</h2>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/80">Locate an invoice, select eligible items, and issue a branded refund.</p>
            </div>

            <div className="p-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-600">Invoice Number</label>
                  <Input
                    type="text"
                    placeholder="Enter invoice number (e.g., INV-1023)"
                    value={invoiceNo}
                    onChange={(e) => {
                      setInvoiceNo(e.target.value)
                      setSearchError("")
                    }}
                    onKeyDown={(e) => e.key === "Enter" && searchInvoice()}
                    className="h-12 text-base"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={searchInvoice}
                    disabled={!invoiceNo.trim() || processing || loading}
                    className="h-12 w-full bg-[#002366] text-white hover:bg-[#001a4d] lg:w-auto lg:px-10"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    {loading ? "Searching..." : "Find Invoice"}
                  </Button>
                </div>
              </div>

              {searchError && (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {searchError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {invoice && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="brand-soft-panel rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Invoice No.</p>
                <p className="mt-2 text-xl font-bold text-[#002366]">{invoice.invoiceNo}</p>
                <p className="text-xs text-gray-500">Sale #{invoice.saleId}</p>
              </div>
              <div className="brand-soft-panel rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Client</p>
                <p className="mt-2 text-xl font-bold text-gray-900">{invoice.clientName || "Guest"}</p>
                <p className="text-xs text-gray-500">Pet · {invoice.petName || "N/A"}</p>
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
                    <span className="rounded-full bg-green-100 p-1 text-green-700">
                      <Check className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Invoice Details</p>
                      <h3 className="text-lg font-bold text-gray-900">Verified sale located</h3>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 p-4">
                      <p className="text-xs font-semibold text-gray-500">Client Name</p>
                      <p className="text-base font-bold text-gray-900">{invoice.clientName || "Guest"}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 p-4">
                      <p className="text-xs font-semibold text-gray-500">Pet Name</p>
                      <p className="text-base font-bold text-gray-900">{invoice.petName || "-"}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 p-4">
                      <p className="text-xs font-semibold text-gray-500">Invoice Date</p>
                      <p className="text-base font-bold text-gray-900">{invoiceDateLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 p-4">
                      <p className="text-xs font-semibold text-gray-500">Sale Reference</p>
                      <p className="text-base font-bold text-gray-900">#{invoice.saleId}</p>
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
                        className="h-2 rounded-full bg-linear-to-r from-[#ff5f6d] to-[#ffc371]"
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
                      className="h-12 text-base bg-[#d946ef] text-white hover:bg-[#c026d3] disabled:opacity-50"
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
                    <h3 className="text-lg font-bold text-gray-900">Tap to include in refund</h3>
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
                          ? "border-[#ff5f6d] bg-[#fff1f2] shadow-sm"
                          : "border-gray-200 bg-white hover:border-[#94a3b8]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-4">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-md border-2 text-sm font-semibold ${
                            item.selected
                              ? "border-[#ff5f6d] bg-[#ff5f6d] text-white"
                              : "border-gray-300 text-gray-400"
                          }`}
                        >
                          {item.selected ? <Check className="h-4 w-4" /> : ""}
                        </span>
                        <div className="flex-1 min-w-45">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                              {item.productCode}
                            </span>
                            <p className="font-semibold text-gray-900">{item.name}</p>
                          </div>
                          <p className="text-xs text-gray-500">Qty {item.qty}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Line Total</p>
                          <p className="text-base font-semibold text-gray-900">
                            {formatCurrency(item.price * item.qty)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur">
          <Card className="brand-card brand-card-hover w-full max-w-xl overflow-hidden">
            <div className="bg-linear-to-r from-[#f97316] to-[#fb7185] px-6 py-5 text-white">
              <p className="text-xs uppercase text-white/70">Confirmation</p>
              <h3 className="text-2xl font-bold">Confirm Return?</h3>
              <p className="text-sm text-white/80">This action updates stock and issues a refund.</p>
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
                  className="h-11 bg-[#d946ef] text-white hover:bg-[#c026d3]"
                >
                  {processing ? "Processing..." : "Confirm"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur">
          <Card className="brand-card brand-card-hover w-full max-w-xl overflow-hidden">
            <div className="bg-linear-to-r from-[#22c55e] to-[#16a34a] px-6 py-5 text-white">
              <p className="text-xs uppercase text-white/70">Success</p>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6" />
                <h3 className="text-2xl font-bold">Return Processed</h3>
              </div>
              <p className="text-sm text-white/80">Stock reconciled and refund confirmed.</p>
            </div>
            <CardContent className="space-y-4 p-6">
              <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                <p className="text-sm text-green-700">Refund Amount</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(refundAmount)}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={handleNewReturn}
                  className="h-11 bg-[#002366] text-white hover:bg-[#001a4d]"
                >
                  <Printer className="mr-2 h-4 w-4" /> Print Receipt
                </Button>
                <Button variant="outline" onClick={handleNewReturn} className="h-11">
                  New Return
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

export default SalesReturn
