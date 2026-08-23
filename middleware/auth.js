// ============================================================
// middleware/auth.js
// ------------------------------------------------------------
// "Middleware" is a function that runs BEFORE your route's main
// code. This one checks: "did the user send a valid login token?"
//
// Think of it like a bouncer at a door: it checks your ID
// (the token) before letting you into a protected route
// (like "save my check-in score" or "book an appointment").
// ============================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

function requireLogin(req, res, next) {
  // The frontend must send the token in a header like this:
  // Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'You must be logged in to do this.' });
  }

  // authHeader looks like "Bearer abc123...". We only want the part after "Bearer ".
  const token = authHeader.split(' ')[1];

  try {
    // This checks the token is genuine and not expired.
    // If valid, it gives us back the data we stored in it (the user's id).
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // attach the user's id to the request for later use
    next(); // move on to the actual route code
  } catch (err) {
    return res.status(401).json({ error: 'Your session is invalid or expired. Please log in again.' });
  }
}

module.exports = requireLogin;
