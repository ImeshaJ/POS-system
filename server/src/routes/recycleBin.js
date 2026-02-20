const express = require('express');
const router = express.Router();
const db = require('../db');

// Tables that support soft delete
const SOFT_DELETE_TABLES = [
  { table: 'clients', nameField: 'name', typeLabel: 'Client' },
  { table: 'pets', nameField: 'name', typeLabel: 'Pet' },
  { table: 'products', nameField: 'name', typeLabel: 'Product' },
  { table: 'appointments', nameField: 'pet_name', typeLabel: 'Appointment' },
  { table: 'employees', nameField: 'name', typeLabel: 'Employee' },
  { table: 'services', nameField: 'name', typeLabel: 'Service' },
  { table: 'sales', nameField: 'invoice_no', typeLabel: 'Sale' },
  { table: 'purchases', nameField: 'invoice_no', typeLabel: 'Purchase' },
];

// GET /api/recycle-bin - Get all deleted items from all tables
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const results = [];

    for (const { table, nameField, typeLabel } of SOFT_DELETE_TABLES) {
      // Skip if filtering by type and this isn't the type
      if (type && type.toLowerCase() !== typeLabel.toLowerCase()) continue;

      const query = `
        SELECT
          id,
          ${nameField} as name,
          '${typeLabel}' as type,
          COALESCE(deleted_at, updated_at, created_at) as "deletedAt",
          created_at as "createdAt"
        FROM ${table}
        WHERE is_deleted = TRUE
        ORDER BY COALESCE(deleted_at, updated_at) DESC
      `;

      const { rows } = await db.query(query);
      results.push(...rows.map(row => ({
        ...row,
        tableSource: table
      })));
    }

    // Sort all results by deletedAt descending
    results.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

    res.json(results);
  } catch (err) {
    console.error('Recycle bin fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recycle-bin/types - Get available item types
router.get('/types', async (_req, res) => {
  try {
    const types = SOFT_DELETE_TABLES.map(t => t.typeLabel);
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recycle-bin/:type/:id/restore - Restore a deleted item
router.post('/:type/:id/restore', async (req, res) => {
  try {
    const { type, id } = req.params;
    const tableConfig = SOFT_DELETE_TABLES.find(
      t => t.typeLabel.toLowerCase() === type.toLowerCase()
    );

    if (!tableConfig) {
      return res.status(400).json({ error: 'Invalid item type' });
    }

    await db.query(
      `UPDATE ${tableConfig.table} SET is_deleted = FALSE, deleted_at = NULL WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: `${tableConfig.typeLabel} restored successfully` });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/recycle-bin/:type/:id - Permanently delete an item
router.delete('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const tableConfig = SOFT_DELETE_TABLES.find(
      t => t.typeLabel.toLowerCase() === type.toLowerCase()
    );

    if (!tableConfig) {
      return res.status(400).json({ error: 'Invalid item type' });
    }

    // Only allow permanent delete of already soft-deleted items
    const { rows } = await db.query(
      `SELECT id FROM ${tableConfig.table} WHERE id = $1 AND is_deleted = TRUE`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Item not found in recycle bin' });
    }

    await db.query(`DELETE FROM ${tableConfig.table} WHERE id = $1`, [id]);

    res.json({ success: true, message: `${tableConfig.typeLabel} permanently deleted` });
  } catch (err) {
    console.error('Permanent delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/recycle-bin/bulk - Bulk permanent delete
router.delete('/bulk', async (req, res) => {
  try {
    const { items } = req.body; // Array of { type, id }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided for deletion' });
    }

    let deletedCount = 0;
    const errors = [];

    for (const item of items) {
      const tableConfig = SOFT_DELETE_TABLES.find(
        t => t.typeLabel.toLowerCase() === item.type.toLowerCase()
      );

      if (!tableConfig) {
        errors.push(`Invalid type: ${item.type}`);
        continue;
      }

      try {
        const result = await db.query(
          `DELETE FROM ${tableConfig.table} WHERE id = $1 AND is_deleted = TRUE`,
          [item.id]
        );
        if (result.rowCount > 0) {
          deletedCount++;
        }
      } catch (err) {
        errors.push(`Failed to delete ${item.type} #${item.id}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `${deletedCount} item(s) permanently deleted`
    });
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recycle-bin/empty - Empty entire recycle bin
router.post('/empty', async (_req, res) => {
  try {
    let totalDeleted = 0;

    for (const { table } of SOFT_DELETE_TABLES) {
      const result = await db.query(
        `DELETE FROM ${table} WHERE is_deleted = TRUE`
      );
      totalDeleted += result.rowCount;
    }

    res.json({
      success: true,
      deletedCount: totalDeleted,
      message: `Recycle bin emptied. ${totalDeleted} item(s) permanently deleted.`
    });
  } catch (err) {
    console.error('Empty recycle bin error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recycle-bin/:type/:id - Get details of a specific deleted item
router.get('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const tableConfig = SOFT_DELETE_TABLES.find(
      t => t.typeLabel.toLowerCase() === type.toLowerCase()
    );

    if (!tableConfig) {
      return res.status(400).json({ error: 'Invalid item type' });
    }

    const { rows } = await db.query(
      `SELECT * FROM ${tableConfig.table} WHERE id = $1 AND is_deleted = TRUE`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Item not found in recycle bin' });
    }

    res.json({
      ...rows[0],
      type: tableConfig.typeLabel
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
