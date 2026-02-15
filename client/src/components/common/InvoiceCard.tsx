import React from "react"

type SaleItem = {
  name: string
  price: number
  qty: number
}

type SaleClient = {
  clientName?: string
  petName?: string
  clientCode?: string
}

type Sale = {
  id?: string
  invoiceNo?: string
  date?: string
  subtotal: number
  vat: number
  discount?: number
  items: SaleItem[]
  client?: SaleClient
  customer?: string
  petName?: string
  clientId?: string
  paymentType?: string
  payment?: string
}

interface InvoiceCardProps {
  sale: Sale | null
  company?: {
    name: string
    address: string
    phone: string
    email: string
    logo: string
  }
  className?: string
  contentClassName?: string
}

const DEFAULT_COMPANY = {
  name: "Furry Friends",
  address: "No 12, Main Street, Colombo",
  phone: "+94 77 123 4567",
  email: "furryfriends@gmail.com",
  logo: "/src/assets/images/logo.png",
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  sale,
  company = DEFAULT_COMPANY,
  className = "",
  contentClassName = "",
}) => {
  if (!sale) return null
  const discount = sale.discount ?? 0
  const grandTotal = sale.subtotal + sale.vat - discount

  return (
    <div id="invoice-print" className={className}>
      <div className={`p-0 space-y-0 text-[10px] leading-none ${contentClassName}`}>
        {/* HEADER */}
        <div className="flex justify-between items-start border-b pb-4">
            <div className="flex items-center gap-1">
              <img src={company.logo} alt="Logo" className="h-6 w-6 rounded" />
              <div>
                <h1 className="text-[10px] font-bold text-gray-900">{company.name}</h1>
                <p className="text-[8px] text-gray-600">{company.address}</p>
              </div>
            </div>
          <div className="text-right">
            <p className="text-xs text-gray-600 uppercase">Invoice</p>
            <p className="text-lg font-bold">{sale.invoiceNo || sale.id}</p>
            <p className="text-xs text-gray-600">{sale.date}</p>
          </div>
        </div>

        {/* CUSTOMER */}
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs text-gray-600 font-semibold">Bill To</p>
            <p className="font-medium">{sale.client?.clientName || sale.customer || "-"}</p>
            <p className="text-gray-600">{sale.client?.petName || sale.petName || "-"}</p>
            <p className="text-gray-600">{sale.client?.clientCode || sale.clientId || "-"}</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>Payment: <span className="font-semibold capitalize">{sale.paymentType || sale.payment}</span></p>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2">Item</th>
              <th className="text-right py-2">Price</th>
              <th className="text-center py-2">Qty</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="py-3">{item.name}</td>
                <td className="text-right py-3">Rs. {item.price.toLocaleString()}</td>
                <td className="text-center py-3">{item.qty}</td>
                <td className="text-right py-3 font-medium">Rs. {(item.price * item.qty).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm border-t-2 border-gray-300 pt-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>Rs. {sale.subtotal?.toLocaleString?.() || sale.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT</span>
              <span>Rs. {sale.vat?.toLocaleString?.() || sale.vat}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>- Rs. {discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span>Rs. {grandTotal?.toLocaleString?.() || grandTotal}</span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center text-xs text-gray-500 border-t pt-4">
          Thank you for choosing {company.name} 🐾
        </div>
      </div>
    </div>
  )
}
