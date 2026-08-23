// ============================================================
// routes/doctors.js
// ------------------------------------------------------------
// Lets the frontend list verified doctors, and lets a logged-in
// user request an appointment with one of them.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db/db');
const requireLogin = require('../middleware/auth');

// ------------------------------------------------------------
// GET /api/doctors
// Public route (no login needed) — anyone can browse doctors.
// ------------------------------------------------------------
router.get('/', (req, res) => {
  const doctors = db.prepare('SELECT id, name, specialty, verified FROM doctors').all();
  res.json(doctors);
});

// ------------------------------------------------------------
// POST /api/doctors/:id/book
// Header: Authorization: Bearer <token>
// Body (JSON): { "requested_time": "2026-08-25T10:00:00" }
// Lets a logged-in user request an appointment with doctor :id.
// ------------------------------------------------------------
router.post('/:id/book', requireLogin, (req, res) => {
  const doctorId = req.params.id;
  const { requested_time } = req.body;

  if (!requested_time) {
    return res.status(400).json({ error: 'requested_time is required.' });
  }

  // Make sure this doctor actually exists before booking.
  const doctor = db.prepare('SELECT id FROM doctors WHERE id = ?').get(doctorId);
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found.' });
  }

  db.prepare(
    'INSERT INTO appointments (user_id, doctor_id, requested_time) VALUES (?, ?, ?)'
  ).run(req.userId, doctorId, requested_time);

  res.status(201).json({ message: 'Appointment requested. The doctor will confirm shortly.' });
});

// ------------------------------------------------------------
// GET /api/doctors/appointments/mine
// Header: Authorization: Bearer <token>
// Returns all appointments the logged-in user has requested.
// ------------------------------------------------------------
router.get('/appointments/mine', requireLogin, (req, res) => {
  const appointments = db
    .prepare(
      `SELECT appointments.id, doctors.name AS doctor_name, doctors.specialty,
              appointments.requested_time, appointments.status
       FROM appointments
       JOIN doctors ON doctors.id = appointments.doctor_id
       WHERE appointments.user_id = ?
       ORDER BY appointments.requested_time`
    )
    .all(req.userId);

  res.json(appointments);
});

module.exports = router;
