const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");
const { createCrudRouter } = require("./crud");

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeLower = (value) => String(value || "").trim().toLowerCase();

const buildWhereClause = (query = {}) => {
  const clauses = [];
  const values = [];

  const startDate = query.startDate;
  const endDate = query.endDate;
  const category = normalizeLower(query.category);
  const status = normalizeLower(query.status);
  const search = normalizeLower(query.search);

  if (startDate) {
    values.push(startDate);
    clauses.push(`date >= $${values.length}`);
  }

  if (endDate) {
    values.push(endDate);
    clauses.push(`date <= $${values.length}`);
  }

  if (category) {
    values.push(category);
    clauses.push(`LOWER(COALESCE(category, '')) = $${values.length}`);
  }

  if (status && status !== "all") {
    values.push(status);
    clauses.push(`LOWER(COALESCE(status, '')) = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    const placeholder = values.length;
    clauses.push(
      `(LOWER(COALESCE(category, '')) LIKE $${placeholder} OR LOWER(COALESCE(type, '')) LIKE $${placeholder} OR LOWER(COALESCE(note, '')) LIKE $${placeholder})`
    );
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
};

const router = express.Router();

router.get("/summary", verifyToken, async (req, res, next) => {
  try {
    const { whereClause, values } = buildWhereClause(req.query || {});

    const [categoryResult, totalsResult, recentResult] = await Promise.all([
      pool.query(
        `SELECT
          COALESCE(category, 'Uncategorized') AS category,
          SUM(amount)::numeric(14,2) AS total_amount,
          COUNT(*)::int AS entries
        FROM expenses
        ${whereClause}
        GROUP BY COALESCE(category, 'Uncategorized')
        ORDER BY total_amount DESC`,
        values
      ),
      pool.query(
        `SELECT
          COUNT(*)::int AS entries,
          COALESCE(SUM(amount), 0)::numeric(14,2) AS total_amount,
          COALESCE(AVG(amount), 0)::numeric(14,2) AS average_amount
        FROM expenses
        ${whereClause}`,
        values
      ),
      pool.query(
        `SELECT
          id,
          category,
          type,
          amount,
          note,
          date,
          payment_method,
          status
        FROM expenses
        ${whereClause}
        ORDER BY date DESC NULLS LAST, id DESC
        LIMIT 100`,
        values
      ),
    ]);

    const totalAmount = toNumber(totalsResult.rows[0]?.total_amount);
    const averageAmount = toNumber(totalsResult.rows[0]?.average_amount);
    const entryCount = Number(totalsResult.rows[0]?.entries || 0);

    const categories = categoryResult.rows.map((row) => {
      const amount = toNumber(row.total_amount);
      return {
        category: row.category || "Uncategorized",
        amount,
        entries: Number(row.entries || 0),
        percentage: totalAmount ? (amount / totalAmount) * 100 : 0,
      };
    });

    const recentExpenses = recentResult.rows.map((row) => ({
      id: row.id,
      category: row.category || "Uncategorized",
      type: row.type || "General",
      amount: toNumber(row.amount),
      note: row.note || "",
      date: row.date,
      paymentMethod: row.payment_method || "Cash",
      status: row.status || "Pending",
    }));

    return res.json({
      success: true,
      data: {
        filters: {
          startDate: req.query?.startDate || null,
          endDate: req.query?.endDate || null,
          category: req.query?.category || null,
          status: req.query?.status || null,
          search: req.query?.search || null,
        },
        categories,
        summary: {
          totalAmount,
          averageAmount,
          entryCount,
        },
        recent: recentExpenses,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.use(
  "/",
  createCrudRouter({
    table: "expenses",
    columns: ["category", "type", "amount", "note", "date", "payment_method", "status"],
    filters: ["category", "status", "date"],
  })
);

module.exports = router;
