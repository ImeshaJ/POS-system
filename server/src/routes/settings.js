const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

const SHOP_INFO_KEY = "shop_info";
const DEFAULT_SHOP_INFO = {
  shopName: "Furry Friends Vet Clinic",
  address: "",
  phone: "",
  email: "",
  vatNumber: "",
};

const ensureAdmin = (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ success: false, message: "Admin access required" });
    return false;
  }
  return true;
};

const parseValue = (value, fallback = {}) => {
  if (!value) return fallback;
  try {
    if (typeof value === "object") return value;
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const formatUser = (row = {}) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  role: row.role,
  status: row.status || "Active",
  fullName: row.full_name || row.username,
  createdAt: row.created_at,
});

router.get("/shop", verifyToken, async (_req, res, next) => {
  try {
    const result = await pool.query(`SELECT value FROM app_settings WHERE key = $1 LIMIT 1`, [SHOP_INFO_KEY]);
    const payload = parseValue(result.rows[0]?.value, DEFAULT_SHOP_INFO) || DEFAULT_SHOP_INFO;
    return res.json({ success: true, data: { ...DEFAULT_SHOP_INFO, ...payload } });
  } catch (error) {
    return next(error);
  }
});

router.put("/shop", verifyToken, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return undefined;
  }

  try {
    const { shopName, address, phone, email, vatNumber } = req.body || {};
    if (!shopName) {
      return res.status(400).json({ success: false, message: "Shop name is required" });
    }

    const payload = {
      shopName: shopName.trim(),
      address: (address || "").trim(),
      phone: (phone || "").trim(),
      email: (email || "").trim(),
      vatNumber: (vatNumber || "").trim(),
    };

    const result = await pool.query(
      `INSERT INTO app_settings (key, category, value, updated_by)
       VALUES ($1, 'settings', $2::jsonb, $3)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
       RETURNING value`,
      [SHOP_INFO_KEY, JSON.stringify(payload), req.user.id || null]
    );

    return res.json({ success: true, data: parseValue(result.rows[0]?.value, payload) });
  } catch (error) {
    return next(error);
  }
});

router.get("/notifications", verifyToken, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, message, type, status, metadata, created_at, read_at
       FROM system_notifications
       ORDER BY created_at DESC
       LIMIT 50`
    );

    const unread = result.rows.filter((row) => row.status === "unread").length;
    return res.json({
      success: true,
      data: {
        notifications: result.rows.map((row) => ({
          id: row.id,
          message: row.message,
          type: row.type,
          status: row.status,
          createdAt: row.created_at,
          readAt: row.read_at,
          metadata: row.metadata,
        })),
        summary: {
          total: result.rows.length,
          unread,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/notifications/:id", verifyToken, async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!status || !["unread", "read", "archived"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const result = await pool.query(
      `UPDATE system_notifications
       SET status = $1,
           read_at = CASE WHEN $1 = 'read' THEN NOW() ELSE read_at END
       WHERE id = $2
       RETURNING id, message, type, status, metadata, created_at, read_at`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    const row = result.rows[0];
    return res.json({
      success: true,
      data: {
        id: row.id,
        message: row.message,
        type: row.type,
        status: row.status,
        createdAt: row.created_at,
        readAt: row.read_at,
        metadata: row.metadata,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/users", verifyToken, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return undefined;
  }

  try {
    const result = await pool.query(
      `SELECT id, email, username, role, status, full_name, created_at
       FROM users
       ORDER BY created_at ASC`
    );

    return res.json({
      success: true,
      data: result.rows.map(formatUser),
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/users/:id", verifyToken, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return undefined;
  }

  try {
    const { role, status, fullName } = req.body || {};
    const updates = [];
    const values = [];

    if (role) {
      if (!["admin", "staff"].includes(role)) {
        return res.status(400).json({ success: false, message: "Invalid role" });
      }
      values.push(role);
      updates.push(`role = $${values.length}`);
    }

    if (status) {
      if (!["Active", "Inactive"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }
      values.push(status);
      updates.push(`status = $${values.length}`);
    }

    if (typeof fullName === "string") {
      values.push(fullName.trim());
      updates.push(`full_name = $${values.length}`);
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: "No updates provided" });
    }

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${values.length} RETURNING id, email, username, role, status, full_name, created_at`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, data: formatUser(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/users/:id", verifyToken, async (req, res, next) => {
  if (!ensureAdmin(req, res)) {
    return undefined;
  }

  if (String(req.user.id) === String(req.params.id)) {
    return res.status(400).json({ success: false, message: "You cannot delete your own account" });
  }

  try {
    const result = await pool.query(`DELETE FROM users WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
