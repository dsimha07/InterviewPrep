# Design Document — basic-auth

## Overview

This feature adds basic username/password authentication to the Interview Prep app. It covers two backend REST endpoints (`/api/auth/signup` and `/api/auth/login`), JWT issuance, and three frontend pages (Login, Signup, Profile placeholder) protected by a React route guard.

**Key decisions:**
- Passwords are hashed with `bcrypt` (cost factor 12) before storage — plaintext is never persisted.
- Tokens are signed JWTs (HS256, 7-day expiry) carrying `{ id, username }` claims.
- The JWT is stored in `localStorage` and read by an `AuthContext` provider that is mounted at the React root.
- Route protection is handled by a `ProtectedRoute` component that wraps React Router v6 `<Outlet>`.
- The backend follows the internal `server/` structure convention mapped onto the existing `backend/` folder (e.g. `backend/src/routes/auth.js`).

---

## Architecture

### System Context

```
Browser (React + Vite)
  │
  │  HTTP/JSON  (localhost:5173 → localhost:3001)
  ▼
Express REST API  (backend/)
  │
  │  better-sqlite3
  ▼
SQLite  (database/interview-prep.db)
```

### Request / Response Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│                                                                 │
│  LoginPage / SignupPage                                         │
│       │  submit form                                            │
│       ▼                                                         │
│  authService.js  ──── POST /api/auth/login|signup ────────────► │
│                                                                 │
│                       Express Router (auth.js)                  │
│                            │                                    │
│                            ▼                                    │
│                       AuthController.js                         │
│                            │  validate input                    │
│                            ▼                                    │
│                       AuthService.js                            │
│                            │  bcrypt.hash / bcrypt.compare      │
│                            │  jwt.sign                          │
│                            ▼                                    │
│                       User.js  (model)                          │
│                            │  better-sqlite3                    │
│                            ▼                                    │
│                       SQLite DB                                 │
│                                                                 │
│  ◄──── { token, user } / error ────────────────────────────────  │
│                                                                 │
│  AuthContext  ◄── stores token in localStorage                  │
│       │                                                         │
│       ▼                                                         │
│  ProtectedRoute  ──► ProfilePage (or redirect to /login)        │
└─────────────────────────────────────────────────────────────────┘
```

### Component Dependency Graph

```
main.jsx
  └── <BrowserRouter>
        └── <AuthProvider>          (context/AuthContext.jsx)
              └── <App>
                    ├── /login      → LoginPage.jsx
                    ├── /signup     → SignupPage.jsx
                    └── <ProtectedRoute>
                          └── /profile  → ProfilePage.jsx
```

---

## Components and Interfaces

### Backend

#### `backend/src/routes/auth.js`
Mounts two routes on the Express router and delegates to `AuthController`.

```js
router.post('/signup', AuthController.signup);
router.post('/login',  AuthController.login);
```

#### `backend/src/controllers/AuthController.js`

```js
/**
 * AuthController — handles HTTP layer for auth routes.
 * Validates request shape, calls AuthService, returns JSON responses.
 */

// POST /api/auth/signup
async signup(req, res, next)
  // → 201 { token, user: { id, username } }
  // → 400 missing/invalid fields
  // → 409 username taken
  // → 500 token issuance failure

// POST /api/auth/login
async login(req, res, next)
  // → 200 { token, user: { id, username } }
  // → 400 missing fields
  // → 401 wrong password
  // → 404 user not found
  // → 503 DB unavailable
  // → 500 token issuance failure
```

#### `backend/src/services/AuthService.js`

```js
/**
 * AuthService — business logic for authentication.
 * Handles password hashing, bcrypt comparison, and JWT signing.
 */

// Hash a plaintext password. Returns Promise<string>.
async hashPassword(plaintext)

// Compare plaintext against a stored hash. Returns Promise<boolean>.
async verifyPassword(plaintext, hash)

// Sign and return a JWT for the given user. Returns string.
signToken(user)   // user: { id, username }

// Validate username format (3–30 chars, alphanumeric + underscore).
// Returns { valid: boolean, message?: string }.
validateUsername(username)

// Validate that a field is non-empty and non-whitespace-only.
// Returns boolean.
isPresent(value)
```

#### `backend/src/models/User.js`

```js
/**
 * User model — SQLite data access layer for the users table.
 * All methods are synchronous (better-sqlite3 is sync).
 */

// Insert a new user. Returns the created row { id, username }.
// Throws on duplicate username.
create({ username, passwordHash })

// Find a user by username (case-insensitive). Returns row or undefined.
findByUsername(username)

// Find a user by id. Returns row or undefined.
findById(id)
```

#### `backend/src/middleware/authenticate.js`

```js
/**
 * authenticate — Express middleware that verifies the JWT on
 * protected routes. Attaches decoded payload to req.user.
 * Returns 401 if token is missing or invalid.
 */
function authenticate(req, res, next)
```

#### `backend/src/app.js`

```js
// Express app setup: JSON body parser, CORS, route mounting, error handler.
// Validates JWT_SECRET presence at startup; exits with code 1 if absent.
app.use('/api/auth', authRouter);
```

---

### Frontend

#### `frontend/src/context/AuthContext.jsx`

```jsx
/**
 * AuthContext — provides authentication state to the entire component tree.
 * Reads/writes JWT from localStorage. Decodes payload with jwt-decode.
 *
 * Exposed value:
 *   {
 *     isAuthenticated: boolean,
 *     token: string | null,
 *     user: { id, username } | null,
 *     login(token): void,
 *     logout(): void,
 *   }
 */
export const AuthContext = createContext(null);
export function AuthProvider({ children })
export function useAuth()   // convenience hook
```

#### `frontend/src/components/ProtectedRoute.jsx`

```jsx
/**
 * ProtectedRoute — wraps React Router <Outlet>.
 * Redirects unauthenticated users to /login.
 * Clears expired tokens before checking auth state.
 */
function ProtectedRoute()
```

#### `frontend/src/pages/LoginPage.jsx`

```jsx
/**
 * LoginPage — renders the login form.
 * Calls authService.login(), stores token via AuthContext, redirects to /profile.
 */
function LoginPage()
```

#### `frontend/src/pages/SignupPage.jsx`

```jsx
/**
 * SignupPage — renders the signup form.
 * Calls authService.signup(), stores token via AuthContext, redirects to /profile.
 */
function SignupPage()
```

#### `frontend/src/pages/ProfilePage.jsx`

```jsx
/**
 * ProfilePage — placeholder landing page for authenticated users.
 * Decodes username from JWT via AuthContext.
 * Redirects to /login if token is absent, malformed, or expired.
 */
function ProfilePage()
```

#### `frontend/src/services/authService.js`

```js
/**
 * authService — thin API client for auth endpoints.
 * All functions return the parsed JSON body or throw on non-2xx.
 */

// POST /api/auth/login  → { token, user }
async function login({ username, password })

// POST /api/auth/signup → { token, user }
async function signup({ username, password })
```

#### `frontend/src/styles/variables.css`

```css
/* Brand color tokens — all components reference these, never raw hex values */
:root {
  --color-primary:        #002856;  /* Midnight Blue */
  --color-secondary:      #0598CE;  /* Dodger Blue */
  --color-accent-yellow:  #FFC000;
  --color-accent-orange:  #F27D2E;
  --color-blue-mid:       #1E4278;
  --color-gray:           #555555;
  --color-bg:             #F7F7F7;  /* Pale White */
  --color-bg-light-blue:  #E3EDFD;
  --color-text:           #1e1111ff;
  --color-text-gray:      #747474;
  --color-text-mid-gray:  #B3B3B3;
}
```

---

## Data Models

### SQLite — `users` table

```sql
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

- `username` has a `UNIQUE` constraint with `COLLATE NOCASE` to enforce case-insensitive uniqueness at the DB level (mirrors the application-level check in Requirement 1.3).
- `password_hash` stores the bcrypt output string (60 characters, `$2b$` prefix).
- `created_at` is stored as ISO-8601 text (SQLite has no native datetime type).

### JWT Payload

```json
{
  "id": 42,
  "username": "alice_dev",
  "iat": 1720000000,
  "exp": 1720604800
}
```

- Algorithm: HS256
- Expiry: `7d` (604 800 seconds from `iat`)
- Secret: `process.env.JWT_SECRET`

### File Structure

```
backend/
├── index.js                        ← existing entry point (will delegate to app.js)
├── src/
│   ├── app.js                      ← Express setup, route mounting, startup guard
│   ├── routes/
│   │   └── auth.js
│   ├── controllers/
│   │   └── AuthController.js
│   ├── models/
│   │   └── User.js
│   ├── middleware/
│   │   └── authenticate.js
│   ├── services/
│   │   └── AuthService.js
│   └── utils/
│       └── logger.js
└── package.json

frontend/src/
├── context/
│   └── AuthContext.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   └── ProfilePage.jsx
├── components/
│   └── ProtectedRoute.jsx
├── services/
│   └── authService.js
├── styles/
│   └── variables.css
├── App.jsx                         ← replace Vite starter; add BrowserRouter + routes
└── main.jsx                        ← wrap with AuthProvider

database/
└── schema.sql                      ← add users table DDL
```

---



## Error Handling

### Backend

| Scenario | HTTP Status | Response body |
|---|---|---|
| Missing / whitespace username or password | 400 | `{ "error": "Username and password are required" }` |
| Username format violation (length / chars) | 400 | `{ "error": "<specific constraint message>" }` |
| Username already taken | 409 | `{ "error": "Username is already taken" }` |
| User not found on login | 404 | `{ "error": "User not found" }` |
| Incorrect password | 401 | `{ "error": "Incorrect password" }` |
| DB unavailable | 503 | `{ "error": "Service temporarily unavailable" }` |
| JWT generation failure | 500 | `{ "error": "Authentication succeeded but token issuance failed" }` |
| Unhandled server error | 500 | `{ "error": "Internal server error" }` |

All error responses use the same shape `{ "error": string }` for consistency.

**Startup guard** — `backend/src/app.js` checks `process.env.JWT_SECRET` before mounting routes. If absent, it logs `"JWT_SECRET environment variable is not set"` at `error` severity and calls `process.exit(1)`.

**Global error handler** — `backend/src/middleware/errorHandler.js` catches any unhandled errors thrown by controllers, logs them with timestamp + severity + source, and returns a 500 response. It never leaks stack traces to the client.

### Frontend

- `authService.js` throws a structured error `{ status, message }` on any non-2xx response, parsing the `error` field from the JSON body when present.
- Login/Signup pages catch the error and display `error.message`, falling back to `"Something went wrong. Please try again."` if the message is absent.
- `AuthContext` initialises by reading `localStorage` and immediately discarding any token whose `exp` has passed, so stale tokens never reach the route guard.
- `ProtectedRoute` performs the expiry check synchronously on every render, ensuring no protected content is ever briefly visible before a redirect.

---


## Correctness Properties

### Property 1: Signup creates a user and returns a token

For any valid username (3–30 alphanumeric/underscore characters) and non-empty password, calling `POST /api/auth/signup` SHALL return HTTP 201 with a `token` field in the body, and the user SHALL be findable in the database afterwards.

**Validates: Requirements 1.1, 3.1**

---

### Property 2: Passwords are stored as bcrypt hashes (never plaintext)

For any plaintext password submitted during signup, the value stored in `password_hash` SHALL NOT equal the plaintext, AND `bcrypt.compare(plaintext, storedHash)` SHALL return `true`.

**Validates: Requirements 1.2**

---

### Property 3: Duplicate usernames are rejected (case-insensitive)

For any username that has already been registered, a second signup attempt using that username in any casing variant SHALL return HTTP 409.

**Validates: Requirements 1.3**

---

### Property 4: Whitespace-only fields are rejected with 400 on both auth endpoints

For any string composed entirely of whitespace characters (including the empty string), submitting it as the `username` or `password` field to either `POST /api/auth/signup` or `POST /api/auth/login` SHALL return HTTP 400.

**Validates: Requirements 1.4, 2.5**

---

### Property 5: Invalid username formats are rejected with 400

For any string that is shorter than 3 characters, longer than 30 characters, or contains characters other than alphanumerics and underscores, submitting it as the `username` in a signup request SHALL return HTTP 400.

**Validates: Requirements 1.5**

---

### Property 6: Correct credentials always produce a successful login

For any user registered in the system, calling `POST /api/auth/login` with that user's exact username and password SHALL return HTTP 200 with a `token` field in the body.

**Validates: Requirements 2.1, 2.2**

---

### Property 7: Unregistered usernames always return 404 on login

For any username that has never been registered, calling `POST /api/auth/login` with that username SHALL return HTTP 404.

**Validates: Requirements 2.3**

---

### Property 8: Wrong passwords always return 401 on login

For any registered user, calling `POST /api/auth/login` with that user's username and any password that differs from the registered password SHALL return HTTP 401.

**Validates: Requirements 2.4**

---

### Property 9: JWT payload contains correct claims and expiry

For any user who successfully authenticates (login or signup), the returned JWT SHALL decode to a payload containing `id` and `username` matching the registered user, and the difference `exp − iat` SHALL equal exactly 604 800 seconds (7 days).

**Validates: Requirements 3.2, 3.3**

---

### Property 10: Auth forms reject whitespace-only inputs client-side

For any string composed entirely of whitespace characters, entering it into the username or password field of either the Login form or the Signup form and activating the submit button SHALL display the inline error `"Username and password are required"` and SHALL NOT dispatch an API request.

**Validates: Requirements 4.2, 5.2**

---

### Property 11: Auth forms display API error messages

For any error response returned by the API (with or without a message body), the Login form and the Signup form SHALL display the error message from the response body, or a generic fallback message if the body is absent.

**Validates: Requirements 4.3, 5.3**

---

### Property 12: Successful authentication stores the token and redirects to /profile

For any valid token returned by the API on a successful login or signup, the corresponding auth form SHALL write that token to `localStorage` and navigate the user to `/profile`.

**Validates: Requirements 4.4, 5.4**

---

### Property 13: ProtectedRoute redirects unauthenticated users

For any protected route path (`/profile`, `/interview`, `/results`), navigating to it without a valid token in `localStorage` SHALL redirect the user to `/login`.

**Validates: Requirements 6.1**

---

### Property 14: ProtectedRoute allows access with a valid non-expired token

For any well-formed JWT with an expiry timestamp in the future, navigating to any protected route SHALL render the protected content without redirecting.

**Validates: Requirements 6.2**

---

### Property 15: Logout always clears auth state

For any token stored in `localStorage`, calling `logout()` on `AuthContext` SHALL set `isAuthenticated` to `false` and `token` to `null` before any subsequent navigation.

**Validates: Requirements 6.4**

---

### Property 16: Expired tokens are cleaned up and trigger redirect

For any JWT whose `exp` timestamp is in the past, the `ProtectedRoute` component SHALL remove the token from `localStorage`, set auth state to unauthenticated, and redirect the user to `/login`.

**Validates: Requirements 6.5**

---

### Property 17: ProfilePage displays the username from the JWT

For any valid JWT containing a `username` claim, the `ProfilePage` SHALL render that username visibly in the document.

**Validates: Requirements 7.3**

---

### Property 18: ProfilePage redirects on absent, malformed, or expired token

For any value in `localStorage` that is `null`, an arbitrary non-JWT string, or a JWT with a past expiry, rendering `ProfilePage` SHALL redirect the user to `/login`.

**Validates: Requirements 7.4**

---

## Testing Strategy

### Overview

This feature uses a dual testing approach: example-based unit tests for specific scenarios and UI structure, and property-based tests for universal correctness guarantees. Both are required; neither alone is sufficient.

### Property-Based Testing

**Library:** `fast-check` — works in both Node.js (backend) and Vitest (frontend).

**Configuration:** Each property test runs a minimum of **100 iterations** (`numRuns: 100`).

**Tag format:** Each property test file includes a comment:
```
// Feature: basic-auth, Property <N>: <property_text>
```

**Properties to implement as PBT tests:**

| Property | Test file | Arbitraries needed |
|---|---|---|
| P1 — Signup creates user + token | `AuthController.test.js` | `fc.string` (valid username pattern), `fc.string` (password) |
| P2 — Passwords stored as bcrypt hash | `AuthService.test.js` | `fc.string` (password) |
| P3 — Duplicate usernames rejected (case-insensitive) | `AuthController.test.js` | `fc.string` (valid username), casing variants |
| P4 — Whitespace fields → 400 | `AuthController.test.js` | `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` |
| P5 — Invalid username formats → 400 | `AuthService.test.js` | `fc.string` filtered to violate constraints |
| P6 — Correct credentials → 200 + token | `AuthController.test.js` | `fc.record({ username, password })` |
| P7 — Unregistered username → 404 | `AuthController.test.js` | `fc.string` (never registered) |
| P8 — Wrong password → 401 | `AuthController.test.js` | `fc.record({ username, password, wrongPassword })` |
| P9 — JWT claims + expiry | `AuthService.test.js` | `fc.record({ id: fc.integer(), username: fc.string() })` |
| P10 — Form rejects whitespace client-side | `LoginPage.test.jsx`, `SignupPage.test.jsx` | `fc.stringOf(fc.constantFrom(' ', '\t'))` |
| P11 — Form displays API errors | `LoginPage.test.jsx`, `SignupPage.test.jsx` | `fc.string` (error messages) |
| P12 — Successful auth stores token + redirects | `LoginPage.test.jsx`, `SignupPage.test.jsx` | `fc.string` (valid JWT-shaped token) |
| P13 — ProtectedRoute redirects unauthenticated | `ProtectedRoute.test.jsx` | `fc.constantFrom('/profile', '/interview', '/results')` |
| P14 — ProtectedRoute allows valid token | `ProtectedRoute.test.jsx` | `fc.record` (valid JWT with future exp) |
| P15 — Logout clears auth state | `AuthContext.test.jsx` | `fc.string` (any token) |
| P16 — Expired token → cleanup + redirect | `ProtectedRoute.test.jsx` | `fc.record` (JWT with past exp) |
| P17 — ProfilePage shows username from JWT | `ProfilePage.test.jsx` | `fc.string` (username) |
| P18 — ProfilePage redirects on bad token | `ProfilePage.test.jsx` | `fc.oneof(fc.constant(null), fc.string(), expiredJwtArb)` |

### Example-Based Unit Tests

Cover scenarios not suited to PBT:

- `AuthController.test.js` — DB unavailable → 503; JWT generation failure → 500
- `AuthService.test.js` — `validateUsername` with specific boundary values (2 chars, 3 chars, 30 chars, 31 chars)
- `LoginPage.test.jsx` — renders correct form elements; submit button disabled during in-flight request; link to /signup present
- `SignupPage.test.jsx` — renders correct form elements with maxLength; submit button disabled during in-flight request; link to /login present
- `ProfilePage.test.jsx` — renders `<h1>Profile Info</h1>` and paragraph text
- `AuthContext.test.jsx` — context shape exposes `isAuthenticated`, `token`, `user`

### Integration / Smoke Tests

- **Smoke:** App refuses to start without `JWT_SECRET` (Requirement 3.4)
- **Integration:** DB unavailable during login returns 503 (Requirement 2.6) — mock `better-sqlite3` to throw

### Test File Locations

Following the co-location convention from the structure steering file:

```
backend/src/controllers/AuthController.test.js
backend/src/services/AuthService.test.js
frontend/src/context/AuthContext.test.jsx
frontend/src/components/ProtectedRoute.test.jsx
frontend/src/pages/LoginPage.test.jsx
frontend/src/pages/SignupPage.test.jsx
frontend/src/pages/ProfilePage.test.jsx
```

**Backend test runner:** Jest (to be added as a dev dependency).
**Frontend test runner:** Vitest (add as dev dependency).
