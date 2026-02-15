const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: Generate soft delete, restore, and recycle bin routes for a table
function addRecycleBinRoutes(table) {
  // Soft delete (move to recycle bin)
  router.delete(`/${table}/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      await db.query(`UPDATE ${table} SET is_deleted = TRUE WHERE id = $1`, [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Restore from recycle bin
  router.post(`/${table}/:id/restore`, async (req, res) => {
    try {
      const { id } = req.params;
      await db.query(`UPDATE ${table} SET is_deleted = FALSE WHERE id = $1`, [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // List deleted items (recycle bin)
  router.get(`/${table}/recycle-bin`, async (req, res) => {
    try {
      const { rows } = await db.query(`SELECT * FROM ${table} WHERE is_deleted = TRUE ORDER BY updated_at DESC`);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// Add recycle bin routes for all main tables
['clients','pets','products','appointments','employees','services','sales','purchases'].forEach(addRecycleBinRoutes);

module.exports = router;
