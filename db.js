// ============================================================
// db.js
// ------------------------------------------------------------
// This file sets up our DATABASE — the place where all app data
// (users, check-in scores, doctors, community posts, records)
// is permanently stored, even after the server restarts.
//
// We use "better-sqlite3", which stores everything in a single
// file called neuroweave.db (created automatically). This means
// you do NOT need to install or configure a separate database
// program like MySQL or PostgreSQL — perfect for learning and
// for small/medium apps.
// ============================================================

const Database = require('better-sqlite3');
const path = require('path');

// This creates (or opens, if it already exists) the file
// "neuroweave.db" inside the db/ folder. Everything we save
// lives inside this one file.
const db = new Database(path.join(__dirname, 'neuroweave.db'));

// Recommended setting for better-sqlite3: makes reads/writes safer.
db.pragma('journal_mode = WAL');

// ------------------------------------------------------------
// Below we define the "shape" of our data using SQL tables.
// Think of a table like an Excel sheet: each row is one record,
// each column is one field. "CREATE TABLE IF NOT EXISTS" means:
// "only create it the first time — don't wipe existing data."
// ------------------------------------------------------------

// USERS table: one row per person who signs up.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// CHECKINS table: one row per brain-game/test result a user submits.
db.exec(`
  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    game_type TEXT NOT NULL,      -- e.g. "reaction_time" or "memory"
    score REAL NOT NULL,          -- e.g. reaction time in ms, or memory score
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// DOCTORS table: verified professionals shown in the app.
db.exec(`
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    verified INTEGER DEFAULT 1     -- 1 = true, 0 = false (SQLite has no boolean type)
  )
`);

// APPOINTMENTS table: a user booking time with a doctor.
db.exec(`
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    requested_time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending / confirmed / cancelled
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
  )
`);

// COMMUNITY POSTS table: messages people share in support rooms.
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room TEXT NOT NULL,           -- e.g. "Memory Support Room"
    content TEXT NOT NULL,
    is_anonymous INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// ------------------------------------------------------------
// Seed some starter doctors so the app isn't empty on first run.
// We only insert them if the table is currently empty.
// ------------------------------------------------------------
const doctorCount = db.prepare('SELECT COUNT(*) AS count FROM doctors').get().count;
if (doctorCount === 0) {
  const insertDoctor = db.prepare('INSERT INTO doctors (name, specialty) VALUES (?, ?)');
  insertDoctor.run('Dr. Ritika Sharma', 'Neurologist');
  insertDoctor.run('Dr. Arjun Mehta', 'Clinical Psychologist');
  insertDoctor.run('Dr. Sana Khan', 'Occupational Therapist');
}

// We "export" the db connection so other files (our routes) can use it.
module.exports = db;
