// ============================================================
// routes/checkins.js
// ------------------------------------------------------------
// Handles saving and viewing a user's brain-game results
// (reaction time, memory score, etc). This is the "early
// detection" feature — it lets us later compare today's score
// against the user's own past scores.
//
// Every route here uses "requireLogin" first, so only a logged
// -in user can save or view THEIR OWN scores.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db/db');
const requireLogin = require('../middleware/auth');

// ------------------------------------------------------------
// POST /api/checkins
// Header: Authorization: Bearer <token>
// Body (JSON): { "game_type": "reaction_time", "score": 320 }
// Saves one new check-in result for the logged-in user.
// ------------------------------------------------------------
router.post('/', requireLogin, (req, res) => {
  const { game_type, score } = req.body;

  if (!game_type || score === undefined) {
    return res.status(400).json({ error: 'game_type and score are required.' });
  }

  db.prepare('INSERT INTO checkins (user_id, game_type, score) VALUES (?, ?, ?)').run(
    req.userId, // this comes from the auth middleware — we know exactly who is saving it
    game_type,
    score
  );

  res.status(201).json({ message: 'Check-in saved.' });
});

// ------------------------------------------------------------
// GET /api/checkins
// Header: Authorization: Bearer <token>
// Returns ALL of the logged-in user's past check-in results,
// newest first. The frontend can use this to draw a trend graph.
// ------------------------------------------------------------
router.get('/', requireLogin, (req, res) => {
  const results = db
    .prepare('SELECT id, game_type, score, created_at FROM checkins WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.userId);

  res.json(results);
});

// ------------------------------------------------------------
// GET /api/checkins/trend/:game_type
// Example: GET /api/checkins/trend/reaction_time
// Returns a simple comparison: today's average vs. the user's
// own historical average for that specific game. This is the
// "gentle nudge" logic — NOT a diagnosis, just a comparison.
// ------------------------------------------------------------
router.get('/trend/:game_type', requireLogin, (req, res) => {
  const { game_type } = req.params;

  const history = db
    .prepare(
      `SELECT score FROM checkins WHERE user_id = ? AND game_type = ? ORDER BY created_at DESC LIMIT 30`
    )
    .all(req.userId, game_type);

  if (history.length < 3) {
    return res.json({ message: 'Not enough data yet — keep checking in daily.' });
  }

  const latest = history[0].score;
  const previous = history.slice(1); // everything except today's
  const average = previous.reduce((sum, row) => sum + row.score, 0) / previous.length;

  // How far today's score is from the user's own normal average, as a percentage.
  const percentChange = ((latest - average) / average) * 100;

  // This threshold (25%) is just an example — a real app would tune this
  // carefully with medical guidance. It is intentionally NOT a diagnosis.
  const worthMentioning = Math.abs(percentChange) > 25;

  res.json({
    latest_score: latest,
    your_usual_average: Math.round(average * 100) / 100,
    percent_change: Math.round(percentChange * 10) / 10,
    suggestion: worthMentioning
      ? 'This is a bigger change than your usual pattern. Consider mentioning it to a doctor.'
      : 'This is within your normal day-to-day range.',
  });
});

// ------------------------------------------------------------
// GET /api/checkins/stats/:game_type
// Example: GET /api/checkins/stats/reaction_time
// Returns REAL statistics computed straight from the database —
// best score, average score, total attempts, and an improvement
// trend. Nothing here is random or hardcoded; it's all SQL rows
// + simple math on the user's own saved scores.
//
// Both games currently save a TIME in milliseconds, where a
// SMALLER number is better (faster). So "best" = the lowest
// score the user has ever recorded.
// ------------------------------------------------------------
router.get('/stats/:game_type', requireLogin, (req, res) => {
  const { game_type } = req.params;

  // Oldest -> newest, so index 0 is the user's very first attempt ever.
  const history = db
    .prepare(
      `SELECT score, created_at FROM checkins WHERE user_id = ? AND game_type = ? ORDER BY created_at ASC`
    )
    .all(req.userId, game_type);

  if (history.length === 0) {
    return res.json({ has_data: false, game_type, total_attempts: 0 });
  }

  const scores = history.map((row) => row.score);
  const total_attempts = scores.length;
  const average_score = scores.reduce((sum, s) => sum + s, 0) / total_attempts;
  const best_score = Math.min(...scores); // fastest ever
  const worst_score = Math.max(...scores);
  const latest_score = scores[scores.length - 1];

  // "Improvement": split the full history into an OLDER half and a
  // RECENT half, then compare their averages. Needs at least 4
  // attempts total so the comparison actually means something.
  let improvement_percent = null;
  if (total_attempts >= 4) {
    const mid = Math.floor(total_attempts / 2);
    const olderAvg = scores.slice(0, mid).reduce((sum, s) => sum + s, 0) / mid;
    const recentAvg = scores.slice(mid).reduce((sum, s) => sum + s, 0) / (total_attempts - mid);
    // Positive % = recent attempts are faster (lower) than older ones.
    improvement_percent = Math.round(((olderAvg - recentAvg) / olderAvg) * 1000) / 10;
  }

  res.json({
    has_data: true,
    game_type,
    total_attempts,
    average_score: Math.round(average_score * 100) / 100,
    best_score,
    worst_score,
    latest_score,
    improvement_percent,
    // Last 10 attempts only, oldest -> newest — just enough to draw a
    // trend sparkline on the frontend without shipping the full history.
    history: history.slice(-10).map((row) => ({ score: row.score, created_at: row.created_at })),
  });
});

module.exports = router;
