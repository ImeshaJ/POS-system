const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const BODY_LIMIT = process.env.REQUEST_BODY_LIMIT || "25mb";

const isAllowedOrigin = (origin) => {
  if (!origin) return true
  if (origin.startsWith("http://localhost:")) return true
  return false
}

app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now, can be configured later
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true)
    return callback(new Error("Not allowed by CORS"))
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options(/.*/, cors());

app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

app.get('/', (_req, res) => {
  res.send('Express server is running!');
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/pets', require('./routes/pets'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/staff-schedules', require('./routes/staffSchedules'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/supplier-dues', require('./routes/supplierDues'));
app.use('/api/supplier-due-payments', require('./routes/supplierDuePayments'));
app.use('/api/supplier-dues-sync', require('./routes/supplierDueSync'));
app.use('/api/products', require('./routes/products'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/purchase-items', require('./routes/purchaseItems'));
app.use('/api/purchase-returns', require('./routes/purchaseReturns'));
app.use('/api/purchase-return-items', require('./routes/purchaseReturnItems'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/sale-items', require('./routes/saleItems'));
app.use('/api/sales-returns', require('./routes/salesReturns'));
app.use('/api/sales-return-items', require('./routes/salesReturnItems'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/salary-records', require('./routes/salaryRecords'));
app.use('/api/revenue/products', require('./routes/productRevenue'));
app.use('/api/revenue/services', require('./routes/serviceRevenue'));
app.use('/api/services', require('./routes/services'));
app.use('/api/service-packages', require('./routes/servicePackages'));
app.use('/api/add-on-services', require('./routes/addOnServices'));
app.use('/api/clinical-services', require('./routes/clinicalServices'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/financials', require('./routes/financials'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/vat', require('./routes/vat'));
app.use('/api/settings', require('./routes/settings'));

app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

