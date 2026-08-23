// ============================================================
// routes/auth.js
// ------------------------------------------------------------
// Handles account creation and login.
//
// We NEVER store a user's real password in the database.
// Instead we store a "hash" — a scrambled, one-way version of
// it — using bcrypt. Even if someone stole the database, they
// could not read the real passwords.
// ============================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/db');
require('dotenv').config();

// ------------------------------------------------------------
// POST /api/auth/signup
// Body (JSON): { "name": "...", "email": "...", "password": "..." }
// Creates a new user account.
// ------------------------------------------------------------
router.post('/signup', (req, res) => {
  const { name, email, password } = req.body;

  // 1. Basic validation — make sure nothing is missing.
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are all required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  // 2. Check this email isn't already registered.
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // 3. Scramble ("hash") the password before saving it. The "10" is
  //    the security strength — higher is slower but more secure.
  const passwordHash = bcrypt.hashSync(password, 10);

  // 4. Save the new user in the database.
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, passwordHash);

  // 5. Immediately log them in by creating a token, so the frontend
  //    doesn't need a second request.
  const token = jwt.sign({ userId: result.lastInsertRowid }, process.env.JWT_SECRET, {
    expiresIn: '7d', // token stays valid for 7 days
  });

  res.status(201).json({
    message: 'Account created!',
    token,
    user: { id: result.lastInsertRowid, name, email },
  });
});

// ------------------------------------------------------------
// POST /api/auth/login
// Body (JSON): { "email": "...", "password": "..." }
// Checks credentials and returns a login token if correct.
// ------------------------------------------------------------
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // 1. Find the user by email.
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    // We give a vague error on purpose (don't reveal whether the email exists).
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  // 2. Compare the typed password against the stored (scrambled) one.
  const passwordMatches = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  // 3. Create a login token (JWT) so the frontend can prove
  //    "this person is logged in" on future requests, without
  //    sending the password again every time.
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.json({
    message: 'Logged in!',
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

module.exports = router;
