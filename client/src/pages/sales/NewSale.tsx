import { useEffect, useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Trash2, Plus, ShoppingCart, CheckCircle, AlertCircle, MapPin, DollarSign, CreditCard } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api"
import { useToast } from "@/components/common/Toast"

type ClientInfo = {
  clientCode: string
  clientName: string
  petName: string
}

type SaleItem = {
  id: number
  productId: number | null
  itemType: "product" | "service" | "package" | "addon"
  itemCode: string
  name: string
  price: number
  qty: number
}

type Product = {
  id: number
  name: string
  price: number
}

type SalesItem = {
  id: number
  type: "product" | "service" | "package" | "addon"
  code: string
  name: string
  packageName: string | null
  category: string
  price: number
  stockQty: number | null
  status: string
}

type Customer = {
  id: string
  clientId: number | null
  code: string
  name: string
  petName: string
}

type Sale = {
  invoiceNo: string
  date: string
  client: ClientInfo
  items: SaleItem[]
  subtotal: number
  vat: number
  discount: number
  total: number
  paymentType: string
  receivedAmount: number
  amountDue: number
  change: number
  note: string
}

type ApiProduct = {
  id: number
  name: string
  selling_price?: number
}

type ApiSalesItem = {
  id: number
  type: "product" | "service" | "package" | "addon"
  code: string
  name: string
  packageName: string | null
  category: string
  price: number
  stockQty: number | null
  status: string
}

type ApiClient = {
  id: number
  code?: string
  name: string
}

type ApiPet = {
  id: number
  client_id: number | null
  name: string
}

const generateInvoiceNumber = () => {
  const timestamp = Date.now().toString()
  return `INV-${timestamp.slice(-6)}`
}
const today = new Date().toISOString().split("T")[0]

export default function NewSale() {
  const navigate = useNavigate()
  const toast = useToast()
  const [invoiceNo] = useState(generateInvoiceNumber())

  const [customerType, setCustomerType] = useState<"guest" | "saved" | "new">("guest")
  const [client, setClient] = useState<ClientInfo>({
    clientCode: "",
    clientName: "",
    petName: "",
  })
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState("")

  const [items, setItems] = useState<SaleItem[]>([])
  const [activeItemId, setActiveItemId] = useState<number | null>(null)

  const [vatRate, setVatRate] = useState<number | "">(15)
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount")
  const [discountValue, setDiscountValue] = useState<number | "">("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash")

  const [receivedAmount, setReceivedAmount] = useState(0)
  const [note, setNote] = useState("")

  // Card payment details
  const [cardLastFour, setCardLastFour] = useState("")
  const [cardType, setCardType] = useState<"visa" | "mastercard" | "amex" | "other">("visa")
  const [cardApprovalCode, setCardApprovalCode] = useState("")

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  const [_products, setProducts] = useState<Product[]>([])
  const [salesItems, setSalesItems] = useState<SalesItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, setSearchQuery] = useState("")

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const [productsRes, salesItemsRes, clientsRes, petsRes] = await Promise.all([
          apiGet<ApiProduct[]>("/api/products?limit=1000"),
          apiGet<ApiSalesItem[]>("/api/sales-items/all?limit=500"),
          apiGet<ApiClient[]>("/api/clients?limit=1000"),
          apiGet<ApiPet[]>("/api/pets?limit=2000"),
        ])

        if (!mounted) return

        const loadedProducts = (productsRes.data || []).map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.selling_price || 0),
        }))

        // Load combined sales items (products + services + packages + addons)
        const loadedSalesItems = (salesItemsRes.data || []).map((item) => ({
          id: item.id,
          type: item.type,
          code: item.code,
          name: item.name,
          packageName: item.packageName,
          category: item.category,
          price: Number(item.price || 0),
          stockQty: item.stockQty,
          status: item.status,
        }))

        const petsByClient = new Map<number, ApiPet[]>()
        ;(petsRes.data || []).forEach((pet) => {
          if (!pet.client_id) return
          const list = petsByClient.get(pet.client_id) || []
          list.push(pet)
          petsByClient.set(pet.client_id, list)
        })

        const loadedCustomers: Customer[] = []
        ;(clientsRes.data || []).forEach((clientRow) => {
          const pets = petsByClient.get(clientRow.id) || []
          if (pets.length === 0) {
            loadedCustomers.push({
              id: `${clientRow.id}-0`,
              clientId: clientRow.id,
              code: clientRow.code || "",
              name: clientRow.name,
              petName: "",
            })
            return
          }
          pets.forEach((pet) => {
            loadedCustomers.push({
              id: `${clientRow.id}-${pet.id}`,
              clientId: clientRow.id,
              code: clientRow.code || "",
              name: clientRow.name,
              petName: pet.name || "",
            })
          })
        })

        setProducts(loadedProducts)
        setSalesItems(loadedSalesItems)
        setCustomers(loadedCustomers)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : "Failed to load sales data")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now(), productId: null, itemType: "product", itemCode: "", name: "", price: 0, qty: 1 },
    ])
  }

  const updateItem = (id: number, updates: Partial<SaleItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    )
  }

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const selectSalesItem = (itemId: number, salesItem: SalesItem) => {
    // For services/packages/addons, productId is null since they're not products
    const productId = salesItem.type === "product" ? salesItem.id : null
    updateItem(itemId, {
      productId,
      itemType: salesItem.type,
      itemCode: salesItem.code,
      name: salesItem.name,
      price: salesItem.price,
      qty: 1,
    })
    setActiveItemId(null)
  }

  const getItemTypeBadge = (type: SalesItem["type"]) => {
    switch (type) {
      case "product":
        return { label: "Product", color: "bg-blue-100 text-blue-700" }
      case "service":
        return { label: "Service", color: "bg-green-100 text-green-700" }
      case "package":
        return { label: "Package", color: "bg-purple-100 text-purple-700" }
      case "addon":
        return { label: "Add-on", color: "bg-orange-100 text-orange-700" }
      default:
        return { label: "Item", color: "bg-gray-100 text-gray-700" }
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const vat = vatRate === "" ? 0 : subtotal * (Number(vatRate) / 100)
  const discountAmount =
    discountType === "percent"
      ? discountValue === ""
        ? 0
        : subtotal * (Number(discountValue) / 100)
      : discountValue === ""
      ? 0
      : Number(discountValue)

  const total = subtotal + vat - discountAmount
  const amountDue = total - receivedAmount
  const change = receivedAmount > total ? receivedAmount - total : 0

  const handleCompleteSaleClick = () => {
    if (items.length === 0) {
      toast.warning("Add at least one item")
      return
    }
    setShowConfirmation(true)
  }

  const confirmPayment = async () => {
    if (items.length === 0) {
      toast.warning("Add at least one item")
      return
    }

    const sale: Sale = {
      invoiceNo,
      date: today,
      client,
      items,
      subtotal,
      vat,
      discount: discountAmount,
      total,
      paymentType: paymentMethod,
      receivedAmount,
      amountDue: amountDue > 0 ? amountDue : 0,
      change,
      note,
    }

    try {
      setSaving(true)
      setShowConfirmation(false)

      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })

      // Use the enhanced /api/sales/full endpoint that handles:
      // - Stock reduction for products
      // - No stock changes for services/packages/addons
      // - Client due amount tracking
      const salePayload = {
        invoice_no: invoiceNo,
        client_id: selectedClientId || undefined,
        customer: client.clientName || "Guest",
        pet_name: client.petName || "",
        date: today,
        time,
        subtotal,
        vat,
        discount: discountAmount,
        total,
        payment_type: paymentMethod,
        received_amount: receivedAmount,
        status: "Completed",
        // Card payment details (only when payment_type is "card")
        ...(paymentMethod === "card" && {
          card_last_four: cardLastFour || null,
          card_type: cardType || null,
          card_approval_code: cardApprovalCode || null,
        }),
        items: items.map((item) => ({
          item_type: item.itemType || "product",
          item_id: item.productId,
          item_code: item.itemCode || "",
          name: item.name,
          price: item.price,
          qty: item.qty,
        })),
      }

      const saleRes = await apiPost<{
        id: number
        stock_updates?: Array<{ product_name: string; new_quantity: number; reduced_by: number }>
        payment_summary?: { total: number; received: number; due: number; status: string }
      }>("/api/sales/full", salePayload)

      // Show stock update info if any products were sold
      const stockUpdates = saleRes.data?.stock_updates || []
      if (stockUpdates.length > 0) {
        const lowStockItems = stockUpdates.filter((u) => u.new_quantity <= 5)
        if (lowStockItems.length > 0) {
          toast.warning(`Low stock alert: ${lowStockItems.map((i) => i.product_name).join(", ")}`)
        }
      }

      setShowSuccess(true)
      setTimeout(() => {
        navigate(`/sales/invoice/${invoiceNo}`, { state: sale })
      }, 2000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save sale")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-sm w-full">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-1 text-base">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              Confirm
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">Review totals and confirm payment to complete the sale.</DialogDescription>

          </DialogHeader>

          <div className="space-y-2">
            <div className="bg-linear-to-br from-blue-50 to-blue-100 p-2 rounded border border-blue-200 shadow-sm">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center bg-white bg-opacity-70 p-1 rounded">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-bold text-gray-900">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-white bg-opacity-70 p-1 rounded">
                  <span className="text-gray-600">VAT ({vatRate}%)</span>
                  <span className="font-bold text-gray-900">Rs. {vat.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center bg-green-50 p-1 rounded border border-green-200">
                    <span className="text-green-700 font-medium">Disc</span>
                    <span className="font-bold text-green-600">- Rs. {discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t-2 border-blue-300 pt-1 flex justify-between items-center bg-blue-600 text-white p-1 rounded">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">Rs. {total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-2 rounded border border-gray-200 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-bold capitalize">{paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Received:</span>
                  <span className="font-bold">Rs. {receivedAmount.toLocaleString()}</span>
                </div>
                {amountDue > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Due:</span>
                    <span className="font-bold">Rs. {amountDue.toLocaleString()}</span>
                  </div>
                )}
                {change > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Change:</span>
                    <span className="font-bold">Rs. {change.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1 border-2 h-7 hover:bg-gray-50 text-xs">
              Cancel
            </Button>
            <Button
              onClick={confirmPayment}
              disabled={saving}
              className="flex-1 bg-linear-to-r from-[#002366] to-[#003a99] text-white hover:opacity-90 font-bold shadow-lg h-7 text-xs"
            >
              <CheckCircle size={12} className="mr-1" /> Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-white rounded-4xl shadow-2xl p-12 text-center max-w-sm animate-bounce">
            <div className="mb-4 text-4xl text-green-500">OK</div>
            <h2 className="text-2xl font-bold text-green-600 mb-3">Payment Successful!</h2>
            <p className="text-gray-600 mb-3">Invoice: <span className="font-mono font-bold text-[#002366] text-lg">{invoiceNo}</span></p>
            <p className="text-sm text-gray-500">Redirecting to invoice...</p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
           <PageTitle title="New Sale" subtitle="Create and process a new sales transaction" />
          </div>
          <div className="bg-linear-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Invoice Number</p>
            <p className="text-2xl font-mono font-bold text-[#002366]">{invoiceNo}</p>
            <p className="text-xs text-gray-500 mt-1">{today}</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="mb-4 text-sm text-gray-500">Loading products and customers...</div>
      )}
      {error && (
        <div className="mb-4 text-sm text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200 rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-linear-to-br from-[#002366] to-[#003a99] p-3 rounded-lg">
                  <MapPin className="text-white" size={15} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Customer Information</h3>
                  <p className="text-sm text-gray-500">Select or enter customer details</p>
                </div>
              </div>

              <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
                {(["guest", "saved", "new"] as const).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    className={`flex-1 font-semibold transition-all ${
                      customerType === type
                        ? "bg-linear-to-r from-[#002366] to-[#003a99] text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setCustomerType(type)
                      if (type === "guest") {
                        setClient({ clientCode: "", clientName: "", petName: "" })
                        setSelectedClientId(null)
                        setSelectedCustomerId("")
                      }
                    }}
                  >
                    {type === "guest" ? "Guest" : type === "saved" ? "Saved" : "New"}
                  </Button>
                ))}
              </div>

              {customerType === "saved" && (
                <select
                  className="w-full border-2 border-gray-200 rounded-lg p-4 mb-4 bg-white text-gray-900 font-medium hover:border-blue-400 focus:border-blue-600 transition-colors"
                  value={selectedCustomerId}
                  onChange={(e) => {
                    const selected = customers.find((c) => c.id === e.target.value)
                    setSelectedCustomerId(e.target.value)
                    if (selected) {
                      setClient({
                        clientCode: selected.code,
                        clientName: selected.name,
                        petName: selected.petName,
                      })
                      setSelectedClientId(selected.clientId)
                    }
                  }}
                >
                  <option value="">Select a saved customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.petName ? `- ${c.petName}` : ""} {c.code ? `(${c.code})` : ""}
                    </option>
                  ))}
                </select>
              )}

              {customerType !== "guest" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Customer Code</label>
                    <Input
                      placeholder="e.g., C001"
                      value={client.clientCode}
                      onChange={(e) => setClient({ ...client, clientCode: e.target.value })}
                      className="rounded-lg border-2 border-gray-200 focus:border-blue-600 transition-colors font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Customer Name</label>
                    <Input
                      placeholder="e.g., John Smith"
                      value={client.clientName}
                      onChange={(e) => setClient({ ...client, clientName: e.target.value })}
                      className="rounded-lg border-2 border-gray-200 focus:border-blue-600 transition-colors font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 block">Pet Name</label>
                    <Input
                      placeholder="e.g., Bella"
                      value={client.petName}
                      onChange={(e) => setClient({ ...client, petName: e.target.value })}
                      className="rounded-lg border-2 border-gray-200 focus:border-blue-600 transition-colors font-medium"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200 rounded-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-linear-to-br from-green-400 to-green-600 p-3 rounded-lg">
                    <ShoppingCart className="text-white" size={15} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Sales Items</h3>
                    <p className="text-sm text-gray-500">{items.length} {items.length === 1 ? "item" : "items"} added</p>
                  </div>
                </div>
                <div className="bg-gray-100 px-4 py-2 rounded-lg">
                  <p className="text-2xl font-bold text-[#002366]">{items.length}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {items.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <ShoppingCart className="mx-auto text-gray-400 mb-3" size={48} />
                    <p className="text-gray-500 font-medium">No items added yet</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Add Item" to start adding products</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="bg-linear-to-r from-gray-50 to-white border-2 border-gray-200 p-4 rounded-xl hover:shadow-md hover:border-blue-300 transition-all">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-5 relative">
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Product / Service</label>
                          <Input
                            placeholder="Search products, services, packages..."
                            value={item.name}
                            onFocus={() => {
                              setActiveItemId(item.id)
                              setSearchQuery(item.name)
                            }}
                            onChange={(e) => {
                              updateItem(item.id, { name: e.target.value })
                              setSearchQuery(e.target.value)
                            }}
                            className="text-sm font-medium border-2 border-gray-300 rounded-lg focus:border-blue-600 transition-colors"
                          />
                          {activeItemId === item.id && item.name && (
                            <div className="absolute bg-white border-2 border-gray-300 rounded-xl w-full z-20 shadow-2xl mt-1 max-h-72 overflow-y-auto">
                              {salesItems
                                .filter((si) =>
                                  si.name.toLowerCase().includes(item.name.toLowerCase()) ||
                                  si.code.toLowerCase().includes(item.name.toLowerCase()) ||
                                  (si.category && si.category.toLowerCase().includes(item.name.toLowerCase())) ||
                                  (si.packageName && si.packageName.toLowerCase().includes(item.name.toLowerCase()))
                                )
                                .slice(0, 20)
                                .map((si) => {
                                  const badge = getItemTypeBadge(si.type)
                                  return (
                                    <div
                                      key={`${si.type}-${si.id}`}
                                      className="p-3 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-b-0 transition-colors"
                                      onMouseDown={(e) => {
                                        e.preventDefault()
                                        selectSalesItem(item.id, si)
                                      }}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-gray-900 truncate">{si.name}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.color}`}>
                                              {badge.label}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                            <span className="font-mono">{si.code}</span>
                                            {si.packageName && (
                                              <>
                                                <span className="text-gray-300">•</span>
                                                <span className="text-purple-600">{si.packageName}</span>
                                              </>
                                            )}
                                            {si.type === "product" && si.stockQty !== null && (
                                              <>
                                                <span className="text-gray-300">•</span>
                                                <span className={si.stockQty > 0 ? "text-green-600" : "text-red-600"}>
                                                  Stock: {si.stockQty}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <div className="text-sm font-bold text-blue-600">
                                            Rs. {si.price.toLocaleString()}
                                          </div>
                                          <div className="text-[10px] text-gray-400">{si.category}</div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              {salesItems.filter((si) =>
                                si.name.toLowerCase().includes(item.name.toLowerCase()) ||
                                si.code.toLowerCase().includes(item.name.toLowerCase())
                              ).length === 0 && (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                  No items found matching "{item.name}"
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="col-span-2">
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Price</label>
                          <Input
                            type="number"
                            value={item.price === 0 ? "" : item.price}
                            onChange={(e) =>
                              updateItem(item.id, {
                                price: e.target.value === "" ? 0 : Number(e.target.value),
                              })
                            }
                            className="text-sm border-2 border-gray-300 rounded-lg focus:border-blue-600 transition-colors font-bold"
                            placeholder="0"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Qty</label>
                          <Input
                            type="number"
                            value={item.qty === 0 ? "" : item.qty}
                            onChange={(e) =>
                              updateItem(item.id, {
                                qty: e.target.value === "" ? 1 : Number(e.target.value),
                              })
                            }
                            className="text-sm border-2 border-gray-300 rounded-lg focus:border-blue-600 transition-colors font-bold"
                            placeholder="1"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Total</label>
                          <div className="text-sm font-bold text-[#002366] bg-blue-50 p-2 rounded-lg text-right border-2 border-blue-200">
                            Rs. {(item.price * item.qty).toLocaleString()}
                          </div>
                        </div>

                        <button
                          className="col-span-1 h-10 text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all border-2 border-red-200 hover:border-red-400 flex items-center justify-center"
                          onClick={() => removeItem(item.id)}
                          title="Remove item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Button
                variant="outline"
                onClick={addItem}
                className="w-full h-12 text-[#002366] border-2 border-[#002366] hover:bg-blue-50 font-bold text-lg rounded-lg transition-all"
              >
                <Plus size={20} className="mr-2" /> Add New Item
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200 rounded-xl overflow-hidden h-fit sticky top-6">
          <CardContent className="p-3">
            <h3 className="text-lg font-bold text-[#002366] mb-3 flex items-center gap-2">
              <DollarSign size={20} className="text-[#002366]" />
              Summary
            </h3>

            <div className="space-y-2 mb-4 pb-4 border-b-2 border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Subtotal</span>
                <span className="font-bold text-gray-900">Rs. {subtotal.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                <label className="text-gray-700 font-medium text-sm">VAT</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={vatRate}
                    onChange={(e) =>
                      setVatRate(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-12 border-2 border-gray-300 rounded px-1 py-0.5 text-right text-xs font-bold focus:border-blue-600 transition-colors"
                  />
                  <span className="text-gray-700 font-bold text-sm">%</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">VAT Amount</span>
                <span className="font-bold text-green-600">Rs. {vat.toLocaleString()}</span>
              </div>

              <div className="flex gap-1">
                <select
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as "amount" | "percent")
                  }
                  className="border-2 border-gray-300 rounded-lg px-2 py-1 text-xs bg-white font-bold focus:border-blue-600 transition-colors"
                >
                  <option value="amount">Rs</option>
                  <option value="percent">%</option>
                </select>
                <Input
                  type="number"
                  placeholder="Discount"
                  value={discountValue}
                  onChange={(e) =>
                    setDiscountValue(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="flex-1 border-2 border-gray-300 rounded-lg text-xs font-bold focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="flex justify-between font-bold text-sm pt-1">
                <span className="text-gray-600">Discount</span>
                <span className="text-red-600">- Rs. {discountAmount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center bg-linear-to-r from-[#002366] to-[#003a99] text-white p-2 rounded-lg shadow-md">
                <span className="font-bold text-sm">Total</span>
                <span className="font-bold text-lg">Rs. {total.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1 block">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as "cash" | "card" | "transfer")
                  }
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-xs bg-white font-bold hover:border-blue-400 focus:border-blue-600 transition-colors"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Card Payment Details */}
              {paymentMethod === "card" && (
                <div className="space-y-2 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold text-blue-700 uppercase">Card Details</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Card Type</label>
                      <select
                        value={cardType}
                        onChange={(e) => setCardType(e.target.value as "visa" | "mastercard" | "amex" | "other")}
                        className="w-full border-2 border-gray-300 rounded-lg p-2 text-xs bg-white font-medium focus:border-blue-600 transition-colors"
                      >
                        <option value="visa">Visa</option>
                        <option value="mastercard">Mastercard</option>
                        <option value="amex">Amex</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Last 4 Digits</label>
                      <Input
                        type="text"
                        maxLength={4}
                        placeholder="1234"
                        value={cardLastFour}
                        onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        className="border-2 border-gray-300 rounded-lg text-xs font-mono focus:border-blue-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Approval Code</label>
                    <Input
                      type="text"
                      placeholder="Terminal approval code"
                      value={cardApprovalCode}
                      onChange={(e) => setCardApprovalCode(e.target.value)}
                      className="border-2 border-gray-300 rounded-lg text-xs font-mono focus:border-blue-600 transition-colors"
                    />
                  </div>

                  {cardLastFour && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-white rounded border border-blue-200">
                      <CreditCard className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium text-gray-700">
                        {cardType.charAt(0).toUpperCase() + cardType.slice(1)} ****{cardLastFour}
                      </span>
                      {cardApprovalCode && (
                        <span className="text-xs text-gray-500">• Approval: {cardApprovalCode}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1 block">Received Amount</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={receivedAmount === 0 ? "" : receivedAmount}
                  onChange={(e) =>
                    setReceivedAmount(e.target.value === "" ? 0 : Number(e.target.value))
                  }
                  className="rounded-lg border-2 border-gray-300 focus:border-blue-600 transition-colors font-bold text-sm"
                />
              </div>

              <div className="bg-linear-to-br from-green-50 to-green-100 p-2 rounded-lg border-2 border-green-300">
                <p className="text-xs text-green-700 font-bold uppercase tracking-wide mb-0.5">Change</p>
                <p className="font-bold text-lg text-green-600">Rs. {change.toLocaleString()}</p>
              </div>

              {amountDue > 0 && (
                <div className="bg-linear-to-br from-orange-50 to-orange-100 p-2 rounded-lg border-2 border-orange-300">
                  <p className="text-xs text-orange-700 font-bold uppercase tracking-wide mb-0.5">Amount Due</p>
                  <p className="font-bold text-lg text-orange-600">Rs. {amountDue.toLocaleString()}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1 block">Notes</label>
                <textarea
                  placeholder="Add notes..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-300 focus:border-blue-600 transition-colors p-2 text-xs font-medium resize-none"
                  rows={2}
                />
              </div>

              <Button
                onClick={handleCompleteSaleClick}
                disabled={saving}
                className="w-full bg-linear-to-r from-[#002366] to-[#003a99] hover:opacity-90 text-white font-bold py-6 rounded-lg shadow-lg text-lg transition-all active:scale-95"
              >
                <CheckCircle size={20} className="mr-2" /> Complete Sale
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

