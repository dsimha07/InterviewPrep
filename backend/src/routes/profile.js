'use strict';

/**
 * profile.js — Express router for profile endpoints.
 *
 * Mounts the create and get routes behind the authenticate middleware
 * and delegates request handling to ProfileController. This router is
 * intended to be mounted at /api/profile in the Express app
 * (e.g. app.use('/api/profile', profileRouter)).
 *
 * Routes:
 *   POST /  → authenticate, ProfileController.create
 *   GET  /  → authenticate, ProfileController.get
 */

const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const ProfileController = require('../controllers/ProfileController');

const router = Router();

router.post('/', authenticate, ProfileController.create);
router.get('/', authenticate, ProfileController.get);

module.exports = router;
