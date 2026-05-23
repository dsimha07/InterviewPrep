'use strict';

/**
 * errorHandler — global Express error-handling middleware.
 *
 * Must be registered as the LAST middleware in app.js so it catches
 * any error passed via next(err) from controllers or other middleware.
 *
 * Logs the error with timestamp, severity, and source for observability,
 * then returns a generic 500 response. Stack traces are never sent to
 * the client to avoid leaking implementation details.
 *
 * @param {Error}    err  - The error object forwarded by next(err).
 * @param {object}   req  - Express request object.
 * @param {object}   res  - Express response object.
 * @param {Function} next - Express next function (required for Express to
 *                          recognise this as an error handler).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString();
  const severity = 'error';
  const source = 'errorHandler';

  // Log with structured format: timestamp | severity | source | message
  console.error(
    `[${timestamp}] [${severity}] [${source}] ${err.message || 'Unknown error'}`,
    {
      method: req.method,
      url: req.originalUrl,
      // Stack is logged server-side only — never sent to the client
      stack: err.stack,
    }
  );

  // Return a generic message — never expose stack traces or internal details
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
