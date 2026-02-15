const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");
const { createCrudRouter } = require("./crud");

const crudRouter = createCrudRouter({
  table: "purchase_returns",
  columns: ["purchase_id", "invoice_no", "total_refund", "reason"],
  required: ["purchase_id"],
});

const router = express.Router();

router.get("/:id/full", verifyToken, async (req, res, next) => {
  try {
    const returnResult = await pool.query(
      `SELECT pr.*, p.invoice_no AS purchase_invoice_no, p.supplier_id, p.total AS purchase_total
       FROM purchase_returns pr
       LEFT JOIN purchases p ON p.id = pr.purchase_id
       WHERE pr.id = $1`,
      [req.params.id]
    );

    if (returnResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Purchase return not found" });
    }

    const itemsResult = await pool.query(
      `SELECT pri.*, pi.product_id, pi.cost_price, pi.qty AS original_qty, prod.name AS product_name, prod.code AS product_code
       FROM purchase_return_items pri
       LEFT JOIN purchase_items pi ON pi.id = pri.purchase_item_id
       LEFT JOIN products prod ON prod.id = pri.product_id
       WHERE pri.purchase_return_id = $1`,
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
    purchase_id,
    invoice_no,
    reason,
    items,
  } = req.body || {};

  if (!purchase_id) {
    return res.status(400).json({ success: false, message: "purchase_id is required" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "At least one item is required" });
  }

  const normalizedItems = [];
  for (let i = 0; i < items.length; i += 1) {
    const raw = items[i] || {};
    const purchase_item_id = Number(raw.purchase_item_id ?? raw.purchaseItemId);
    const product_id = Number(raw.product_id ?? raw.productId);
    const qty = Number(raw.qty ?? 0);
    const cost_price = Number(raw.cost_price ?? raw.costPrice ?? 0);

    if (!purchase_item_id) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: purchase_item_id is required` });
    }
    if (!product_id) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: product_id is required` });
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: qty must be greater than 0` });
    }
    if (!Number.isFinite(cost_price) || cost_price < 0) {
      return res.status(400).json({ success: false, message: `Item ${i + 1}: cost_price must be 0 or greater` });
    }

    normalizedItems.push({ purchase_item_id, product_id, qty, cost_price });
  }

  const totalRefund = normalizedItems.reduce((sum, item) => sum + item.qty * item.cost_price, 0);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const returnResult = await client.query(
      `INSERT INTO purchase_returns (purchase_id, invoice_no, total_refund, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [purchase_id, invoice_no || null, totalRefund, reason || null]
    );

    const purchaseReturn = returnResult.rows[0];
    const insertedItems = [];

    for (const item of normalizedItems) {
      const itemResult = await client.query(
        `INSERT INTO purchase_return_items (purchase_return_id, purchase_item_id, product_id, qty, cost_price)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [purchaseReturn.id, item.purchase_item_id, item.product_id, item.qty, item.cost_price]
      );
      insertedItems.push(itemResult.rows[0]);

      await client.query(
        `UPDATE products
         SET quantity = GREATEST(COALESCE(quantity, 0) - $2, 0),
             updated_at = NOW()
         WHERE id = $1`,
        [item.product_id, item.qty]
      );
    }

    const purchaseInfo = await client.query(
      `SELECT supplier_id, total FROM purchases WHERE id = $1`,
      [purchase_id]
    );

    if (purchaseInfo.rows.length > 0 && purchaseInfo.rows[0].supplier_id && totalRefund > 0) {
      const existingDue = await client.query(
        `SELECT id, due_amount FROM supplier_dues WHERE supplier_id = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [purchaseInfo.rows[0].supplier_id]
      );

      if (existingDue.rows.length > 0) {
        await client.query(
          `UPDATE supplier_dues
           SET due_amount = GREATEST(COALESCE(due_amount, 0) - $2, 0),
               updated_at = NOW()
           WHERE id = $1`,
          [existingDue.rows[0].id, totalRefund]
        );
      }
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      data: {
        ...purchaseReturn,
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
