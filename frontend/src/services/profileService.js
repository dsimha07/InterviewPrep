/**
 * profileService.js
 *
 * Thin API client for the profile endpoints.
 * All functions return the parsed JSON body on success, or throw a
 * structured error object { status, message } on non-2xx responses.
 *
 * The API base URL is read from the VITE_API_URL environment variable
 * so it is never hardcoded and can be changed per environment.
 */

const API_URL = import.meta.env.VITE_API_URL;

const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Internal helper that sends an HTTP request to the given endpoint with
 * an Authorization: Bearer header and an optional JSON body.
 * Returns the parsed response JSON on 2xx.
 * Throws { status, message } on non-2xx, extracting the `error` field
 * from the response body when present, or falling back to a generic message.
 *
 * @param {string} method - HTTP method (e.g. 'GET', 'POST').
 * @param {string} endpoint - The path to request (e.g. '/api/profile').
 * @param {string} token - JWT used in the Authorization: Bearer header.
 * @param {Object} [body] - Optional request payload (omitted for GET).
 * @returns {Promise<Object>} Parsed JSON response body.
 * @throws {{ status: number, message: string }} On non-2xx responses.
 */
async function fetchJson(method, endpoint, token, body) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const options = { method, headers };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);

  // Attempt to parse the response body regardless of status so we can
  // extract the error message on failure.
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data && data.error ? data.error : FALLBACK_ERROR_MESSAGE;
    throw { status: response.status, message };
  }

  return data;
}

/**
 * Saves a new profile for the authenticated user.
 * POSTs profileData to /api/profile and returns the saved profile object on success.
 *
 * @param {Object} profileData - The profile payload: { full_name, job_role, experience_level }.
 * @param {string} token - JWT for the Authorization: Bearer header.
 * @returns {Promise<{ id: number, user_id: number, full_name: string, job_role: string, experience_level: string, created_at: string }>}
 * @throws {{ status: number, message: string }} On non-2xx responses.
 */
async function saveProfile(profileData, token) {
  return fetchJson('POST', '/api/profile', token, profileData);
}

/**
 * Retrieves the profile for the authenticated user.
 * GETs /api/profile and returns the profile object on success.
 *
 * @param {string} token - JWT for the Authorization: Bearer header.
 * @returns {Promise<{ id: number, user_id: number, full_name: string, job_role: string, experience_level: string, created_at: string }>}
 * @throws {{ status: number, message: string }} On non-2xx responses.
 */
async function getProfile(token) {
  return fetchJson('GET', '/api/profile', token);
}

export { saveProfile, getProfile };
