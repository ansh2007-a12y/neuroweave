// ============================================================
// routes/community.js
// ------------------------------------------------------------
// Handles the "safe community" feature: posting messages inside
// support rooms, and reading a room's posts. Users can choose
// to post anonymously.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db/db');
const requireLogin = require('../middleware/auth');

// ------------------------------------------------------------
// GET /api/community/:room
// Example: GET /api/community/Memory%20Support%20Room
// Public route — returns the latest posts in a given room.
// If a post was made anonymously, we hide the real name.
// ------------------------------------------------------------
router.get('/:room', (req, res) => {
  const { room } = req.params;

  const posts = db
    .prepare(
      `SELECT posts.id, posts.content, posts.is_anonymous, posts.created_at,
              users.name AS author_name
       FROM posts
       JOIN users ON users.id = posts.user_id
       WHERE posts.room = ?
       ORDER BY posts.created_at DESC`
    )
    .all(room);

  // Hide the real name for anonymous posts before sending to the frontend.
  const safePosts = posts.map((post) => ({
    id: post.id,
    content: post.content,
    created_at: post.created_at,
    author_name: post.is_anonymous ? 'Anonymous Weaver' : post.author_name,
  }));

  res.json(safePosts);
});

// ------------------------------------------------------------
// POST /api/community/:room
// Header: Authorization: Bearer <token>
// Body (JSON): { "content": "...", "is_anonymous": true }
// Creates a new post in a room, from the logged-in user.
// ------------------------------------------------------------
router.post('/:room', requireLogin, (req, res) => {
  const { room } = req.params;
  const { content, is_anonymous } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Post content cannot be empty.' });
  }

  db.prepare(
    'INSERT INTO posts (user_id, room, content, is_anonymous) VALUES (?, ?, ?, ?)'
  ).run(req.userId, room, content.trim(), is_anonymous ? 1 : 0);

  res.status(201).json({ message: 'Post shared.' });
});

module.exports = router;
