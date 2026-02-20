import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Printer, Mail, ArrowLeft, Download, Receipt } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api"
import { useToast } from "@/components/common/Toast"
import InvoiceA4 from "@/components/invoice/InvoiceA4"
import type { InvoiceData, CompanyInfo } from "@/components/invoice/InvoiceA4"
import html2pdf from "html2pdf.js"

/* ---------------- COMPANY ---------------- */
const DEFAULT_COMPANY: CompanyInfo = {
  name: "Furry Friends",
  address: "No4, Old Kesbewa Road, Gangodawila, Nugegoda",
  phone: "0704667700",
  email: "skfurryfriends@gmail.com",
  logo: "/src/assets/images/logo.png",
}

type ShopSettings = {
  shopName: string
  address: string
  phone: string
  email: string
  vatNumber?: string
  website?: string
  bankName?: string
  bankAccount?: string
  bankBranch?: string
}

type SaleItem = {
  name: string
  price: number
  qty: number
}

type ApiSale = {
  id: number
  invoice_no?: string
  date?: string
  time?: string
  client_id?: number
  customer?: string
  pet_name?: string
  total?: number
  subtotal?: number
  vat?: number
  discount?: number
  payment_type?: string
  status?: string
}

type ApiSaleItem = {
  sale_id: number
  name: string
  price?: number
  qty?: number
}

type Sale = {
  id?: string
  invoiceNo?: string
  date?: string
  time?: string
  clientId?: string
  customer?: string
  petName?: string
  total?: number
  payment?: string
  paymentType?: string
  status?: string
  items?: SaleItem[]
  subtotal: number
  vat?: number
  discount?: number
  client?: {
    clientName?: string
    petName?: string
  }
  receivedAmount?: number
  change?: number
}

export default function SalesInvoice() {
  const location = useLocation()
  const navigate = useNavigate()
  const { invoiceNo } = useParams()
  const toast = useToast()
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [sale, setSale] = useState<Sale | null>((location.state as Sale) || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [company, setCompany] = useState<CompanyInfo>(DEFAULT_COMPANY)
  const [downloading, setDownloading] = useState(false)

  // Fetch company info from settings API
  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const res = await apiGet<ShopSettings>("/api/settings/shop")
        if (res.data) {
          setCompany({
            name: res.data.shopName || DEFAULT_COMPANY.name,
            address: res.data.address || DEFAULT_COMPANY.address,
            phone: res.data.phone || DEFAULT_COMPANY.phone,
            email: res.data.email || DEFAULT_COMPANY.email,
            logo: DEFAULT_COMPANY.logo,
            vatNumber: res.data.vatNumber,
            website: res.data.website,
            bankName: res.data.bankName,
            bankAccount: res.data.bankAccount,
            bankBranch: res.data.bankBranch,
          })
        }
      } catch {
        // Use defaults if API fails
      }
    }
    loadCompanyInfo()
  }, [])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (sale || !invoiceNo) return
      try {
        setLoading(true)
        setError(null)

        const [salesRes, itemsRes] = await Promise.all([
          apiGet<ApiSale[]>("/api/sales?limit=1000"),
          apiGet<ApiSaleItem[]>("/api/sale-items?limit=2000"),
        ])

        const normalize = (value: string) => value.trim().toUpperCase().replace(/^INV-/, "")
        const input = normalize(invoiceNo)

        const sales = salesRes.data || []
        const found = sales.find((s) => {
          const candidate = s.invoice_no || `INV-${s.id}`
          return normalize(candidate) === input || String(s.id) === input
        })

        if (!found) {
          if (mounted) setError("Invoice not found")
          return
        }

        const items = (itemsRes.data || [])
          .filter((i) => i.sale_id === found.id)
          .map((i) => ({
            name: i.name,
            price: Number(i.price || 0),
            qty: Number(i.qty || 0),
          }))

        const mapped: Sale = {
          id: found.invoice_no || `INV-${found.id}`,
          invoiceNo: found.invoice_no || `INV-${found.id}`,
          date: found.date || "",
          time: found.time || "",
          clientId: found.client_id ? String(found.client_id) : "",
          customer: found.customer || "Guest",
          petName: found.pet_name || "",
          total: Number(found.total || 0),
          payment: found.payment_type || "Cash",
          paymentType: found.payment_type || "Cash",
          status: found.status || "Completed",
          items,
          subtotal: Number(found.subtotal || found.total || 0),
          vat: Number(found.vat || 0),
          discount: Number(found.discount || 0),
        }

        if (mounted) setSale(mapped)
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load invoice")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [invoiceNo, sale])

  if (!sale) {
    if (loading) return <div className="p-6 text-center text-gray-600">Loading invoice...</div>
    return <div className="p-6 text-center text-gray-600">{error || "Invoice not found"}</div>
  }

  const safeSubtotal = Number(sale.subtotal ?? sale.total ?? 0)
  const safeVat = Number(sale.vat || 0)
  const safeDiscount = Number(sale.discount || 0)
  const total = safeSubtotal + safeVat - safeDiscount

  // Convert sale to InvoiceData format
  const invoiceData: InvoiceData = {
    invoiceNo: sale.invoiceNo || sale.id || "",
    date: sale.date || new Date().toISOString().split("T")[0],
    time: sale.time,
    customer: sale.customer || sale.client?.clientName || "Guest",
    petName: sale.petName || sale.client?.petName,
    items: sale.items || [],
    subtotal: safeSubtotal,
    vat: safeVat,
    discount: safeDiscount,
    total: total,
    paymentType: sale.paymentType || sale.payment || "Cash",
    status: sale.status || "Completed",
  }

  const printReceipt = () => {
    navigate("/sales/receipt-80mm", { state: sale })
  }

  const printInvoice = () => {
    const printContent = document.getElementById("invoice-a4-print")
    if (!printContent) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast.error("Please allow popups to print")
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceData.invoiceNo}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
              font-size: 14px;
              line-height: 1.5;
              color: #1f2937;
              background: white;
              padding: 20mm 15mm;
            }
            @page {
              size: A4;
              margin: 0;
            }
            @media print {
              body {
                padding: 20mm 15mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            .text-\\[\\#002366\\] { color: #002366; }
            .bg-\\[\\#002366\\] { background-color: #002366; }
            .border-\\[\\#002366\\] { border-color: #002366; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .bg-green-100 { background-color: #dcfce7; }
            .bg-yellow-100 { background-color: #fef9c3; }
            .bg-blue-50 { background-color: #eff6ff; }
            .bg-yellow-50 { background-color: #fefce8; }
            .text-white { color: white; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-900 { color: #111827; }
            .text-red-600 { color: #dc2626; }
            .text-green-800 { color: #166534; }
            .text-yellow-800 { color: #854d0e; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .text-xs { font-size: 12px; }
            .text-sm { font-size: 14px; }
            .text-lg { font-size: 18px; }
            .text-xl { font-size: 20px; }
            .text-2xl { font-size: 24px; }
            .text-4xl { font-size: 36px; }
            .uppercase { text-transform: uppercase; }
            .capitalize { text-transform: capitalize; }
            .tracking-wider { letter-spacing: 0.05em; }
            .tracking-tight { letter-spacing: -0.025em; }
            .rounded-lg { border-radius: 8px; }
            .rounded-tl-lg { border-top-left-radius: 8px; }
            .rounded-tr-lg { border-top-right-radius: 8px; }
            .rounded-full { border-radius: 9999px; }
            .border { border-width: 1px; }
            .border-b { border-bottom-width: 1px; }
            .border-b-2 { border-bottom-width: 2px; }
            .border-t-2 { border-top-width: 2px; }
            .border-gray-200 { border-color: #e5e7eb; }
            .border-blue-100 { border-color: #dbeafe; }
            .border-yellow-100 { border-color: #fef3c7; }
            .p-4 { padding: 16px; }
            .px-2 { padding-left: 8px; padding-right: 8px; }
            .px-4 { padding-left: 16px; padding-right: 16px; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .py-3 { padding-top: 12px; padding-bottom: 12px; }
            .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
            .pb-6 { padding-bottom: 24px; }
            .pt-6 { padding-top: 24px; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .mt-6 { margin-top: 24px; }
            .mt-8 { margin-top: 32px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-8 { margin-bottom: 32px; }
            .gap-2 { gap: 8px; }
            .gap-4 { gap: 16px; }
            .gap-8 { gap: 32px; }
            .flex { display: flex; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
            .justify-between { justify-content: space-between; }
            .justify-end { justify-content: flex-end; }
            .items-start { align-items: flex-start; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .inline-block { display: inline-block; }
            .inline-flex { display: inline-flex; }
            .w-full { width: 100%; }
            .w-80 { width: 320px; }
            .max-w-\\[250px\\] { max-width: 250px; }
            .h-16 { height: 64px; }
            .w-16 { width: 64px; }
            .object-contain { object-fit: contain; }
            .whitespace-pre-line { white-space: pre-line; }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 12px 16px; }
            .opacity-80 { opacity: 0.8; }
            .-mx-4 { margin-left: -16px; margin-right: -16px; }
            .-mb-4 { margin-bottom: -16px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()

    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  const downloadPDF = async () => {
    const element = document.getElementById("invoice-a4-print")
    if (!element) {
      toast.error("Invoice not found")
      return
    }

    setDownloading(true)

    try {
      const opt = {
        margin: [15, 15, 15, 15] as [number, number, number, number],
        filename: `Invoice_${invoiceData.invoiceNo}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const
        },
      }

      await html2pdf().set(opt).from(element).save()
      toast.success("PDF downloaded successfully")
    } catch (err) {
      console.error("PDF generation error:", err)
      toast.error("Failed to generate PDF")
    } finally {
      setDownloading(false)
    }
  }

  const emailInvoice = async () => {
    const to = window.prompt("Enter customer email")
    if (!to) return

    try {
      await apiPost("/api/invoices/email", { to, invoice: sale })
      toast.success("Invoice sent to email")
    } catch (error) {
      console.error("Email error:", error)
      toast.error(error instanceof Error ? error.message : "Email failed")
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      {/* Action Bar */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="h-10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={printReceipt}
              className="h-10 text-sm"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Print Receipt (POS)
            </Button>
            <Button
              variant="outline"
              onClick={printInvoice}
              className="h-10 text-sm"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Invoice (A4)
            </Button>
            <Button
              variant="outline"
              onClick={downloadPDF}
              disabled={downloading}
              className="h-10 text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? "Generating..." : "Download PDF"}
            </Button>
            <Button
              onClick={emailInvoice}
              className="h-10 text-sm bg-[#002366] hover:bg-[#001a4d] text-white"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8 md:p-12">
        <InvoiceA4
          ref={invoiceRef}
          invoice={invoiceData}
          company={company}
        />
      </div>

      {/* Format Info */}
      <div className="max-w-4xl mx-auto mt-6 text-center text-sm text-gray-500">
        <p>
          <strong>Print Invoice (A4)</strong> - Full-size professional invoice for clients
          <span className="mx-2">|</span>
          <strong>Print Receipt (POS)</strong> - Compact receipt for thermal printers
        </p>
      </div>
    </div>
  )
}
