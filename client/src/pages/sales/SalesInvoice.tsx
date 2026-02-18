import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Printer, Mail, ArrowLeft, MapPin, Phone, Mail as MailIcon } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api"
import { useToast } from "@/components/common/Toast"

/* ---------------- COMPANY ---------------- */
type CompanyInfo = {
  name: string
  address: string
  phone: string
  email: string
  logo: string
}

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
}

export default function SalesInvoice() {
  const location = useLocation()
  const navigate = useNavigate()
  const { invoiceNo } = useParams()
  const toast = useToast()
  const [sale, setSale] = useState<Sale | null>((location.state as Sale) || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [company, setCompany] = useState<CompanyInfo>(DEFAULT_COMPANY)

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

  const printReceipt = () => {
    navigate("/sales/receipt-80mm", { state: sale })
  }

  const printInvoice = () => {
    const style = document.createElement("style");
    style.innerHTML = `
      @page {
        margin: 20mm 15mm 20mm 15mm;
        size: A4;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        body {
          display: block !important;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
      window.print();
      document.head.removeChild(style);
    }, 100);
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
  const safeSubtotal = Number(sale.subtotal ?? sale.total ?? 0)
  const safeVat = Number(sale.vat || 0)
  const safeDiscount = Number(sale.discount || 0)
  const total = safeSubtotal + safeVat - safeDiscount

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <style>{`
        @page {
          size: A4;
          margin: 20mm 15mm 20mm 15mm;
          @bottom-left {
            content: none;
          }
          @bottom-right {
            content: none;
          }
          @top-left {
            content: none;
          }
          @top-right {
            content: none;
          }
        }
        @media print {
          * {
            margin: 0;
            padding: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          body * {
            visibility: hidden;
          }
          #invoice-print, #invoice-print * {
            visibility: visible;
          }
          #invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20mm 15mm;
            box-sizing: border-box;
          }
        }
      `}</style>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Button variant="outline" onClick={() => navigate(-1)} className="h-9 text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={printInvoice} className="h-9 text-sm">
              <Printer className="w-4 h-4 mr-2" />
              Print Invoice
            </Button>
            <Button variant="outline" onClick={printReceipt} className="h-9 text-sm">
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
            <Button onClick={emailInvoice} className="h-9 text-sm bg-linear-to-r from-[#002366] to-[#003a99] text-white">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          </div>
        </div>

        <div id="invoice-print" className="bg-white p-4 rounded-lg shadow-lg print:shadow-none print:p-0 print:rounded-none">
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div className="flex items-start gap-3 min-w-0">
              {company.logo && (
                <img src={company.logo} alt="logo" className="h-12 w-12 object-contain shrink-0" />
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-[#002366] wrap-break-word whitespace-normal">{company.name}</h1>
                <div className="space-y-1 mt-2">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-[#002366] shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600 wrap-break-word">{company.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-[#002366] shrink-0" />
                    <p className="text-xs text-gray-600">{company.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MailIcon size={14} className="text-[#002366] shrink-0" />
                    <p className="text-xs text-gray-600 wrap-break-word">{company.email}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right min-w-0">
              <div className="bg-linear-to-br p-2 min-w-0">
                <p className="text-xs text-gray-600 font-semibold wrap-break-word whitespace-normal">INVOICE</p>
                <p className="text-lg font-bold text-[#002366] wrap-break-word whitespace-normal">{sale.invoiceNo || sale.id}</p>
                <p className="text-xs text-gray-600 wrap-break-word whitespace-normal">{sale.date}</p>
                <p className="text-xs text-gray-600 wrap-break-word whitespace-normal">{sale.time || new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#002366] pt-3 mb-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-600 mb-1">Bill To</p>
                <p className="text-sm font-bold text-gray-900">{sale.customer || sale.client?.clientName || "Guest"}</p>
                {(sale.petName || sale.client?.petName) && (
                  <p className="text-xs text-gray-600">Pet: {sale.petName || sale.client?.petName}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-600 mb-1">Payment</p>
                <div className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold text-[#002366]">
                  {sale.payment || sale.paymentType || "Cash"}
                </div>
              </div>
            </div>
          </div>

          <table className="w-full mb-4 text-xs">
            <thead className="bg-linear-to-r from-[#002366] to-[#003a99] text-white">
              <tr>
                <th className="text-left p-2 font-bold">Item</th>
                <th className="text-center p-2 font-bold">Qty</th>
                <th className="text-right p-2 font-bold">Unit Price</th>
                <th className="text-right p-2 font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((item, idx: number) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-gray-900">{item.name}</td>
                    <td className="p-2 text-center text-gray-900">{item.qty}</td>
                    <td className="p-2 text-right text-gray-900">Rs. {item.price.toLocaleString()}</td>
                    <td className="p-2 text-right font-semibold text-gray-900">Rs. {(item.qty * item.price).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">No items</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-end mb-3">
            <div className="w-64">
              <div className="flex justify-between py-1 border-b text-xs">
                <span className="text-gray-700">Subtotal</span>
                <span className="font-semibold text-gray-900">Rs. {safeSubtotal.toLocaleString()}</span>
              </div>
              {safeVat > 0 && (
                <div className="flex justify-between py-1 border-b text-xs">
                  <span className="text-gray-700">VAT (15%)</span>
                  <span className="font-semibold text-gray-900">Rs. {safeVat.toLocaleString()}</span>
                </div>
              )}
              {safeDiscount > 0 && (
                <div className="flex justify-between py-1 border-b text-xs">
                  <span className="text-gray-700">Discount</span>
                  <span className="font-semibold text-red-600">- Rs. {safeDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between py-2 bg-linear-to-r from-[#002366] to-[#003a99] text-white rounded mt-1 px-2 font-bold">
                <span>TOTAL</span>
                <span>Rs. {total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-[#002366] pt-2 text-center text-xs text-gray-600">
            <p className="mb-0.5">Thank you for your business!</p>
            <p>Contact: {company.phone}</p>
          </div>
        </div>
      </div>
    </div>
  )
}



