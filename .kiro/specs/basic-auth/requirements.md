# Requirements Document

## Introduction

This feature adds basic authentication to the Interview Prep app. Users can register a new account with a username and password, or log in to an existing account. Passwords are stored securely using bcrypt hashing. On successful login or signup, the server issues a JWT token that the frontend stores and uses to protect routes. Any page that requires authentication redirects unauthenticated users to the Login page. A placeholder Profile Info page is the landing destination after a successful login or signup.

The backend is a Node.js + Express REST API. The database is SQLite via better-sqlite3. The frontend is React + Vite.

---

## Glossary

- **Auth_API**: The Express REST API responsible for handling signup and login requests.
- **Auth_Service**: The backend business-logic layer that validates credentials, hashes passwords, and issues tokens.
- **User_Store**: The SQLite database table (`users`) that persists user records.
- **JWT**: JSON Web Token — a signed, stateless token returned to the client on successful authentication.
- **Token_Store**: The browser's `localStorage`, where the frontend persists the JWT between page loads.
- **Auth_Context**: The React context provider that exposes authentication state and helper functions to all frontend components.
- **Route_Guard**: The React component that checks authentication state and redirects unauthenticated users to the Login page.
- **Login_Page**: The frontend page containing the login form.
- **Signup_Page**: The frontend page containing the signup form.
- **Profile_Page**: The placeholder frontend page that authenticated users are redirected to after login or signup.
- **Auth_Form**: A login or signup HTML form rendered on Login_Page or Signup_Page.
- **bcrypt**: The password-hashing library used to hash and verify passwords before storage.

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to register with a username and password, so that I can create an account and access the app.

#### Acceptance Criteria

1. WHEN a POST request is received at `/api/auth/signup` with a valid `username` and `password`, THE Auth_API SHALL create a new user record in the User_Store and return a JWT with HTTP status 201.
2. WHEN a signup request is received, THE Auth_Service SHALL store a bcrypt hash of the password (not the plaintext password) in the User_Store, such that the stored value cannot be reversed to recover the original password.
3. WHEN a signup request is received with a `username` that already exists in the User_Store (case-insensitive comparison), THE Auth_API SHALL return HTTP status 409 and an error message indicating the username is already taken.
4. WHEN a signup request is received with an absent, empty, or whitespace-only `username` or `password`, THE Auth_API SHALL return HTTP status 400 and an error message indicating both fields are required.
5. WHEN a signup request is received, THE Auth_API SHALL reject a `username` shorter than 3 characters or longer than 30 characters, or containing characters other than alphanumerics and underscores, with HTTP status 400 and an error message describing the constraint violated.

---

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in with my username and password, so that I can access my account.

#### Acceptance Criteria

1. WHEN a POST request is received at `/api/auth/login` with a valid `username` and `password` that match a record in the User_Store, THE Auth_API SHALL return a JWT and HTTP status 200.
2. WHEN a login request is received, THE Auth_Service SHALL verify the provided password by comparing it against the stored `password_hash` using bcrypt, and SHALL only authenticate the user if the comparison returns true.
3. WHEN a login request is received with a `username` that does not exist in the User_Store, THE Auth_API SHALL return HTTP status 404 and an error message indicating the user was not found.
4. WHEN a login request is received with a `username` that exists but an incorrect `password`, THE Auth_API SHALL return HTTP status 401 and an error message indicating the password is incorrect.
5. WHEN a login request is received with an absent, empty, or whitespace-only `username` or `password`, THE Auth_API SHALL return HTTP status 400 and an error message indicating both fields are required.
6. WHEN the User_Store is unavailable during a login request, THE Auth_API SHALL return HTTP status 503 and an error message indicating the service is temporarily unavailable.

---

### Requirement 3: JWT Token Issuance

**User Story:** As the system, I want to issue a signed JWT on successful authentication, so that the frontend can prove the user's identity on subsequent requests.

#### Acceptance Criteria

1. WHEN authentication succeeds (login or signup), THE Auth_Service SHALL generate a JWT signed with the HS256 algorithm using a secret key loaded from the environment variable `JWT_SECRET`, and SHALL return the token in the response body as a field named `token`.
2. THE Auth_Service SHALL set the JWT expiry to 7 days from the time of issuance.
3. THE Auth_Service SHALL include the user's `id` and `username` as claims inside the JWT payload.
4. IF `JWT_SECRET` is not set in the environment, THEN THE Auth_API SHALL refuse to start, log the error `"JWT_SECRET environment variable is not set"`, and exit the process with a non-zero exit code.
5. WHEN JWT generation fails for any reason other than a missing `JWT_SECRET`, THE Auth_API SHALL return HTTP status 500 and an error message indicating authentication succeeded but token issuance failed.

---

### Requirement 4: Frontend Login Page

**User Story:** As a user, I want a Login page with a form, so that I can enter my credentials and sign in.

#### Acceptance Criteria

1. THE Login_Page SHALL render an Auth_Form containing a `username` text input, a `password` password input, and a submit button labelled `"Log In"`.
2. WHEN the submit button is activated with an empty or whitespace-only `username` or `password` field, THE Login_Page SHALL display the inline error message `"Username and password are required"` without submitting the request.
3. WHEN the Auth_API returns an error response to a login request, THE Login_Page SHALL display the error message returned by the API; IF the error response contains no message body, THE Login_Page SHALL display a generic fallback error message.
4. WHEN the Auth_API returns a successful login response, THE Login_Page SHALL store the JWT in the Token_Store and redirect the user to the Profile_Page.
5. WHILE a login request is in-flight, THE Login_Page SHALL disable the submit button to prevent duplicate submissions, and SHALL re-enable it when the request completes.
6. THE Login_Page SHALL provide a link to the Signup_Page that: is rendered in the document flow, has a non-empty accessible text label, and is keyboard-focusable.

---

### Requirement 5: Frontend Signup Page

**User Story:** As a new user, I want a Signup page with a form, so that I can create an account.

#### Acceptance Criteria

1. THE Signup_Page SHALL render an Auth_Form containing a `username` text input (max 50 characters), a `password` password input (max 128 characters), and a submit button labelled `"Sign Up"`.
2. WHEN the submit button is activated with an empty or whitespace-only `username` or `password` field, THE Signup_Page SHALL display the inline error message `"Username and password are required"` without submitting the request.
3. WHEN the Auth_API returns an error response to a signup request, THE Signup_Page SHALL display the error message returned by the API; IF the error response contains no message body, THE Signup_Page SHALL display a generic fallback error message.
4. WHEN the Auth_API returns a successful signup response, THE Signup_Page SHALL store the JWT in the Token_Store and redirect the user to the Profile_Page.
5. WHILE a signup request is in-flight, THE Signup_Page SHALL disable the submit button to prevent duplicate submissions, and SHALL re-enable it when the request completes.
6. THE Signup_Page SHALL provide a link to the Login_Page that: is rendered in the document flow, has a non-empty accessible text label, and is keyboard-focusable with a visible focus indicator.


---

### Requirement 6: Route Protection

**User Story:** As the system, I want to redirect unauthenticated users to the Login page, so that protected pages cannot be accessed without a valid session.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to a protected route (Profile_Page, Interview_Page, or Results_Page), THE Route_Guard SHALL redirect the user to the Login_Page and, after successful login, redirect the user to the Login_Page.
2. WHILE a JWT is present in the Token_Store AND its expiry timestamp has not yet been reached, THE Route_Guard SHALL allow the user to access protected routes without redirecting.
3. THE Auth_Context SHALL expose the current authentication state (authenticated or unauthenticated) and the stored JWT — where the JWT value is `null` when unauthenticated — to all components in the component tree.
4. WHEN the JWT is removed from the Token_Store (logout), THE Auth_Context SHALL update the authentication state to unauthenticated before any subsequent navigation occurs.
5. IF the JWT present in the Token_Store has an expiry timestamp that has already passed, THEN THE Route_Guard SHALL remove the token from the Token_Store, set the authentication state to unauthenticated, and redirect the user to the Login_Page.

---

### Requirement 7: Profile Info Placeholder Page

**User Story:** As an authenticated user, I want to be redirected to a Profile Info page after login or signup, so that I have a clear landing destination inside the app.

#### Acceptance Criteria

1. THE Profile_Page SHALL render an `<h1>` heading with the text `"Profile Info"` and a paragraph containing the text `"Profile setup coming soon"`.
2. WHILE the user is unauthenticated, THE Route_Guard SHALL prevent access to the Profile_Page and redirect the user to the Login_Page.
3. THE Profile_Page SHALL display the authenticated user's `username` decoded from the JWT stored in the Token_Store.
4. IF the JWT stored in the Token_Store is absent, malformed, or expired when the Profile_Page is rendered, THEN THE Profile_Page SHALL redirect the user to the Login_Page.

---


