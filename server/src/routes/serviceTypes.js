const express = require('express');
const router = express.Router();
const db = require('../db');

// --- Service Types ---
// Get all service types
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM service_types WHERE status = $1 ORDER BY display_order ASC',
      ['active']
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single service type by code
router.get('/code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { rows } = await db.query('SELECT * FROM service_types WHERE code = $1', [code]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Service Packages ---
// Get all packages
router.get('/packages', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT sp.*, st.code as service_type_code, st.name as service_type_name
      FROM service_packages sp
      LEFT JOIN service_types st ON sp.service_type_id = st.id
      ORDER BY sp.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get packages by service type code
router.get('/packages/by-type/:typeCode', async (req, res) => {
  try {
    const { typeCode } = req.params;
    const { rows } = await db.query(`
      SELECT sp.*, st.code as service_type_code, st.name as service_type_name
      FROM service_packages sp
      JOIN service_types st ON sp.service_type_id = st.id
      WHERE st.code = $1 AND sp.status = 'active'
      ORDER BY sp.name ASC
    `, [typeCode]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new package
router.post('/packages', async (req, res) => {
  try {
    const {
      service_type_code,
      package_id,
      name,
      price,
      description,
      status,
      duration_days,
      duration_hours,
      duration_minutes
    } = req.body;

    // Get service_type_id from code
    let service_type_id = null;
    if (service_type_code) {
      const typeResult = await db.query('SELECT id FROM service_types WHERE code = $1', [service_type_code]);
      if (typeResult.rows.length > 0) {
        service_type_id = typeResult.rows[0].id;
      }
    }

    const { rows } = await db.query(
      `INSERT INTO service_packages
       (service_type_id, package_id, name, price, description, status, duration_days, duration_hours, duration_minutes, service_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [service_type_id, package_id, name, price || 0, description, status || 'active',
       duration_days || 0, duration_hours || 0, duration_minutes || 0, service_type_code]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a package
router.put('/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      service_type_code,
      package_id,
      name,
      price,
      description,
      status,
      duration_days,
      duration_hours,
      duration_minutes
    } = req.body;

    // Get service_type_id from code
    let service_type_id = null;
    if (service_type_code) {
      const typeResult = await db.query('SELECT id FROM service_types WHERE code = $1', [service_type_code]);
      if (typeResult.rows.length > 0) {
        service_type_id = typeResult.rows[0].id;
      }
    }

    const { rows } = await db.query(
      `UPDATE service_packages SET
       service_type_id = $1, package_id = $2, name = $3, price = $4, description = $5,
       status = $6, duration_days = $7, duration_hours = $8, duration_minutes = $9,
       service_type = $10, updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [service_type_id, package_id, name, price || 0, description, status || 'active',
       duration_days || 0, duration_hours || 0, duration_minutes || 0, service_type_code, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a package
router.delete('/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM service_packages WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Add-on Services ---
// Get all add-ons
router.get('/addons', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT aos.*, st.code as service_type_code, st.name as service_type_name
      FROM add_on_services aos
      LEFT JOIN service_types st ON aos.service_type_id = st.id
      ORDER BY aos.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get add-ons by service type code
router.get('/addons/by-type/:typeCode', async (req, res) => {
  try {
    const { typeCode } = req.params;
    const { rows } = await db.query(`
      SELECT aos.*, st.code as service_type_code, st.name as service_type_name
      FROM add_on_services aos
      JOIN service_types st ON aos.service_type_id = st.id
      WHERE st.code = $1 AND aos.status = 'active'
      ORDER BY aos.name ASC
    `, [typeCode]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new add-on
router.post('/addons', async (req, res) => {
  try {
    const {
      service_type_code,
      addon_id,
      name,
      price,
      description,
      status,
      duration_days,
      duration_hours,
      duration_minutes
    } = req.body;

    // Get service_type_id from code
    let service_type_id = null;
    if (service_type_code) {
      const typeResult = await db.query('SELECT id FROM service_types WHERE code = $1', [service_type_code]);
      if (typeResult.rows.length > 0) {
        service_type_id = typeResult.rows[0].id;
      }
    }

    const { rows } = await db.query(
      `INSERT INTO add_on_services
       (service_type_id, addon_id, name, price, description, status, duration_days, duration_hours, duration_minutes, service_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [service_type_id, addon_id, name, price || 0, description, status || 'active',
       duration_days || 0, duration_hours || 0, duration_minutes || 0, service_type_code]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an add-on
router.put('/addons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      service_type_code,
      addon_id,
      name,
      price,
      description,
      status,
      duration_days,
      duration_hours,
      duration_minutes
    } = req.body;

    // Get service_type_id from code
    let service_type_id = null;
    if (service_type_code) {
      const typeResult = await db.query('SELECT id FROM service_types WHERE code = $1', [service_type_code]);
      if (typeResult.rows.length > 0) {
        service_type_id = typeResult.rows[0].id;
      }
    }

    const { rows } = await db.query(
      `UPDATE add_on_services SET
       service_type_id = $1, addon_id = $2, name = $3, price = $4, description = $5,
       status = $6, duration_days = $7, duration_hours = $8, duration_minutes = $9,
       service_type = $10, updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [service_type_id, addon_id, name, price || 0, description, status || 'active',
       duration_days || 0, duration_hours || 0, duration_minutes || 0, service_type_code, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an add-on
router.delete('/addons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM add_on_services WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
