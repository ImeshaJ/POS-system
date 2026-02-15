import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

/* ---------- COMPANY ---------- */
const COMPANY = {
  name: "Furry Friends",
  address: "No4, Old Kesbewa Road, Gangodawila, Nugegoda",
  phone: "0704667700",
  logo: "/src/assets/images/logo.png", // optional
}

export default function SalesReceipt80mm() {
  type SaleItem = { name: string; price: number; qty: number }
  type Sale = {
    invoiceNo?: string
    date?: string
    time?: string
    client?: { clientName?: string; petName?: string }
    customer?: string
    petName?: string
    items: SaleItem[]
    subtotal: number
    vat: number
    discount?: number
    paymentType?: string
    receivedAmount?: number
    change?: number
  }

  const loc = useLocation()
  const sale = (loc.state as Sale) || null
  const navigate = useNavigate()

  if (!sale) return <div className="p-4 text-center text-gray-600">Receipt not found</div>

  const safeSubtotal = Number(sale.subtotal ?? 0)
  const safeVat = Number(sale.vat ?? 0)
  const discount = Number(sale.discount ?? 0)
  const total = safeSubtotal + safeVat - discount

  const printReceipt = () => window.print()

  return (
    <>
      <div className="print:hidden p-4 flex justify-between items-center bg-linear-to-r from-[#002366] to-[#003a99]">
        <Button variant="outline" onClick={() => navigate(-1)} className="h-8 text-xs">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <button onClick={printReceipt} className="px-4 py-2 bg-white text-[#002366] font-bold rounded-lg hover:bg-gray-100 transition text-sm">
          🖨️ Print Receipt
        </button>
      </div>

      <div id="receipt-print" className="mx-auto w-[75mm] p-2 text-[9px] font-mono bg-white">
        <div className="text-center mb-1.5 border-b border-gray-400 pb-2">
          {COMPANY.logo && (
            <img src={COMPANY.logo} alt="logo" className="h-8 mx-auto mb-0.5 object-contain" />
          )}
          <h1 className="text-[12px] font-bold text-[#002366]">{COMPANY.name}</h1>
          <p className="text-[8px] text-gray-700">{COMPANY.address}</p>
          <p className="text-[8px] text-gray-700">{COMPANY.phone}</p>
        </div>

        <div className="border-b border-dashed border-gray-400 my-1" />

        <div className="space-y-0.5 mb-1 text-[8px]">
          <div className="flex justify-between">
            <span className="font-bold">Invoice:</span>
            <span>{sale.invoiceNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Date:</span>
            <span>{sale.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Time:</span>
            <span>{sale.time ?? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>

        <div className="border-b border-dashed border-gray-400 my-1" />

        <div className="space-y-0.5 mb-1 text-[8px]">
          <div><span className="font-bold">Customer:</span> {sale.customer || sale.client?.clientName || "Guest"}</div>
          {(sale.petName || sale.client?.petName) && (
            <div><span className="font-bold">Pet:</span> {sale.petName || sale.client?.petName}</div>
          )}
        </div>

        <div className="border-b border-dashed border-gray-400 my-1" />

        <div className="mb-1">
          {sale.items.map((item: SaleItem, i: number) => (
            <div key={i} className="mb-0.5 text-[8px]">
              <div className="font-bold">{item.name}</div>
              <div className="flex justify-between">
                <span>{item.qty} x Rs. {item.price.toLocaleString()}</span>
                <span className="font-bold">Rs. {(item.qty * item.price).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-b border-dashed border-gray-400 my-1" />

        <div className="space-y-0.5 mb-1 text-[8px]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-bold">Rs. {safeSubtotal.toLocaleString()}</span>
          </div>
          {safeVat > 0 && (
            <div className="flex justify-between">
              <span>VAT</span>
              <span className="font-bold">Rs. {safeVat.toLocaleString()}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span className="font-bold">- Rs. {discount.toLocaleString()}</span>
            </div>
          )}
          <div className="border-t border-gray-400 pt-0.5 flex justify-between font-bold text-[9px]">
            <span>TOTAL</span>
            <span>Rs. {total.toLocaleString()}</span>
          </div>
        </div>

        <div className="border-b border-dashed border-gray-400 my-1" />

        <div className="space-y-0.5 text-[8px] mb-1.5">
          <div className="flex justify-between">
            <span className="font-bold">Payment:</span>
            <span>{sale.paymentType ?? "Cash"}</span>
          </div>
          {sale.receivedAmount && (
            <div className="flex justify-between">
              <span className="font-bold">Received:</span>
              <span>Rs. {sale.receivedAmount.toLocaleString()}</span>
            </div>
          )}
          {sale.change && (
            <div className="flex justify-between">
              <span className="font-bold">Change:</span>
              <span>Rs. {sale.change.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="border-b border-dashed border-gray-400 my-1" />

        <div className="text-center text-[8px] mt-1">
          <p className="font-bold">Thank you! ❤️</p>
          <p>Come again soon!</p>
        </div>
      </div>
    </>
  )
}
