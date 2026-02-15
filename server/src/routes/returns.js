const express = require("express")
const pool = require("../db")
const { verifyToken } = require("../middleware/auth")

const router = express.Router()

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const normalizeType = (value) => {
  const normalized = String(value || "all").toLowerCase()
  if (normalized === "sales" || normalized === "purchase") return normalized
  return "all"
}

const formatFilters = (query = {}) => ({
  startDate: query.startDate || "",
  endDate: query.endDate || "",
  type: normalizeType(query.type),
  search: String(query.search || "").trim().toLowerCase(),
})

const buildWhereClause = (filters, alias, searchColumns = []) => {
  const clauses = []
  const values = []

  if (filters.startDate) {
    values.push(filters.startDate)
    clauses.push(`${alias}.created_at::date >= $${values.length}`)
  }

  if (filters.endDate) {
    values.push(filters.endDate)
    clauses.push(`${alias}.created_at::date <= $${values.length}`)
  }

  if (filters.search) {
    values.push(`%${filters.search}%`)
    const placeholder = values.length
    const searchClause = searchColumns
      .map((column) => `LOWER(${column}) LIKE $${placeholder}`)
      .join(" OR ")
    clauses.push(`(${searchClause})`)
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  }
}

const mapSalesRow = (row) => ({
  id: row.id,
  invoiceNo: row.invoice_no || `INV-${row.id}`,
  customer: row.customer || "Guest",
  date: row.created_at,
  items: Number(row.items || 0),
  refund: toNumber(row.total_refund),
  reason: row.reason || "Unspecified",
})

const mapPurchaseRow = (row) => ({
  id: row.id,
  invoiceNo: row.invoice_no || `PUR-${row.id}`,
  supplier: row.supplier || "Unknown supplier",
  date: row.created_at,
  items: Number(row.items || 0),
  refund: toNumber(row.total_refund),
  reason: row.reason || "Unspecified",
})

const summarizeRows = (rows) => {
  return rows.reduce(
    (acc, row) => {
      acc.count += 1
      acc.items += Number(row.items || 0)
      acc.refund += toNumber(row.refund)
      return acc
    },
    { count: 0, items: 0, refund: 0 }
  )
}

const buildReasonStats = (salesRows, purchaseRows) => {
  const map = new Map()
  const consume = (label, amount) => {
    const key = label || "Unspecified"
    const existing = map.get(key) || { label: key, amount: 0, count: 0 }
    existing.amount += toNumber(amount)
    existing.count += 1
    map.set(key, existing)
  }

  salesRows.forEach((row) => consume(row.reason, row.refund))
  purchaseRows.forEach((row) => consume(row.reason, row.refund))

  return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
}

router.get("/summary", verifyToken, async (req, res, next) => {
  try {
    const filters = formatFilters(req.query)
    const includeSales = filters.type === "all" || filters.type === "sales"
    const includePurchases = filters.type === "all" || filters.type === "purchase"

    const searchValueColumnsSales = [
      "COALESCE(sr.invoice_no, '')",
      "COALESCE(s.customer, '')",
      "COALESCE(sr.reason, '')",
    ]

    const searchValueColumnsPurchases = [
      "COALESCE(pr.invoice_no, '')",
      "COALESCE(sup.name, '')",
      "COALESCE(pr.reason, '')",
    ]

    const salesPromise = includeSales
      ? (() => {
          const { where, values } = buildWhereClause(filters, "sr", searchValueColumnsSales)
          return pool.query(
            `SELECT
              sr.id,
              sr.invoice_no,
              sr.total_refund,
              sr.reason,
              sr.created_at,
              COALESCE(s.customer, 'Guest') AS customer,
              COALESCE(SUM(sri.qty), 0)::int AS items
            FROM sales_returns sr
            LEFT JOIN sales s ON s.id = sr.sale_id
            LEFT JOIN sales_return_items sri ON sri.sales_return_id = sr.id
            ${where}
            GROUP BY sr.id, s.customer
            ORDER BY sr.created_at DESC NULLS LAST
            LIMIT 200`,
            values
          )
        })()
      : Promise.resolve({ rows: [] })

    const purchasePromise = includePurchases
      ? (() => {
          const { where, values } = buildWhereClause(filters, "pr", searchValueColumnsPurchases)
          return pool.query(
            `SELECT
              pr.id,
              pr.invoice_no,
              pr.total_refund,
              pr.reason,
              pr.created_at,
              COALESCE(sup.name, 'Unknown supplier') AS supplier,
              COALESCE(SUM(pri.qty), 0)::int AS items
            FROM purchase_returns pr
            LEFT JOIN purchases p ON p.id = pr.purchase_id
            LEFT JOIN suppliers sup ON sup.id = p.supplier_id
            LEFT JOIN purchase_return_items pri ON pri.purchase_return_id = pr.id
            ${where}
            GROUP BY pr.id, sup.name
            ORDER BY pr.created_at DESC NULLS LAST
            LIMIT 200`,
            values
          )
        })()
      : Promise.resolve({ rows: [] })

    const [salesResult, purchaseResult] = await Promise.all([salesPromise, purchasePromise])

    const salesRows = salesResult.rows.map(mapSalesRow)
    const purchaseRows = purchaseResult.rows.map(mapPurchaseRow)

    const salesSummary = summarizeRows(salesRows)
    const purchaseSummary = summarizeRows(purchaseRows)

    const reasonStats = buildReasonStats(salesRows, purchaseRows)

    return res.json({
      success: true,
      data: {
        filters,
        summary: {
          salesCount: salesSummary.count,
          salesItems: salesSummary.items,
          salesRefund: salesSummary.refund,
          purchaseCount: purchaseSummary.count,
          purchaseItems: purchaseSummary.items,
          purchaseRefund: purchaseSummary.refund,
          netRefund: salesSummary.refund + purchaseSummary.refund,
        },
        reasons: reasonStats,
        sales: salesRows,
        purchases: purchaseRows,
      },
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
