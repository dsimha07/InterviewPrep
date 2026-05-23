'use strict';

/**
 * auth.js — Express router for authentication endpoints.
 *
 * Mounts the signup and login routes and delegates request handling
 * to AuthController. This router is intended to be mounted at
 * /api/auth in the Express app (e.g. app.use('/api/auth', authRouter)).
 *
 * Routes:
 *   POST /signup  → AuthController.signup
 *   POST /login   → AuthController.login
 */

const { Router } = require('express');
const AuthController = require('../controllers/AuthController');

const router = Router();

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);

module.exports = router;
