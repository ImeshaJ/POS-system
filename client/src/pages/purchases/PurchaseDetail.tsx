import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import PageTitle from "@/components/common/PageTitle"
import Loader from "@/components/common/Loader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiGet } from "@/lib/api"
import { useToast } from "@/components/common/Toast"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Download,
  FileText,
  Package,
  Phone,
  Printer,
  Receipt,
  User,
} from "lucide-react"

type PurchaseItem = {
  id: number
  product_id: number
  product_name: string
  product_code: string
  qty: number
  cost_price: string
}

type PurchaseData = {
  id: number
  invoice_no: string
  date: string
  total: string
  status: string
  supplier_id: number
  supplier_name: string
  supplier_code: string
  supplier_phone: string
  staff_username: string
  staff_email: string
  created_at: string
  items: PurchaseItem[]
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
}

const formatCurrency = (value: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value
  return `Rs. ${num.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "N/A"
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function PurchaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const printRef = useRef<HTMLDivElement>(null)

  const [purchase, setPurchase] = useState<PurchaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (id) {
      loadPurchase()
    }
  }, [id])

  async function loadPurchase() {
    setLoading(true)
    setError("")
    try {
      const res = await apiGet<PurchaseData>(`/api/purchases/${id}/full`)
      setPurchase(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase details")
      toast.error("Failed to load purchase details")
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    if (!printRef.current) return
    const printContent = printRef.current.innerHTML
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${purchase?.invoice_no || id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #1e40af; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-section { padding: 15px; background: #f8fafc; border-radius: 8px; }
            .info-section h3 { margin: 0 0 10px 0; color: #374151; font-size: 14px; text-transform: uppercase; }
            .info-section p { margin: 5px 0; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #1e40af; color: white; padding: 12px; text-align: left; }
            td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; background: #f0f9ff; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 40px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${printContent}
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  function handleExportCSV() {
    if (!purchase) return

    const headers = ["Product Code", "Product Name", "Quantity", "Unit Cost", "Total"]
    const rows = purchase.items.map((item) => [
      item.product_code || "-",
      item.product_name || "Unknown Product",
      item.qty,
      parseFloat(item.cost_price),
      item.qty * parseFloat(item.cost_price),
    ])

    const totalRow = ["", "", "", "Total:", parseFloat(purchase.total)]

    const csv = [
      `Purchase Order: ${purchase.invoice_no}`,
      `Supplier: ${purchase.supplier_name}`,
      `Date: ${formatDate(purchase.date)}`,
      "",
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      totalRow.join(","),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Purchase_${purchase.invoice_no}_${purchase.date}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  if (error || !purchase) {
    return (
      <div className="space-y-6">
        <PageTitle title="Purchase Details" />
        <Card className="brand-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-4">
              {error || "Purchase not found"}
            </p>
            <Button onClick={() => navigate("/purchases")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Purchases
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const itemsTotal = purchase.items.reduce(
    (sum, item) => sum + item.qty * parseFloat(item.cost_price),
    0
  )

  return (
    <div className="space-y-6">
      <PageTitle
        title="Purchase Details"
        subtitle={`Order ${purchase.invoice_no || `#${purchase.id}`}`}
      />

      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button onClick={() => navigate("/purchases")} variant="outline" className="rounded-2xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Purchases
        </Button>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="rounded-2xl">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handlePrint} className="rounded-2xl bg-[#4338ca] text-white hover:bg-[#312e81]">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Print Content */}
      <div ref={printRef}>
        {/* Order Header Card */}
        <Card className="brand-card brand-card-hover overflow-hidden mb-6">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-[#0f172a] via-[#1e40af] to-[#3b82f6] p-6 text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">Purchase Order</p>
                  <h2 className="text-3xl font-bold">{purchase.invoice_no || `PO-${purchase.id}`}</h2>
                  <p className="text-sm text-white/80 mt-1">
                    Created on {formatDate(purchase.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    className={`${
                      STATUS_STYLES[purchase.status?.toLowerCase()] || STATUS_STYLES.pending
                    } border text-sm px-4 py-1`}
                  >
                    {purchase.status || "Pending"}
                  </Badge>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(purchase.total)}</p>
                  <p className="text-xs text-white/70">Total Amount</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
              {/* Supplier Info */}
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Supplier Information</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-lg text-foreground">
                    {purchase.supplier_name || "Unknown Supplier"}
                  </p>
                  {purchase.supplier_code && (
                    <p className="text-muted-foreground">
                      Code: {purchase.supplier_code}
                    </p>
                  )}
                  {purchase.supplier_phone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {purchase.supplier_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Purchase Info */}
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Purchase Details</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium text-foreground">
                      {formatDate(purchase.date)}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Items:</span>
                    <span className="font-medium text-foreground">
                      {purchase.items.length} products
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total Qty:</span>
                    <span className="font-medium text-foreground">
                      {purchase.items.reduce((sum, item) => sum + item.qty, 0)} units
                    </span>
                  </p>
                </div>
              </div>

              {/* Staff Info */}
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Processed By</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-lg text-foreground">
                    {purchase.staff_username || "System"}
                  </p>
                  {purchase.staff_email && (
                    <p className="text-muted-foreground">{purchase.staff_email}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card className="brand-card brand-card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-[#eff6ff] to-[#eef2ff]">
                    <TableHead className="font-semibold">#</TableHead>
                    <TableHead className="font-semibold">Product Code</TableHead>
                    <TableHead className="font-semibold">Product Name</TableHead>
                    <TableHead className="text-center font-semibold">Quantity</TableHead>
                    <TableHead className="text-right font-semibold">Unit Cost</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items.map((item, idx) => {
                    const lineTotal = item.qty * parseFloat(item.cost_price)
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/40">
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {item.product_code || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {item.product_name || "Unknown Product"}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {item.qty}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(item.cost_price)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatCurrency(lineTotal)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="border-t bg-gradient-to-r from-[#f0f9ff] to-[#eff6ff] p-6">
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(itemsTotal)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-3">
                    <span>Total:</span>
                    <span className="text-[#1e40af]">{formatCurrency(purchase.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={() => navigate("/purchases")}
          variant="outline"
          className="rounded-2xl"
        >
          Back to List
        </Button>
        <Button
          onClick={() => navigate("/purchases/new")}
          className="rounded-2xl bg-[#4338ca] text-white hover:bg-[#312e81]"
        >
          New Purchase
        </Button>
      </div>
    </div>
  )
}
