'use strict';

/**
 * AuthService — business logic for authentication.
 *
 * Handles password hashing via bcrypt, bcrypt comparison,
 * JWT signing, username format validation, and field-presence checks.
 *
 * All methods are exported as plain functions (no class instance needed).
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/** bcrypt cost factor — 12 rounds as specified in the design. */
const BCRYPT_COST = 12;

/** Username constraints. */
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;

/** Regex: only alphanumerics and underscores. */
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

/**
 * Hashes a plaintext password using bcrypt with cost factor 12.
 * The plaintext is never stored — only the resulting hash is persisted.
 *
 * @param {string} plaintext - The raw password supplied by the user.
 * @returns {Promise<string>} The bcrypt hash string.
 */
async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 * Returns true only when the plaintext matches the hash.
 *
 * @param {string} plaintext - The raw password to verify.
 * @param {string} hash - The bcrypt hash stored in the database.
 * @returns {Promise<boolean>} True if the password matches, false otherwise.
 */
async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

/**
 * Signs and returns a JWT for the given user.
 *
 * Payload contains { id, username }.
 * Algorithm: HS256.
 * Expiry: 7 days.
 * Secret: process.env.JWT_SECRET (never hardcoded).
 *
 * @param {{ id: number, username: string }} user - The authenticated user.
 * @returns {string} A signed JWT string.
 * @throws {Error} If JWT_SECRET is not set or jwt.sign fails.
 */
function signToken(user) {
  const secret = process.env.JWT_SECRET;

  return jwt.sign({ id: user.id, username: user.username }, secret, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
}

/**
 * Validates that a username meets the format requirements:
 *   - Between 3 and 30 characters (inclusive)
 *   - Contains only alphanumeric characters and underscores
 *
 * Returns { valid: true } on success, or { valid: false, message: string }
 * describing the first constraint violated.
 *
 * @param {string} username - The username string to validate.
 * @returns {{ valid: boolean, message?: string }}
 */
function validateUsername(username) {
  if (typeof username !== 'string') {
    return { valid: false, message: 'Username must be a string.' };
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      message: `Username must be at least ${USERNAME_MIN_LENGTH} characters long.`,
    };
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      message: `Username must be no more than ${USERNAME_MAX_LENGTH} characters long.`,
    };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      valid: false,
      message:
        'Username may only contain letters, numbers, and underscores.',
    };
  }

  return { valid: true };
}

/**
 * Checks whether a value is present — i.e. not absent, not an empty string,
 * and not a whitespace-only string.
 *
 * Returns false for: undefined, null, '', '   ', '\t\n', etc.
 * Returns true for any string that contains at least one non-whitespace character.
 *
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is a non-empty, non-whitespace string.
 */
function isPresent(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  validateUsername,
  isPresent,
};
