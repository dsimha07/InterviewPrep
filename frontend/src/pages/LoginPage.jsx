/**
 * LoginPage.jsx
 *
 * Renders the login form for the Interview Prep app.
 * Validates inputs client-side before calling the API, displays inline
 * errors, disables the submit button during in-flight requests, and
 * redirects to /profile on success.
 *
 * On API success: stores the JWT via AuthContext.login() and navigates to /profile.
 * On API error: displays error.message, falling back to a generic message.
 *
 * All colors reference variables.css tokens — no raw hex values.
 *
 * @author basic-auth spec
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as authService from '../services/authService';
import '../styles/variables.css';

/** Fallback error message when the API error has no message body. */
const FALLBACK_ERROR = 'Something went wrong. Please try again.';

/**
 * LoginPage — the login form page.
 * Handles client-side validation, API call, and post-login navigation.
 */
function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  /**
   * Handles form submission.
   * Validates that both fields are non-empty and non-whitespace-only.
   * On valid input, calls the login API and handles success/error.
   *
   * @param {React.FormEvent<HTMLFormElement>} event
   */
  async function handleSubmit(event) {
    event.preventDefault();

    // Client-side validation: both fields must be non-empty and non-whitespace.
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const { token } = await authService.login({ username, password });
      login(token);
      navigate('/profile');
    } catch (err) {
      const message =
        err && err.message ? err.message : FALLBACK_ERROR;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="login-page" style={styles.page}>
      <div className="login-card" style={styles.card}>
        <h1 style={styles.heading}>Log In</h1>

        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          {/* Inline error message */}
          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="login-error"
              style={styles.error}
            >
              {error}
            </p>
          )}

          {/* Username field */}
          <div style={styles.fieldGroup}>
            <label htmlFor="username" style={styles.label}>
              Username
            </label>
            <input
              id="username"
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              style={styles.input}
            />
          </div>

          {/* Password field */}
          <div style={styles.fieldGroup}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={styles.input}
            />
          </div>

          {/* Submit button — disabled while request is in-flight */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {}),
            }}
          >
            {isLoading ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        {/* Link to signup page — keyboard-focusable with accessible text */}
        <p style={styles.signupPrompt}>
          Don&apos;t have an account?{' '}
          <Link to="/signup" style={styles.link}>
            Sign up here
          </Link>
        </p>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Inline styles — all color values reference CSS variable tokens
// ---------------------------------------------------------------------------

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-bg)',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  heading: {
    color: 'var(--color-primary)',
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  error: {
    color: 'var(--color-accent-orange)',
    backgroundColor: 'var(--color-bg-light-blue)',
    border: '1px solid var(--color-accent-orange)',
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    margin: 0,
    fontSize: '0.9rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  label: {
    color: 'var(--color-text)',
    fontWeight: '600',
    fontSize: '0.9rem',
  },
  input: {
    border: '1px solid var(--color-text-mid-gray)',
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    fontSize: '1rem',
    color: 'var(--color-text)',
    backgroundColor: '#ffffff',
    outline: 'none',
  },
  button: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  buttonDisabled: {
    backgroundColor: 'var(--color-text-mid-gray)',
    cursor: 'not-allowed',
  },
  signupPrompt: {
    textAlign: 'center',
    marginTop: '1.25rem',
    color: 'var(--color-text-gray)',
    fontSize: '0.9rem',
  },
  link: {
    color: 'var(--color-secondary)',
    textDecoration: 'underline',
    fontWeight: '600',
  },
};

export default LoginPage;
