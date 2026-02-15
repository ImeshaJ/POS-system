const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in environment`);
  }
  return value;
}

function getTransport() {
  const host = requireEnv('SMTP_HOST');
  const port = Number(process.env.SMTP_PORT || 587);
  const user = requireEnv('SMTP_USER');
  const pass = requireEnv('SMTP_PASS');
  const secure = String(process.env.SMTP_SECURE || (port === 465)).toLowerCase() === 'true';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString();
}

function buildInvoiceEmail(invoice) {
  const companyName = process.env.COMPANY_NAME || 'Furry Friends';
  const invoiceNo = invoice.invoiceNo || invoice.id || 'Invoice';
  const customerName = invoice.customer || invoice.client?.clientName || 'Guest';
  const petName = invoice.petName || invoice.client?.petName;
  const payment = invoice.payment || invoice.paymentType || 'Cash';
  const subtotal = invoice.subtotal || 0;
  const vat = invoice.vat || 0;
  const discount = invoice.discount || 0;
  const total = subtotal + vat - discount;
  const items = Array.isArray(invoice.items) ? invoice.items : [];

  const lines = items.map((item) => {
    const qty = item.qty || 0;
    const price = item.price || 0;
    const amount = qty * price;
    return `${item.name} x ${qty} = Rs. ${formatMoney(amount)}`;
  });

  const text = [
    `${companyName} Invoice`,
    `Invoice: ${invoiceNo}`,
    `Date: ${invoice.date || ''}`,
    `Customer: ${customerName}${petName ? ` (Pet: ${petName})` : ''}`,
    '',
    ...lines,
    '',
    `Subtotal: Rs. ${formatMoney(subtotal)}`,
    vat ? `VAT: Rs. ${formatMoney(vat)}` : null,
    discount ? `Discount: - Rs. ${formatMoney(discount)}` : null,
    `Total: Rs. ${formatMoney(total)}`,
    `Payment: ${payment}`,
  ].filter(Boolean).join('\n');

  const rows = items.map((item) => {
    const qty = item.qty || 0;
    const price = item.price || 0;
    const amount = qty * price;
    return `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${item.name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${qty}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">Rs. ${formatMoney(price)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">Rs. ${formatMoney(amount)}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; color:#111;">
      <h2 style="margin:0 0 8px">${companyName} Invoice</h2>
      <p style="margin:0 0 4px"><strong>Invoice:</strong> ${invoiceNo}</p>
      <p style="margin:0 0 4px"><strong>Date:</strong> ${invoice.date || ''}</p>
      <p style="margin:0 0 12px"><strong>Customer:</strong> ${customerName}${petName ? ` (Pet: ${petName})` : ''}</p>
      <table style="width:100%; border-collapse:collapse; font-size:14px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb">Item</th>
            <th style="text-align:center;padding:6px 8px;border-bottom:1px solid #e5e7eb">Qty</th>
            <th style="text-align:right;padding:6px 8px;border-bottom:1px solid #e5e7eb">Unit Price</th>
            <th style="text-align:right;padding:6px 8px;border-bottom:1px solid #e5e7eb">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top:12px; text-align:right">
        <p style="margin:4px 0"><strong>Subtotal:</strong> Rs. ${formatMoney(subtotal)}</p>
        ${vat ? `<p style="margin:4px 0"><strong>VAT:</strong> Rs. ${formatMoney(vat)}</p>` : ''}
        ${discount ? `<p style="margin:4px 0"><strong>Discount:</strong> - Rs. ${formatMoney(discount)}</p>` : ''}
        <p style="margin:6px 0; font-size:16px"><strong>Total:</strong> Rs. ${formatMoney(total)}</p>
        <p style="margin:4px 0"><strong>Payment:</strong> ${payment}</p>
      </div>
    </div>
  `;

  return { subject: `Invoice ${invoiceNo} - ${companyName}`, text, html };
}

router.post('/email', async (req, res, next) => {
  try {
    const { to, invoice, subject } = req.body || {};
    if (!to) {
      return res.status(400).json({ success: false, message: 'Recipient email is required' });
    }
    if (!invoice) {
      return res.status(400).json({ success: false, message: 'Invoice data is required' });
    }

    const transport = getTransport();
    const built = buildInvoiceEmail(invoice);
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    const info = await transport.sendMail({
      from,
      to,
      subject: subject || built.subject,
      text: built.text,
      html: built.html,
    });

    return res.json({ success: true, message: 'Invoice emailed', id: info.messageId });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
