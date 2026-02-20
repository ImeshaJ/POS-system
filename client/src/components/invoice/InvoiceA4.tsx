import { forwardRef } from "react"

export type InvoiceItem = {
  name: string
  price: number
  qty: number
  description?: string
}

export type InvoiceData = {
  invoiceNo: string
  date: string
  time?: string
  dueDate?: string
  customer: string
  customerAddress?: string
  customerPhone?: string
  customerEmail?: string
  petName?: string
  items: InvoiceItem[]
  subtotal: number
  vat: number
  discount: number
  total: number
  paymentType?: string
  paymentStatus?: string
  notes?: string
  status?: string
}

export type CompanyInfo = {
  name: string
  address: string
  phone: string
  email: string
  logo?: string
  website?: string
  vatNumber?: string
  bankName?: string
  bankAccount?: string
  bankBranch?: string
}

interface InvoiceA4Props {
  invoice: InvoiceData
  company: CompanyInfo
}

const InvoiceA4 = forwardRef<HTMLDivElement, InvoiceA4Props>(
  ({ invoice, company }, ref) => {
    const formatCurrency = (amount: number) => {
      return `Rs. ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "-"
      try {
        const date = new Date(dateStr)
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        })
      } catch {
        return dateStr
      }
    }

    return (
      <div
        ref={ref}
        id="invoice-a4-print"
        className="bg-white w-full max-w-[210mm] mx-auto"
        style={{
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontSize: "14px",
          lineHeight: "1.5",
          color: "#1f2937",
        }}
      >
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-[#002366]">
          {/* Company Info */}
          <div className="flex items-start gap-4">
            {company.logo && (
              <img
                src={company.logo}
                alt={company.name}
                className="h-16 w-16 object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-[#002366] mb-1">
                {company.name}
              </h1>
              <p className="text-sm text-gray-600 max-w-[250px]">
                {company.address}
              </p>
              <p className="text-sm text-gray-600">Tel: {company.phone}</p>
              <p className="text-sm text-gray-600">Email: {company.email}</p>
              {company.website && (
                <p className="text-sm text-gray-600">Web: {company.website}</p>
              )}
              {company.vatNumber && (
                <p className="text-sm text-gray-600 mt-1">
                  VAT No: {company.vatNumber}
                </p>
              )}
            </div>
          </div>

          {/* Invoice Title & Number */}
          <div className="text-right">
            <h2 className="text-4xl font-bold text-[#002366] tracking-tight mb-2">
              INVOICE
            </h2>
            <div className="bg-[#002366] text-white px-4 py-2 rounded-lg inline-block">
              <p className="text-xs uppercase tracking-wider opacity-80">Invoice No.</p>
              <p className="text-xl font-bold">{invoice.invoiceNo}</p>
            </div>
          </div>
        </div>

        {/* Invoice Details Row */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Bill To */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
              Bill To
            </h3>
            <p className="text-lg font-semibold text-gray-900">
              {invoice.customer}
            </p>
            {invoice.customerAddress && (
              <p className="text-sm text-gray-600">{invoice.customerAddress}</p>
            )}
            {invoice.customerPhone && (
              <p className="text-sm text-gray-600">Tel: {invoice.customerPhone}</p>
            )}
            {invoice.customerEmail && (
              <p className="text-sm text-gray-600">Email: {invoice.customerEmail}</p>
            )}
            {invoice.petName && (
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-medium">Pet:</span> {invoice.petName}
              </p>
            )}
          </div>

          {/* Invoice Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
              Invoice Details
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500">Issue Date:</p>
                <p className="font-semibold text-gray-900">{formatDate(invoice.date)}</p>
              </div>
              {invoice.time && (
                <div>
                  <p className="text-gray-500">Time:</p>
                  <p className="font-semibold text-gray-900">{invoice.time}</p>
                </div>
              )}
              {invoice.dueDate && (
                <div>
                  <p className="text-gray-500">Due Date:</p>
                  <p className="font-semibold text-gray-900">{formatDate(invoice.dueDate)}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Payment Method:</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {invoice.paymentType || "Cash"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Status:</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                  invoice.status === "Completed" || invoice.paymentStatus === "Paid"
                    ? "bg-green-100 text-green-800"
                    : invoice.status === "Pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {invoice.paymentStatus || invoice.status || "Completed"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="bg-[#002366] text-white">
                <th className="text-left py-3 px-4 font-semibold text-sm uppercase tracking-wider rounded-tl-lg">
                  #
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm uppercase tracking-wider">
                  Item / Description
                </th>
                <th className="text-center py-3 px-4 font-semibold text-sm uppercase tracking-wider">
                  Qty
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm uppercase tracking-wider rounded-tr-lg">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-200 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="py-3 px-4 text-gray-600">{index + 1}</td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-500">{item.description}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-900">
                    {item.qty}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-900">
                    {formatCurrency(item.qty * item.price)}
                  </td>
                </tr>
              ))}
              {invoice.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>
              {invoice.vat > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">VAT (15%)</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(invoice.vat)}
                  </span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-semibold text-red-600">
                    - {formatCurrency(invoice.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-3 mt-2 bg-[#002366] text-white rounded-lg px-4 -mx-4 -mb-4">
                <span className="text-lg font-bold">TOTAL</span>
                <span className="text-lg font-bold">
                  {formatCurrency(invoice.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details (Optional) */}
        {company.bankName && (
          <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 className="text-sm font-semibold text-[#002366] mb-2">
              Bank Details for Wire Transfer
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Bank Name</p>
                <p className="font-medium text-gray-900">{company.bankName}</p>
              </div>
              {company.bankAccount && (
                <div>
                  <p className="text-gray-500">Account Number</p>
                  <p className="font-medium text-gray-900">{company.bankAccount}</p>
                </div>
              )}
              {company.bankBranch && (
                <div>
                  <p className="text-gray-500">Branch</p>
                  <p className="font-medium text-gray-900">{company.bankBranch}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Section */}
        {invoice.notes && (
          <div className="mb-8 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {invoice.notes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-[#002366] pt-6 mt-8">
          <div className="text-center">
            <p className="text-lg font-semibold text-[#002366] mb-2">
              Thank you for your business!
            </p>
            <p className="text-sm text-gray-500">
              If you have any questions about this invoice, please contact us
            </p>
            <p className="text-sm text-gray-500">
              {company.phone} | {company.email}
            </p>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="mt-6 text-xs text-gray-400 text-center">
          <p>
            Payment is due within 30 days of invoice date. Late payments may be subject to additional charges.
          </p>
        </div>
      </div>
    )
  }
)

InvoiceA4.displayName = "InvoiceA4"

export default InvoiceA4
