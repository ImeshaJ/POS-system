const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const formatMonth = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return date.toISOString().slice(0, 7);
};

router.get("/summary", verifyToken, async (_req, res, next) => {
  try {
    const lowStockClause =
      "COALESCE(p.reorder_level, 0) > 0 AND COALESCE(p.quantity, 0) <= COALESCE(p.reorder_level, 0)";

    const [
      countsResult,
      appointmentsResult,
      salesResult,
      purchasesResult,
      inventoryResult,
      duesResult,
      salesTrendResult,
      purchaseTrendResult,
      categorySalesResult,
      topProductsResult,
      recentSalesResult,
      recentPurchasesResult,
      upcomingAppointmentsResult,
    ] = await Promise.all([
      pool.query(
        `SELECT
          (SELECT COUNT(*) FROM clients) AS clients,
          (SELECT COUNT(*) FROM clients WHERE COALESCE(status, 'Active') = 'Active') AS active_clients,
          (SELECT COUNT(*) FROM pets) AS pets,
          (SELECT COUNT(*) FROM products) AS products,
          (SELECT COUNT(*) FROM suppliers) AS suppliers,
          (SELECT COUNT(*) FROM employees) AS employees`
      ),
      pool.query(
        `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE date = CURRENT_DATE)::int AS today,
          COUNT(*) FILTER (WHERE date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')::int AS upcoming,
          COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed,
          COUNT(*) FILTER (WHERE status = 'Scheduled')::int AS scheduled
        FROM appointments`
      ),
      pool.query(
        `SELECT
          COUNT(*)::int AS total_invoices,
          COALESCE(SUM(total), 0)::numeric(14,2) AS total_revenue,
          COALESCE(SUM(total) FILTER (WHERE sale_date = CURRENT_DATE), 0)::numeric(14,2) AS today_revenue,
          COUNT(*) FILTER (WHERE sale_date = CURRENT_DATE)::int AS today_invoices,
          COALESCE(SUM(total) FILTER (WHERE sale_date >= CURRENT_DATE - INTERVAL '7 days'), 0)::numeric(14,2) AS week_revenue,
          COALESCE(SUM(total) FILTER (WHERE sale_date >= date_trunc('month', CURRENT_DATE)), 0)::numeric(14,2) AS month_revenue
        FROM (
          SELECT COALESCE(date, created_at::date) AS sale_date, total
          FROM sales
        ) s`
      ),
      pool.query(
        `SELECT
          COUNT(*)::int AS purchase_count,
          COALESCE(SUM(total), 0)::numeric(14,2) AS total_spent,
          COALESCE(SUM(total) FILTER (WHERE purchase_date >= date_trunc('month', CURRENT_DATE)), 0)::numeric(14,2) AS month_spent,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(status, '')) = 'pending' THEN total ELSE 0 END), 0)::numeric(14,2) AS pending_total
        FROM (
          SELECT COALESCE(date, created_at::date) AS purchase_date, total, status
          FROM purchases
        ) p`
      ),
      pool.query(
        `SELECT
          COUNT(*)::int AS sku_count,
          COALESCE(SUM(COALESCE(p.quantity, 0)), 0)::numeric(16,2) AS total_units,
          COALESCE(SUM(COALESCE(p.quantity, 0) * COALESCE(p.cost_price, 0)), 0)::numeric(18,2) AS stock_value,
          COALESCE(SUM(CASE WHEN ${lowStockClause} THEN 1 ELSE 0 END), 0)::int AS low_stock,
          COALESCE(SUM(CASE WHEN p.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 ELSE 0 END), 0)::int AS expiring,
          COALESCE(SUM(CASE WHEN p.expiry_date < CURRENT_DATE THEN 1 ELSE 0 END), 0)::int AS expired
        FROM products p`
      ),
      pool.query(
        `SELECT
          (SELECT COALESCE(SUM(due_amount), 0)::numeric(14,2) FROM clients) AS clients_due,
          (SELECT COALESCE(SUM(due_amount), 0)::numeric(14,2) FROM supplier_dues) AS suppliers_due`
      ),
      pool.query(
        `SELECT
          sale_date::date AS date,
          COUNT(*)::int AS invoices,
          COALESCE(SUM(total), 0)::numeric(14,2) AS total
        FROM (
          SELECT COALESCE(date, created_at::date) AS sale_date, total
          FROM sales
        ) s
        WHERE sale_date >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY sale_date
        ORDER BY sale_date ASC`
      ),
      pool.query(
        `SELECT
          purchase_date::date AS date,
          COUNT(*)::int AS purchases,
          COALESCE(SUM(total), 0)::numeric(14,2) AS total
        FROM (
          SELECT COALESCE(date, created_at::date) AS purchase_date, total
          FROM purchases
        ) p
        WHERE purchase_date >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY purchase_date
        ORDER BY purchase_date ASC`
      ),
      pool.query(
        `SELECT
          COALESCE(p.category, 'Uncategorized') AS category,
          COALESCE(SUM(si.qty), 0)::int AS units,
          COALESCE(SUM(si.qty * si.price), 0)::numeric(14,2) AS sales
        FROM sale_items si
        INNER JOIN sales s ON s.id = si.sale_id
        LEFT JOIN products p ON p.id = si.product_id
        WHERE COALESCE(s.date, s.created_at::date) >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY COALESCE(p.category, 'Uncategorized')
        ORDER BY sales DESC
        LIMIT 6`
      ),
      pool.query(
        `SELECT
          COALESCE(si.name, 'Unnamed Product') AS name,
          COALESCE(SUM(si.qty), 0)::int AS units,
          COALESCE(SUM(si.qty * si.price), 0)::numeric(14,2) AS revenue
        FROM sale_items si
        INNER JOIN sales s ON s.id = si.sale_id
        WHERE COALESCE(s.date, s.created_at::date) >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY COALESCE(si.name, 'Unnamed Product')
        ORDER BY revenue DESC
        LIMIT 5`
      ),
      pool.query(
        `SELECT
          s.id,
          s.invoice_no,
          COALESCE(s.date, s.created_at::date) AS date,
          s.total,
          s.payment_type,
          s.status,
          s.customer,
          COALESCE(SUM(si.qty), 0)::int AS items
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id
        GROUP BY s.id, s.invoice_no, s.date, s.created_at, s.total, s.payment_type, s.status, s.customer
        ORDER BY COALESCE(s.date, s.created_at::date) DESC NULLS LAST, s.id DESC
        LIMIT 5`
      ),
      pool.query(
        `SELECT
          p.id,
          p.invoice_no,
          COALESCE(p.date, p.created_at::date) AS date,
          p.total,
          p.status,
          COALESCE(s.name, 'Unknown supplier') AS supplier,
          COALESCE(SUM(pi.qty), 0)::int AS items
        FROM purchases p
        LEFT JOIN suppliers s ON s.id = p.supplier_id
        LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
        GROUP BY p.id, p.invoice_no, p.date, p.created_at, p.total, p.status, s.name
        ORDER BY COALESCE(p.date, p.created_at::date) DESC NULLS LAST, p.id DESC
        LIMIT 5`
      ),
      pool.query(
        `SELECT
          id,
          date,
          time,
          client_name,
          pet_name,
          pet_type,
          doctor,
          status
        FROM appointments
        WHERE date >= CURRENT_DATE
        ORDER BY date ASC, time ASC NULLS LAST
        LIMIT 5`
      ),
    ]);

    const countsRow = countsResult.rows[0] || {};
    const appointmentsRow = appointmentsResult.rows[0] || {};
    const salesRow = salesResult.rows[0] || {};
    const purchasesRow = purchasesResult.rows[0] || {};
    const inventoryRow = inventoryResult.rows[0] || {};
    const duesRow = duesResult.rows[0] || {};

    const kpis = {
      todaySales: toNumber(salesRow.today_revenue),
      totalClients: Number(countsRow.clients || 0),
      appointmentsToday: Number(appointmentsRow.today || 0),
      lowStockItems: Number(inventoryRow.low_stock || 0),
    };

    const quickStats = {
      monthlyRevenue: toNumber(salesRow.month_revenue),
      stockValue: toNumber(inventoryRow.stock_value),
      activeClients: Number(countsRow.active_clients || 0),
      pendingDues: toNumber(duesRow.clients_due),
    };

    return res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        kpis,
        counts: {
          clients: Number(countsRow.clients || 0),
          activeClients: Number(countsRow.active_clients || 0),
          pets: Number(countsRow.pets || 0),
          products: Number(countsRow.products || 0),
          suppliers: Number(countsRow.suppliers || 0),
          employees: Number(countsRow.employees || 0),
        },
        appointments: {
          total: Number(appointmentsRow.total || 0),
          today: Number(appointmentsRow.today || 0),
          upcoming: Number(appointmentsRow.upcoming || 0),
          completed: Number(appointmentsRow.completed || 0),
          scheduled: Number(appointmentsRow.scheduled || 0),
          upcomingList: upcomingAppointmentsResult.rows.map((row) => ({
            id: row.id,
            date: row.date,
            time: row.time,
            clientName: row.client_name,
            petName: row.pet_name,
            petType: row.pet_type,
            doctor: row.doctor,
            status: row.status,
          })),
        },
        sales: {
          totalRevenue: toNumber(salesRow.total_revenue),
          todayRevenue: toNumber(salesRow.today_revenue),
          weekRevenue: toNumber(salesRow.week_revenue),
          monthRevenue: toNumber(salesRow.month_revenue),
          totalInvoices: Number(salesRow.total_invoices || 0),
          todayInvoices: Number(salesRow.today_invoices || 0),
          trend: salesTrendResult.rows.map((row) => ({
            date: row.date,
            invoices: Number(row.invoices || 0),
            total: toNumber(row.total),
          })),
          recent: recentSalesResult.rows.map((row) => ({
            id: row.id,
            invoiceNo: row.invoice_no || `INV-${row.id}`,
            customer: row.customer || "Walk-in",
            date: row.date,
            total: toNumber(row.total),
            paymentType: row.payment_type || "Unknown",
            status: row.status || "Pending",
            items: Number(row.items || 0),
          })),
        },
        purchases: {
          purchaseCount: Number(purchasesRow.purchase_count || 0),
          totalSpent: toNumber(purchasesRow.total_spent),
          monthSpent: toNumber(purchasesRow.month_spent),
          pendingTotal: toNumber(purchasesRow.pending_total),
          trend: purchaseTrendResult.rows.map((row) => ({
            date: row.date,
            purchases: Number(row.purchases || 0),
            total: toNumber(row.total),
          })),
          recent: recentPurchasesResult.rows.map((row) => ({
            id: row.id,
            invoiceNo: row.invoice_no || `PUR-${row.id}`,
            supplier: row.supplier || "Unknown supplier",
            date: row.date,
            total: toNumber(row.total),
            status: row.status || "Pending",
            items: Number(row.items || 0),
          })),
        },
        inventory: {
          skuCount: Number(inventoryRow.sku_count || 0),
          totalUnits: toNumber(inventoryRow.total_units),
          stockValue: toNumber(inventoryRow.stock_value),
          lowStock: Number(inventoryRow.low_stock || 0),
          expiring: Number(inventoryRow.expiring || 0),
          expired: Number(inventoryRow.expired || 0),
        },
        dues: {
          clients: toNumber(duesRow.clients_due),
          suppliers: toNumber(duesRow.suppliers_due),
        },
        profitTrend: [],
        categorySales: categorySalesResult.rows.map((row) => ({
          category: row.category || "Uncategorized",
          units: Number(row.units || 0),
          sales: toNumber(row.sales),
        })),
        topProducts: topProductsResult.rows.map((row) => ({
          name: row.name || "Unnamed Product",
          units: Number(row.units || 0),
          revenue: toNumber(row.revenue),
        })),
        quickStats,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
