# Requirements Document

## Introduction

The Profile Info feature captures a user's name, target job role, and experience level immediately after they sign up or log in. The collected data is persisted in a SQLite `profiles` table linked to the authenticated user. Once a profile exists, the user is routed directly to the interview page, bypassing the profile form. The feature spans a React/Vite frontend form, a REST API backed by Express and better-sqlite3, and JWT-based authentication using the existing `authenticate` middleware.

## Glossary

- **Profile_Form**: The React page component at `/profile-info` that renders the profile collection form.
- **Profile_API**: The Express REST API that handles `POST /api/profile` and `GET /api/profile`.
- **Profile_Model**: The SQLite data-access layer for the `profiles` table.
- **Authenticate_Middleware**: The existing Express middleware that verifies the JWT from the `Authorization: Bearer <token>` header and attaches `req.user` to the request.
- **AuthContext**: The existing React context that stores the JWT and exposes `token`, `user`, and `isAuthenticated`.
- **Profile_Service**: The frontend service module (`profileService.js`) that makes HTTP calls to the Profile_API.
- **Interview_Page**: The placeholder page at `/interview` that users are redirected to after a profile is saved or confirmed to exist.
- **JWT**: JSON Web Token issued by the auth endpoints and required on all profile API requests.
- **Job_Role**: One of the eight fixed options a user may select: Frontend Developer, Backend Developer, Full Stack Developer, DevOps Engineer, Data Scientist, UI/UX Designer, Product Manager, QA Engineer.
- **Experience_Level**: One of the four fixed options a user may select: Fresher, Junior, Mid-Level, Senior.

---

## Requirements

### Requirement 1: Profile Info Form

**User Story:** As a newly registered or returning user, I want to fill in my name, job role, and experience level on a dedicated page, so that the app can tailor interview questions to my background.

#### Acceptance Criteria

1. THE Profile_Form SHALL render a form containing a full-name text input (max 100 characters), a Job_Role dropdown, and an Experience_Level dropdown.
2. THE Profile_Form SHALL populate the Job_Role dropdown with exactly the following options in order: Frontend Developer, Backend Developer, Full Stack Developer, DevOps Engineer, Data Scientist, UI/UX Designer, Product Manager, QA Engineer.
3. THE Profile_Form SHALL populate the Experience_Level dropdown with exactly the following options in order: Fresher, Junior, Mid-Level, Senior.
4. WHEN the user submits the form with an empty or whitespace-only full-name field, THE Profile_Form SHALL display an inline validation error message adjacent to the full-name input and SHALL NOT submit the form to the Profile_API.
5. WHEN the user submits the form without selecting a Job_Role, THE Profile_Form SHALL display an inline validation error message adjacent to the Job_Role dropdown and SHALL NOT submit the form to the Profile_API.
6. WHEN the user submits the form without selecting an Experience_Level, THE Profile_Form SHALL display an inline validation error message adjacent to the Experience_Level dropdown and SHALL NOT submit the form to the Profile_API.
8. WHILE a form submission is in progress, THE Profile_Form SHALL disable the submit button and display a visible loading indicator within or adjacent to the submit button.
9. IF the Profile_API returns an error response, THEN THE Profile_Form SHALL display a human-readable error message in a dedicated error area above the submit button, re-enable the submit button, and preserve all field values.
10. WHEN the Profile_API returns a successful response, THE Profile_Form SHALL navigate the user to `/interview`.
12. THE Profile_Form SHALL apply all colors exclusively from the `variables.css` CSS custom properties — no raw hex values.
13. THE Profile_Form SHALL use semantic HTML elements including `<main>`, `<form>`, `<label>`, and `<button>`, and all interactive elements SHALL be keyboard navigable with visible focus indicators.
14. THE Profile_Form SHALL associate every input and dropdown with a visible `<label>` element via matching `htmlFor` and `id` attributes.

---

### Requirement 2: Post-Authentication Routing

**User Story:** As a user who has just logged in or signed up, I want to be automatically directed to the correct next page, so that I never have to manually navigate.

#### Acceptance Criteria

1. WHEN a user successfully logs in and the Profile_API returns HTTP 404 for that user, THE App SHALL redirect the user to `/profile-info` before rendering any page content.
2. WHEN a user successfully logs in and the Profile_API returns HTTP 200 for that user, THE App SHALL redirect the user directly to `/interview` before rendering any page content.
3. WHEN a user successfully signs up, THE App SHALL redirect the user to `/profile-info`.
4. WHEN an unauthenticated user navigates to `/profile-info`, THE App SHALL redirect the user to `/login` using replace navigation before rendering any page content.
5. WHEN an authenticated user navigates to `/profile-info` and the Profile_API returns HTTP 200 for that user, THE App SHALL redirect the user to `/interview` using replace navigation before rendering any page content.
6. IF the Profile_API returns an error (non-404, non-200) during the post-login profile check, THE App SHALL redirect the user to `/profile-info` as a safe fallback.

---

### Requirement 3: Save Profile — Backend

**User Story:** As a user submitting the profile form, I want my profile data to be saved to the database, so that the app remembers my details for future sessions.

#### Acceptance Criteria

1. THE Profile_API SHALL expose a `POST /api/profile` endpoint protected by the Authenticate_Middleware.
2. WHEN a valid `POST /api/profile` request is received with `full_name`, `job_role`, and `experience_level` fields, THE Profile_API SHALL insert a new row into the `profiles` table and return HTTP 201 with the saved profile object containing `id`, `user_id`, `full_name`, `job_role`, `experience_level`, and `created_at`.
3. IF the `POST /api/profile` request body is missing `full_name`, or `full_name` is an empty string or whitespace-only, THEN THE Profile_API SHALL return HTTP 400 with a `{ "error": string }` response body.
4. IF the `POST /api/profile` request body is missing `job_role` or `job_role` is an empty string, THEN THE Profile_API SHALL return HTTP 400 with a `{ "error": string }` response body.
5. IF the `POST /api/profile` request body is missing `experience_level` or `experience_level` is an empty string, THEN THE Profile_API SHALL return HTTP 400 with a `{ "error": string }` response body.
6. IF the `job_role` value in the request body is not one of the eight permitted Job_Role values, THEN THE Profile_API SHALL return HTTP 400 with a `{ "error": string }` response body.
7. IF the `experience_level` value in the request body is not one of the four permitted Experience_Level values, THEN THE Profile_API SHALL return HTTP 400 with a `{ "error": string }` response body.
8. IF the `POST /api/profile` request does not include a valid JWT in the `Authorization` header, THEN THE Profile_API SHALL return HTTP 401.
9. WHEN a `POST /api/profile` request is received for a `user_id` that already has a profile, THE Profile_API SHALL return HTTP 409 with a `{ "error": string }` response body.

---

### Requirement 4: Retrieve Profile — Backend

**User Story:** As an authenticated user, I want the app to check whether I already have a profile, so that I am not asked to fill in my details again.

#### Acceptance Criteria

1. THE Profile_API SHALL expose a `GET /api/profile` endpoint protected by the Authenticate_Middleware.
2. WHEN a valid `GET /api/profile` request is received and a profile exists for the authenticated user, THE Profile_API SHALL return HTTP 200 with the profile object containing `id`, `user_id`, `full_name`, `job_role`, `experience_level`, and `created_at`.
3. WHEN a valid `GET /api/profile` request is received and no profile exists for the authenticated user, THE Profile_API SHALL return HTTP 404 with a `{ "error": string }` response body.
4. IF the `GET /api/profile` request does not include a JWT in the `Authorization` header, THEN THE Profile_API SHALL return HTTP 401.
5. IF the `GET /api/profile` request includes an expired or malformed JWT, THEN THE Profile_API SHALL return HTTP 401.

---

### Requirement 5: Profiles Database Table

**User Story:** As a developer, I want a well-defined `profiles` table in SQLite, so that profile data is stored reliably and linked to the correct user.

#### Acceptance Criteria

1. THE Profile_Model SHALL create a `profiles` table with columns: `id` (INTEGER PRIMARY KEY AUTOINCREMENT), `user_id` (INTEGER NOT NULL UNIQUE), `full_name` (TEXT NOT NULL), `job_role` (TEXT NOT NULL), `experience_level` (TEXT NOT NULL), `created_at` (TEXT NOT NULL DEFAULT datetime('now')).
2. THE Profile_Model SHALL enforce a UNIQUE constraint on `user_id` so that each user can have at most one profile row.
3. THE Profile_Model SHALL enforce a FOREIGN KEY constraint linking `user_id` to `users.id`.
4. THE Profile_Model SHALL expose a `create(user_id, full_name, job_role, experience_level)` method that inserts a new profile row and returns all columns of the inserted row.
5. THE Profile_Model SHALL expose a `findByUserId(user_id)` method that returns the profile row for a given `user_id`, or `undefined` if none exists.
6. WHEN the `create` method is called with a `user_id` that already exists in the `profiles` table, THE Profile_Model SHALL throw an error indicating a duplicate entry.
7. WHEN the `create` method is called with a `user_id` that does not exist in the `users` table, THE Profile_Model SHALL throw an error indicating a foreign key violation.

---

### Requirement 6: Frontend Profile Service

**User Story:** As a frontend developer, I want a dedicated service module for profile API calls, so that API logic is kept out of components and is easy to test.

#### Acceptance Criteria

1. THE Profile_Service SHALL expose a `saveProfile(profileData, token)` function that sends a `POST /api/profile` request with `profileData` as the JSON body and the JWT in the `Authorization: Bearer <token>` header, and returns the parsed JSON response on success.
2. THE Profile_Service SHALL expose a `getProfile(token)` function that sends a `GET /api/profile` request with the JWT in the `Authorization: Bearer <token>` header, and returns the parsed JSON response on success.
3. WHEN the Profile_API returns a non-2xx response, THE Profile_Service SHALL throw an error whose `message` property contains the `error` field from the `{ "error": string }` response body, or a generic fallback message if the field is absent.
5. THE Profile_Service SHALL read the API base URL from the Vite environment variable `VITE_API_URL` — no hardcoded URLs.

---

### Requirement 7: Interview Placeholder Page

**User Story:** As a user who has completed the profile form, I want to land on the interview page, so that I can see the next step in the flow even before it is fully built.

#### Acceptance Criteria

1. WHEN a user navigates to `/interview`, THE App SHALL render a page containing an `<h1>` heading within a `<main>` landmark that confirms the user has reached the interview section.
2. IF a user navigates to `/interview` without a valid JWT in localStorage, THEN THE App SHALL redirect the user to `/login` using replace navigation before rendering any page content.
3. IF a user navigates to `/interview` with an expired JWT, THEN THE App SHALL redirect the user to `/login` using replace navigation.
