const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");
const { createCrudRouter } = require("./crud");

const router = express.Router();

router.get("/due", verifyToken, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `WITH due_data AS (
        SELECT
          c.id,
          c.code,
          c.name,
          c.email,
          c.phone,
          c.address,
          COALESCE(c.due_amount, 0)::numeric(12,2) AS due_amount,
          sale_info.invoice_no,
          sale_info.invoice_date,
          sale_info.invoice_total,
          sale_info.payment_type,
          sale_info.invoice_status,
          sale_info.days_since_invoice,
          pet_info.pet_name,
          pet_info.pet_type,
          pet_info.pet_breed,
          pet_info.pet_age,
          pet_info.pet_weight
        FROM clients c
        LEFT JOIN LATERAL (
          SELECT
            s.invoice_no,
            s.date AS invoice_date,
            s.total AS invoice_total,
            s.payment_type,
            s.status AS invoice_status,
            (CURRENT_DATE - COALESCE(s.date, CURRENT_DATE))::int AS days_since_invoice
          FROM sales s
          WHERE s.client_id = c.id
          ORDER BY s.date DESC NULLS LAST, s.id DESC
          LIMIT 1
        ) sale_info ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            p.name AS pet_name,
            p.type AS pet_type,
            p.breed AS pet_breed,
            p.age AS pet_age,
            p.weight AS pet_weight
          FROM pets p
          WHERE p.client_id = c.id
          ORDER BY p.updated_at DESC NULLS LAST, p.id DESC
          LIMIT 1
        ) pet_info ON TRUE
      )
      SELECT
        id,
        code,
        name,
        email,
        phone,
        address,
        due_amount,
        invoice_no,
        invoice_date,
        invoice_total,
        payment_type,
        invoice_status,
        COALESCE(days_since_invoice, 0) AS days_since_invoice,
        COALESCE(pet_name, '') AS pet_name,
        COALESCE(pet_type, '') AS pet_type,
        COALESCE(pet_breed, '') AS pet_breed,
        COALESCE(pet_age, '') AS pet_age,
        COALESCE(pet_weight, '') AS pet_weight
      FROM due_data
      WHERE due_amount > 0
      ORDER BY due_amount DESC, name ASC`
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return next(err);
  }
});

const crudRouter = createCrudRouter({
  table: "clients",
  columns: ["code", "name", "email", "phone", "address", "status", "due_amount"],
  required: ["name"],
});

router.use("/", crudRouter);

module.exports = router;
