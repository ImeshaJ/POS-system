const express = require("express");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");
const { createCrudRouter } = require("./crud");

const SERVICE_RULES = [
  {
    key: "grooming",
    label: "Grooming Session",
    category: "Grooming",
    keywords: ["groom", "bath", "spa", "trim", "coat", "clip"],
    defaultPrice: 2500,
    defaultCost: 800,
  },
  {
    key: "boarding",
    label: "Boarding Stay",
    category: "Boarding",
    keywords: ["board", "boarding", "stay", "overnight", "kennel", "hotel", "daycare"],
    defaultPrice: 5500,
    defaultCost: 2000,
  },
  {
    key: "physiotherapy",
    label: "Physiotherapy Session",
    category: "Therapy",
    keywords: ["physio", "therapy", "rehab", "laser", "acupuncture", "massage"],
    defaultPrice: 4200,
    defaultCost: 1500,
  },
  {
    key: "consultation",
    label: "Consultation",
    category: "Medical",
    keywords: ["consult", "checkup", "review", "follow"],
    defaultPrice: 2000,
    defaultCost: 400,
  },
  {
    key: "vaccination",
    label: "Vaccination",
    category: "Medical",
    keywords: ["vacci", "booster", "immun", "shot"],
    defaultPrice: 2500,
    defaultCost: 800,
  },
  {
    key: "surgery",
    label: "Surgery",
    category: "Surgical",
    keywords: ["surg", "operation", "spay", "neuter"],
    defaultPrice: 32000,
    defaultCost: 12000,
  },
  {
    key: "dental",
    label: "Dental Cleaning",
    category: "Dental",
    keywords: ["dental", "teeth", "oral"],
    defaultPrice: 9000,
    defaultCost: 3000,
  },
];

const DEFAULT_SERVICE_RULE = {
  key: "other",
  label: "Other Clinical Service",
  category: "Specialty",
  keywords: [],
  defaultPrice: 3500,
  defaultCost: 1000,
};

const matchServiceRule = (reason) => {
  if (!reason) return DEFAULT_SERVICE_RULE;
  const lower = String(reason).toLowerCase();
  return SERVICE_RULES.find((rule) => rule.keywords.some((keyword) => lower.includes(keyword))) ?? DEFAULT_SERVICE_RULE;
};

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeLower = (value) => String(value || "").trim().toLowerCase();

const router = express.Router();

router.get("/summary", verifyToken, async (req, res, next) => {
  try {
    const startDate = req.query?.startDate;
    const endDate = req.query?.endDate;
    const categoryFilter = normalizeLower(req.query?.category);
    const searchTerm = normalizeLower(req.query?.search);
    const appointmentLimit = Math.min(2000, Math.max(200, Number(req.query?.limit) || 1000));

    const manualConditions = [];
    const manualValues = [];

    if (startDate) {
      manualConditions.push(`date >= $${manualValues.length + 1}`);
      manualValues.push(startDate);
    }

    if (endDate) {
      manualConditions.push(`date <= $${manualValues.length + 1}`);
      manualValues.push(endDate);
    }

    if (categoryFilter) {
      manualConditions.push(`LOWER(category) = $${manualValues.length + 1}`);
      manualValues.push(categoryFilter);
    }

    if (searchTerm) {
      manualConditions.push(
        `(LOWER(service) LIKE $${manualValues.length + 1} OR LOWER(category) LIKE $${manualValues.length + 1})`
      );
      manualValues.push(`%${searchTerm}%`);
    }

    const manualWhere = manualConditions.length ? `WHERE ${manualConditions.join(" AND ")}` : "";

    const appointmentConditions = [];
    const appointmentValues = [];

    if (startDate) {
      appointmentConditions.push(`date >= $${appointmentValues.length + 1}`);
      appointmentValues.push(startDate);
    }

    if (endDate) {
      appointmentConditions.push(`date <= $${appointmentValues.length + 1}`);
      appointmentValues.push(endDate);
    }

    const appointmentWhere = appointmentConditions.length ? `WHERE ${appointmentConditions.join(" AND ")}` : "";

    const [manualResult, appointmentResult] = await Promise.all([
      pool.query(
        `SELECT id, service, category, count, price_per_unit, revenue, cost_per_unit, profit, date FROM service_revenue ${manualWhere} ORDER BY date DESC, id DESC`,
        manualValues
      ),
      pool.query(
        `SELECT id, date, reason, status FROM appointments ${appointmentWhere} ORDER BY date DESC LIMIT ${appointmentLimit}`,
        appointmentValues
      ),
    ]);

    const manualServices = manualResult.rows.map((row) => {
      const bookings = toNumber(row.count);
      const pricePerUnit = toNumber(row.price_per_unit);
      const revenue = row.revenue !== null ? toNumber(row.revenue) : bookings * pricePerUnit;
      const costPerUnit = toNumber(row.cost_per_unit);
      const profit = row.profit !== null ? toNumber(row.profit) : bookings * (pricePerUnit - costPerUnit);
      return {
        id: row.id,
        service: row.service || "Unnamed service",
        category: row.category || "Uncategorized",
        bookings,
        pricePerUnit,
        revenue,
        costPerUnit,
        profit,
        date: row.date,
        origin: "manual",
      };
    });

    const appointmentBuckets = new Map();

    appointmentResult.rows.forEach((row) => {
      if (!row.reason) return;
      const status = normalizeLower(row.status || "Scheduled");
      if (status === "cancelled" || status === "no-show") return;
      const rule = matchServiceRule(row.reason);
      if (categoryFilter && normalizeLower(rule.category) !== categoryFilter) return;
      if (searchTerm) {
        const matchHaystack = `${rule.label} ${rule.category}`.toLowerCase();
        if (!matchHaystack.includes(searchTerm)) {
          return;
        }
      }
      const existing = appointmentBuckets.get(rule.key);
      if (!existing) {
        appointmentBuckets.set(rule.key, {
          key: rule.key,
          service: rule.label,
          category: rule.category,
          bookings: 1,
          pricePerUnit: rule.defaultPrice,
          costPerUnit: rule.defaultCost,
          latestDate: row.date,
        });
      } else {
        existing.bookings += 1;
        if (row.date && (!existing.latestDate || row.date > existing.latestDate)) {
          existing.latestDate = row.date;
        }
      }
    });

    const appointmentServices = Array.from(appointmentBuckets.values()).map((bucket) => {
      const revenue = bucket.bookings * bucket.pricePerUnit;
      const profit = bucket.bookings * (bucket.pricePerUnit - bucket.costPerUnit);
      return {
        id: `APPT-${bucket.key}`,
        service: bucket.service,
        category: bucket.category,
        bookings: bucket.bookings,
        pricePerUnit: bucket.pricePerUnit,
        revenue,
        costPerUnit: bucket.costPerUnit,
        profit,
        date: bucket.latestDate,
        origin: "appointment",
      };
    });

    const combinedServices = [...manualServices, ...appointmentServices].sort((a, b) => b.revenue - a.revenue);

    const manualRevenue = manualServices.reduce((sum, row) => sum + row.revenue, 0);
    const manualBookings = manualServices.reduce((sum, row) => sum + row.bookings, 0);
    const appointmentRevenue = appointmentServices.reduce((sum, row) => sum + row.revenue, 0);
    const appointmentBookings = appointmentServices.reduce((sum, row) => sum + row.bookings, 0);

    const totalRevenue = manualRevenue + appointmentRevenue;
    const totalBookings = manualBookings + appointmentBookings;
    const averageTicket = totalBookings ? totalRevenue / totalBookings : 0;

    const categoryStats = Array.from(
      combinedServices.reduce((acc, row) => {
        const key = row.category || "Uncategorized";
        const current = acc.get(key) || { category: key, bookings: 0, revenue: 0 };
        current.bookings += row.bookings;
        current.revenue += row.revenue;
        acc.set(key, current);
        return acc;
      }, new Map())
    )
      .map(([, value]) => value)
      .sort((a, b) => b.revenue - a.revenue);

    const topServices = combinedServices.slice(0, 5);

    const originBreakdown = [
      {
        label: "Manual Entries",
        revenue: manualRevenue,
        bookings: manualBookings,
        share: totalRevenue ? (manualRevenue / totalRevenue) * 100 : 0,
      },
      {
        label: "Appointments",
        revenue: appointmentRevenue,
        bookings: appointmentBookings,
        share: totalRevenue ? (appointmentRevenue / totalRevenue) * 100 : 0,
      },
    ];

    return res.json({
      success: true,
      data: {
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          category: categoryFilter || null,
          search: searchTerm || null,
        },
        manual: manualServices,
        appointments: appointmentServices,
        combined: combinedServices,
        summary: {
          totalRevenue,
          totalBookings,
          averageTicket,
          manualRevenue,
          manualBookings,
          appointmentRevenue,
          appointmentBookings,
        },
        categoryStats,
        topServices,
        originBreakdown,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.use(
  "/",
  createCrudRouter({
    table: "service_revenue",
    columns: [
      "service",
      "category",
      "count",
      "price_per_unit",
      "revenue",
      "cost_per_unit",
      "profit",
      "date",
    ],
    filters: ["category", "date"],
  })
);

module.exports = router;
