const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");
const { createCrudRouter } = require("./crud");

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const pickFirst = (value) => (Array.isArray(value) ? value[0] : value);

const normalizeLower = (value) => String(pickFirst(value) || "").trim().toLowerCase();

const buildWhereClause = (query = {}, alias = "sales") => {
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

const crudRouter = createCrudRouter({
  table: "sales",
  columns: [
    "invoice_no",
    "client_id",
    "customer",
    "pet_name",
    "date",
    "time",
    "subtotal",
    "vat",
    "discount",
    "total",
    "payment_type",
    "status",
  ],
  required: ["date", "total"],
});

const router = express.Router();

router.get("/summary", verifyToken, async (req, res, next) => {
  try {
    const filters = req.query || {};
    const baseFilters = buildWhereClause(filters);
    const aliasFilters = buildWhereClause(filters, "s");

    const [totalsResult, paymentResult, statusResult, dailyResult, productsResult, itemsResult, recentResult] =
      await Promise.all([
        pool.query(
          `SELECT
            COUNT(*)::int AS invoices,
            COALESCE(SUM(total), 0)::numeric(14,2) AS total_amount,
            COALESCE(AVG(total), 0)::numeric(14,2) AS average_amount,
            COALESCE(SUM(subtotal), 0)::numeric(14,2) AS subtotal_amount,
            COALESCE(SUM(vat), 0)::numeric(14,2) AS vat_amount,
            COALESCE(SUM(discount), 0)::numeric(14,2) AS discount_amount
          FROM sales
          ${baseFilters.whereClause}`,
          [...baseFilters.values]
        ),
        pool.query(
          `SELECT
            COALESCE(payment_type, 'Unknown') AS payment_type,
            COUNT(*)::int AS invoices,
            COALESCE(SUM(total), 0)::numeric(14,2) AS total_amount
          FROM sales
          ${baseFilters.whereClause}
          GROUP BY COALESCE(payment_type, 'Unknown')
          ORDER BY total_amount DESC`,
          [...baseFilters.values]
        ),
        pool.query(
          `SELECT
            COALESCE(status, 'Pending') AS status,
            COUNT(*)::int AS invoices,
            COALESCE(SUM(total), 0)::numeric(14,2) AS total_amount
          FROM sales
          ${baseFilters.whereClause}
          GROUP BY COALESCE(status, 'Pending')
          ORDER BY total_amount DESC`,
          [...baseFilters.values]
        ),
        pool.query(
          `SELECT
            date::date AS sale_date,
            COUNT(*)::int AS invoices,
            COALESCE(SUM(total), 0)::numeric(14,2) AS total_amount
          FROM sales
          ${baseFilters.whereClause}
          GROUP BY sale_date
          ORDER BY sale_date DESC
          LIMIT 14`,
          [...baseFilters.values]
        ),
        pool.query(
          `SELECT
            COALESCE(si.name, 'Unnamed Product') AS product_name,
            COALESCE(SUM(si.qty), 0)::int AS units,
            COALESCE(SUM(si.qty * si.price), 0)::numeric(14,2) AS revenue,
            COALESCE(SUM(si.qty * COALESCE(p.cost_price, 0)), 0)::numeric(14,2) AS cost
          FROM sale_items si
          INNER JOIN sales s ON s.id = si.sale_id
          LEFT JOIN products p ON p.id = si.product_id
          ${aliasFilters.whereClause}
          GROUP BY COALESCE(si.name, 'Unnamed Product')
          ORDER BY revenue DESC
          LIMIT 5`,
          [...aliasFilters.values]
        ),
        pool.query(
          `SELECT
            COALESCE(SUM(si.qty), 0)::int AS items_sold,
            COALESCE(SUM(si.qty * COALESCE(p.cost_price, 0)), 0)::numeric(14,2) AS cost_amount
          FROM sale_items si
          INNER JOIN sales s ON s.id = si.sale_id
          LEFT JOIN products p ON p.id = si.product_id
          ${aliasFilters.whereClause}`,
          [...aliasFilters.values]
        ),
        pool.query(
          `SELECT
            s.id,
            s.invoice_no,
            s.date,
            s.total,
            s.payment_type,
            s.status,
            s.customer,
            COALESCE(SUM(si.qty), 0)::int AS items
          FROM sales s
          LEFT JOIN sale_items si ON si.sale_id = s.id
          ${aliasFilters.whereClause}
          GROUP BY s.id, s.invoice_no, s.date, s.total, s.payment_type, s.status, s.customer
          ORDER BY s.date DESC NULLS LAST, s.id DESC
          LIMIT 100`,
          [...aliasFilters.values]
        ),
      ]);

    const totalAmount = toNumber(totalsResult.rows[0]?.total_amount);
    const averageAmount = toNumber(totalsResult.rows[0]?.average_amount);
    const subtotalAmount = toNumber(totalsResult.rows[0]?.subtotal_amount);
    const vatAmount = toNumber(totalsResult.rows[0]?.vat_amount);
    const discountAmount = toNumber(totalsResult.rows[0]?.discount_amount);
    const invoiceCount = Number(totalsResult.rows[0]?.invoices || 0);
    const itemsSold = Number(itemsResult.rows[0]?.items_sold || 0);
    const costAmount = toNumber(itemsResult.rows[0]?.cost_amount || 0);
    const grossProfit = totalAmount - costAmount;
    const grossMargin = totalAmount ? (grossProfit / totalAmount) * 100 : 0;

    const paymentBreakdown = paymentResult.rows.map((row) => {
      const amount = toNumber(row.total_amount);
      return {
        paymentType: row.payment_type || "Unknown",
        invoices: Number(row.invoices || 0),
        amount,
        share: totalAmount ? (amount / totalAmount) * 100 : 0,
      };
    });

    const statusBreakdown = statusResult.rows.map((row) => {
      const amount = toNumber(row.total_amount);
      return {
        status: row.status || "Pending",
        invoices: Number(row.invoices || 0),
        amount,
        share: totalAmount ? (amount / totalAmount) * 100 : 0,
      };
    });

    const dailyTrend = dailyResult.rows
      .map((row) => ({
        date: row.sale_date,
        invoices: Number(row.invoices || 0),
        amount: toNumber(row.total_amount),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const topProducts = productsResult.rows.map((row) => {
      const revenue = toNumber(row.revenue);
      const cost = toNumber(row.cost);
      return {
        name: row.product_name || "Unnamed Product",
        units: Number(row.units || 0),
        revenue,
        cost,
        profit: revenue - cost,
      };
    });

    const recentInvoices = recentResult.rows.map((row) => ({
      id: row.id,
      invoiceNo: row.invoice_no || "—",
      customer: row.customer || "Walk-in",
      date: row.date,
      total: toNumber(row.total),
      paymentType: row.payment_type || "Unknown",
      status: row.status || "Pending",
      items: Number(row.items || 0),
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
          totalAmount,
          averageAmount,
          invoiceCount,
          subtotalAmount,
          vatAmount,
          discountAmount,
          itemsSold,
          costAmount,
          grossProfit,
          grossMargin,
        },
        paymentBreakdown,
        statusBreakdown,
        dailyTrend,
        topProducts,
        recentInvoices,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id/full", verifyToken, async (req, res, next) => {
  try {
    const saleResult = await pool.query(
      `SELECT s.*, c.name AS client_name, c.code AS client_code, c.phone AS client_phone
       FROM sales s
       LEFT JOIN clients c ON c.id = s.client_id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (saleResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    const itemsResult = await pool.query(
      `SELECT si.*, p.name AS product_name, p.code AS product_code
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = $1`,
      [req.params.id]
    );

    return res.json({
      success: true,
      data: {
        ...saleResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/sales/full
 * Complete sale with items - handles both products and services
 * - Products: Reduces stock quantity
 * - Services/Packages/Add-ons: No stock reduction
 * - Updates client due amount if payment not fully received
 */
router.post("/full", verifyToken, async (req, res, next) => {
  const {
    client_id,
    customer,
    pet_name,
    invoice_no,
    date,
    time,
    subtotal,
    vat,
    discount,
    total,
    payment_type = "Cash",
    status = "Completed",
    received_amount = 0,
    // Card payment fields
    card_last_four,
    card_type,
    card_approval_code,
    items,
  } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "At least one item is required" });
  }

  const normalizedItems = [];
  for (let i = 0; i < items.length; i += 1) {
    const raw = items[i] || {};
    const item_type = String(raw.item_type || raw.type || "product").toLowerCase();
    const item_id = Number(raw.product_id ?? raw.productId ?? raw.item_id ?? raw.id ?? 0);
    const item_code = String(raw.item_code || raw.code || "");
    const item_name = String(raw.name || "");
    const qty = Number(raw.qty ?? 1);
    const price = Number(raw.price ?? 0);

    // For products, we need an ID. For services, name is sufficient
    if (item_type === "product" && !item_id) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: product_id is required for products` });
    }
    if (!item_name && !item_id) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: name or id is required` });
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: qty must be greater than 0` });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: price must be 0 or greater` });
    }

    normalizedItems.push({
      item_type,
      item_id: item_id || null,
      item_code,
      item_name,
      qty,
      price,
    });
  }

  const saleDate = date || new Date().toISOString().slice(0, 10);
  const saleTime = time || new Date().toTimeString().slice(0, 8);
  const receivedAmount = Number(received_amount) || 0;
  const totalAmount = Number(total) || 0;
  const amountDue = totalAmount - receivedAmount;

  // Determine final status based on payment
  let finalStatus = status;
  if (status === "Completed" && amountDue > 0) {
    finalStatus = "Partial"; // Partial payment
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert sale record (including card payment fields if provided)
    const saleResult = await client.query(
      `INSERT INTO sales (invoice_no, client_id, customer, pet_name, date, time, subtotal, vat, discount, total, payment_type, status, card_last_four, card_type, card_approval_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [invoice_no || null, client_id || null, customer || null, pet_name || null, saleDate, saleTime, subtotal || 0, vat || 0, discount || 0, totalAmount, payment_type, finalStatus, card_last_four || null, card_type || null, card_approval_code || null]
    );

    const sale = saleResult.rows[0];
    const insertedItems = [];
    const stockUpdates = [];

    for (const item of normalizedItems) {
      // Get item name - for products, fetch from products table
      let finalName = item.item_name;
      if (item.item_type === "product" && item.item_id && !finalName) {
        const productResult = await client.query(
          "SELECT name FROM products WHERE id = $1",
          [item.item_id]
        );
        if (productResult.rows.length > 0) {
          finalName = productResult.rows[0].name;
        }
      }

      // Insert sale item with type
      const itemResult = await client.query(
        `INSERT INTO sale_items (sale_id, product_id, name, price, qty, item_type, item_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          sale.id,
          item.item_type === "product" ? item.item_id : null,
          finalName || "Unnamed Item",
          item.price,
          item.qty,
          item.item_type,
          item.item_code || null,
        ]
      );
      insertedItems.push(itemResult.rows[0]);

      // Only reduce stock for PRODUCTS, not services/packages/addons
      if (item.item_type === "product" && item.item_id) {
        const updateResult = await client.query(
          `UPDATE products
           SET quantity = GREATEST(COALESCE(quantity, 0) - $2, 0),
               updated_at = NOW()
           WHERE id = $1
           RETURNING id, name, quantity`,
          [item.item_id, item.qty]
        );

        if (updateResult.rows.length > 0) {
          stockUpdates.push({
            product_id: item.item_id,
            product_name: updateResult.rows[0].name,
            new_quantity: updateResult.rows[0].quantity,
            reduced_by: item.qty,
          });
        }
      }
    }

    // Update client due amount if there's an outstanding balance
    if (client_id && amountDue > 0) {
      await client.query(
        `UPDATE clients
         SET due_amount = COALESCE(due_amount, 0) + $2,
             updated_at = NOW()
         WHERE id = $1`,
        [client_id, amountDue]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      data: {
        ...sale,
        items: insertedItems,
        stock_updates: stockUpdates,
        payment_summary: {
          total: totalAmount,
          received: receivedAmount,
          due: amountDue,
          status: finalStatus,
        },
      },
      message: `Sale completed successfully. ${stockUpdates.length} product(s) stock updated.`,
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
