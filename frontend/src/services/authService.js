/**
 * authService.js
 *
 * Thin API client for the authentication endpoints.
 * All functions return the parsed JSON body on success, or throw a
 * structured error object { status, message } on non-2xx responses.
 *
 * The API base URL is read from the VITE_API_URL environment variable
 * so it is never hardcoded and can be changed per environment.
 */

const API_URL = import.meta.env.VITE_API_URL;

const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Sends a POST request to the given endpoint with a JSON body.
 * Returns the parsed response JSON on 2xx.
 * Throws { status, message } on non-2xx, extracting the `error` field
 * from the response body when present, or falling back to a generic message.
 *
 * @param {string} endpoint - The path to POST to (e.g. '/api/auth/login').
 * @param {Object} body - The request payload.
 * @returns {Promise<Object>} Parsed JSON response body.
 * @throws {{ status: number, message: string }} On non-2xx responses.
 */
async function postJson(endpoint, body) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Attempt to parse the response body regardless of status so we can
  // extract the error message on failure.
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      (data && data.error) ? data.error : FALLBACK_ERROR_MESSAGE;
    throw { status: response.status, message };
  }

  return data;
}

/**
 * Logs in an existing user.
 * POSTs credentials to /api/auth/login and returns { token, user } on success.
 *
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<{ token: string, user: { id: number, username: string } }>}
 * @throws {{ status: number, message: string }} On non-2xx responses.
 */
async function login({ username, password }) {
  return postJson('/api/auth/login', { username, password });
}

/**
 * Registers a new user.
 * POSTs credentials to /api/auth/signup and returns { token, user } on success.
 *
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<{ token: string, user: { id: number, username: string } }>}
 * @throws {{ status: number, message: string }} On non-2xx responses.
 */
async function signup({ username, password }) {
  return postJson('/api/auth/signup', { username, password });
}

export { login, signup };
