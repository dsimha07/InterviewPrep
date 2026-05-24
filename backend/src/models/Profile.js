'use strict';

/**
 * Profile model — SQLite data access layer for the profiles table.
 * All methods are synchronous (better-sqlite3 is sync).
 *
 * Opens (or creates) the SQLite database at database/interview-prep.db
 * relative to the project root, and runs schema.sql on first connection
 * to initialise the profiles table.
 *
 * Enforces one profile per user via the UNIQUE constraint on user_id.
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
 * Opens the SQLite database and runs the schema SQL to ensure all
 * tables exist. Returns the database instance.
 *
 * @returns {import('better-sqlite3').Database} The open database connection.
 */
function openDatabase() {
  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance.
  db.pragma('journal_mode = WAL');

  // Enable foreign key enforcement — SQLite does not enforce FK constraints
  // by default; this pragma must be set per connection.
  db.pragma('foreign_keys = ON');

  // Run the schema to create tables if they don't already exist.
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  return db;
}

// Module-level singleton database connection.
const db = openDatabase();

/**
 * Inserts a new profile record into the profiles table.
 * Returns all columns of the inserted row.
 *
 * Throws a SqliteError with UNIQUE constraint message if a profile
 * already exists for the given userId.
 * Throws a SqliteError with FOREIGN KEY constraint message if the
 * userId does not reference a valid user.
 *
 * @param {number} userId
 * @param {string} fullName
 * @param {string} jobRole
 * @param {string} experienceLevel
 * @returns {{ id: number, user_id: number, full_name: string, job_role: string, experience_level: string, created_at: string }}
 */
function create(userId, fullName, jobRole, experienceLevel) {
  const stmt = db.prepare(
    'INSERT INTO profiles (user_id, full_name, job_role, experience_level) VALUES (?, ?, ?, ?)'
  );

  const result = stmt.run(userId, fullName, jobRole, experienceLevel);

  const row = db
    .prepare('SELECT * FROM profiles WHERE id = ?')
    .get(result.lastInsertRowid);

  return row;
}

/**
 * Finds a profile by the owning user's id.
 * Returns the full row object or undefined if no profile exists for that user.
 *
 * @param {number} userId
 * @returns {{ id: number, user_id: number, full_name: string, job_role: string, experience_level: string, created_at: string } | undefined}
 */
function findByUserId(userId) {
  const stmt = db.prepare('SELECT * FROM profiles WHERE user_id = ?');
  return stmt.get(userId) ?? undefined;
}

module.exports = { create, findByUserId };
