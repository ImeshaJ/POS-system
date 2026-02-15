const express = require('express');
const router = express.Router();
const db = require('../db');

// --- Surgery Cases ---
// Get all surgery cases
router.get('/surgery-cases', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM surgery_cases ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single surgery case by ID
router.get('/surgery-cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM surgery_cases WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new surgery case
router.post('/surgery-cases', async (req, res) => {
  try {
    const { appointment_id, fasting_confirmed, bloodwork_done, consent_signed, implants_ready, notes, anesthesia_plan, recovery_plan } = req.body;
    const { rows } = await db.query(
      `INSERT INTO surgery_cases (appointment_id, fasting_confirmed, bloodwork_done, consent_signed, implants_ready, notes, anesthesia_plan, recovery_plan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [appointment_id, fasting_confirmed, bloodwork_done, consent_signed, implants_ready, notes, anesthesia_plan, recovery_plan]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a surgery case
router.put('/surgery-cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fasting_confirmed, bloodwork_done, consent_signed, implants_ready, notes, anesthesia_plan, recovery_plan } = req.body;
    const { rows } = await db.query(
      `UPDATE surgery_cases SET fasting_confirmed=$1, bloodwork_done=$2, consent_signed=$3, implants_ready=$4, notes=$5, anesthesia_plan=$6, recovery_plan=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [fasting_confirmed, bloodwork_done, consent_signed, implants_ready, notes, anesthesia_plan, recovery_plan, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a surgery case
router.delete('/surgery-cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM surgery_cases WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Physiotherapy Sessions ---
// Get all physiotherapy sessions
router.get('/physiotherapy-sessions', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM physiotherapy_sessions ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single physiotherapy session by ID
router.get('/physiotherapy-sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM physiotherapy_sessions WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new physiotherapy session
router.post('/physiotherapy-sessions', async (req, res) => {
  try {
    const { appointment_id, assessment_summary, modalities_applied, home_exercise_plan, follow_up_date } = req.body;
    const { rows } = await db.query(
      `INSERT INTO physiotherapy_sessions (appointment_id, assessment_summary, modalities_applied, home_exercise_plan, follow_up_date)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [appointment_id, assessment_summary, modalities_applied, home_exercise_plan, follow_up_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a physiotherapy session
router.put('/physiotherapy-sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { assessment_summary, modalities_applied, home_exercise_plan, follow_up_date } = req.body;
    const { rows } = await db.query(
      `UPDATE physiotherapy_sessions SET assessment_summary=$1, modalities_applied=$2, home_exercise_plan=$3, follow_up_date=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
      [assessment_summary, modalities_applied, home_exercise_plan, follow_up_date, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a physiotherapy session
router.delete('/physiotherapy-sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM physiotherapy_sessions WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Physiotherapy Session History (optional) ---
// Get all history entries for a session
router.get('/physiotherapy-session-history/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;
    const { rows } = await db.query('SELECT * FROM physiotherapy_session_history WHERE session_id = $1 ORDER BY updated_at DESC', [session_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new history entry
router.post('/physiotherapy-session-history', async (req, res) => {
  try {
    const { session_id, detail } = req.body;
    const { rows } = await db.query(
      `INSERT INTO physiotherapy_session_history (session_id, detail) VALUES ($1, $2) RETURNING *`,
      [session_id, detail]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
