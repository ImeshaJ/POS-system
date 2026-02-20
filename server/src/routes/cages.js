const express = require('express');
const router = express.Router();
const db = require('../db');

// ==========================================
// CAGE SETTINGS
// ==========================================

// GET /api/cages/settings - Get cage configuration
router.get('/settings', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM cage_settings ORDER BY id LIMIT 1');
    if (rows.length === 0) {
      // Return default if no settings exist
      return res.json({ id: 0, total_cages: 10, cage_prefix: 'C' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cages/settings - Update cage configuration
router.put('/settings', async (req, res) => {
  try {
    const { total_cages, cage_prefix, notes } = req.body;

    if (total_cages !== undefined && (total_cages < 1 || total_cages > 100)) {
      return res.status(400).json({ error: 'Total cages must be between 1 and 100' });
    }

    const { rows } = await db.query('SELECT id FROM cage_settings LIMIT 1');

    if (rows.length === 0) {
      // Insert new settings
      const result = await db.query(
        `INSERT INTO cage_settings (total_cages, cage_prefix, notes) VALUES ($1, $2, $3) RETURNING *`,
        [total_cages || 10, cage_prefix || 'C', notes || null]
      );
      return res.json(result.rows[0]);
    }

    // Update existing settings
    const result = await db.query(
      `UPDATE cage_settings SET
        total_cages = COALESCE($1, total_cages),
        cage_prefix = COALESCE($2, cage_prefix),
        notes = COALESCE($3, notes),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [total_cages, cage_prefix, notes, rows[0].id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CAGE AVAILABILITY
// ==========================================

// GET /api/cages/availability - Get cage availability for date range
router.get('/availability', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    // Get total cages
    const settingsResult = await db.query('SELECT total_cages FROM cage_settings LIMIT 1');
    const totalCages = settingsResult.rows[0]?.total_cages || 10;

    // Get booked cages for the date range (overlapping bookings)
    const { rows: bookings } = await db.query(
      `SELECT
        cage_number,
        pet_name,
        client_name,
        animal_type,
        start_date,
        end_date,
        status,
        appointment_id,
        id
       FROM cage_bookings
       WHERE status = 'booked'
         AND start_date <= $2
         AND end_date >= $1
       ORDER BY cage_number`,
      [start_date, end_date]
    );

    // Build availability map
    const cages = [];
    for (let i = 1; i <= totalCages; i++) {
      const booking = bookings.find(b => b.cage_number === i);
      cages.push({
        cageNumber: i,
        available: !booking,
        booking: booking || null
      });
    }

    res.json({
      totalCages,
      startDate: start_date,
      endDate: end_date,
      cages,
      bookedCount: bookings.length,
      availableCount: totalCages - bookings.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CAGE BOOKINGS
// ==========================================

// GET /api/cages/bookings - List all bookings
router.get('/bookings', async (req, res) => {
  try {
    const { status, start_date, end_date, limit = 100 } = req.query;

    let query = `
      SELECT cb.*,
             a.date as appointment_date,
             a.time as appointment_time,
             a.doctor,
             a.reason
      FROM cage_bookings cb
      LEFT JOIN appointments a ON cb.appointment_id = a.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND cb.status = $${paramIndex++}`;
      params.push(status);
    }

    if (start_date) {
      query += ` AND cb.end_date >= $${paramIndex++}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND cb.start_date <= $${paramIndex++}`;
      params.push(end_date);
    }

    query += ` ORDER BY cb.start_date DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cages/bookings/:id - Get single booking
router.get('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT cb.*,
              a.date as appointment_date,
              a.time as appointment_time,
              a.doctor,
              a.reason
       FROM cage_bookings cb
       LEFT JOIN appointments a ON cb.appointment_id = a.id
       WHERE cb.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cages/bookings/by-appointment/:appointmentId - Get booking by appointment
router.get('/bookings/by-appointment/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { rows } = await db.query(
      `SELECT * FROM cage_bookings WHERE appointment_id = $1`,
      [appointmentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No booking found for this appointment' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cages/bookings - Create a cage booking
router.post('/bookings', async (req, res) => {
  try {
    const {
      cage_number,
      appointment_id,
      boarding_stay_id,
      pet_name,
      client_name,
      animal_type,
      start_date,
      end_date,
      notes
    } = req.body;

    // Validate required fields
    if (!cage_number || !start_date || !end_date) {
      return res.status(400).json({ error: 'cage_number, start_date, and end_date are required' });
    }

    // Check if cage is available for the date range
    const { rows: conflicts } = await db.query(
      `SELECT id FROM cage_bookings
       WHERE cage_number = $1
         AND status = 'booked'
         AND start_date <= $3
         AND end_date >= $2`,
      [cage_number, start_date, end_date]
    );

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Cage is already booked for the selected dates' });
    }

    // Create booking
    const { rows } = await db.query(
      `INSERT INTO cage_bookings
       (cage_number, appointment_id, boarding_stay_id, pet_name, client_name, animal_type, start_date, end_date, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'booked')
       RETURNING *`,
      [cage_number, appointment_id, boarding_stay_id, pet_name, client_name, animal_type, start_date, end_date, notes]
    );

    // Update boarding_stays with cage_number if boarding_stay_id provided
    if (boarding_stay_id) {
      await db.query(
        'UPDATE boarding_stays SET cage_number = $1 WHERE id = $2',
        [cage_number, boarding_stay_id]
      );
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cages/bookings/:id - Update a cage booking
router.put('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cage_number,
      pet_name,
      client_name,
      animal_type,
      start_date,
      end_date,
      status,
      notes
    } = req.body;

    // If changing cage or dates, check for conflicts
    if (cage_number || start_date || end_date) {
      const { rows: current } = await db.query(
        'SELECT * FROM cage_bookings WHERE id = $1',
        [id]
      );

      if (current.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const newCage = cage_number || current[0].cage_number;
      const newStart = start_date || current[0].start_date;
      const newEnd = end_date || current[0].end_date;

      const { rows: conflicts } = await db.query(
        `SELECT id FROM cage_bookings
         WHERE cage_number = $1
           AND status = 'booked'
           AND id != $4
           AND start_date <= $3
           AND end_date >= $2`,
        [newCage, newStart, newEnd, id]
      );

      if (conflicts.length > 0) {
        return res.status(409).json({ error: 'Cage is already booked for the selected dates' });
      }
    }

    const { rows } = await db.query(
      `UPDATE cage_bookings SET
        cage_number = COALESCE($1, cage_number),
        pet_name = COALESCE($2, pet_name),
        client_name = COALESCE($3, client_name),
        animal_type = COALESCE($4, animal_type),
        start_date = COALESCE($5, start_date),
        end_date = COALESCE($6, end_date),
        status = COALESCE($7, status),
        notes = COALESCE($8, notes),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [cage_number, pet_name, client_name, animal_type, start_date, end_date, status, notes, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cages/bookings/:id - Cancel/delete a booking
router.delete('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      // Permanently delete
      await db.query('DELETE FROM cage_bookings WHERE id = $1', [id]);
    } else {
      // Just mark as cancelled
      await db.query(
        `UPDATE cage_bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [id]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
