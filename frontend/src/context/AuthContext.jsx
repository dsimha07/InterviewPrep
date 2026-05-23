/**
 * AuthContext.jsx
 *
 * Provides authentication state to the entire React component tree.
 * Reads and writes the JWT from/to localStorage. Decodes the JWT payload
 * using jwt-decode to expose user identity (id, username) to consumers.
 *
 * Exposed context value:
 *   {
 *     isAuthenticated: boolean,
 *     token: string | null,
 *     user: { id, username } | null,
 *     login(token): void,
 *     logout(): void,
 *   }
 *
 * On mount, any token whose `exp` has already passed is immediately discarded
 * so stale tokens never reach the route guard.
 *
 * @author basic-auth spec
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Key used to persist the JWT in localStorage. */
const TOKEN_KEY = 'auth_token';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * AuthContext — the React context object.
 * Default value is null; consumers must be wrapped in AuthProvider.
 */
export const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Decodes a JWT string and returns the payload, or null if decoding fails.
 *
 * @param {string} token - A JWT string.
 * @returns {{ id: number, username: string, exp: number } | null}
 */
function decodeToken(token) {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

/**
 * Returns true if the decoded JWT payload has an `exp` claim that is still
 * in the future (i.e. the token has not yet expired).
 *
 * @param {{ exp: number } | null} payload - Decoded JWT payload.
 * @returns {boolean}
 */
function isTokenValid(payload) {
  if (!payload || typeof payload.exp !== 'number') return false;
  // exp is in seconds; Date.now() is in milliseconds.
  return payload.exp * 1000 > Date.now();
}

/**
 * Reads the stored token from localStorage, validates it, and returns
 * the initial auth state. Discards the token if it is expired or malformed.
 *
 * @returns {{ token: string | null, user: { id, username } | null, isAuthenticated: boolean }}
 */
function resolveInitialState() {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) {
    return { token: null, user: null, isAuthenticated: false };
  }

  const payload = decodeToken(stored);
  if (!isTokenValid(payload)) {
    // Immediately discard expired or malformed tokens.
    localStorage.removeItem(TOKEN_KEY);
    return { token: null, user: null, isAuthenticated: false };
  }

  return {
    token: stored,
    user: { id: payload.id, username: payload.username },
    isAuthenticated: true,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * AuthProvider — wraps the component tree and supplies auth state via context.
 * Initialises state from localStorage on mount, discarding any expired token.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(resolveInitialState);

  // Re-validate on mount in case the token expired while the tab was open.
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      const payload = decodeToken(stored);
      if (!isTokenValid(payload)) {
        localStorage.removeItem(TOKEN_KEY);
        setAuthState({ token: null, user: null, isAuthenticated: false });
      }
    }
  }, []);

  /**
   * Stores the given JWT in localStorage and updates auth state.
   * Decodes the payload to populate the `user` field.
   *
   * @param {string} token - A valid JWT string returned by the API.
   */
  function login(token) {
    const payload = decodeToken(token);
    const user = payload ? { id: payload.id, username: payload.username } : null;
    localStorage.setItem(TOKEN_KEY, token);
    setAuthState({ token, user, isAuthenticated: true });
  }

  /**
   * Removes the JWT from localStorage and synchronously resets auth state
   * to unauthenticated before any subsequent navigation occurs.
   */
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setAuthState({ token: null, user: null, isAuthenticated: false });
  }

  const value = {
    isAuthenticated: authState.isAuthenticated,
    token: authState.token,
    user: authState.user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Convenience hook
// ---------------------------------------------------------------------------

/**
 * useAuth — convenience hook that returns the AuthContext value.
 * Must be called inside a component wrapped by AuthProvider.
 *
 * @returns {{ isAuthenticated: boolean, token: string | null, user: { id, username } | null, login: Function, logout: Function }}
 * @throws {Error} If called outside of an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
