import { useState, useEffect, useCallback } from "react"
import PageTitle from "@/components/common/PageTitle"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, Boxes, Tag, Barcode, Printer, RefreshCcw, Plus, Trash2, Undo2, TrendingUp, AlertTriangle, Download, FileText, FileSpreadsheet } from "lucide-react"
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { useToast } from "@/components/common/Toast"

interface ProductItem {
  id: number
  code: string
  name: string
  category: string
  unit: string
  size?: string
  weight?: string
  costPrice: number
  sellingPrice: number
  expiryDate: string
  reorderLevel: number
  supplier?: string
  supplierId?: number
  quantity: number
  status?: "In Stock" | "Low Stock" | "Expired" | "Returned"
}

type ApiProduct = {
  id: number
  code?: string
  name: string
  category?: string
  unit?: string
  size?: string
  weight?: string
  cost_price?: number
  selling_price?: number
  expiry_date?: string
  reorder_level?: number
  supplier_id?: number
  quantity?: number
  status?: string
}

type ApiSupplier = {
  id: number
  name: string
}

type ProductLabel = {
  id: number
  product_id: number | null
  label_code: string
  product_code: string
  product_name: string
  selling_price: number
  expiry_date: string
  supplier_name: string
  printed_at: string
  created_at: string
}

type LabelReportData = {
  labels: ProductLabel[]
  summary: {
    total_labels: number
    unique_products: number
    unique_suppliers: number
    total_retail_value: number
    earliest_label: string
    latest_label: string
  }
  generatedAt: string
}

const formatCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`

const getStatusBadge = (status?: ProductItem["status"]) => {
  switch (status) {
    case "Low Stock":
      return "bg-amber-100 text-amber-700"
    case "Expired":
      return "bg-rose-100 text-rose-700"
    case "Returned":
      return "bg-gray-200 text-gray-600"
    case "In Stock":
      return "bg-emerald-100 text-emerald-700"
    default:
      return "bg-slate-100 text-slate-600"
  }
}

const AddProduct = () => {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [supplier, setSupplier] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false)

  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [unit, setUnit] = useState("")
  const [size, setSize] = useState("")
  const [weight, setWeight] = useState("")
  const [costPrice, setCostPrice] = useState("")
  const [sellingPrice, setSellingPrice] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [reorderLevel, setReorderLevel] = useState("")
  const [labelQty, setLabelQty] = useState(1)

  const [units, setUnits] = useState(["Pieces", "Box", "Kg", "Liter", "Bottle", "Vial"])
  const [categories, setCategories] = useState(["Medicines", "Food", "Accessories", "Equipment", "Supplies"])
  const [newUnit, setNewUnit] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<number | null>(null)
  const [generatedLabels, setGeneratedLabels] = useState<ProductLabel[]>([])
  const [labelsLoading, setLabelsLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const [productsRes, suppliersRes] = await Promise.all([
          apiGet<ApiProduct[]>("/api/products?limit=1000"),
          apiGet<ApiSupplier[]>("/api/suppliers?limit=1000"),
        ])

        if (!mounted) return

        const supplierMap = new Map<number, string>()
        ;(suppliersRes.data || []).forEach((s) => supplierMap.set(s.id, s.name))

        const mapped = (productsRes.data || []).map((row) => mapProductRow(row, supplierMap))
        setProducts(mapped)
        setSuppliers(suppliersRes.data || [])
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : "Failed to load products")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const closeSuggestions = () => setShowSupplierSuggestions(false)
    window.addEventListener("click", closeSuggestions)
    return () => window.removeEventListener("click", closeSuggestions)
  }, [])

  const fetchLabels = useCallback(async () => {
    try {
      setLabelsLoading(true)
      const response = await apiGet<ProductLabel[]>("/api/product-labels?limit=100")
      setGeneratedLabels(response.data || [])
    } catch (err) {
      console.error("Failed to fetch labels:", err)
    } finally {
      setLabelsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLabels()
  }, [fetchLabels])

  const mapProductRow = (row: ApiProduct, supplierMap: Map<number, string>): ProductItem => {
    const today = new Date().toISOString().split("T")[0]
    const quantityValue = Number(row.quantity || 0)
    const reorderValue = Number(row.reorder_level || 0)
    let derivedStatus: ProductItem["status"] = "In Stock"
    if (row.expiry_date && row.expiry_date < today) derivedStatus = "Expired"
    else if (quantityValue <= 0) derivedStatus = "Returned"
    else if (quantityValue <= reorderValue) derivedStatus = "Low Stock"

    return {
      id: row.id,
      code: row.code || "",
      name: row.name,
      category: row.category || "",
      unit: row.unit || "",
      size: row.size || "",
      weight: row.weight || "",
      costPrice: Number(row.cost_price || 0),
      sellingPrice: Number(row.selling_price || 0),
      expiryDate: row.expiry_date || "",
      reorderLevel: Number(row.reorder_level || 0),
      supplier: row.supplier_id ? supplierMap.get(row.supplier_id) || "" : "",
      supplierId: row.supplier_id,
      quantity: quantityValue,
      status: (row.status as ProductItem["status"]) || derivedStatus,
    }
  }

  const handleAddUnit = () => {
    if (newUnit && !units.includes(newUnit)) {
      setUnits([...units, newUnit])
      setNewUnit("")
    }
  }

  const handleAddCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory])
      setNewCategory("")
    }
  }

  const ensureSupplierId = async () => {
    const trimmed = supplier.trim()
    if (!trimmed) return undefined

    const existing = suppliers.find(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (existing) return existing.id

    const created = await apiPost<ApiSupplier>("/api/suppliers", { name: trimmed })
    const newSupplier = created.data
    setSuppliers((prev) => [newSupplier, ...prev])
    return newSupplier.id
  }

  const addProduct = async () => {
    if (!code || !name || !category || !unit || !sellingPrice || !expiryDate || !supplier) {
      toast.warning("Please fill all required fields")
      return
    }

    const today = new Date().toISOString().split("T")[0]
    let status: ProductItem["status"] = "In Stock"
    if (expiryDate < today) status = "Expired"
    else if (quantity <= (Number(reorderLevel) || 0)) status = "Low Stock"

    try {
      const supplierId = await ensureSupplierId()

      const payload = {
        code,
        name,
        category,
        unit,
        size: size || undefined,
        weight: weight || undefined,
        cost_price: Number(costPrice) || 0,
        selling_price: Number(sellingPrice),
        expiry_date: expiryDate,
        reorder_level: Number(reorderLevel) || 0,
        supplier_id: supplierId,
        quantity,
        status,
      }

      const created = await apiPost<ApiProduct>("/api/products", payload)
      const supplierMap = new Map<number, string>()
      suppliers.forEach((s) => supplierMap.set(s.id, s.name))
      if (supplierId && supplier) supplierMap.set(supplierId, supplier)

      const mapped = mapProductRow(created.data, supplierMap)
      setProducts((prev) => [mapped, ...prev])
      resetForm()
      toast.success("Product purchased and added to stock!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add product")
    }
  }

  const resetForm = () => {
    setCode("")
    setName("")
    setCategory("")
    setUnit("")
    setSize("")
    setWeight("")
    setCostPrice("")
    setSellingPrice("")
    setExpiryDate("")
    setReorderLevel("")
    setSupplier("")
    setQuantity(1)
    setLabelQty(1)
  }

  const openDeleteDialog = (id: number) => {
    setProductToDelete(id)
    setDeleteDialogOpen(true)
  }

  const removeProduct = async () => {
    if (!productToDelete) return
    setDeleteDialogOpen(false)
    try {
      await apiDelete(`/api/products/${productToDelete}`)
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete))
      toast.success("Product deleted successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete product")
    } finally {
      setProductToDelete(null)
    }
  }

  const returnProduct = async (id: number) => {
    try {
      const updated = await apiPatch<ApiProduct>(`/api/products/${id}`, {
        status: "Returned",
        quantity: 0,
      })
      const supplierMap = new Map<number, string>()
      suppliers.forEach((s) => supplierMap.set(s.id, s.name))
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? mapProductRow(updated.data, supplierMap) : p))
      )
      toast.success("Product marked as returned")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark product returned")
    }
  }

  const handlePrintLabel = async (productId?: number, existingLabel?: ProductLabel) => {
    // If printing an existing label, use its data directly
    if (existingLabel) {
      printLabelsToWindow([existingLabel])
      return
    }

    let productToPrint: ProductItem | undefined = productId
      ? products.find((p) => p.id === productId)
      : undefined

    // Allow printing even if all fields are empty
    if (!productToPrint) {
      productToPrint = {
        id: 0,
        code,
        name,
        category,
        unit,
        size,
        weight,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        expiryDate,
        reorderLevel: Number(reorderLevel),
        supplier,
        quantity,
      }
    }

    // Generate unique labels via API
    try {
      setLabelsLoading(true)
      const response = await apiPost<ProductLabel[]>("/api/product-labels/generate", {
        product_id: productToPrint.id > 0 ? productToPrint.id : null,
        quantity: labelQty,
        product_code: productToPrint.code,
        product_name: productToPrint.name,
        selling_price: productToPrint.sellingPrice,
        expiry_date: productToPrint.expiryDate || null,
        supplier_name: productToPrint.supplier || supplier,
      })

      const newLabels = response.data || []
      if (newLabels.length === 0) {
        toast.warning("No labels were generated")
        return
      }

      // Update local state with new labels
      setGeneratedLabels((prev) => [...newLabels, ...prev])

      // Print the labels
      printLabelsToWindow(newLabels)

      toast.success(`${newLabels.length} unique label(s) generated and sent to print`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate labels")
    } finally {
      setLabelsLoading(false)
    }
  }

  const printLabelsToWindow = (labels: ProductLabel[]) => {
    const labelsHTML = labels
      .map(
        (label, i) => `
        <div class="label">
          <h3>${label.product_name || "Product"}</h3>
          <p class="label-code"><strong>${label.label_code}</strong></p>
          <svg id="barcode-${i}"></svg>
          <p>Price: Rs. ${Number(label.selling_price || 0).toLocaleString()}</p>
          ${label.expiry_date ? `<p>EXP: ${label.expiry_date}</p>` : ""}
        </div>
      `
      )
      .join("")

    const win = window.open("", "_blank", "width=800,height=600")
    if (!win) {
      toast.warning("Unable to open print window. Please allow popups for this site.")
      return
    }

    win.document.write(`
      <html>
        <head>
          <title>Print Labels</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #fff;
              margin: 0;
              padding: 0;
            }
            .labels-container {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              padding: 10px;
              box-sizing: border-box;
              width: 100vw;
              max-width: 100vw;
            }
            .label {
              width: 260px;
              min-height: 140px;
              max-width: 260px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border: 1px dashed #000;
              border-radius: 8px;
              box-sizing: border-box;
              padding: 10px 6px 10px 6px;
              margin: 0;
              background: #fff;
              text-align: center;
              overflow: hidden;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            h3 {
              font-size: 14px;
              margin: 0 0 4px;
              font-weight: bold;
              word-break: break-word;
            }
            p {
              font-size: 11px;
              margin: 3px 0;
              word-break: break-word;
            }
            .label-code {
              font-size: 10px;
              color: #333;
              font-family: monospace;
            }
            svg {
              margin: 6px 0;
              display: block;
            }
            @media print {
              .label {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .labels-container {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="labels-container">
            ${labelsHTML}
          </div>
          <script>
            ${labels
              .map(
                (label, i) => `
                JsBarcode("#barcode-${i}", "${label.label_code}", {
                  format: "CODE128",
                  width: 1.5,
                  height: 35,
                  displayValue: false
                });
              `
              )
              .join("")}
            window.print();
            window.close();
          </script>
        </body>
      </html>
    `)

    win.document.close()
  }

  const handleDownloadReport = async (format: "pdf" | "excel") => {
    try {
      setReportLoading(true)
      const response = await apiGet<LabelReportData>("/api/product-labels/report/data")
      const reportData = response.data

      if (!reportData || !reportData.labels || reportData.labels.length === 0) {
        toast.warning("No label data available for report")
        return
      }

      if (format === "excel") {
        downloadExcelReport(reportData)
      } else {
        downloadPdfReport(reportData)
      }

      toast.success(`Report downloaded successfully as ${format.toUpperCase()}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report")
    } finally {
      setReportLoading(false)
    }
  }

  const downloadExcelReport = (reportData: LabelReportData) => {
    const headers = [
      "Label Code",
      "Product Code",
      "Product Name",
      "Category",
      "Selling Price (Rs.)",
      "Expiry Date",
      "Supplier",
      "Generated At",
    ]

    const rows = reportData.labels.map((label) => [
      label.label_code,
      label.product_code || "-",
      label.product_name || "-",
      "-",
      label.selling_price || 0,
      label.expiry_date || "-",
      label.supplier_name || "-",
      new Date(label.created_at).toLocaleString(),
    ])

    // Summary rows
    const summaryRows = [
      [],
      ["REPORT SUMMARY"],
      ["Total Labels", reportData.summary.total_labels],
      ["Unique Products", reportData.summary.unique_products],
      ["Unique Suppliers", reportData.summary.unique_suppliers],
      ["Total Retail Value", `Rs. ${Number(reportData.summary.total_retail_value || 0).toLocaleString()}`],
      ["Report Generated", new Date(reportData.generatedAt).toLocaleString()],
    ]

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
      ...summaryRows.map((row) =>
        row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Product_Labels_Report_${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadPdfReport = (reportData: LabelReportData) => {
    const win = window.open("", "_blank", "width=900,height=700")
    if (!win) {
      toast.warning("Unable to open print window. Please allow popups for this site.")
      return
    }

    const tableRows = reportData.labels
      .map(
        (label) => `
        <tr>
          <td style="font-family: monospace; font-size: 11px;">${label.label_code}</td>
          <td>${label.product_code || "-"}</td>
          <td>${label.product_name || "-"}</td>
          <td style="text-align: right;">Rs. ${Number(label.selling_price || 0).toLocaleString()}</td>
          <td>${label.expiry_date || "-"}</td>
          <td>${label.supplier_name || "-"}</td>
          <td style="font-size: 10px;">${new Date(label.created_at).toLocaleString()}</td>
        </tr>
      `
      )
      .join("")

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product Labels Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; background: #fff; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1d4ed8; padding-bottom: 20px; }
            .header h1 { color: #0f172a; font-size: 24px; margin-bottom: 5px; }
            .header p { color: #64748b; font-size: 12px; }
            .summary { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 30px; }
            .summary-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; flex: 1; min-width: 150px; }
            .summary-item .label { font-size: 11px; color: #64748b; text-transform: uppercase; }
            .summary-item .value { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #1d4ed8; color: white; padding: 10px 8px; text-align: left; font-weight: 600; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            tr:hover { background: #eff6ff; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            @media print {
              body { padding: 10px; }
              .summary-item { page-break-inside: avoid; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Product Labels Report</h1>
            <p>Generated on ${new Date(reportData.generatedAt).toLocaleString()}</p>
          </div>

          <div class="summary">
            <div class="summary-item">
              <div class="label">Total Labels</div>
              <div class="value">${reportData.summary.total_labels}</div>
            </div>
            <div class="summary-item">
              <div class="label">Unique Products</div>
              <div class="value">${reportData.summary.unique_products}</div>
            </div>
            <div class="summary-item">
              <div class="label">Unique Suppliers</div>
              <div class="value">${reportData.summary.unique_suppliers}</div>
            </div>
            <div class="summary-item">
              <div class="label">Total Retail Value</div>
              <div class="value">Rs. ${Number(reportData.summary.total_retail_value || 0).toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Label Code</th>
                <th>Product Code</th>
                <th>Product Name</th>
                <th style="text-align: right;">Price</th>
                <th>Expiry</th>
                <th>Supplier</th>
                <th>Generated</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer">
            <p>Furry Friends POS System - Product Labels Report</p>
          </div>

          <script>
            window.print();
          </script>
        </body>
      </html>
    `)

    win.document.close()
  }

  const handleDeleteLabel = async (labelId: number) => {
    try {
      await apiDelete(`/api/product-labels/${labelId}`)
      setGeneratedLabels((prev) => prev.filter((l) => l.id !== labelId))
      toast.success("Label deleted successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete label")
    }
  }

  const totalValue = products.reduce((sum, p) => sum + p.costPrice * p.quantity, 0)
  const totalSaleValue = products.reduce((sum, p) => sum + p.sellingPrice * p.quantity, 0)
  const lowStockCount = products.filter((p) => p.status === "Low Stock").length
  const expiredCount = products.filter((p) => p.status === "Expired").length

  return (
    <>
      <PageTitle title="Add New Product" />

      {loading && <div className="mt-4 text-sm text-gray-500">Loading products...</div>}
      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

      <div className="space-y-6 pb-10">
        <Card className="brand-card brand-card-hover overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#22d3ee] p-6 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">Inventory Studio</p>
                  <h2 className="text-3xl font-bold">Add New Product</h2>
                  <p className="text-sm text-white/80">Capture supplier info, catalog specs, and pricing in one flow.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleDownloadReport("pdf")}
                      disabled={reportLoading}
                      className="h-9 rounded-2xl bg-white/90 px-4 text-[#0f172a] hover:bg-white text-sm"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button
                      onClick={() => handleDownloadReport("excel")}
                      disabled={reportLoading}
                      variant="outline"
                      className="h-9 rounded-2xl border-white/60 text-white hover:bg-white/10 text-sm"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Download Excel
                    </Button>
                  </div>
                  <div className="rounded-3xl bg-white/10 p-3">
                    <Package className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#6a11cb] to-[#2575fc] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Catalog SKUs</p>
                <p className="mt-2 text-3xl font-bold">{products.length}</p>
                <p className="text-xs text-white/80">Active listings in stock</p>
              </div>
              <Boxes className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#00b09b] to-[#22d3ee] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Inventory Value</p>
                <p className="mt-2 text-3xl font-bold">{formatCurrency(totalValue)}</p>
                <p className="text-xs text-white/80">Based on cost price</p>
              </div>
              <TrendingUp className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#ff512f] to-[#f97316] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Low Stock Items</p>
                <p className="mt-2 text-3xl font-bold">{lowStockCount}</p>
                <p className="text-xs text-white/80">Needs replenishment</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-white/70" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-linear-to-br from-[#0f172a] to-[#94a3b8] p-5 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">Expired Items</p>
                <p className="mt-2 text-3xl font-bold">{expiredCount}</p>
                <p className="text-xs text-white/80">Requires disposal</p>
              </div>
              <Trash2 className="h-10 w-10 text-white/70" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card className="brand-card brand-card-hover">
            <CardContent className="space-y-8 p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-blue-100 p-2 text-blue-600">
                  <Boxes className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Product blueprint</p>
                  <h3 className="text-lg font-bold text-gray-900">Define supplier, specs, and pricing</h3>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Supplier *</Label>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={supplier}
                        onFocus={() => setShowSupplierSuggestions(true)}
                        onChange={(e) => {
                          setSupplier(e.target.value)
                          setShowSupplierSuggestions(true)
                        }}
                        placeholder="Start typing supplier name"
                        className="h-12"
                      />
                      {showSupplierSuggestions && suppliers.length > 0 && (
                        <div className="absolute z-20 mt-2 max-h-48 w-full overflow-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
                          {suppliers
                            .filter((s) => s.name.toLowerCase().includes(supplier.toLowerCase()))
                            .map((s) => (
                              <button
                                type="button"
                                key={s.id}
                                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-blue-50"
                                onClick={() => {
                                  setSupplier(s.name)
                                  setShowSupplierSuggestions(false)
                                }}
                              >
                                <span className="font-semibold text-gray-900">{s.name}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">New names auto-create suppliers on save.</p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-600">Quantity *</Label>
                      <Input
                        type="number"
                        value={quantity}
                        min={1}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                        placeholder="1"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-600">Reorder Level</Label>
                      <Input
                        type="number"
                        value={reorderLevel}
                        onChange={(e) => setReorderLevel(e.target.value)}
                        placeholder="0"
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Product Code *</Label>
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g., PRD-001"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Product Name *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Product name"
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Category *</Label>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#1d4ed8] focus:outline-none"
                      >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="New"
                        className="h-12 w-28"
                      />
                      <Button type="button" onClick={handleAddCategory} className="h-12 px-4">
                        Add
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Unit *</Label>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#1d4ed8] focus:outline-none"
                      >
                        <option value="">Select Unit</option>
                        {units.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        placeholder="New"
                        className="h-12 w-28"
                      />
                      <Button type="button" onClick={handleAddUnit} className="h-12 px-4">
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Size</Label>
                    <Input
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      placeholder="Small / Medium / Large"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Weight</Label>
                    <Input
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g., 500g, 1kg"
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Cost Price (Rs.) *</Label>
                    <Input
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="0.00"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Selling Price (Rs.) *</Label>
                    <Input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="0.00"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Expiry Date *</Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    onClick={addProduct}
                    className="h-12 w-full bg-[#0f172a] text-white hover:bg-[#0b1220]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                  <Button variant="outline" onClick={resetForm} className="h-12 w-full text-gray-700">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Reset Form
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="brand-card brand-card-hover">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-purple-100 p-2 text-purple-600">
                  <Barcode className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Label utilities</p>
                  <h3 className="text-lg font-bold text-gray-900">Generate shelf-ready stickers</h3>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-600">Number of Labels</Label>
                <Input
                  type="number"
                  value={labelQty}
                  onChange={(e) => setLabelQty(Math.max(1, Number(e.target.value)))}
                  min={1}
                  max={50}
                  className="h-12"
                />
                <p className="text-xs text-gray-500">Uses current form data or a selected product entry.</p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => handlePrintLabel()}
                  disabled={labelsLoading}
                  className="h-11 w-full bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {labelsLoading ? "Generating..." : "Print Labels"}
                </Button>
                <Button variant="outline" onClick={resetForm} className="h-11 w-full">
                  Clear Form
                </Button>
              </div>

              <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                <p>Each label gets a <strong>unique code</strong> stored in the database. Labels can be reprinted from the table below.</p>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Download Report</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadReport("pdf")}
                    disabled={reportLoading}
                    className="h-10 text-xs"
                  >
                    <FileText className="mr-1 h-3.5 w-3.5" />
                    PDF Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadReport("excel")}
                    disabled={reportLoading}
                    className="h-10 text-xs"
                  >
                    <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
                    Excel Report
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Export all generated labels with product details, pricing, and supplier info.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {generatedLabels.length > 0 && (
          <Card className="brand-card brand-card-hover">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-purple-100 p-2 text-purple-600">
                    <Tag className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Generated Labels</p>
                    <h3 className="text-lg font-bold text-gray-900">{generatedLabels.length} unique label(s)</h3>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchLabels}
                    className="h-8 text-xs"
                  >
                    <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-linear-to-r from-[#f5f3ff] to-[#ede9fe]">
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">Label Code</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">Product</th>
                      <th className="px-4 py-3 text-right font-semibold uppercase tracking-wide text-gray-600">Price</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Expiry</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Supplier</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Generated</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedLabels.slice(0, 50).map((label, idx) => (
                      <tr
                        key={label.id}
                        className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} border-b border-gray-100 transition hover:bg-purple-50/60`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-purple-700 font-semibold">{label.label_code}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{label.product_name || "-"}</p>
                          <p className="text-xs text-gray-500">{label.product_code || "-"}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          {formatCurrency(Number(label.selling_price || 0))}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 text-xs">{label.expiry_date || "-"}</td>
                        <td className="px-4 py-3 text-center text-gray-600 text-xs">{label.supplier_name || "-"}</td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">
                          {new Date(label.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-center gap-1">
                            <Button
                              onClick={() => handlePrintLabel(undefined, label)}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2"
                              title="Reprint this label"
                            >
                              <Printer className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteLabel(label.id)}
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-rose-600 hover:text-rose-700"
                              title="Delete label"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {generatedLabels.length > 50 && (
                <p className="text-center text-xs text-gray-500">
                  Showing 50 of {generatedLabels.length} labels. Download the full report for complete data.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {products.length > 0 && (
          <Card className="brand-card brand-card-hover">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Inventory Catalog</p>
                  <h3 className="text-lg font-bold text-gray-900">{products.length} product(s) tracked</h3>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#002366]">
                  Potential revenue {formatCurrency(totalSaleValue)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-linear-to-r from-[#eff6ff] to-[#e0ecff]">
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">Code</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">Category</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Unit</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Size</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Weight</th>
                      <th className="px-4 py-3 text-right font-semibold uppercase tracking-wide text-gray-600">Cost</th>
                      <th className="px-4 py-3 text-right font-semibold uppercase tracking-wide text-gray-600">Selling</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Expiry</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Supplier</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Qty</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Status</th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, idx) => (
                      <tr
                        key={product.id}
                        className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} border-b border-gray-100 transition hover:bg-blue-50/60`}
                      >
                        <td className="px-4 py-3 font-mono text-[#1d4ed8] font-semibold">{product.code}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                        <td className="px-4 py-3 text-gray-600">{product.category}</td>
                        <td className="px-4 py-3 text-center text-gray-800">{product.unit}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{product.size || "-"}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{product.weight || "-"}</td>
                        <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(product.costPrice)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(product.sellingPrice)}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{product.expiryDate}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{product.supplier || "-"}</td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-900">{product.quantity}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(product.status)}`}>
                            {product.status || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              onClick={() => handlePrintLabel(product.id)}
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              title="Print labels for this product"
                            >
                              <Printer className="mr-1 h-3.5 w-3.5" />
                              Print
                            </Button>
                            <Button onClick={() => openDeleteDialog(product.id)} variant="destructive" size="sm" className="h-8 text-xs">
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Delete
                            </Button>
                            {product.status !== "Returned" && (
                              <Button
                                onClick={() => returnProduct(product.id)}
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                              >
                                <Undo2 className="mr-1 h-3.5 w-3.5" />
                                Return
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {products.length > 0 && (
          <Card className="brand-card brand-card-hover">
            <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total Products</p>
                  <p className="text-3xl font-bold text-gray-900">{products.length}</p>
                </div>
                <div className="h-12 w-px bg-gray-200" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total Cost Value</p>
                  <p className="text-3xl font-bold text-orange-600">{formatCurrency(totalValue)}</p>
                </div>
                <div className="h-12 w-px bg-gray-200" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total Sale Value</p>
                  <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totalSaleValue)}</p>
                </div>
              </div>

              <Button
                onClick={() => toast.success("Products saved successfully!")}
                className="h-11 w-full bg-[#16a34a] text-white hover:bg-[#15803d] md:w-auto"
              >
                <Tag className="mr-2 h-4 w-4" />
                Save Products
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={removeProduct}
      />
    </>
  )
}

export default AddProduct
