const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");
const { createCrudRouter } = require("./crud");

const appointmentColumns = [
  "date",
  "time",
  "client_id",
  "client_name",
  "client_code",
  "pet_id",
  "pet_name",
  "pet_type",
  "animal_type",
  "age",
  "weight",
  "last_visit",
  "doctor",
  "reason",
  "status",
  "notes",
  "attachments",
];

async function ensureAttachmentsColumn() {
  try {
    await pool.query(
      `ALTER TABLE IF EXISTS appointments
       ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb`
    );
  } catch (err) {
    console.error("Failed to ensure attachments column", err);
  }
}

ensureAttachmentsColumn();

const crudRouter = createCrudRouter({
  table: "appointments",
  columns: appointmentColumns,
  optionalColumns: ["attachments"],
  jsonColumns: ["attachments"],
  required: ["date", "time", "client_name", "pet_name"],
});

const router = express.Router();

router.get("/summary", verifyToken, async (_req, res, next) => {
  try {
    const metricsResult = await pool.query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE date = CURRENT_DATE)::int AS today,
        COUNT(*) FILTER (WHERE date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')::int AS upcoming,
        COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'Scheduled')::int AS scheduled
      FROM appointments`
    );

    const statusResult = await pool.query(
      `SELECT COALESCE(status, 'Unassigned') AS status, COUNT(*)::int AS count
       FROM appointments
       GROUP BY status
       ORDER BY count DESC`
    );

    const dailyResult = await pool.query(
      `SELECT date, COUNT(*)::int AS count
       FROM appointments
       WHERE date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
       GROUP BY date
       ORDER BY date ASC`
    );

    const doctorResult = await pool.query(
      `SELECT COALESCE(doctor, 'Unassigned') AS doctor, COUNT(*)::int AS count
       FROM appointments
       WHERE date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
       GROUP BY doctor
       ORDER BY count DESC
       LIMIT 5`
    );

    return res.json({
      success: true,
      data: {
        metrics: {
          total: Number(metricsResult.rows[0]?.total || 0),
          today: Number(metricsResult.rows[0]?.today || 0),
          upcoming: Number(metricsResult.rows[0]?.upcoming || 0),
          completed: Number(metricsResult.rows[0]?.completed || 0),
          scheduled: Number(metricsResult.rows[0]?.scheduled || 0),
        },
        statuses: statusResult.rows.map((row) => ({
          status: row.status,
          count: Number(row.count || 0),
        })),
        daily: dailyResult.rows.map((row) => ({
          date: row.date,
          count: Number(row.count || 0),
        })),
        doctors: doctorResult.rows.map((row) => ({
          doctor: row.doctor,
          count: Number(row.count || 0),
        })),
      },
    });
  } catch (err) {
    return next(err);
  }
});

function toPositiveInt(value) {
  if (value === undefined || value === null) return null;
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "") return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
    return null;
  }
  return num;
}

async function normalizeForeignKey(value, { table, label }) {
  const parsed = toPositiveInt(value);
  if (parsed === null) return null;
  const exists = await pool.query(`SELECT 1 FROM ${table} WHERE id = $1`, [parsed]);
  if (exists.rowCount === 0) {
    console.warn(`Skipping ${label} reference. ID ${parsed} was not found.`);
    return null;
  }
  return parsed;
}
router.use(async (req, _res, next) => {
  if (!req || !req.method || !["POST", "PATCH"].includes(req.method) || !req.body) {
    return next();
  }

  try {
    const clientIdFromBody = req.body.client_id ?? req.body.clientId;
    req.body.client_id = await normalizeForeignKey(clientIdFromBody, {
      table: "clients",
      label: "Client",
    });

    const rawCode =
      typeof req.body.client_code === "string"
        ? req.body.client_code
        : typeof req.body.clientId === "string"
        ? req.body.clientId
        : "";
    req.body.client_code = rawCode.trim() || null;

    const petIdFromBody = req.body.pet_id ?? req.body.petId;
    req.body.pet_id = await normalizeForeignKey(petIdFromBody, {
      table: "pets",
      label: "Pet",
    });

    if (Array.isArray(req.body.attachments)) {
      req.body.attachments = req.body.attachments.map((item) => ({
        name: item?.name || "attachment",
        type: item?.type || "application/octet-stream",
        size: Number(item?.size) || 0,
        data: typeof item?.data === "string" ? item.data : null,
      }));
    } else if (typeof req.body.attachments === "string") {
      try {
        const parsed = JSON.parse(req.body.attachments);
        if (Array.isArray(parsed)) {
          req.body.attachments = parsed;
        }
      } catch (_err) {
        req.body.attachments = [];
      }
    }

    return next();
  } catch (err) {
    return next(err);
  }
});

router.use("/", crudRouter);

module.exports = router;
