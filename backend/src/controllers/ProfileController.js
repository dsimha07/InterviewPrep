'use strict';

/**
 * ProfileController — handles HTTP layer for profile routes.
 *
 * Validates request shape, delegates to the Profile model,
 * and returns JSON responses. All risky operations are wrapped in
 * try/catch blocks; specific error conditions are caught and mapped
 * to the appropriate HTTP status codes.
 *
 * Routes:
 *   POST /api/profile  → create()
 *   GET  /api/profile  → get()
 */

const Profile = require('../models/Profile');

// ---------------------------------------------------------------------------
// Validation constants
// ---------------------------------------------------------------------------

const VALID_JOB_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'UI/UX Designer',
  'Product Manager',
  'QA Engineer',
];

const VALID_EXPERIENCE_LEVELS = ['Fresher', 'Junior', 'Mid-Level', 'Senior'];

const FULL_NAME_MAX_LENGTH = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the SQLite error is a UNIQUE constraint violation.
 *
 * @param {Error} err
 * @returns {boolean}
 */
function isUniqueConstraintError(err) {
  return (
    err &&
    typeof err.message === 'string' &&
    err.message.includes('UNIQUE constraint failed')
  );
}

// ---------------------------------------------------------------------------
// Controller methods
// ---------------------------------------------------------------------------

/**
 * POST /api/profile
 *
 * Validates the request body, creates a new profile for the authenticated
 * user, and returns 201 with the created profile object on success.
 *
 * Error responses:
 *   400 — missing/whitespace full_name, or full_name exceeds max length
 *   400 — missing or invalid job_role
 *   400 — missing or invalid experience_level
 *   409 — a profile already exists for this user
 *   500 — unexpected error (passed to next)
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function create(req, res, next) {
  try {
    const { full_name, job_role, experience_level } = req.body;

    // 1. Validate full_name — required, non-whitespace, max 100 chars
    if (!full_name || typeof full_name !== 'string' || full_name.trim() === '') {
      return res.status(400).json({ error: 'Full name is required' });
    }

    if (full_name.trim().length > FULL_NAME_MAX_LENGTH) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    // 2. Validate job_role — required
    if (!job_role || typeof job_role !== 'string' || job_role.trim() === '') {
      return res.status(400).json({ error: 'Job role is required' });
    }

    // 3. Validate experience_level — required
    if (
      !experience_level ||
      typeof experience_level !== 'string' ||
      experience_level.trim() === ''
    ) {
      return res.status(400).json({ error: 'Experience level is required' });
    }

    // 4. Validate job_role is in the allowed list
    if (!VALID_JOB_ROLES.includes(job_role)) {
      return res.status(400).json({ error: 'Invalid job role' });
    }

    // 5. Validate experience_level is in the allowed list
    if (!VALID_EXPERIENCE_LEVELS.includes(experience_level)) {
      return res.status(400).json({ error: 'Invalid experience level' });
    }

    // 6. Delegate to model
    let profile;
    try {
      profile = Profile.create(
        req.user.id,
        full_name.trim(),
        job_role,
        experience_level
      );
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        console.error(
          `[${new Date().toISOString()}] [error] [ProfileController.create] Duplicate profile for user_id=${req.user.id}: ${err.message}`
        );
        return res
          .status(409)
          .json({ error: 'Profile already exists for this user' });
      }
      // Re-throw any other unexpected error
      throw err;
    }

    console.info(
      `[${new Date().toISOString()}] [info] [ProfileController.create] Profile created for user_id=${req.user.id}`
    );

    return res.status(201).json(profile);
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] [error] [ProfileController.create] Unexpected error for user_id=${req.user && req.user.id}: ${err.message}`
    );
    next(err);
  }
}

/**
 * GET /api/profile
 *
 * Retrieves the profile for the authenticated user.
 * Returns 200 with the profile object if found, or 404 if no profile exists.
 *
 * Error responses:
 *   404 — no profile found for this user
 *   500 — unexpected error (passed to next)
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function get(req, res, next) {
  try {
    const profile = Profile.findByUserId(req.user.id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.info(
      `[${new Date().toISOString()}] [info] [ProfileController.get] Profile retrieved for user_id=${req.user.id}`
    );

    return res.status(200).json(profile);
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] [error] [ProfileController.get] Unexpected error for user_id=${req.user && req.user.id}: ${err.message}`
    );
    next(err);
  }
}

module.exports = { create, get };
