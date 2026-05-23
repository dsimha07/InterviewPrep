'use strict';

/**
 * AuthController — handles HTTP layer for auth routes.
 *
 * Validates request shape, delegates to AuthService and User model,
 * and returns JSON responses. All risky operations are wrapped in
 * try/catch blocks; specific error conditions are caught and mapped
 * to the appropriate HTTP status codes.
 *
 * Routes:
 *   POST /api/auth/signup  → signup()
 *   POST /api/auth/login   → login()
 */

const AuthService = require('../services/AuthService');
const User = require('../models/User');

/**
 * Determines whether a better-sqlite3 error indicates the database
 * file is unavailable (e.g. SQLITE_CANTOPEN or similar I/O errors).
 *
 * @param {Error} err
 * @returns {boolean}
 */
function isDbUnavailableError(err) {
  if (!err || typeof err.message !== 'string') return false;
  const msg = err.message.toUpperCase();
  // better-sqlite3 surfaces these codes in the error message
  return (
    msg.includes('SQLITE_CANTOPEN') ||
    msg.includes('SQLITE_IOERR') ||
    msg.includes('SQLITE_NOTADB') ||
    msg.includes('UNABLE TO OPEN DATABASE') ||
    (err.code && String(err.code).toUpperCase().includes('SQLITE_CANTOPEN'))
  );
}

/**
 * POST /api/auth/signup
 *
 * Validates input, creates a new user with a hashed password, signs a JWT,
 * and returns 201 with { token, user: { id, username } } on success.
 *
 * Error responses:
 *   400 — missing/whitespace username or password
 *   400 — username format violation
 *   409 — username already taken
 *   500 — JWT generation failure
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function signup(req, res, next) {
  try {
    const { username, password } = req.body;

    // 1. Validate field presence
    if (!AuthService.isPresent(username) || !AuthService.isPresent(password)) {
      return res
        .status(400)
        .json({ error: 'Username and password are required' });
    }

    // 2. Validate username format
    const usernameValidation = AuthService.validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({ error: usernameValidation.message });
    }

    // 3. Hash password and create user
    let createdUser;
    try {
      const passwordHash = await AuthService.hashPassword(password);
      createdUser = User.create({ username, passwordHash });
    } catch (err) {
      // Catch duplicate-username constraint violation from SQLite
      if (
        err &&
        typeof err.message === 'string' &&
        err.message.includes('UNIQUE constraint failed')
      ) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
      // Re-throw any other unexpected error
      throw err;
    }

    // 4. Sign JWT
    let token;
    try {
      token = AuthService.signToken(createdUser);
    } catch (tokenErr) {
      return res
        .status(500)
        .json({ error: 'Authentication succeeded but token issuance failed' });
    }

    // 5. Success
    return res.status(201).json({
      token,
      user: { id: createdUser.id, username: createdUser.username },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 *
 * Validates input, looks up the user, verifies the password, signs a JWT,
 * and returns 200 with { token, user: { id, username } } on success.
 *
 * Error responses:
 *   400 — missing/whitespace username or password
 *   404 — user not found
 *   401 — incorrect password
 *   503 — database unavailable
 *   500 — JWT generation failure
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    // 1. Validate field presence
    if (!AuthService.isPresent(username) || !AuthService.isPresent(password)) {
      return res
        .status(400)
        .json({ error: 'Username and password are required' });
    }

    // 2. Look up user — catch DB-unavailable errors
    let user;
    try {
      user = User.findByUsername(username);
    } catch (dbErr) {
      if (isDbUnavailableError(dbErr)) {
        return res
          .status(503)
          .json({ error: 'Service temporarily unavailable' });
      }
      throw dbErr;
    }

    // 3. User not found
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 4. Verify password
    let passwordMatches;
    try {
      passwordMatches = await AuthService.verifyPassword(
        password,
        user.password_hash
      );
    } catch (dbErr) {
      if (isDbUnavailableError(dbErr)) {
        return res
          .status(503)
          .json({ error: 'Service temporarily unavailable' });
      }
      throw dbErr;
    }

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // 5. Sign JWT
    let token;
    try {
      token = AuthService.signToken({ id: user.id, username: user.username });
    } catch (tokenErr) {
      return res
        .status(500)
        .json({ error: 'Authentication succeeded but token issuance failed' });
    }

    // 6. Success
    return res.status(200).json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login };
