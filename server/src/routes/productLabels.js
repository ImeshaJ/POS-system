const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");
const crypto = require("crypto");

const router = express.Router();

/**
 * Generate a unique label code
 * Format: {productCode}-{timestamp}-{random}
 */
const generateUniqueLabelCode = (productCode) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  const code = productCode ? productCode.replace(/[^A-Z0-9]/gi, "").toUpperCase() : "LBL";
  return `${code}-${timestamp}-${random}`;
};

/**
 * POST /api/product-labels/generate
 * Generate unique labels for a product
 */
router.post("/generate", verifyToken, async (req, res, next) => {
  const client = await pool.connect();

  try {
    const {
      product_id,
      quantity = 1,
      product_code,
      product_name,
      selling_price,
      expiry_date,
      supplier_name,
    } = req.body;

    if (quantity < 1 || quantity > 100) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be between 1 and 100",
      });
    }

    await client.query("BEGIN");

    const labels = [];

    for (let i = 0; i < quantity; i++) {
      let labelCode;
      let attempts = 0;
      const maxAttempts = 10;

      // Ensure unique code generation
      while (attempts < maxAttempts) {
        labelCode = generateUniqueLabelCode(product_code);
        const existing = await client.query(
          "SELECT id FROM product_labels WHERE label_code = $1",
          [labelCode]
        );
        if (existing.rows.length === 0) break;
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("Failed to generate unique label code");
      }

      const result = await client.query(
        `INSERT INTO product_labels
          (product_id, label_code, product_code, product_name, selling_price, expiry_date, supplier_name, printed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [
          product_id || null,
          labelCode,
          product_code || null,
          product_name || null,
          selling_price || 0,
          expiry_date || null,
          supplier_name || null,
        ]
      );

      labels.push(result.rows[0]);
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      data: labels,
      message: `${labels.length} label(s) generated successfully`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
});

/**
 * GET /api/product-labels
 * Get all labels with optional filtering
 */
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { product_id, limit = 500, offset = 0, search } = req.query;

    let whereClause = "";
    const values = [];

    if (product_id) {
      values.push(product_id);
      whereClause = `WHERE pl.product_id = $${values.length}`;
    }

    if (search) {
      values.push(`%${search}%`);
      const searchClause = `(
        LOWER(COALESCE(pl.label_code, '')) LIKE LOWER($${values.length})
        OR LOWER(COALESCE(pl.product_code, '')) LIKE LOWER($${values.length})
        OR LOWER(COALESCE(pl.product_name, '')) LIKE LOWER($${values.length})
      )`;
      whereClause = whereClause
        ? `${whereClause} AND ${searchClause}`
        : `WHERE ${searchClause}`;
    }

    values.push(Number(limit) || 500);
    values.push(Number(offset) || 0);

    const result = await pool.query(
      `SELECT
        pl.*,
        s.name AS supplier_display_name
       FROM product_labels pl
       LEFT JOIN products p ON p.id = pl.product_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       ${whereClause}
       ORDER BY pl.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM product_labels pl ${whereClause}`,
      values.slice(0, -2)
    );

    return res.json({
      success: true,
      data: result.rows,
      total: countResult.rows[0]?.total || 0,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/product-labels/:id
 * Get a specific label by ID
 */
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT pl.*, s.name AS supplier_display_name
       FROM product_labels pl
       LEFT JOIN products p ON p.id = pl.product_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       WHERE pl.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Label not found",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/product-labels/by-code/:code
 * Get a label by its unique code
 */
router.get("/by-code/:code", verifyToken, async (req, res, next) => {
  try {
    const { code } = req.params;

    const result = await pool.query(
      `SELECT pl.*, s.name AS supplier_display_name
       FROM product_labels pl
       LEFT JOIN products p ON p.id = pl.product_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       WHERE pl.label_code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Label not found",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/product-labels/report/data
 * Get comprehensive report data for download
 */
router.get("/report/data", verifyToken, async (req, res, next) => {
  try {
    const { start_date, end_date, product_id, supplier_id } = req.query;

    let whereClause = "";
    const values = [];

    const conditions = [];

    if (start_date) {
      values.push(start_date);
      conditions.push(`pl.created_at >= $${values.length}::date`);
    }

    if (end_date) {
      values.push(end_date);
      conditions.push(`pl.created_at <= ($${values.length}::date + INTERVAL '1 day')`);
    }

    if (product_id) {
      values.push(product_id);
      conditions.push(`pl.product_id = $${values.length}`);
    }

    if (supplier_id) {
      values.push(supplier_id);
      conditions.push(`p.supplier_id = $${values.length}`);
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(" AND ")}`;
    }

    const result = await pool.query(
      `SELECT
        pl.id,
        pl.label_code,
        pl.product_code,
        pl.product_name,
        pl.selling_price,
        pl.expiry_date,
        pl.supplier_name,
        pl.printed_at,
        pl.created_at,
        p.category AS product_category,
        p.unit AS product_unit,
        p.cost_price,
        p.quantity AS stock_quantity,
        p.reorder_level,
        s.name AS supplier_display_name,
        s.phone AS supplier_phone,
        s.email AS supplier_email,
        s.address AS supplier_address
       FROM product_labels pl
       LEFT JOIN products p ON p.id = pl.product_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       ${whereClause}
       ORDER BY pl.created_at DESC`,
      values
    );

    // Get summary statistics
    const summaryResult = await pool.query(
      `SELECT
        COUNT(*)::int AS total_labels,
        COUNT(DISTINCT pl.product_id)::int AS unique_products,
        COUNT(DISTINCT p.supplier_id)::int AS unique_suppliers,
        COALESCE(SUM(pl.selling_price), 0)::numeric(18,2) AS total_retail_value,
        MIN(pl.created_at) AS earliest_label,
        MAX(pl.created_at) AS latest_label
       FROM product_labels pl
       LEFT JOIN products p ON p.id = pl.product_id
       ${whereClause}`,
      values
    );

    return res.json({
      success: true,
      data: {
        labels: result.rows,
        summary: summaryResult.rows[0] || {},
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/product-labels/:id
 * Delete a specific label
 */
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM product_labels WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Label not found",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
      message: "Label deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/product-labels/:id/reprint
 * Mark a label as reprinted (update printed_at timestamp)
 */
router.patch("/:id/reprint", verifyToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE product_labels
       SET printed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Label not found",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
      message: "Label reprinted successfully",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
