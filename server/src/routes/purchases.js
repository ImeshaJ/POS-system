const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");
const { createCrudRouter } = require("./crud");

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "all") return "all";
  return normalized;
};

const formatFilters = (query = {}) => ({
  startDate: query.startDate || "",
  endDate: query.endDate || "",
  status: normalizeStatus(query.status),
  search: String(query.search || "").trim().toLowerCase(),
});

const buildWhereClause = (filters = {}, alias = "p") => {
  const clauses = [];
  const values = [];

  if (filters.startDate) {
    values.push(filters.startDate);
    clauses.push(`COALESCE(${alias}.date, ${alias}.created_at::date) >= $${values.length}`);
  }

  if (filters.endDate) {
    values.push(filters.endDate);
    clauses.push(`COALESCE(${alias}.date, ${alias}.created_at::date) <= $${values.length}`);
  }

  if (filters.status && filters.status !== "all") {
    values.push(filters.status);
    clauses.push(`LOWER(COALESCE(${alias}.status, '')) = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const placeholder = values.length;
    clauses.push(
      `(
        LOWER(COALESCE(${alias}.invoice_no, '')) LIKE $${placeholder}
        OR LOWER(COALESCE(${alias}.status, '')) LIKE $${placeholder}
        OR EXISTS (
          SELECT 1 FROM suppliers sup
          WHERE sup.id = ${alias}.supplier_id
            AND LOWER(COALESCE(sup.name, '')) LIKE $${placeholder}
        )
      )`
    );
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
};

const crudRouter = createCrudRouter({
  table: "purchases",
  columns: ["supplier_id", "invoice_no", "date", "total", "status"],
  required: ["supplier_id", "date"],
});

const router = express.Router();

router.get("/summary", verifyToken, async (req, res, next) => {
  try {
    const filters = formatFilters(req.query);
    const { whereClause, values } = buildWhereClause(filters, "p");

    const [
      summaryResult,
      itemsResult,
      statusResult,
      categoryResult,
      supplierResult,
      trendResult,
      recentResult,
      dueResult,
    ] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(*)::int AS purchase_count,
          COALESCE(SUM(p.total), 0)::numeric(14,2) AS total_spent,
          COALESCE(AVG(p.total), 0)::numeric(14,2) AS average_purchase,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(p.status, '')) = 'pending' THEN p.total ELSE 0 END), 0)::numeric(14,2) AS pending_total,
          COALESCE(SUM(CASE WHEN COALESCE(p.date, p.created_at::date) >= date_trunc('month', CURRENT_DATE) THEN p.total ELSE 0 END), 0)::numeric(14,2) AS month_total,
          COUNT(DISTINCT p.supplier_id) AS supplier_count
        FROM purchases p
        ${whereClause}`,
        values
      ),
      pool.query(
        `SELECT COALESCE(SUM(pi.qty), 0)::int AS units
         FROM purchase_items pi
         JOIN purchases p ON p.id = pi.purchase_id
         ${whereClause}`,
        values
      ),
      pool.query(
        `SELECT
          LOWER(COALESCE(p.status, 'unknown')) AS status,
          COUNT(*)::int AS purchases,
          COALESCE(SUM(p.total), 0)::numeric(14,2) AS total_amount
         FROM purchases p
         ${whereClause}
         GROUP BY LOWER(COALESCE(p.status, 'unknown'))
         ORDER BY total_amount DESC`,
        values
      ),
      pool.query(
        `SELECT
          COALESCE(prod.category, 'Uncategorized') AS category,
          COALESCE(SUM(pi.qty), 0)::int AS units,
          COALESCE(SUM(pi.qty * pi.cost_price), 0)::numeric(14,2) AS spend
         FROM purchase_items pi
         JOIN purchases p ON p.id = pi.purchase_id
         LEFT JOIN products prod ON prod.id = pi.product_id
         ${whereClause}
         GROUP BY COALESCE(prod.category, 'Uncategorized')
         ORDER BY spend DESC`,
        values
      ),
      pool.query(
        `SELECT
          p.supplier_id AS id,
          COALESCE(s.name, 'Unknown supplier') AS name,
          COUNT(*)::int AS orders,
          COALESCE(SUM(p.total), 0)::numeric(14,2) AS total_spent
         FROM purchases p
         LEFT JOIN suppliers s ON s.id = p.supplier_id
         ${whereClause}
         GROUP BY p.supplier_id, s.name
         ORDER BY total_spent DESC
         LIMIT 5`,
        values
      ),
      pool.query(
        `SELECT
          COALESCE(p.date, p.created_at::date) AS date,
          COUNT(*)::int AS purchases,
          COALESCE(SUM(p.total), 0)::numeric(14,2) AS total_amount
         FROM purchases p
         ${whereClause}
         GROUP BY COALESCE(p.date, p.created_at::date)
         ORDER BY COALESCE(p.date, p.created_at::date) ASC
         LIMIT 60`,
        values
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
         ${whereClause}
         GROUP BY p.id, s.name
         ORDER BY COALESCE(p.date, p.created_at::date) DESC NULLS LAST, p.id DESC
         LIMIT 200`,
        values
      ),
      pool.query(
        `SELECT COALESCE(SUM(due_amount), 0)::numeric(14,2) AS outstanding_due FROM supplier_dues`
      ),
    ]);

    const summaryRow = summaryResult.rows[0] || {};
    const totalSpent = toNumber(summaryRow.total_spent);
    const averagePurchase = toNumber(summaryRow.average_purchase);
    const purchaseCount = Number(summaryRow.purchase_count || 0);
    const pendingTotal = toNumber(summaryRow.pending_total);
    const monthToDate = toNumber(summaryRow.month_total);
    const supplierCount = Number(summaryRow.supplier_count || 0);
    const itemsPurchased = Number(itemsResult.rows[0]?.units || 0);

    const statusBreakdown = statusResult.rows.map((row) => {
      const amount = toNumber(row.total_amount);
      return {
        status: row.status || "unknown",
        purchases: Number(row.purchases || 0),
        amount,
        share: totalSpent ? (amount / totalSpent) * 100 : 0,
      };
    });

    const categoryBreakdown = categoryResult.rows.map((row) => {
      const spend = toNumber(row.spend);
      return {
        category: row.category || "Uncategorized",
        units: Number(row.units || 0),
        spend,
        share: totalSpent ? (spend / totalSpent) * 100 : 0,
      };
    });

    const topSuppliers = supplierResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      orders: Number(row.orders || 0),
      totalSpent: toNumber(row.total_spent),
    }));

    const trend = trendResult.rows.map((row) => ({
      date: row.date,
      purchases: Number(row.purchases || 0),
      amount: toNumber(row.total_amount),
    }));

    const purchases = recentResult.rows.map((row) => ({
      id: row.id,
      invoiceNo: row.invoice_no || `PUR-${row.id}`,
      supplier: row.supplier || "Unknown supplier",
      date: row.date,
      status: row.status || "Pending",
      items: Number(row.items || 0),
      total: toNumber(row.total),
    }));

    const outstandingDue = toNumber(dueResult.rows[0]?.outstanding_due);

    return res.json({
      success: true,
      data: {
        filters,
        summary: {
          totalSpent,
          averagePurchase,
          purchaseCount,
          pendingTotal,
          monthToDate,
          itemsPurchased,
          supplierCount,
        },
        outstandingDue,
        trend,
        statusBreakdown,
        categoryBreakdown,
        topSuppliers,
        purchases,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id/full", verifyToken, async (req, res, next) => {
  try {
    const purchaseResult = await pool.query(
      `SELECT p.*, s.name AS supplier_name, s.code AS supplier_code, s.phone AS supplier_phone
       FROM purchases p
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (purchaseResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }

    const itemsResult = await pool.query(
      `SELECT pi.*, pr.name AS product_name, pr.code AS product_code
       FROM purchase_items pi
       LEFT JOIN products pr ON pr.id = pi.product_id
       WHERE pi.purchase_id = $1`,
      [req.params.id]
    );

    return res.json({
      success: true,
      data: {
        ...purchaseResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/full", verifyToken, async (req, res, next) => {
  const {
    supplier_id,
    invoice_no,
    date,
    status = "Completed",
    due_date,
    notes,
    items,
  } = req.body || {};

  if (!supplier_id) {
    return res.status(400).json({ success: false, message: "supplier_id is required" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "At least one item is required" });
  }

  const normalizedItems = [];
  for (let i = 0; i < items.length; i += 1) {
    const raw = items[i] || {};
    const product_id = Number(raw.product_id ?? raw.productId);
    const qty = Number(raw.qty ?? 0);
    const cost_price = Number(raw.cost_price ?? raw.costPrice ?? 0);

    if (!product_id) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: product_id is required` });
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: qty must be greater than 0` });
    }
    if (!Number.isFinite(cost_price) || cost_price < 0) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: cost_price must be 0 or greater` });
    }

    normalizedItems.push({ product_id, qty, cost_price });
  }

  const purchaseTotal = normalizedItems.reduce((sum, item) => sum + item.qty * item.cost_price, 0);
  const purchaseDate = date || new Date().toISOString().slice(0, 10);
  const dueDate = due_date || null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const purchaseResult = await client.query(
      `INSERT INTO purchases (supplier_id, invoice_no, date, total, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [supplier_id, invoice_no || null, purchaseDate, purchaseTotal, status]
    );

    const purchase = purchaseResult.rows[0];
    const insertedItems = [];

    for (const item of normalizedItems) {
      const itemResult = await client.query(
        `INSERT INTO purchase_items (purchase_id, product_id, qty, cost_price)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [purchase.id, item.product_id, item.qty, item.cost_price]
      );
      insertedItems.push(itemResult.rows[0]);

      await client.query(
        `UPDATE products
         SET quantity = COALESCE(quantity, 0) + $2,
             cost_price = CASE WHEN $3 > 0 THEN $3 ELSE cost_price END,
             updated_at = NOW()
         WHERE id = $1`,
        [item.product_id, item.qty, item.cost_price]
      );
    }

    let supplierDueRecord = null;
    const existingDue = await client.query(
      `SELECT id, total_amount, paid_amount, due_amount
       FROM supplier_dues
       WHERE supplier_id = $1
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [supplier_id]
    );

    if (existingDue.rows.length > 0) {
      const row = existingDue.rows[0];
      const updated = await client.query(
        `UPDATE supplier_dues
         SET total_amount = COALESCE(total_amount, 0) + $2,
             due_amount = COALESCE(due_amount, 0) + $2,
             due_date = COALESCE($3, due_date),
             notes = CASE WHEN $4 IS NOT NULL THEN $4 ELSE notes END,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [row.id, purchaseTotal, dueDate, notes || null]
      );
      supplierDueRecord = updated.rows[0];
    } else {
      const inserted = await client.query(
        `INSERT INTO supplier_dues (supplier_id, total_amount, paid_amount, due_amount, due_date, notes)
         VALUES ($1, $2, 0, $2, $3, $4)
         RETURNING *`,
        [supplier_id, purchaseTotal, dueDate, notes || null]
      );
      supplierDueRecord = inserted.rows[0];
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      data: {
        ...purchase,
        items: insertedItems,
        supplier_due: supplierDueRecord,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    return next(err);
  } finally {
    client.release();
  }
});

router.use("/", crudRouter);

module.exports = router;
