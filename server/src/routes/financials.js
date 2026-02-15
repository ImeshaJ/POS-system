const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const formatFilters = (query = {}) => ({
  startDate: query.startDate || "",
  endDate: query.endDate || "",
});

const buildWhereClause = (filters = {}, alias = "t") => {
  const clauses = [];
  const values = [];
  const dateColumn = `COALESCE(${alias}.date, ${alias}.created_at::date)`;

  if (filters.startDate) {
    values.push(filters.startDate);
    clauses.push(`${dateColumn} >= $${values.length}`);
  }

  if (filters.endDate) {
    values.push(filters.endDate);
    clauses.push(`${dateColumn} <= $${values.length}`);
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
};

const formatPeriod = (period) => {
  if (!period) return null;
  const date = new Date(period);
  if (Number.isNaN(date.valueOf())) return null;
  return date.toISOString().slice(0, 10);
};

router.get("/profit-loss", verifyToken, async (req, res, next) => {
  try {
    const filters = formatFilters(req.query);
    const salesFilter = buildWhereClause(filters, "s");
    const expenseFilter = buildWhereClause(filters, "e");

    const [
      revenueResult,
      cogsResult,
      expenseTotalsResult,
      revenueMonthlyResult,
      cogsMonthlyResult,
      expensesMonthlyResult,
      expenseCategoriesResult,
      topExpensesResult,
    ] = await Promise.all([
      pool.query(
        `SELECT
          COALESCE(SUM(s.total), 0)::numeric(18,2) AS revenue,
          COUNT(*)::int AS invoices,
          COALESCE(AVG(s.total), 0)::numeric(18,2) AS average_invoice
        FROM sales s
        ${salesFilter.whereClause}`,
        salesFilter.values
      ),
      pool.query(
        `SELECT
          COALESCE(SUM(si.qty * COALESCE(prod.cost_price, 0)), 0)::numeric(18,2) AS cost
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id
        LEFT JOIN products prod ON prod.id = si.product_id
        ${salesFilter.whereClause}`,
        salesFilter.values
      ),
      pool.query(
        `SELECT
          COALESCE(SUM(e.amount), 0)::numeric(18,2) AS expenses,
          COUNT(*)::int AS entries,
          COALESCE(AVG(e.amount), 0)::numeric(14,2) AS average_expense
        FROM expenses e
        ${expenseFilter.whereClause}`,
        expenseFilter.values
      ),
      pool.query(
        `SELECT
          date_trunc('month', COALESCE(s.date, s.created_at::date)) AS period,
          COALESCE(SUM(s.total), 0)::numeric(18,2) AS revenue,
          COUNT(*)::int AS invoices
        FROM sales s
        ${salesFilter.whereClause}
        GROUP BY period
        ORDER BY period ASC`,
        salesFilter.values
      ),
      pool.query(
        `SELECT
          date_trunc('month', COALESCE(s.date, s.created_at::date)) AS period,
          COALESCE(SUM(si.qty * COALESCE(prod.cost_price, 0)), 0)::numeric(18,2) AS cost
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id
        LEFT JOIN products prod ON prod.id = si.product_id
        ${salesFilter.whereClause}
        GROUP BY period
        ORDER BY period ASC`,
        salesFilter.values
      ),
      pool.query(
        `SELECT
          date_trunc('month', COALESCE(e.date, e.created_at::date)) AS period,
          COALESCE(SUM(e.amount), 0)::numeric(18,2) AS expenses
        FROM expenses e
        ${expenseFilter.whereClause}
        GROUP BY period
        ORDER BY period ASC`,
        expenseFilter.values
      ),
      pool.query(
        `SELECT
          COALESCE(e.category, 'Uncategorized') AS category,
          COALESCE(SUM(e.amount), 0)::numeric(18,2) AS amount,
          COUNT(*)::int AS entries
        FROM expenses e
        ${expenseFilter.whereClause}
        GROUP BY COALESCE(e.category, 'Uncategorized')
        ORDER BY amount DESC`,
        expenseFilter.values
      ),
      pool.query(
        `SELECT
          e.id,
          COALESCE(e.category, 'Uncategorized') AS category,
          COALESCE(e.type, 'General') AS type,
          COALESCE(e.note, '') AS note,
          e.amount,
          COALESCE(e.date, e.created_at::date) AS date
        FROM expenses e
        ${expenseFilter.whereClause}
        ORDER BY e.amount DESC NULLS LAST
        LIMIT 10`,
        expenseFilter.values
      ),
    ]);

    const revenueRow = revenueResult.rows[0] || {};
    const revenueTotal = toNumber(revenueRow.revenue);
    const invoiceCount = Number(revenueRow.invoices || 0);
    const averageInvoice = toNumber(revenueRow.average_invoice);
    const costRow = cogsResult.rows[0] || {};
    const costOfGoods = toNumber(costRow.cost);
    const expenseRow = expenseTotalsResult.rows[0] || {};
    const totalExpenses = toNumber(expenseRow.expenses);
    const expenseEntries = Number(expenseRow.entries || 0);

    const grossProfit = revenueTotal - costOfGoods;
    const netProfit = grossProfit - totalExpenses;
    const grossMargin = revenueTotal ? (grossProfit / revenueTotal) * 100 : 0;
    const netMargin = revenueTotal ? (netProfit / revenueTotal) * 100 : 0;

    const monthlyMap = new Map();
    const upsert = (period) => {
      const key = formatPeriod(period) || "unknown";
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          period: key,
          revenue: 0,
          costOfGoods: 0,
          expenses: 0,
          invoices: 0,
          grossProfit: 0,
          netProfit: 0,
        });
      }
      return monthlyMap.get(key);
    };

    revenueMonthlyResult.rows.forEach((row) => {
      const bucket = upsert(row.period);
      bucket.revenue = toNumber(row.revenue);
      bucket.invoices = Number(row.invoices || 0);
    });

    cogsMonthlyResult.rows.forEach((row) => {
      const bucket = upsert(row.period);
      bucket.costOfGoods = toNumber(row.cost);
    });

    expensesMonthlyResult.rows.forEach((row) => {
      const bucket = upsert(row.period);
      bucket.expenses = toNumber(row.expenses);
    });

    monthlyMap.forEach((value) => {
      value.grossProfit = value.revenue - value.costOfGoods;
      value.netProfit = value.grossProfit - value.expenses;
    });

    const monthly = Array.from(monthlyMap.values()).sort((a, b) => {
      if (a.period === "unknown") return 1;
      if (b.period === "unknown") return -1;
      return a.period < b.period ? -1 : 1;
    });

    const expenseCategories = expenseCategoriesResult.rows.map((row) => ({
      category: row.category || "Uncategorized",
      amount: toNumber(row.amount),
      entries: Number(row.entries || 0),
    }));

    const topExpenses = topExpensesResult.rows.map((row) => ({
      id: row.id,
      category: row.category || "Uncategorized",
      type: row.type || "General",
      note: row.note || "",
      amount: toNumber(row.amount),
      date: formatPeriod(row.date),
    }));

    return res.json({
      success: true,
      data: {
        filters,
        summary: {
          totalRevenue: revenueTotal,
          costOfGoods,
          grossProfit,
          totalExpenses,
          netProfit,
          grossMargin,
          netMargin,
          invoiceCount,
          averageInvoice,
          expenseEntries,
        },
        monthly,
        expenseCategories,
        topExpenses,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
