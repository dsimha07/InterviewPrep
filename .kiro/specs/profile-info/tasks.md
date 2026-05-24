# Implementation Plan: Profile Info

## Overview

Implement the profile info feature end-to-end: database schema, backend model/controller/router, frontend service, profile form page, interview placeholder page, and all routing updates. Each task builds on the previous so that every piece is wired in before moving forward.

## Tasks

- [x] 1. Extend the database schema with the profiles table
  - Append the `CREATE TABLE IF NOT EXISTS profiles` statement to `database/schema.sql`
  - Include columns: `id` (INTEGER PRIMARY KEY AUTOINCREMENT), `user_id` (INTEGER NOT NULL UNIQUE), `full_name` (TEXT NOT NULL), `job_role` (TEXT NOT NULL), `experience_level` (TEXT NOT NULL), `created_at` (TEXT NOT NULL DEFAULT datetime('now'))
  - Add `FOREIGN KEY (user_id) REFERENCES users(id)` constraint
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 2. Implement the Profile model
  - [x] 2.1 Create `backend/src/models/Profile.js`
    - Open the database using the same singleton pattern as `User.js` (resolve `DB_PATH` and `SCHEMA_PATH` relative to project root)
    - Set `PRAGMA foreign_keys = ON` at connection time alongside `journal_mode = WAL`
    - Implement `create(userId, fullName, jobRole, experienceLevel)` — INSERT and return all columns of the inserted row using `lastInsertRowid`
    - Implement `findByUserId(userId)` — SELECT the profile row or return `undefined`
    - Export both functions as named exports
    - _Requirements: 5.4, 5.5_

  

- [x] 3. Implement the ProfileController
  - [x] 3.1 Create `backend/src/controllers/ProfileController.js`
    - Define module-level validation constants: `VALID_JOB_ROLES` (8 values), `VALID_EXPERIENCE_LEVELS` (4 values), `FULL_NAME_MAX_LENGTH = 100`
    - Implement `create(req, res, next)` — validate `full_name` (required, non-whitespace, max 100 chars), `job_role` (required, in allowed list), `experience_level` (required, in allowed list); delegate to `Profile.create`; map UNIQUE constraint error to 409; pass all other unexpected errors to `next`
    - Implement `get(req, res, next)` — call `Profile.findByUserId(req.user.id)`; return 200 with profile or 404 `{ error: 'Profile not found' }`; pass unexpected errors to `next`
    - Follow the same error-logging format used in `AuthController.js` (timestamp + severity + source)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3_

  

- [x] 4. Create the profile router and mount it in app.js
  - [x] 4.1 Create `backend/src/routes/profile.js`
    - Define an Express Router with `POST /` → `authenticate`, `ProfileController.create` and `GET /` → `authenticate`, `ProfileController.get`
    - Follow the same pattern as `backend/src/routes/auth.js`
    - _Requirements: 3.1, 4.1_

  - [x] 4.2 Update `backend/src/app.js`
    - Require the profile router and mount it at `/api/profile` after the auth router
    - _Requirements: 3.1, 4.1_

- [x] 5. Checkpoint — verify backend is wired end-to-end
  - Manually test POST /api/profile and GET /api/profile 
   using Postman or curl before moving to frontend, ask the user if questions arise.

- [x] 6. Implement the frontend profile service
  - [x] 6.1 Create `frontend/src/services/profileService.js`
    - Read `API_URL` from `import.meta.env.VITE_API_URL`
    - Implement private `fetchJson(method, endpoint, token, body?)` helper — sets `Authorization: Bearer <token>`, `Content-Type: application/json`, parses JSON, throws `{ status, message }` on non-2xx (extract `error` field from body or use generic fallback)
    - Implement `saveProfile(profileData, token)` — calls `fetchJson('POST', '/api/profile', token, profileData)`
    - Implement `getProfile(token)` — calls `fetchJson('GET', '/api/profile', token)`
    - Export `saveProfile` and `getProfile` as named exports
    - _Requirements: 6.1, 6.2, 6.3, 6.5_



- [x] 7. Implement ProfilePage
  - [x] 7.1 Replace `frontend/src/pages/ProfilePage.jsx` with the full implementation
    - On mount: if unauthenticated redirect to `/login`; call `getProfile(token)`; if 200 redirect to `/interview` (replace); if 404 render the form; if other error fall through to form with a console warning
    - Use `isCheckingProfile` state to suppress form flash during the profile check; render nothing (or a minimal spinner) while `true`
    - Render a `<form>` inside `<main>` with: full-name `<input type="text">` (maxLength 100), job-role `<select>` with the 8 Job_Role options in order, experience-level `<select>` with the 4 Experience_Level options in order
    - Associate every input/select with a `<label>` via matching `htmlFor`/`id`
    - Client-side validation on submit: full-name non-empty/non-whitespace, job-role selected, experience-level selected; display per-field inline errors adjacent to each field; do not call the API if validation fails
    - On submit: call `saveProfile(formData, token)`; on 201 navigate to `/interview`; on error display `err.message` in a dedicated error area above the submit button and re-enable the button
    - Disable submit button and show loading text while API call is in-flight
    - All colors from `variables.css` tokens; semantic HTML; visible focus indicators on all interactive elements
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 1.9, 1.10, 1.12, 1.13, 1.14, 2.4, 2.5_


- [x] 8. Create the InterviewPage placeholder
  - [x] 8.1 Create `frontend/src/pages/InterviewPage.jsx`
    - Render a `<main>` landmark containing an `<h1>` that confirms the user has reached the interview section
    - No logic beyond what `ProtectedRoute` already provides
    - All colors from `variables.css` tokens
    - _Requirements: 7.1_


- [x] 9. Update routing in App.jsx
  - Modify `frontend/src/App.jsx` to import `InterviewPage` and update the protected routes block:
    - Remove the old `/profile` route
    - Add `<Route path="/profile-info" element={<ProfilePage />} />`
    - Add `<Route path="/interview" element={<InterviewPage />} />`
  - Both new routes must be nested inside the existing `<Route element={<ProtectedRoute />}>` wrapper
  - _Requirements: 2.4, 7.2, 7.3_

- [x] 10. Update post-login routing in LoginPage
  - Modify `frontend/src/pages/LoginPage.jsx` `handleSubmit` function:
    - After `login(token)`, import and call `getProfile(token)` from `profileService`
    - On 200 → `navigate('/interview')`
    - On 404 → `navigate('/profile-info')`
    - On any other error → `navigate('/profile-info')` (safe fallback per Requirement 2.6)
  - _Requirements: 2.1, 2.2, 2.6_

- [x] 11. Update post-signup routing in SignupPage
  - Modify `frontend/src/pages/SignupPage.jsx` `handleSubmit` function:
    - Change `navigate('/profile')` to `navigate('/profile-info')` after successful signup
  - _Requirements: 2.3_

- [x] 12. Final checkpoint — ensure all tests pass
  - Manually verify the full flow in browser —
   signup → profile-info → fill form → interview page
   login with existing profile → interview page directly, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The design has no Correctness Properties section, so only unit tests are included (no property-based tests)
- Co-locate test files next to the source file they test (e.g. `Profile.js` → `Profile.test.js`)
- The `Profile` model must set `PRAGMA foreign_keys = ON` at connection time — SQLite does not enforce foreign keys by default
- `LoginPage` will need to import `getProfile` from `profileService` — ensure the import is added alongside the routing change

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": [ "3.1"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2", "6.1"] },
    { "id": 5, "tasks": ["6.2", "7.1", "8.1"] },
    { "id": 6, "tasks": ["7.2", "8.2", "9"] },
    { "id": 7, "tasks": ["10", "11"] }
  ]
}
```
