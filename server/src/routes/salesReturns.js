const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");
const { createCrudRouter } = require("./crud");

const crudRouter = createCrudRouter({
  table: "sales_returns",
  columns: ["sale_id", "invoice_no", "total_refund", "reason"],
  required: ["sale_id"],
});

const router = express.Router();

router.get("/:id/full", verifyToken, async (req, res, next) => {
  try {
    const returnResult = await pool.query(
      `SELECT sr.*, s.invoice_no AS sale_invoice_no, s.client_id, s.customer, s.pet_name, s.total AS sale_total
       FROM sales_returns sr
       LEFT JOIN sales s ON s.id = sr.sale_id
       WHERE sr.id = $1`,
      [req.params.id]
    );

    if (returnResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Sales return not found" });
    }

    const itemsResult = await pool.query(
      `SELECT sri.*, si.name AS item_name, si.price, si.qty AS original_qty, p.name AS product_name, p.code AS product_code
       FROM sales_return_items sri
       LEFT JOIN sale_items si ON si.id = sri.sale_item_id
       LEFT JOIN products p ON p.id = sri.product_id
       WHERE sri.sales_return_id = $1`,
      [req.params.id]
    );

    return res.json({
      success: true,
      data: {
        ...returnResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/full", verifyToken, async (req, res, next) => {
  const {
    sale_id,
    invoice_no,
    reason,
    items,
  } = req.body || {};

  if (!sale_id) {
    return res.status(400).json({ success: false, message: "sale_id is required" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "At least one item is required" });
  }

  const normalizedItems = [];
  for (let i = 0; i < items.length; i += 1) {
    const raw = items[i] || {};
    const sale_item_id = Number(raw.sale_item_id ?? raw.saleItemId);
    const product_id = Number(raw.product_id ?? raw.productId);
    const qty = Number(raw.qty ?? 0);
    const price = Number(raw.price ?? 0);

    if (!sale_item_id) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: sale_item_id is required` });
    }
    if (!product_id) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: product_id is required` });
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: qty must be greater than 0` });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: price must be 0 or greater` });
    }

    normalizedItems.push({ sale_item_id, product_id, qty, price });
  }

  const totalRefund = normalizedItems.reduce((sum, item) => sum + item.qty * item.price, 0);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const returnResult = await client.query(
      `INSERT INTO sales_returns (sale_id, invoice_no, total_refund, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [sale_id, invoice_no || null, totalRefund, reason || null]
    );

    const salesReturn = returnResult.rows[0];
    const insertedItems = [];

    for (const item of normalizedItems) {
      const itemResult = await client.query(
        `INSERT INTO sales_return_items (sales_return_id, sale_item_id, name, qty, price, product_id)
         VALUES ($1, $2, (SELECT name FROM sale_items WHERE id = $2), $3, $4, $5)
         RETURNING *`,
        [salesReturn.id, item.sale_item_id, item.qty, item.price, item.product_id]
      );
      insertedItems.push(itemResult.rows[0]);

      await client.query(
        `UPDATE products
         SET quantity = COALESCE(quantity, 0) + $2,
             updated_at = NOW()
         WHERE id = $1`,
        [item.product_id, item.qty]
      );
    }

    const saleInfo = await client.query(
      `SELECT client_id, total FROM sales WHERE id = $1`,
      [sale_id]
    );

    if (saleInfo.rows.length > 0 && saleInfo.rows[0].client_id && totalRefund > 0) {
      await client.query(
        `UPDATE clients
         SET due_amount = GREATEST(COALESCE(due_amount, 0) - $2, 0),
             updated_at = NOW()
         WHERE id = $1`,
        [saleInfo.rows[0].client_id, totalRefund]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      data: {
        ...salesReturn,
        items: insertedItems,
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
