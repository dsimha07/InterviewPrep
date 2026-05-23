'use strict';

/**
 * authenticate — Express middleware that verifies the JWT on protected routes.
 *
 * Reads the `Authorization: Bearer <token>` header, verifies the token using
 * `jwt.verify` with the `JWT_SECRET` environment variable, and attaches the
 * decoded payload to `req.user` before calling `next()`.
 *
 * Returns HTTP 401 with a JSON error body if:
 *   - The Authorization header is absent or not in Bearer format
 *   - The token is invalid (bad signature, malformed)
 *   - The token has expired
 */

const jwt = require('jsonwebtoken');

/**
 * Verifies the Bearer JWT from the Authorization header.
 * Attaches the decoded payload to `req.user` on success.
 * Responds with 401 JSON `{ error: '...' }` on any failure.
 *
 * @param {object}   req  - Express request object.
 * @param {object}   res  - Express response object.
 * @param {Function} next - Express next function.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Require the header to be present and in "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const timestamp = new Date().toISOString();
    console.warn(
      `[${timestamp}] [warning] [authenticate] Missing or malformed Authorization header`,
      { method: req.method, url: req.originalUrl }
    );
    return res.status(401).json({ error: 'Authorization token is required' });
  }

  const token = authHeader.slice(7); // strip "Bearer " prefix

  try {
    const secret = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);

    // Attach the decoded payload so downstream handlers can read req.user
    req.user = decoded;

    const timestamp = new Date().toISOString();
    console.info(
      `[${timestamp}] [info] [authenticate] Token verified for user: ${decoded.username}`,
      { method: req.method, url: req.originalUrl }
    );

    next();
  } catch (err) {
    const timestamp = new Date().toISOString();

    if (err.name === 'TokenExpiredError') {
      console.warn(
        `[${timestamp}] [warning] [authenticate] Token has expired`,
        { method: req.method, url: req.originalUrl }
      );
      return res.status(401).json({ error: 'Token has expired' });
    }

    // Covers JsonWebTokenError (bad signature, malformed) and any other jwt error
    console.warn(
      `[${timestamp}] [warning] [authenticate] Invalid token: ${err.message}`,
      { method: req.method, url: req.originalUrl }
    );
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authenticate;
