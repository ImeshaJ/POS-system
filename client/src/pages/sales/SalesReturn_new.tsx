import { useState } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Printer, Search, Check, X, ArrowRight, Package, AlertCircle, CheckCircle2 } from "lucide-react"

/* ---------- TYPES ---------- */

type ReturnItem = {
  id: number
  productCode: string
  name: string
  qty: number
  price: number
  selected: boolean
}

type Invoice = {
  invoiceNo: string
  clientCode?: string
  clientName?: string
  petName?: string
  date?: string
  items: ReturnItem[]
}

/* ---------- MOCK DATA ---------- */

const mockInvoice: Invoice = {
  invoiceNo: "INV-1023",
  clientCode: "CL-00125",
  clientName: "John Perera",
  petName: "Rocky",
  date: "2025-01-10",
  items: [
    {
      id: 1,
      productCode: "PR-1001",
      name: "Dog Vaccination",
      qty: 1,
      price: 2500,
      selected: false,
    },
    {
      id: 2,
      productCode: "PR-1002",
      name: "Pet Shampoo",
      qty: 2,
      price: 500,
      selected: false,
    },
    {
      id: 3,
      productCode: "PR-1003",
      name: "Dog Food 5kg",
      qty: 1,
      price: 3000,
      selected: false,
    },
  ],
}

/* ---------- COMPONENT ---------- */

const SalesReturn = () => {
  const [invoiceNo, setInvoiceNo] = useState("")
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [searchError, setSearchError] = useState("")

  const searchInvoice = () => {
    setSearchError("")
    if (!invoiceNo.trim()) {
      setSearchError("Please enter an invoice number")
      return
    }

    if (invoiceNo.toUpperCase() === mockInvoice.invoiceNo) {
      setInvoice(mockInvoice)
    } else {
      setSearchError("Invoice not found. Try 'INV-1023'")
      setInvoice(null)
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

  const handleProcessReturn = () => {
    if (!invoice || selectedCount === 0) {
      setSearchError("Please select at least one item to return")
      return
    }
    setShowConfirm(true)
  }

  const confirmProcessReturn = async () => {
    setShowConfirm(false)
    setProcessing(true)
    await new Promise((res) => setTimeout(res, 1500))
    setProcessing(false)
    setShowSuccess(true)
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

      <div className="max-w-5xl mx-auto pb-8">
        {/* SEARCH SECTION */}
        <div className="mb-8">
          <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-linear-to-r from-orange-500 to-red-500 text-white p-8">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">Process Sales Return</h2>
                </div>
                <p className="text-orange-100">Search for an invoice and select items to return</p>
              </div>

              <div className="p-8">
                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice Number</label>
                    <Input
                      type="text"
                      placeholder="Enter invoice number (e.g., INV-1023)"
                      value={invoiceNo}
                      onChange={(e) => {
                        setInvoiceNo(e.target.value)
                        setSearchError("")
                      }}
                      onKeyPress={(e) => e.key === "Enter" && searchInvoice()}
                      className="text-base h-11"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={searchInvoice}
                      disabled={!invoiceNo.trim() || processing}
                      className="bg-[#002366] hover:bg-[#001a4d] px-8 h-11 flex items-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      Search
                    </Button>
                  </div>
                </div>

                {searchError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {searchError}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* INVOICE DETAILS & ITEMS */}
        {invoice && (
          <>
            {/* CLIENT INFO SECTION */}
            <div className="mb-8">
              <Card className="border-0 shadow-lg rounded-2xl">
                <CardContent className="p-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    Invoice Found
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-linear-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Invoice No.</p>
                      <p className="text-lg font-bold text-gray-900 mt-2">{invoice.invoiceNo}</p>
                    </div>

                    <div className="bg-linear-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Client ID</p>
                      <p className="text-lg font-bold text-gray-900 mt-2">{invoice.clientCode}</p>
                    </div>

                    <div className="bg-linear-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl">
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Client Name</p>
                      <p className="text-lg font-bold text-gray-900 mt-2">{invoice.clientName}</p>
                    </div>

                    <div className="bg-linear-to-br from-amber-50 to-amber-100 p-4 rounded-xl">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Pet Name</p>
                      <p className="text-lg font-bold text-gray-900 mt-2">{invoice.petName}</p>
                    </div>
                  </div>

                  {invoice.date && (
                    <div className="text-sm text-gray-600 border-t pt-4">
                      <span className="font-semibold">Invoice Date:</span> {new Date(invoice.date).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ITEMS SELECTION */}
            <div className="mb-8">
              <Card className="border-0 shadow-lg rounded-2xl">
                <CardContent className="p-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-600" />
                    Select Items to Return
                  </h3>

                  <div className="space-y-3">
                    {invoice.items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          item.selected
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 bg-white hover:border-orange-300"
                        }`}
                        onClick={() => toggleItem(item.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                              item.selected
                                ? "bg-orange-500 border-orange-500"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {item.selected && <Check className="w-4 h-4 text-white" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-700">
                                {item.productCode}
                              </span>
                              <span className="font-semibold text-gray-900">{item.name}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm text-gray-500">Qty: {item.qty}</div>
                            <div className="font-bold text-gray-900">
                              Rs. {(item.price * item.qty).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{selectedCount}</span> of{" "}
                      <span className="font-semibold text-gray-900">{invoice.items.length}</span> items selected
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* REFUND SUMMARY & ACTION */}
            <div className="mb-8">
              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <div className="bg-linear-to-r from-red-50 to-orange-50 p-8 border-b">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Return Summary</h3>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b">
                      <span className="text-gray-600">Number of Items:</span>
                      <span className="font-bold text-gray-900">{selectedCount} item(s)</span>
                    </div>

                    <div className="flex justify-between items-center text-lg">
                      <span className="font-semibold text-gray-900">Refund Amount:</span>
                      <span className="text-3xl font-bold text-red-600">
                        Rs. {refundAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <CardContent className="p-8">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setInvoice(null)
                        setInvoiceNo("")
                      }}
                      className="flex-1 h-12 text-base"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>

                    <Button
                      onClick={handleProcessReturn}
                      disabled={refundAmount === 0 || processing}
                      className="flex-1 h-12 text-base bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4" />
                          Process Return
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* CONFIRMATION DIALOG */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="border-0 shadow-2xl rounded-2xl max-w-md w-full overflow-hidden">
              <div className="bg-linear-to-br from-orange-500 to-red-500 text-white p-8 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">Confirm Return?</h3>
                  <p className="text-orange-100">This action cannot be undone</p>
                </div>
              </div>

              <CardContent className="p-8 space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Refund Amount</div>
                  <div className="text-3xl font-bold text-red-600">
                    Rs. {refundAmount.toLocaleString()}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                    disabled={processing}
                    className="flex-1 h-11"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmProcessReturn}
                    disabled={processing}
                    className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {processing ? "Processing..." : "Confirm"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SUCCESS DIALOG */}
        {showSuccess && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="border-0 shadow-2xl rounded-2xl max-w-md w-full overflow-hidden">
              <div className="bg-linear-to-br from-green-500 to-emerald-500 text-white p-8 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">Return Processed!</h3>
                  <p className="text-green-100">Refund has been issued successfully</p>
                </div>
              </div>

              <CardContent className="p-8 space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-sm text-green-700 mb-1">Refund Amount</div>
                  <div className="text-2xl font-bold text-green-600">
                    Rs. {refundAmount.toLocaleString()}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleNewReturn}
                    className="flex-1 h-11 bg-[#002366] hover:bg-[#001a4d] text-white flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print Receipt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNewReturn}
                    className="flex-1 h-11"
                  >
                    New Return
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}

export default SalesReturn
