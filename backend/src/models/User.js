'use strict';

/**
 * User model — SQLite data access layer for the users table.
 * All methods are synchronous (better-sqlite3 is sync).
 *
 * Opens (or creates) the SQLite database at database/interview-prep.db
 * relative to the project root, and runs schema.sql on first connection
 * to initialise the users table.
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Resolve paths relative to the project root (three levels up from this file:
// models/ → src/ → backend/ → project root)
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const DB_PATH = path.join(PROJECT_ROOT, 'database', 'interview-prep.db');
const SCHEMA_PATH = path.join(PROJECT_ROOT, 'database', 'schema.sql');

/**
 * Opens the SQLite database and runs the schema SQL to ensure the
 * users table exists. Returns the database instance.
 *
 * @returns {import('better-sqlite3').Database} The open database connection.
 */
function openDatabase() {
  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance.
  db.pragma('journal_mode = WAL');

  // Run the schema to create tables if they don't already exist.
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  return db;
}

// Module-level singleton database connection.
const db = openDatabase();

/**
 * Inserts a new user record into the users table.
 * Returns the created row as { id, username }.
 * Throws a SqliteError (SQLITE_CONSTRAINT_UNIQUE) if the username already
 * exists (case-insensitive, enforced by COLLATE NOCASE on the column).
 *
 * @param {{ username: string, passwordHash: string }} params
 * @returns {{ id: number, username: string }}
 */
function create({ username, passwordHash }) {
  const stmt = db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  );

  const result = stmt.run(username, passwordHash);

  return { id: result.lastInsertRowid, username };
}

/**
 * Finds a user by username using a case-insensitive comparison.
 * The COLLATE NOCASE on the column means SQLite handles the
 * case-insensitivity automatically.
 * Returns the full row object or undefined if no match is found.
 *
 * @param {string} username
 * @returns {{ id: number, username: string, password_hash: string, created_at: string } | undefined}
 */
function findByUsername(username) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username) ?? undefined;
}

/**
 * Finds a user by their numeric id.
 * Returns the full row object or undefined if no match is found.
 *
 * @param {number} id
 * @returns {{ id: number, username: string, password_hash: string, created_at: string } | undefined}
 */
function findById(id) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) ?? undefined;
}

module.exports = { create, findByUsername, findById };
