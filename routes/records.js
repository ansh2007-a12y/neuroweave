// ============================================================
// routes/records.js
// ------------------------------------------------------------
// Builds the "Health Record" screen: a combined timeline of a
// user's check-in results and their doctor appointments, all
// in one place — because that's what the record page shows.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db/db');
const requireLogin = require('../middleware/auth');

// ------------------------------------------------------------
// GET /api/records
// Header: Authorization: Bearer <token>
// Returns a combined, time-sorted list of the logged-in user's
// check-ins and appointments — everything for their record page.
// ------------------------------------------------------------
router.get('/', requireLogin, (req, res) => {
  const checkins = db
    .prepare('SELECT id, game_type, score, created_at FROM checkins WHERE user_id = ?')
    .all(req.userId)
    .map((row) => ({
      type: 'checkin',
      label: `${row.game_type} score: ${row.score}`,
      date: row.created_at,
    }));

  const appointments = db
    .prepare(
      `SELECT appointments.requested_time AS date, doctors.name AS doctor_name, appointments.status
       FROM appointments
       JOIN doctors ON doctors.id = appointments.doctor_id
       WHERE appointments.user_id = ?`
    )
    .all(req.userId)
    .map((row) => ({
      type: 'appointment',
      label: `Appointment with ${row.doctor_name} (${row.status})`,
      date: row.date,
    }));

  // Merge both lists and sort newest first.
  const combined = [...checkins, ...appointments].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  res.json(combined);
});

module.exports = router;
