'use strict';

/**
 * index.js — Server entry point.
 *
 * Loads environment variables first so JWT_SECRET is available when app.js
 * runs its startup guard, then imports the configured Express app and starts
 * listening on port 3001.
 */

require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
