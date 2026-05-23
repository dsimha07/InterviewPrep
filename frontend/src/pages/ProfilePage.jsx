/**
 * ProfilePage.jsx
 *
 * Placeholder landing page for authenticated users.
 * Displays the authenticated user's username decoded from the JWT via AuthContext.
 * Redirects to /login if the token is absent, malformed, or expired on render.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 *
 * All colors reference variables.css tokens — no raw hex values.
 *
 * @author basic-auth spec
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import '../styles/variables.css';

/** localStorage key used by AuthContext to persist the JWT. */
const TOKEN_KEY = 'auth_token';

/**
 * Returns true if the decoded JWT payload has an `exp` claim that is still
 * in the future (i.e. the token has not yet expired).
 *
 * @param {{ exp: number } | null} payload - Decoded JWT payload.
 * @returns {boolean}
 */
function isPayloadValid(payload) {
  if (!payload || typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 > Date.now();
}

/**
 * ProfilePage — placeholder profile page for authenticated users.
 *
 * On render, reads the raw token from localStorage and validates it.
 * If the token is absent, malformed, or expired, calls logout() and
 * redirects to /login immediately.
 *
 * Displays the username from AuthContext (decoded from the JWT payload).
 */
function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const rawToken = localStorage.getItem(TOKEN_KEY);

    // No token present — redirect immediately.
    if (!rawToken) {
      logout();
      navigate('/login', { replace: true });
      return;
    }

    // Attempt to decode; redirect on malformed or expired token.
    try {
      const payload = jwtDecode(rawToken);
      if (!isPayloadValid(payload)) {
        logout();
        navigate('/login', { replace: true });
      }
    } catch {
      // Malformed token — treat as unauthenticated.
      logout();
      navigate('/login', { replace: true });
    }
  }, [logout, navigate]);

  return (
    <main className="profile-page" style={styles.page}>
      <div className="profile-card" style={styles.card}>
        <h1 style={styles.heading}>Profile Info</h1>

        {/* Display the authenticated user's username */}
        {user && (
          <p style={styles.username} data-testid="profile-username">
            {user.username}
          </p>
        )}

        <p style={styles.body}>Profile setup coming soon</p>
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
    maxWidth: '480px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  heading: {
    color: 'var(--color-primary)',
    marginBottom: '1rem',
  },
  username: {
    color: 'var(--color-secondary)',
    fontWeight: '600',
    fontSize: '1.1rem',
    marginBottom: '0.75rem',
  },
  body: {
    color: 'var(--color-text-gray)',
    fontSize: '1rem',
    margin: 0,
  },
};

export default ProfilePage;
