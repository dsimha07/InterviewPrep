---
inclusion: manual
---

# Add a New API Endpoint

## Overview
Adds a new REST API endpoint following the Interview Prep app's layered architecture.

## When to use this skill
- When asked to add a new backend route
- When creating a new API feature

## Layer order — always follow this sequence
1. Add DDL to `database/schema.sql` if new table needed
2. Create model in `backend/src/models/ModelName.js`
3. Create controller in `backend/src/controllers/ControllerName.js`
4. Create router in `backend/src/routes/routeName.js`
5. Mount router in `backend/src/app.js`

## Model rules
- Use better-sqlite3 (synchronous — no async/await)
- Set PRAGMA foreign_keys = ON at connection time
- Export named functions only
- Follow pattern in `backend/src/models/Profile.js`

## Controller rules
- Validate all inputs before touching the database
- Apply authenticate middleware on all protected routes
- Map errors to correct HTTP status codes:
  - 400 → validation failure
  - 401 → missing or invalid JWT
  - 404 → resource not found
  - 409 → duplicate or conflict
  - 500 → unexpected error via next(err)
- Never expose stack traces to the client
- Use console.error for unexpected errors
- Follow pattern in `backend/src/controllers/ProfileController.js`

## Router rules
- Follow pattern in `backend/src/routes/profile.js`
- Always apply authenticate middleware to protected routes
- Mount in `app.js` after existing routers