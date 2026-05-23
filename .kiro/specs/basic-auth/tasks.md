# Implementation Plan: basic-auth

## Overview

Implement username/password authentication end-to-end: backend REST endpoints (`/api/auth/signup` and `/api/auth/login`), JWT issuance, SQLite user storage, and three frontend pages (Login, Signup, Profile placeholder) protected by a React route guard. The implementation follows the layered architecture defined in the design: DB schema → model → service → controller → routes → Express app → frontend context → pages.

---

## Tasks

- [x] 1. Install dependencies and configure test runners
  - [x] 1.1 Install backend dependencies
    - Run `npm install bcrypt jsonwebtoken cors` in `backend/`
    - _Requirements: 1.2, 2.2, 3.1_
  - [x] 1.2 Install frontend dependencies
    - Run `npm install react-router-dom jwt-decode` in `frontend/`
    - _Requirements: 4.1, 5.1, 6.1_

- [x] 2. Database schema
  - [x] 2.1 Create `database/schema.sql`
    - Write the `CREATE TABLE IF NOT EXISTS users` DDL with columns: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `username TEXT NOT NULL UNIQUE COLLATE NOCASE`, `password_hash TEXT NOT NULL`, `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
    - _Requirements: 1.1, 1.3_

- [x] 3. Backend utilities and logger
  - [x] 3.1 Create `backend/src/utils/logger.js`
    - Implement a logger that writes entries with timestamp, severity level (`debug`, `info`, `warning`, `error`), source, and contextual data
    - Export named functions: `debug`, `info`, `warning`, `error`
    - _Requirements: 3.4_

- [x] 4. User model
  - [x] 4.1 Create `backend/src/models/User.js`
    - Open (or create) the SQLite database at `database/interview-prep.db` using `better-sqlite3`
    - Run `schema.sql` on first connection to initialise the `users` table
    - Implement synchronous `create({ username, passwordHash })` — inserts a row and returns `{ id, username }`; throws on duplicate username
    - Implement synchronous `findByUsername(username)` — returns the row or `undefined` (case-insensitive via `COLLATE NOCASE`)
    - Implement synchronous `findById(id)` — returns the row or `undefined`
    - _Requirements: 1.1, 1.3, 2.1_

- [x] 5. AuthService — business logic
  - [x] 5.1 Create `backend/src/services/AuthService.js`
    - Implement `async hashPassword(plaintext)` using `bcrypt.hash` with cost factor 12
    - Implement `async verifyPassword(plaintext, hash)` using `bcrypt.compare`; returns `boolean`
    - Implement `signToken(user)` using `jwt.sign` with `{ id, username }` payload, `JWT_SECRET` from `process.env`, algorithm HS256, and `expiresIn: '7d'`
    - Implement `validateUsername(username)` — returns `{ valid: boolean, message?: string }`; rejects strings shorter than 3 or longer than 30 characters, or containing characters other than alphanumerics and underscores
    - Implement `isPresent(value)` — returns `false` for absent, empty, or whitespace-only strings
    - _Requirements: 1.2, 1.4, 1.5, 2.2, 3.1, 3.2, 3.3_
 

- [x] 6. AuthController and error handler middleware
  - [x] 6.1 Create `backend/src/middleware/errorHandler.js`
    - Implement a four-argument Express error handler `(err, req, res, next)`
    - console.error the error message
    - Return `{ error: 'Internal server error' }` with status 500; never leak stack traces to the client
    - _Requirements: 2.6_
  - [x] 6.2 Create `backend/src/controllers/AuthController.js`
    - Implement `async signup(req, res, next)`:
      - Validate `username` and `password` presence with `AuthService.isPresent`; return 400 on failure
      - Validate username format with `AuthService.validateUsername`; return 400 on failure
      - Call `User.create` after hashing password; catch duplicate-username error and return 409
      - Call `AuthService.signToken`; catch token failure and return 500
      - Return 201 `{ token, user: { id, username } }` on success
    - Implement `async login(req, res, next)`:
      - Validate field presence; return 400 on failure
      - Call `User.findByUsername`; return 404 if not found
      - Call `AuthService.verifyPassword`; return 401 if mismatch
      - Catch DB-unavailable errors and return 503
      - Call `AuthService.signToken`; catch token failure and return 500
      - Return 200 `{ token, user: { id, username } }` on success
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.3, 2.4, 2.5, 2.6, 3.1, 3.5_
 
    
- [x] 7. Auth route and authenticate middleware
  - [x] 7.1 Create `backend/src/middleware/authenticate.js`
    - Implement `authenticate(req, res, next)` Express middleware
    - Read the `Authorization: Bearer <token>` header; return 401 if absent
    - Verify the token with `jwt.verify` using `JWT_SECRET`; return 401 if invalid or expired
    - Attach decoded payload to `req.user` and call `next()`
    - _Requirements: 6.2_
  - [x] 7.2 Create `backend/src/routes/auth.js`
    - Mount `router.post('/signup', AuthController.signup)` and `router.post('/login', AuthController.login)`
    - Export the router
    - _Requirements: 1.1, 2.1_

- [x] 8. Express app setup and entry point refactor
  - [x] 8.1 Create `backend/src/app.js`
    - Import and configure `express`, `cors`, and `express.json()` body parser
    - Check `process.env.JWT_SECRET` at startup; if absent, console.error JWT_SECRET environment variable is not set and call `process.exit(1)`
    - Mount `authRouter` at `/api/auth`
    - Register `errorHandler` as the last middleware
    - Export the `app` instance (do not call `app.listen` here)
    - _Requirements: 3.4_
  - [x] 8.2 Refactor `backend/index.js` to delegate to `app.js`
    - Replace the current inline Express setup with `require('./src/app')` and call `app.listen(3001, ...)`
    - Load `dotenv` before importing `app.js`
    - _Requirements: 3.4_

- [x] 9. Checkpoint — backend smoke test
  - Manually verify the server starts, POST /api/auth/signup and POST /api/auth/login return correct responses using a tool like curl or Postman
  - Verify the server starts and exits with code 1 when `JWT_SECRET` is unset
  - Ask the user if any questions arise before proceeding to the frontend.

- [x] 10. Frontend CSS variables
  - [ ] 10.1 Create `frontend/src/styles/variables.css`
    - Define all brand color tokens as CSS custom properties on `:root` exactly as specified in the design: `--color-primary`, `--color-secondary`, `--color-accent-yellow`, `--color-accent-orange`, `--color-blue-mid`, `--color-gray`, `--color-bg`, `--color-bg-light-blue`, `--color-text`, `--color-text-gray`, `--color-text-mid-gray`
    - _Requirements: 4.1, 5.1_

- [x] 11. Frontend auth service
  - [x] 11.1 Create `frontend/src/services/authService.js`
    - Implement `async login({ username, password })` — POST to `/api/auth/login`; return parsed JSON on 2xx; throw `{ status, message }` on non-2xx, parsing the `error` field from the response body when present, falling back to a generic message
    - Implement `async signup({ username, password })` — POST to `/api/auth/signup`; same error-handling pattern
    - Read the API base URL from `import.meta.env.VITE_API_URL` (never hardcode)
    - _Requirements: 4.3, 4.4, 5.3, 5.4_

- [x] 12. AuthContext provider
  - [x] 12.1 Create `frontend/src/context/AuthContext.jsx`
    - Create `AuthContext` with `createContext(null)`
    - Implement `AuthProvider` that initialises state by reading `localStorage` on mount; immediately discard any token whose `exp` has already passed
    - Decode the JWT payload with `jwt-decode` to populate `user: { id, username }`
    - Expose `{ isAuthenticated, token, user, login(token), logout() }` via context value
    - `login(token)` stores the token in `localStorage` and updates state
    - `logout()` removes the token from `localStorage` and sets `isAuthenticated` to `false` and `token` to `null` synchronously
    - Export `useAuth()` convenience hook
    - _Requirements: 6.3, 6.4, 7.3_

- [x] 13. ProtectedRoute component
  - [x] 13.1 Create `frontend/src/components/ProtectedRoute.jsx`
    - Implement `ProtectedRoute` that wraps React Router v6 `<Outlet>`
    - On every render, check if the token in `localStorage` is expired; if so, call `logout()` from `AuthContext`, set auth state to unauthenticated, and redirect to `/login`
    - If `isAuthenticated` is `false`, redirect to `/login`
    - Otherwise render `<Outlet />`
    - _Requirements: 6.1, 6.2, 6.5_
 

- [x] 14. Login page
  - [x] 14.1 Create `frontend/src/pages/LoginPage.jsx`
    - Render a `<form>` with a `username` text input, a `password` password input, and a submit button labelled `"Log In"`
    - Use semantic HTML (`<label>` elements associated with inputs via `htmlFor`/`id`)
    - On submit: validate that both fields are non-empty and non-whitespace-only; if not, display inline error `"Username and password are required"` without calling the API
    - On submit (valid): disable the submit button, call `authService.login()`, re-enable on completion
    - On API success: call `AuthContext.login(token)` and navigate to `/profile`
    - On API error: display `error.message` from the thrown error, falling back to `"Something went wrong. Please try again."`
    - Include a keyboard-focusable link with accessible text to `/signup`
    - All colors must reference `variables.css` tokens
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_


- [x] 15. Signup page
  - [x] 15.1 Create `frontend/src/pages/SignupPage.jsx`
    - Render a `<form>` with a `username` text input (`maxLength={50}`), a `password` password input (`maxLength={128}`), and a submit button labelled `"Sign Up"`
    - Use semantic HTML with associated `<label>` elements
    - On submit: validate presence; display `"Username and password are required"` without calling the API if invalid
    - On submit (valid): disable the submit button, call `authService.signup()`, re-enable on completion
    - On API success: call `AuthContext.login(token)` and navigate to `/profile`
    - On API error: display `error.message`, falling back to `"Something went wrong. Please try again."`
    - Include a keyboard-focusable link with accessible text and visible focus indicator to `/login`
    - All colors must reference `variables.css` tokens
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_




- [x] 17. App routing and main entry point
  - [x] 17.1 Replace `frontend/src/App.jsx` with React Router routes
    - Remove the Vite starter content
    - Set up `<Routes>`: `/login` → `LoginPage`, `/signup` → `SignupPage`, `<ProtectedRoute>` wrapping `/profile` → `ProfilePage`
    - Add a default redirect from `/` to `/login`
    - _Requirements: 6.1, 6.2_
  - [x] 17.2 Update `frontend/src/main.jsx` to wrap with `AuthProvider`
    - Wrap `<App />` with `<BrowserRouter>` and `<AuthProvider>` so auth context is available to all routes
    - Import `variables.css` here (or in `index.css`) so tokens are globally available
    - _Requirements: 6.3_


---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation before moving to the next layer
- Property tests validate universal correctness guarantees; unit tests cover specific examples and edge cases
- All property tests use `fast-check` with `numRuns: 100`
- Backend test runner: Jest; Frontend test runner: Vitest
- Never hardcode config values — use `.env` files and `import.meta.env` on the frontend
- All brand colors must reference `variables.css` tokens, never raw hex values

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1"] },
    { "id": 5, "tasks": ["6.2"] },
    { "id": 6, "tasks": ["6.3", "7.1", "7.2"] },
    { "id": 7, "tasks": ["8.1"] },
    { "id": 8, "tasks": ["8.2", "10.1"] },
    { "id": 9, "tasks": ["11.1"] },
    { "id": 10, "tasks": ["12.1"] },
    { "id": 11, "tasks": ["12.2", "13.1"] },
    { "id": 12, "tasks": ["13.2", "14.1"] },
    { "id": 13, "tasks": ["14.2", "15.1"] },
    { "id": 14, "tasks": ["15.2", "16.1"] },
    { "id": 15, "tasks": ["16.2", "17.1"] },
    { "id": 16, "tasks": ["17.2"] }
  ]
}
```
