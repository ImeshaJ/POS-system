const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");

function pickFields(body, columns) {
  const data = {};
  columns.forEach((col) => {
    if (Object.prototype.hasOwnProperty.call(body, col)) {
      data[col] = body[col];
    }
  });
  return data;
}

function createCrudRouter({
  table,
  columns,
  orderBy = "id",
  select = "*",
  required = [],
  optionalColumns = [],
  jsonColumns = [],
  filters = [],
}) {
  const router = express.Router();
  router.use(verifyToken);

  const optionalSet = new Set(optionalColumns);
  const jsonSet = new Set(jsonColumns);
  const filterableColumns = Array.isArray(filters) ? filters : [];
  let cachedColumnsPromise = null;

  const buildFilterClause = (query = {}) => {
    if (!filterableColumns.length) return { clause: "", values: [] };
    const clauses = [];
    const values = [];
    filterableColumns.forEach((column) => {
      const rawValue = query[column];
      const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      if (value === undefined || value === null || value === "") return;
      clauses.push(`${column} = $${values.length + 1}`);
      values.push(value);
    });
    if (!clauses.length) {
      return { clause: "", values: [] };
    }
    return { clause: `WHERE ${clauses.join(" AND ")}`, values };
  };

  const stringifyJsonColumns = (data) => {
    jsonSet.forEach((column) => {
      if (!Object.prototype.hasOwnProperty.call(data, column)) return;
      const value = data[column];
      if (value === undefined) {
        delete data[column];
        return;
      }
      if (value === null) {
        data[column] = null;
        return;
      }
      if (typeof value === "string") {
        try {
          JSON.parse(value);
          data[column] = value;
          return;
        } catch (_err) {
          // fall through to stringify below
        }
      }
      try {
        data[column] = JSON.stringify(value);
      } catch (_err) {
        data[column] = JSON.stringify(String(value));
      }
    });
  };

  const getActiveColumns = async () => {
    if (!cachedColumnsPromise) {
      cachedColumnsPromise = pool
        .query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
          [table]
        )
        .then((result) => {
          const existing = new Set(result.rows.map((row) => row.column_name));
          const missingRequired = columns.filter(
            (col) => !existing.has(col) && !optionalSet.has(col)
          );
          if (missingRequired.length > 0) {
            throw new Error(
              `Missing required columns on ${table}: ${missingRequired.join(", ")}`
            );
          }
          const missingOptional = columns.filter(
            (col) => optionalSet.has(col) && !existing.has(col)
          );
          if (missingOptional.length > 0) {
            console.warn(
              `Optional columns unavailable on ${table}: ${missingOptional.join(", ")}`
            );
          }
          return columns.filter((col) => existing.has(col));
        })
        .catch((err) => {
          cachedColumnsPromise = null;
          throw err;
        });
    }
    return cachedColumnsPromise;
  };

  router.get("/", async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page || 1));
      const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
      const offset = (page - 1) * limit;
      const { clause, values } = buildFilterClause(req.query);

      const totalResult = await pool.query(
        `SELECT COUNT(*)::int AS count FROM ${table} ${clause}`,
        values
      );
      const total = totalResult.rows[0]?.count || 0;

      const limitPlaceholder = `$${values.length + 1}`;
      const offsetPlaceholder = `$${values.length + 2}`;
      const result = await pool.query(
        `SELECT ${select} FROM ${table} ${clause} ORDER BY ${orderBy} DESC LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
        [...values, limit, offset]
      );

      return res.json({
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT ${select} FROM ${table} WHERE id = $1`,
        [req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Not found" });
      }
      return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const missing = required.filter((field) => {
        const value = req.body?.[field];
        return value === undefined || value === null || value === "";
      });
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missing.join(", ")}`,
        });
      }

      const activeColumns = await getActiveColumns();
      const data = pickFields(req.body || {}, activeColumns);
      stringifyJsonColumns(data);
      const fields = Object.keys(data);
      if (fields.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No valid fields provided" });
      }
      const values = fields.map((f) => data[f]);
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");
      const result = await pool.query(
        `INSERT INTO ${table} (${fields.join(", ")})
         VALUES (${placeholders})
         RETURNING *`,
        values
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const activeColumns = await getActiveColumns();
      const data = pickFields(req.body || {}, activeColumns);
      stringifyJsonColumns(data);
      const fields = Object.keys(data);
      if (fields.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No valid fields provided" });
      }
      const setClause = fields
        .map((f, i) => `${f} = $${i + 1}`)
        .join(", ");
      const values = fields.map((f) => data[f]);
      values.push(req.params.id);
      const result = await pool.query(
        `UPDATE ${table} SET ${setClause} WHERE id = $${
          fields.length + 1
        } RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Not found" });
      }
      return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const result = await pool.query(
        `DELETE FROM ${table} WHERE id = $1 RETURNING id`,
        [req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Not found" });
      }
      return res.json({ success: true, data: { id: result.rows[0].id } });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { createCrudRouter };
