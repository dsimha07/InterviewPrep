-- database/schema.sql
-- Users table for basic authentication
-- Stores user credentials with bcrypt-hashed passwords

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Profiles table for storing user profile information
-- Linked to users table via foreign key on user_id
-- UNIQUE constraint on user_id enforces one profile per user

CREATE TABLE IF NOT EXISTS profiles (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL UNIQUE,
  full_name        TEXT    NOT NULL,
  job_role         TEXT    NOT NULL,
  experience_level TEXT    NOT NULL,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
