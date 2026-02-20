const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/sales-items/search
 * Combined search for products, services, service packages, and add-on services
 * Returns a unified list for the sales item autocomplete
 */
router.get("/search", verifyToken, async (req, res, next) => {
  try {
    const { q = "", limit = 50 } = req.query;
    const searchTerm = `%${String(q).toLowerCase()}%`;
    const maxResults = Math.min(Number(limit) || 50, 100);

    // Search products
    const productsQuery = `
      SELECT
        id,
        'product' AS item_type,
        code AS item_code,
        name AS item_name,
        NULL AS package_name,
        category,
        COALESCE(selling_price, 0)::numeric(12,2) AS price,
        quantity AS stock_qty,
        status
      FROM products
      WHERE
        LOWER(COALESCE(name, '')) LIKE $1
        OR LOWER(COALESCE(code, '')) LIKE $1
        OR LOWER(COALESCE(category, '')) LIKE $1
      ORDER BY name ASC
      LIMIT $2
    `;

    // Search base services
    const servicesQuery = `
      SELECT
        id,
        'service' AS item_type,
        'SVC-' || id AS item_code,
        name AS item_name,
        NULL AS package_name,
        category,
        COALESCE(price, 0)::numeric(12,2) AS price,
        NULL AS stock_qty,
        status
      FROM services
      WHERE
        status = 'Active'
        AND (
          LOWER(COALESCE(name, '')) LIKE $1
          OR LOWER(COALESCE(category, '')) LIKE $1
        )
      ORDER BY name ASC
      LIMIT $2
    `;

    // Search service packages
    const packagesQuery = `
      SELECT
        sp.id,
        'package' AS item_type,
        'PKG-' || sp.id AS item_code,
        sp.name AS item_name,
        COALESCE(sp.service_type, sp.service_type_code, 'General') AS package_name,
        COALESCE(sp.service_type, sp.service_type_code, 'Package') AS category,
        COALESCE(sp.price, 0)::numeric(12,2) AS price,
        NULL AS stock_qty,
        sp.status
      FROM service_packages sp
      WHERE
        (sp.status IS NULL OR LOWER(sp.status) = 'active')
        AND (
          LOWER(COALESCE(sp.name, '')) LIKE $1
          OR LOWER(COALESCE(sp.description, '')) LIKE $1
          OR LOWER(COALESCE(sp.service_type, '')) LIKE $1
          OR LOWER(COALESCE(sp.service_type_code, '')) LIKE $1
        )
      ORDER BY sp.name ASC
      LIMIT $2
    `;

    // Search add-on services
    const addonsQuery = `
      SELECT
        aos.id,
        'addon' AS item_type,
        'ADD-' || aos.id AS item_code,
        aos.name AS item_name,
        COALESCE(aos.service_type, aos.service_type_code, 'Add-on') AS package_name,
        COALESCE(aos.service_type, aos.service_type_code, 'Add-on Service') AS category,
        COALESCE(aos.price, 0)::numeric(12,2) AS price,
        NULL AS stock_qty,
        aos.status
      FROM add_on_services aos
      WHERE
        (aos.status IS NULL OR LOWER(aos.status) = 'active')
        AND (
          LOWER(COALESCE(aos.name, '')) LIKE $1
          OR LOWER(COALESCE(aos.description, '')) LIKE $1
          OR LOWER(COALESCE(aos.service_type, '')) LIKE $1
          OR LOWER(COALESCE(aos.service_type_code, '')) LIKE $1
        )
      ORDER BY aos.name ASC
      LIMIT $2
    `;

    // Execute all queries in parallel
    const [productsResult, servicesResult, packagesResult, addonsResult] = await Promise.all([
      pool.query(productsQuery, [searchTerm, maxResults]),
      pool.query(servicesQuery, [searchTerm, maxResults]),
      pool.query(packagesQuery, [searchTerm, maxResults]),
      pool.query(addonsQuery, [searchTerm, maxResults]),
    ]);

    // Combine and format results
    const items = [
      ...productsResult.rows.map((row) => ({
        id: row.id,
        type: "product",
        code: row.item_code || `PRD-${row.id}`,
        name: row.item_name,
        packageName: null,
        category: row.category || "Product",
        price: Number(row.price) || 0,
        stockQty: row.stock_qty,
        status: row.status,
      })),
      ...servicesResult.rows.map((row) => ({
        id: row.id,
        type: "service",
        code: row.item_code,
        name: row.item_name,
        packageName: null,
        category: row.category || "Service",
        price: Number(row.price) || 0,
        stockQty: null,
        status: row.status,
      })),
      ...packagesResult.rows.map((row) => ({
        id: row.id,
        type: "package",
        code: row.item_code,
        name: row.item_name,
        packageName: row.package_name,
        category: row.category || "Package",
        price: Number(row.price) || 0,
        stockQty: null,
        status: row.status,
      })),
      ...addonsResult.rows.map((row) => ({
        id: row.id,
        type: "addon",
        code: row.item_code,
        name: row.item_name,
        packageName: row.package_name,
        category: row.category || "Add-on",
        price: Number(row.price) || 0,
        stockQty: null,
        status: row.status,
      })),
    ];

    // Sort combined results by name and limit total
    items.sort((a, b) => a.name.localeCompare(b.name));
    const limitedItems = items.slice(0, maxResults);

    return res.json({
      success: true,
      data: limitedItems,
      counts: {
        products: productsResult.rows.length,
        services: servicesResult.rows.length,
        packages: packagesResult.rows.length,
        addons: addonsResult.rows.length,
        total: limitedItems.length,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/sales-items/all
 * Get all available items (products + services) for initial load
 * Optimized for performance with pagination
 */
router.get("/all", verifyToken, async (req, res, next) => {
  try {
    const { limit = 200, offset = 0 } = req.query;
    const maxResults = Math.min(Number(limit) || 200, 500);
    const offsetNum = Number(offset) || 0;

    // Get all items with UNION for efficiency
    const combinedQuery = `
      (
        SELECT
          id,
          'product' AS type,
          code,
          name,
          NULL AS package_name,
          category,
          COALESCE(selling_price, 0)::numeric(12,2) AS price,
          quantity AS stock_qty,
          status
        FROM products
        WHERE status != 'Returned' OR status IS NULL
      )
      UNION ALL
      (
        SELECT
          id,
          'service' AS type,
          'SVC-' || id AS code,
          name,
          NULL AS package_name,
          category,
          COALESCE(price, 0)::numeric(12,2) AS price,
          NULL AS stock_qty,
          status
        FROM services
        WHERE status = 'Active'
      )
      UNION ALL
      (
        SELECT
          id,
          'package' AS type,
          'PKG-' || id AS code,
          name,
          COALESCE(service_type, service_type_code, 'Package') AS package_name,
          COALESCE(service_type, service_type_code, 'Package') AS category,
          COALESCE(price, 0)::numeric(12,2) AS price,
          NULL AS stock_qty,
          status
        FROM service_packages
        WHERE status IS NULL OR LOWER(status) = 'active'
      )
      UNION ALL
      (
        SELECT
          id,
          'addon' AS type,
          'ADD-' || id AS code,
          name,
          COALESCE(service_type, service_type_code, 'Add-on') AS package_name,
          COALESCE(service_type, service_type_code, 'Add-on') AS category,
          COALESCE(price, 0)::numeric(12,2) AS price,
          NULL AS stock_qty,
          status
        FROM add_on_services
        WHERE status IS NULL OR LOWER(status) = 'active'
      )
      ORDER BY name ASC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(combinedQuery, [maxResults, offsetNum]);

    const items = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      code: row.code || `${row.type.toUpperCase().slice(0, 3)}-${row.id}`,
      name: row.name,
      packageName: row.package_name,
      category: row.category,
      price: Number(row.price) || 0,
      stockQty: row.stock_qty,
      status: row.status,
    }));

    return res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
