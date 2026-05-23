'use strict';

/**
 * app.js — Express application setup.
 *
 * Configures middleware (CORS, JSON body parser), mounts the auth router,
 * and registers the global error handler. Validates that JWT_SECRET is
 * present at module load time — exits immediately with code 1 if absent.
 *
 * Does NOT call app.listen; that responsibility belongs to index.js.
 */

const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');

// Startup guard — must run before any routes are mounted so the process
// exits immediately if the secret is missing, rather than serving requests
// that would fail at token-signing time.
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not set');
  process.exit(1);
}

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
app.use('/api/auth', authRouter);

// --- Global error handler (must be last) ---
app.use(errorHandler);

module.exports = app;
