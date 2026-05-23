/**
 * ProtectedRoute.jsx
 *
 * A route guard component that wraps React Router v6 <Outlet>.
 *
 * On every render it reads the JWT directly from localStorage and checks
 * whether the token's `exp` claim has passed. If the token is expired,
 * it calls logout() from AuthContext (which clears localStorage and resets
 * auth state) and redirects the user to /login.
 *
 * If the user is not authenticated (no token, or after expiry cleanup),
 * it redirects to /login. Otherwise it renders the nested <Outlet />.
 *
 * Requirements: 6.1, 6.2, 6.5
 *
 * @author basic-auth spec
 */

import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';

/** localStorage key used by AuthContext to persist the JWT. */
const TOKEN_KEY = 'auth_token';

/**
 * ProtectedRoute — guards all child routes behind authentication.
 *
 * Checks token expiry on every render so that a tab left open past the
 * token's expiry time is immediately redirected on the next navigation.
 *
 * @returns {JSX.Element} <Outlet /> when authenticated, <Navigate> otherwise.
 */
function ProtectedRoute() {
  const { isAuthenticated, logout } = useAuth();

  // Read the raw token directly from localStorage on every render so that
  // expiry is evaluated with the current wall-clock time, not a stale value
  // cached in React state.
  const rawToken = localStorage.getItem(TOKEN_KEY);

  if (rawToken) {
    try {
      const payload = jwtDecode(rawToken);
      const isExpired =
        typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();

      if (isExpired) {
        // Clear the stale token and reset auth state before redirecting.
        logout();
        return <Navigate to="/login" replace />;
      }
    } catch {
      // Malformed token — treat as unauthenticated.
      logout();
      return <Navigate to="/login" replace />;
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
