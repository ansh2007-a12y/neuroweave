// ============================================================
// server.js
// ------------------------------------------------------------
// This is the MAIN file — the one you actually run to start
// the backend. It:
//   1. Starts a web server (using Express)
//   2. Connects all our route files to specific URLs
//   3. Listens for requests from the frontend (index.html)
//
// Run it with:   npm start
// Then it lives at:   http://localhost:5000
// ============================================================

require('dotenv').config(); // loads settings from the .env file
const express = require('express');
const cors = require('cors');
const path = require('path');

// Make sure the database file + tables are created before anything else.
require('./db/db');

const authRoutes = require('./routes/auth');
const checkinRoutes = require('./routes/checkins');
const doctorRoutes = require('./routes/doctors');
const communityRoutes = require('./routes/community');
const recordRoutes = require('./routes/records');

const app = express();

// ------------------------------------------------------------
// MIDDLEWARE (runs on every request, before it reaches a route)
// ------------------------------------------------------------
app.use(cors()); // allows your frontend (a different origin, e.g. file:// or another port) to call this API
app.use(express.json()); // lets us read JSON data sent in request bodies (req.body)

// ------------------------------------------------------------
// ROUTES
// Every URL that starts with e.g. "/api/auth" is handled by
// the code inside routes/auth.js, and so on.
// ------------------------------------------------------------
app.use('/api/auth', authRoutes); // signup, login
app.use('/api/checkins', checkinRoutes); // save/view brain game scores
app.use('/api/doctors', doctorRoutes); // list doctors, book appointments
app.use('/api/community', communityRoutes); // community posts by room
app.use('/api/records', recordRoutes); // combined health record

// ------------------------------------------------------------
// FRONTEND: index.html, style.css, script.js ab yahin se serve
// hote hain (public/ folder se) — ek hi deploy, ek hi URL, na
// CORS ka jhanjhat, na do alag hosting.
// ------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------
// START THE SERVER
// ------------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ NeuroWeave backend is running at http://localhost:${PORT}`);
});
