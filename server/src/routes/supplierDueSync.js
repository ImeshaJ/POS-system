const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();
router.use(verifyToken);

router.post("/sync", async (_req, res, next) => {
  try {
    const result = await pool.query(`
      WITH purchase_totals AS (
        SELECT supplier_id, COALESCE(SUM(total), 0) AS total_amount
        FROM purchases
        WHERE supplier_id IS NOT NULL
        GROUP BY supplier_id
      ),
      updated AS (
        UPDATE supplier_dues sd
        SET
          total_amount = pt.total_amount,
          due_amount = GREATEST(pt.total_amount - sd.paid_amount, 0)
        FROM purchase_totals pt
        WHERE sd.supplier_id = pt.supplier_id
        RETURNING sd.*
      ),
      inserted AS (
        INSERT INTO supplier_dues (supplier_id, total_amount, paid_amount, due_amount, last_payment_date, due_date, notes)
        SELECT pt.supplier_id, pt.total_amount, 0, pt.total_amount, NULL, NULL, 'Auto-generated from purchases'
        FROM purchase_totals pt
        WHERE NOT EXISTS (
          SELECT 1 FROM supplier_dues sd WHERE sd.supplier_id = pt.supplier_id
        )
        RETURNING *
      )
      SELECT * FROM updated
      UNION ALL
      SELECT * FROM inserted
      ORDER BY id DESC;
    `);

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
