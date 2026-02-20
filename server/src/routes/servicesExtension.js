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

// Get a surgery case by appointment_id
router.get('/surgery-cases/by-appointment/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { rows } = await db.query('SELECT * FROM surgery_cases WHERE appointment_id = $1', [appointmentId]);
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

// Get physiotherapy session by appointment_id
router.get('/physiotherapy-sessions/by-appointment/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { rows } = await db.query('SELECT * FROM physiotherapy_sessions WHERE appointment_id = $1', [appointmentId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Grooming Sessions ---
// Get all grooming sessions
router.get('/grooming-sessions', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM grooming_sessions ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get grooming session by appointment_id
router.get('/grooming-sessions/by-appointment/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { rows } = await db.query('SELECT * FROM grooming_sessions WHERE appointment_id = $1', [appointmentId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single grooming session by ID
router.get('/grooming-sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM grooming_sessions WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new grooming session
router.post('/grooming-sessions', async (req, res) => {
  try {
    const { appointment_id, coat_condition, skin_issues, grooming_type, services_performed, products_used, next_grooming_date, special_instructions, notes } = req.body;
    const { rows } = await db.query(
      `INSERT INTO grooming_sessions (appointment_id, coat_condition, skin_issues, grooming_type, services_performed, products_used, next_grooming_date, special_instructions, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [appointment_id, coat_condition, skin_issues, grooming_type, services_performed, products_used, next_grooming_date, special_instructions, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a grooming session
router.put('/grooming-sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { coat_condition, skin_issues, grooming_type, services_performed, products_used, next_grooming_date, special_instructions, notes } = req.body;
    const { rows } = await db.query(
      `UPDATE grooming_sessions SET coat_condition=$1, skin_issues=$2, grooming_type=$3, services_performed=$4, products_used=$5, next_grooming_date=$6, special_instructions=$7, notes=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [coat_condition, skin_issues, grooming_type, services_performed, products_used, next_grooming_date, special_instructions, notes, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a grooming session
router.delete('/grooming-sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM grooming_sessions WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Boarding Stays ---
// Get all boarding stays
router.get('/boarding-stays', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM boarding_stays ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get boarding stay by appointment_id
router.get('/boarding-stays/by-appointment/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { rows } = await db.query('SELECT * FROM boarding_stays WHERE appointment_id = $1', [appointmentId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single boarding stay by ID
router.get('/boarding-stays/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM boarding_stays WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new boarding stay
router.post('/boarding-stays', async (req, res) => {
  try {
    const { appointment_id, check_in_date, check_in_time, check_out_date, check_out_time, vaccination_complete, dewormed_complete, has_lice, has_allergy, stay_items, allergy_notes, health_concerns, feeding_instructions, emergency_contact } = req.body;
    const { rows } = await db.query(
      `INSERT INTO boarding_stays (appointment_id, check_in_date, check_in_time, check_out_date, check_out_time, vaccination_complete, dewormed_complete, has_lice, has_allergy, stay_items, allergy_notes, health_concerns, feeding_instructions, emergency_contact)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [appointment_id, check_in_date, check_in_time, check_out_date, check_out_time, vaccination_complete, dewormed_complete, has_lice, has_allergy, stay_items, allergy_notes, health_concerns, feeding_instructions, emergency_contact]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a boarding stay
router.put('/boarding-stays/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { check_in_date, check_in_time, check_out_date, check_out_time, vaccination_complete, dewormed_complete, has_lice, has_allergy, stay_items, allergy_notes, health_concerns, feeding_instructions, emergency_contact } = req.body;
    const { rows } = await db.query(
      `UPDATE boarding_stays SET check_in_date=$1, check_in_time=$2, check_out_date=$3, check_out_time=$4, vaccination_complete=$5, dewormed_complete=$6, has_lice=$7, has_allergy=$8, stay_items=$9, allergy_notes=$10, health_concerns=$11, feeding_instructions=$12, emergency_contact=$13, updated_at=NOW() WHERE id=$14 RETURNING *`,
      [check_in_date, check_in_time, check_out_date, check_out_time, vaccination_complete, dewormed_complete, has_lice, has_allergy, stay_items, allergy_notes, health_concerns, feeding_instructions, emergency_contact, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a boarding stay
router.delete('/boarding-stays/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM boarding_stays WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Hospitalization Cases ---
// Get all hospitalization cases
router.get('/hospitalization-cases', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM hospitalization_cases ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get hospitalization case by appointment_id
router.get('/hospitalization-cases/by-appointment/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { rows } = await db.query('SELECT * FROM hospitalization_cases WHERE appointment_id = $1', [appointmentId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single hospitalization case by ID
router.get('/hospitalization-cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM hospitalization_cases WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new hospitalization case
router.post('/hospitalization-cases', async (req, res) => {
  try {
    const { appointment_id, admission_date, admission_time, discharge_date, discharge_time, diagnosis, treatment_plan, medications, vitals_on_admission, cage_number, isolation_required, iv_fluids_required, oxygen_support, special_diet, daily_notes } = req.body;
    const { rows } = await db.query(
      `INSERT INTO hospitalization_cases (appointment_id, admission_date, admission_time, discharge_date, discharge_time, diagnosis, treatment_plan, medications, vitals_on_admission, cage_number, isolation_required, iv_fluids_required, oxygen_support, special_diet, daily_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [appointment_id, admission_date, admission_time, discharge_date, discharge_time, diagnosis, treatment_plan, medications, vitals_on_admission, cage_number, isolation_required, iv_fluids_required, oxygen_support, special_diet, daily_notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a hospitalization case
router.put('/hospitalization-cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { admission_date, admission_time, discharge_date, discharge_time, diagnosis, treatment_plan, medications, vitals_on_admission, cage_number, isolation_required, iv_fluids_required, oxygen_support, special_diet, daily_notes } = req.body;
    const { rows } = await db.query(
      `UPDATE hospitalization_cases SET admission_date=$1, admission_time=$2, discharge_date=$3, discharge_time=$4, diagnosis=$5, treatment_plan=$6, medications=$7, vitals_on_admission=$8, cage_number=$9, isolation_required=$10, iv_fluids_required=$11, oxygen_support=$12, special_diet=$13, daily_notes=$14, updated_at=NOW() WHERE id=$15 RETURNING *`,
      [admission_date, admission_time, discharge_date, discharge_time, diagnosis, treatment_plan, medications, vitals_on_admission, cage_number, isolation_required, iv_fluids_required, oxygen_support, special_diet, daily_notes, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a hospitalization case
router.delete('/hospitalization-cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM hospitalization_cases WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
