const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const pickFirst = (value) => (Array.isArray(value) ? value[0] : value);

const normalizeLower = (value) => String(pickFirst(value) || "").trim().toLowerCase();

const normalizeStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "inactive") return "Inactive";
  return "Active";
};

const ensureVatClause = (whereClause = "", alias = "sales") => {
  const vatFilter = `COALESCE(${alias}.vat, 0) <> 0`;
  if (!whereClause) {
    return `WHERE ${vatFilter}`;
  }
  return `${whereClause} AND ${vatFilter}`;
};

const normalizeDateInput = (value) => {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

const buildFilters = (query = {}, alias = "sales") => {
  const clauses = [];
  const values = [];
  const column = (field) => `${alias}.${field}`;

  const startDate = pickFirst(query.startDate);
  const endDate = pickFirst(query.endDate);
  const status = normalizeLower(query.status);
  const paymentType = normalizeLower(query.paymentType);
  const search = normalizeLower(query.search);

  if (startDate) {
    values.push(startDate);
    clauses.push(`${column("date")} >= $${values.length}`);
  }

  if (endDate) {
    values.push(endDate);
    clauses.push(`${column("date")} <= $${values.length}`);
  }

  if (status && status !== "all") {
    values.push(status);
    clauses.push(`LOWER(COALESCE(${column("status")}, '')) = $${values.length}`);
  }

  if (paymentType && paymentType !== "all") {
    values.push(paymentType);
    clauses.push(`LOWER(COALESCE(${column("payment_type")}, '')) = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    const placeholder = values.length;
    const searchableColumns = ["invoice_no", "customer", "pet_name"]
      .map((field) => `LOWER(COALESCE(${column(field)}, '')) LIKE $${placeholder}`)
      .join(" OR ");
    clauses.push(`(${searchableColumns})`);
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
};

const mapRateRow = (row = {}) => ({
  id: row.id,
  category: row.category,
  description: row.description,
  rate: toNumber(row.rate),
  applicableFrom: row.applicable_from,
  status: row.status || "Active",
  remarks: row.remarks,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const formatLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const buildFilings = (monthly = []) => {
  const today = new Date();
  const filings = monthly.map((row) => {
    const periodStart = new Date(row.period);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1, 0);
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 20);

    const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    let status = "Upcoming";
    if (diffDays >= 0 && diffDays <= 7) {
      status = "Pending";
    } else if (diffDays > 7 && diffDays <= 45) {
      status = "Overdue";
    } else if (diffDays > 45) {
      status = "Filed";
    } else if (diffDays < 0) {
      status = "Upcoming";
    }

    return {
      period: formatDate(periodStart),
      label: formatLabel(periodStart),
      dueDate: formatDate(dueDate),
      taxableSales: row.taxableSales,
      vatAmount: row.vatAmount,
      invoices: row.invoices,
      status,
    };
  });

  const filedReturns = filings.filter((f) => f.status === "Filed").length;
  const pendingReturns = filings.filter((f) => f.status === "Pending").length;
  const overdueReturns = filings.filter((f) => f.status === "Overdue").length;

  const nextReturnDue = filings
    .filter((f) => f.status === "Upcoming")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]?.dueDate || null;

  return {
    filings,
    filedReturns,
    pendingReturns,
    overdueReturns,
    outstandingReturns: pendingReturns + overdueReturns,
    nextReturnDue,
  };
};

router.get("/summary", verifyToken, async (req, res, next) => {
  try {
    const filters = req.query || {};
    const { whereClause, values } = buildFilters(filters);
    const vatWhereClause = ensureVatClause(whereClause);

    const [summaryResult, monthlyResult, ledgerResult] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(*)::int AS invoices,
          COALESCE(SUM(subtotal), 0)::numeric(14,2) AS taxable_sales,
          COALESCE(SUM(vat), 0)::numeric(14,2) AS vat_amount,
          COALESCE(SUM(total), 0)::numeric(14,2) AS total_amount
        FROM sales
        ${vatWhereClause}`,
        [...values]
      ),
      pool.query(
        `SELECT
          DATE_TRUNC('month', date)::date AS period,
          COUNT(*)::int AS invoices,
          COALESCE(SUM(subtotal), 0)::numeric(14,2) AS taxable_sales,
          COALESCE(SUM(vat), 0)::numeric(14,2) AS vat_amount,
          COALESCE(AVG(CASE WHEN subtotal > 0 THEN (vat / NULLIF(subtotal, 0)) * 100 END), 0)::numeric(10,4) AS avg_rate
        FROM sales
        ${vatWhereClause}
        GROUP BY period
        ORDER BY period DESC
        LIMIT 18`,
        [...values]
      ),
      pool.query(
        `SELECT
          id,
          invoice_no,
          date,
          subtotal,
          vat,
          total,
          payment_type,
          status,
          customer
        FROM sales
        ${vatWhereClause}
        ORDER BY date DESC NULLS LAST, id DESC
        LIMIT 50`,
        [...values]
      ),
    ]);

    const summaryRow = summaryResult.rows[0] || {};
    const taxableSales = toNumber(summaryRow.taxable_sales);
    const vatAmount = toNumber(summaryRow.vat_amount);
    const totalAmount = toNumber(summaryRow.total_amount);
    const invoiceCount = Number(summaryRow.invoices || 0);
    const averageVatRate = taxableSales ? (vatAmount / taxableSales) * 100 : 0;

    const monthlyBreakdown = monthlyResult.rows
      .map((row) => ({
        period: formatDate(row.period),
        label: formatLabel(row.period),
        invoices: Number(row.invoices || 0),
        taxableSales: toNumber(row.taxable_sales),
        vatAmount: toNumber(row.vat_amount),
        averageRate: toNumber(row.avg_rate),
      }))
      .sort((a, b) => new Date(a.period) - new Date(b.period));

    const { filings, filedReturns, pendingReturns, overdueReturns, outstandingReturns, nextReturnDue } =
      buildFilings(monthlyBreakdown);

    const complianceScore = (() => {
      const totalReturns = filings.length || 1;
      const penalty = (overdueReturns / totalReturns) * 100;
      return Math.max(0, 100 - penalty);
    })();

    const vatLedger = ledgerResult.rows.map((row) => ({
      id: row.id,
      invoiceNo: row.invoice_no || "—",
      date: formatDate(row.date),
      customer: row.customer || "Walk-in Customer",
      taxableAmount: toNumber(row.subtotal),
      vatAmount: toNumber(row.vat),
      totalAmount: toNumber(row.total),
      paymentType: row.payment_type || "Unknown",
      status: row.status || "Pending",
    }));

    return res.json({
      success: true,
      data: {
        filters: {
          startDate: pickFirst(filters.startDate) || null,
          endDate: pickFirst(filters.endDate) || null,
          status: pickFirst(filters.status) || null,
          paymentType: pickFirst(filters.paymentType) || null,
          search: pickFirst(filters.search) || null,
        },
        summary: {
          totalVat: vatAmount,
          taxableSales,
          totalSales: totalAmount,
          invoiceCount,
          averageVatRate,
          outstandingReturns,
          complianceScore,
          nextReturnDue,
          filedReturns,
          pendingReturns,
          overdueReturns,
        },
        monthlyBreakdown,
        filings,
        vatLedger,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/rates", verifyToken, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM vat_rates
       ORDER BY status DESC, applicable_from DESC, id DESC`
    );
    const rates = result.rows.map(mapRateRow);
    return res.json({ success: true, data: { rates } });
  } catch (error) {
    return next(error);
  }
});

router.post("/rates", verifyToken, async (req, res, next) => {
  try {
    const { category, description, rate, applicableFrom, status, remarks } = req.body || {};
    if (!category) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }

    const numericRate = Number(rate);
    if (!Number.isFinite(numericRate) || numericRate < 0) {
      return res.status(400).json({ success: false, message: "Rate must be zero or greater" });
    }

    const insertResult = await pool.query(
      `INSERT INTO vat_rates (category, description, rate, applicable_from, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [category.trim(), description || null, numericRate, normalizeDateInput(applicableFrom), normalizeStatus(status), remarks || null]
    );

    return res.status(201).json({ success: true, data: mapRateRow(insertResult.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.put("/rates/:id", verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category, description, rate, applicableFrom, status, remarks } = req.body || {};

    if (!category) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }

    const numericRate = Number(rate);
    if (!Number.isFinite(numericRate) || numericRate < 0) {
      return res.status(400).json({ success: false, message: "Rate must be zero or greater" });
    }

    const updateResult = await pool.query(
      `UPDATE vat_rates SET
        category = $1,
        description = $2,
        rate = $3,
        applicable_from = $4,
        status = $5,
        remarks = $6,
        updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [category.trim(), description || null, numericRate, normalizeDateInput(applicableFrom), normalizeStatus(status), remarks || null, id]
    );

    if (!updateResult.rows[0]) {
      return res.status(404).json({ success: false, message: "VAT rate not found" });
    }

    return res.json({ success: true, data: mapRateRow(updateResult.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/rates/:id", verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM vat_rates WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "VAT rate not found" });
    }
    return res.json({ success: true, data: { id: Number(id) } });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
