const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");
const { createCrudRouter } = require("./crud");

const router = express.Router();

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const parseBoolean = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const normalizeStatus = (value) => {
  const normalized = String(value || "all").trim().toLowerCase();
  if (!normalized || normalized === "all") return "all";
  return normalized;
};

const normalizeExpiryMode = (value) => {
  const normalized = String(value || "all").trim().toLowerCase();
  if (normalized === "expiring" || normalized === "expired") return normalized;
  return "all";
};

const formatFilters = (query = {}) => ({
  category: String(query.category || ""),
  status: normalizeStatus(query.status),
  search: String(query.search || "").trim().toLowerCase(),
  lowOnly: parseBoolean(query.lowOnly),
  expiryMode: normalizeExpiryMode(query.expiryMode),
});

const lowStockCondition = (alias = "p") => `COALESCE(${alias}.reorder_level, 0) > 0 AND COALESCE(${alias}.quantity, 0) <= COALESCE(${alias}.reorder_level, 0)`;
const expiringCondition = (alias = "p") => `${alias}.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`;
const expiredCondition = (alias = "p") => `${alias}.expiry_date < CURRENT_DATE`;

const buildWhereClause = (filters = {}, alias = "p") => {
  const clauses = [];
  const values = [];

  if (filters.category) {
    values.push(filters.category);
    clauses.push(`LOWER(COALESCE(${alias}.category, '')) = LOWER($${values.length})`);
  }

  if (filters.status && filters.status !== "all") {
    values.push(filters.status);
    clauses.push(`LOWER(COALESCE(${alias}.status, '')) = LOWER($${values.length})`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const placeholder = values.length;
    clauses.push(
      `(
        LOWER(COALESCE(${alias}.name, '')) LIKE $${placeholder}
        OR LOWER(COALESCE(${alias}.code, '')) LIKE $${placeholder}
        OR LOWER(COALESCE(${alias}.category, '')) LIKE $${placeholder}
      )`
    );
  }

  if (filters.lowOnly) {
    clauses.push(lowStockCondition(alias));
  }

  if (filters.expiryMode === "expiring") {
    clauses.push(expiringCondition(alias));
  } else if (filters.expiryMode === "expired") {
    clauses.push(expiredCondition(alias));
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
};

const mapProductRow = (row) => ({
  id: row.id,
  code: row.code || `SKU-${row.id}`,
  name: row.name,
  category: row.category || "Uncategorized",
  quantity: Number(row.quantity || 0),
  reorderLevel: Number(row.reorder_level || 0),
  status: row.status || "inactive",
  expiryDate: row.expiry_date,
  supplier: row.supplier || "Unknown supplier",
  costPrice: toNumber(row.cost_price),
  sellingPrice: toNumber(row.selling_price),
});

router.get("/summary", verifyToken, async (req, res, next) => {
  try {
    const filters = formatFilters(req.query);
    const { whereClause, values } = buildWhereClause(filters, "p");
    const lowClause = lowStockCondition("p");
    const expiringClause = expiringCondition("p");
    const expiredClause = expiredCondition("p");

    const [
      summaryResult,
      categoryResult,
      statusResult,
      lowStockResult,
      expiringResult,
      allProductsResult,
    ] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(*)::int AS sku_count,
          COALESCE(SUM(COALESCE(p.quantity, 0)), 0)::numeric(16,2) AS total_units,
          COALESCE(SUM(COALESCE(p.quantity, 0) * COALESCE(p.selling_price, 0)), 0)::numeric(18,2) AS retail_value,
          COALESCE(SUM(COALESCE(p.quantity, 0) * COALESCE(p.cost_price, 0)), 0)::numeric(18,2) AS cost_value,
          COALESCE(SUM(CASE WHEN ${lowClause} THEN 1 ELSE 0 END), 0)::int AS low_stock_skus,
          COALESCE(SUM(CASE WHEN ${expiringClause} THEN 1 ELSE 0 END), 0)::int AS expiring_skus,
          COALESCE(SUM(CASE WHEN ${expiredClause} THEN 1 ELSE 0 END), 0)::int AS expired_skus
        FROM products p
        ${whereClause}`,
        values
      ),
      pool.query(
        `SELECT
          COALESCE(p.category, 'Uncategorized') AS category,
          COUNT(*)::int AS skus,
          COALESCE(SUM(COALESCE(p.quantity, 0)), 0)::numeric(16,2) AS units,
          COALESCE(SUM(COALESCE(p.quantity, 0) * COALESCE(p.cost_price, 0)), 0)::numeric(18,2) AS cost_value
        FROM products p
        ${whereClause}
        GROUP BY COALESCE(p.category, 'Uncategorized')
        ORDER BY units DESC`,
        values
      ),
      pool.query(
        `SELECT
          LOWER(COALESCE(p.status, 'inactive')) AS status,
          COUNT(*)::int AS skus,
          COALESCE(SUM(COALESCE(p.quantity, 0)), 0)::numeric(16,2) AS units
        FROM products p
        ${whereClause}
        GROUP BY LOWER(COALESCE(p.status, 'inactive'))
        ORDER BY units DESC`,
        values
      ),
      pool.query(
        `SELECT
          p.id,
          p.code,
          p.name,
          p.category,
          p.quantity,
          p.reorder_level,
          p.status,
          p.expiry_date,
          p.cost_price,
          p.selling_price,
          COALESCE(sup.name, 'Unknown supplier') AS supplier
        FROM products p
        LEFT JOIN suppliers sup ON sup.id = p.supplier_id
        ${whereClause ? `${whereClause} AND ${lowClause}` : `WHERE ${lowClause}`}
        ORDER BY COALESCE(p.quantity, 0) ASC, p.reorder_level ASC NULLS LAST
        LIMIT 100`,
        values
      ),
      pool.query(
        `SELECT
          p.id,
          p.code,
          p.name,
          p.category,
          p.quantity,
          p.reorder_level,
          p.status,
          p.expiry_date,
          p.cost_price,
          p.selling_price,
          COALESCE(sup.name, 'Unknown supplier') AS supplier
        FROM products p
        LEFT JOIN suppliers sup ON sup.id = p.supplier_id
        ${whereClause ? `${whereClause} AND ${expiringClause}` : `WHERE ${expiringClause}`}
        ORDER BY p.expiry_date ASC NULLS LAST, p.quantity ASC
        LIMIT 100`,
        values
      ),
      pool.query(
        `SELECT
          p.id,
          p.code,
          p.name,
          p.category,
          p.quantity,
          p.reorder_level,
          p.status,
          p.expiry_date,
          p.cost_price,
          p.selling_price,
          COALESCE(sup.name, 'Unknown supplier') AS supplier
        FROM products p
        LEFT JOIN suppliers sup ON sup.id = p.supplier_id
        ${whereClause}
        ORDER BY COALESCE(p.quantity, 0) ASC, p.name ASC
        LIMIT 200`,
        values
      ),
    ]);

    const summaryRow = summaryResult.rows[0] || {};
    const categories = categoryResult.rows.map((row) => ({
      category: row.category || "Uncategorized",
      skus: Number(row.skus || 0),
      units: toNumber(row.units),
      costValue: toNumber(row.cost_value),
    }));

    const statuses = statusResult.rows.map((row) => ({
      status: row.status || "inactive",
      skus: Number(row.skus || 0),
      units: toNumber(row.units),
    }));

    const lowStock = lowStockResult.rows.map(mapProductRow);
    const expiring = expiringResult.rows.map(mapProductRow);
    const products = allProductsResult.rows.map(mapProductRow);

    return res.json({
      success: true,
      data: {
        filters,
        summary: {
          totalUnits: toNumber(summaryRow.total_units),
          retailValue: toNumber(summaryRow.retail_value),
          costValue: toNumber(summaryRow.cost_value),
          skuCount: Number(summaryRow.sku_count || 0),
          lowStockSkus: Number(summaryRow.low_stock_skus || 0),
          expiringSkus: Number(summaryRow.expiring_skus || 0),
          expiredSkus: Number(summaryRow.expired_skus || 0),
        },
        categories,
        statuses,
        lowStock,
        expiring,
        products,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.use(
  "/",
  createCrudRouter({
    table: "products",
    columns: [
      "code",
      "name",
      "category",
      "unit",
      "size",
      "weight",
      "cost_price",
      "selling_price",
      "expiry_date",
      "reorder_level",
      "supplier_id",
      "quantity",
      "status",
    ],
    required: ["name", "selling_price"],
  })
);

module.exports = router;
